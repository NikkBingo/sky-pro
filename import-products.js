const XMLParser = require('./utils/xml-parser');
const ShopifyAPI = require('./config/shopify');
const { createShopifyProduct, splitProductBySize } = require('./config/field-mapping');
require('dotenv').config();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run') || args.includes('-d'),
  limit: parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1]) || 10
};

class ProductImporter {
  constructor() {
    this.xmlParser = new XMLParser();
    this.shopifyAPI = new ShopifyAPI();
    this.englishFeedUrl = process.env.ENGLISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products-en.xml';
    
    // Global caches for image deduplication (from app.import-products.jsx)
    this.globalMediaCache = new Map();
    this.urlToMediaCache = new Map();
    // Add a cache for color to imageId mapping per product
    this.productColorImageCache = new Map(); // productId -> { colorKey: imageId }
    // Global image cache to prevent UUID creation (from app.images-api.jsx)
    this.globalImageCache = new Map(); // imageUrl -> { id, src, alt, productId }
  }

  // Helper function to generate image identifier (from app.import-products.jsx)
  generateImageIdentifier(styleName) {
    return styleName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  // Helper function to generate descriptive filenames for better image matching
  generateDescriptiveFilename(productName, colorName) {
    // Clean and format product name
    const cleanProductName = productName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
      .join(' ');
    
    // Clean and format color name
    const cleanColorName = colorName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
      .join(' ');
    
    // Create descriptive filename based on the specified pattern
    let filename = '';
    
    if (cleanColorName && cleanColorName.toLowerCase() !== 'product image') {
      // Variant image: "Product Name + Color.jpg" (using + instead of -)
      filename = `${cleanProductName} + ${cleanColorName}.jpg`;
    } else {
      // Main image: "Product Name.jpg"
      filename = `${cleanProductName}.jpg`;
    }
    
    // Ensure filename is URL-safe
    filename = filename.replace(/[^a-zA-Z0-9\s\-\.\+]/g, '');
    
    return filename;
  }

  // Helper function to mask sensitive data in logs (from app.import-products.jsx)
  maskSensitiveData(str) {
    if (typeof str !== 'string') return String(str);
    
    return str
      .replace(/"password"\s*:\s*"[^"]*"/g, '"password": "***MASKED***"')
      .replace(/"api_key"\s*:\s*"[^"]*"/g, '"api_key": "***MASKED***"')
      .replace(/"token"\s*:\s*"[^"]*"/g, '"token": "***MASKED***"')
      .replace(/"secret"\s*:\s*"[^"]*"/g, '"secret": "***MASKED***"')
      .replace(/"key"\s*:\s*"[^"]*"/g, '"key": "***MASKED***"')
      .replace(/"access_token"\s*:\s*"[^"]*"/g, '"access_token": "***MASKED***"')
      .replace(/"refresh_token"\s*:\s*"[^"]*"/g, '"refresh_token": "***MASKED***"')
      .replace(/"client_secret"\s*:\s*"[^"]*"/g, '"client_secret": "***MASKED***"')
      .replace(/"private_key"\s*:\s*"[^"]*"/g, '"private_key": "***MASKED***"')
      .replace(/"session_token"\s*:\s*"[^"]*"/g, '"session_token": "***MASKED***"');
  }

  // Helper function to truncate large data for logging (from app.import-products.jsx)
  truncateForLog(data, maxLength = 200) {
    if (typeof data === 'string' && data.length > maxLength) {
      return data.substring(0, maxLength) + '...';
    }
    return data;
  }

  async attachMediaWithRetry(mediaId, productId, retries = 5) {
    // Convert productId to GID format if needed
    let gid = productId;
    if (typeof productId === 'number' || /^[0-9]+$/.test(productId)) {
      gid = `gid://shopify/Product/${productId}`;
    } else if (typeof productId === 'string' && !productId.startsWith('gid://')) {
      gid = `gid://shopify/Product/${productId}`;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Attach the file to the product using GraphQL
        const mutation = `
          mutation fileUpdate($files: [FileUpdateInput!]!) {
            fileUpdate(files: $files) {
              files { id alt ... on MediaImage { image { url } } }
              userErrors { field message }
            }
          }
        `;
        const variables = {
          files: [{ id: mediaId, referencesToAdd: [gid] }]
        };
        const res = await this.shopifyAPI.makeGraphQLRequest(mutation, variables);
        const errs = res.data?.fileUpdate?.userErrors || [];
        const files = res.data?.fileUpdate?.files || [];

        // Ensure only valid MediaImage files are attached
        const isValidMediaImage = files.some(f => f.id === mediaId && f.image && f.image.url);
        if (!isValidMediaImage) {
          throw new Error('File is not a valid MediaImage or not yet processed');
        }

        const blocking = errs.filter((e) => !/already|processing|non-ready files/i.test(e.message));
        const processingErr = errs.find((e) => /processing|non-ready files/i.test(e.message));
        if (blocking.length === 0) {
          if (!processingErr) return true; // success or just already attached
        }
        if (attempt < retries) {
          const delay = attempt * 2000;
          await this.sleep(delay); // Exponential backoff
          continue;
        }
        console.error('Image attach errors', errs);
        return false;
      } catch (err) {
        if (attempt === retries) {
          console.error('attachMediaWithRetry failed', err);
          return false;
        }
        const delay = attempt * 2000;
        await this.sleep(delay); // Exponential backoff
      }
    }
    return false;
  }

  // New image handling method using Shopify's file system (from app.import-products.jsx)
  async uploadImageWithShopifyFileSystem(productId, imageData, styleName) {
    try {
      const imageUrl = imageData.src;
      const baseAlt = imageData.alt || styleName;
      
      // Generate descriptive filename based on product name and color
      let descriptiveFilename = this.generateDescriptiveFilename(styleName, baseAlt);
      let originalFilename = imageData.filename || descriptiveFilename;
      let productImageId = null;
      
      console.log(`📤 Uploading image for Color: '${baseAlt}' directly to product`);
      console.log(`  URL: ${imageUrl}`);
      console.log(`  Original filename: ${originalFilename}`);
      console.log(`  Descriptive filename: ${descriptiveFilename}`);
      
      // Check if the image is already in the product's images array
      const productImagesRes = await this.shopifyAPI.makeRequest('GET', `/products/${productId}/images.json`);
      const productImages = productImagesRes.images || [];
      
      // Debug: Log all existing images
      console.log(`  📸 Current product images:`);
      productImages.forEach((img, index) => {
        console.log(`    ${index + 1}. Alt: "${img.alt || 'no alt'}" | ID: ${img.id} | Src: ${img.src}`);
      });
      
      // Check for existing image by URL AND alt text to avoid duplicates
      const colorKey = baseAlt.toLowerCase().trim();
      const alreadyPresent = productImages.find(img => {
        const sameUrl = img.src === imageUrl;
        const sameAlt = (img.alt || '').toLowerCase().trim() === colorKey;
        return sameUrl || sameAlt;
      });
      
      if (alreadyPresent) {
        productImageId = alreadyPresent.id;
        console.log(`♻️ Product already has image: ${imageUrl} (id: ${productImageId})`);
        console.log(`  Matched by: ${alreadyPresent.src === imageUrl ? 'URL' : 'Alt text'}`);
      } else {
        // Check if image exists globally to reuse it (prevent UUID creation)
        const existingImage = await this.findExistingImage(imageUrl);
        
        if (existingImage) {
          console.log(`♻️ Found existing image globally: ${existingImage.id} (${existingImage.src})`);
          
          // Add existing image to this product
          const addResponse = await this.shopifyAPI.makeRequest('POST', `/products/${productId}/images.json`, {
            image: {
              id: existingImage.id,
              src: existingImage.src,
              alt: baseAlt,
              position: imageData.position
            }
          });
          
          if (addResponse.image && addResponse.image.id) {
            productImageId = addResponse.image.id;
            console.log(`✅ Added existing image to product: ${imageUrl} (id: ${productImageId})`);
            
            // Cache the reused image globally
            this.globalImageCache.set(imageUrl, {
              id: existingImage.id,
              src: existingImage.src,
              alt: baseAlt,
              productId: productId
            });
          } else {
            throw new Error('Failed to add existing image to product');
          }
        } else {
          // Use the same approach as app.images-api.jsx - create media directly on product
          console.log(`📤 Creating new media directly on product with alt: "${baseAlt}"`);
          
          try {
            // Use GraphQL productCreateMedia mutation (same as working app.images-api.jsx)
            // Convert productId to GID format
            let productGid = productId;
            if (typeof productId === 'number' || /^[0-9]+$/.test(productId)) {
              productGid = `gid://shopify/Product/${productId}`;
            } else if (typeof productId === 'string' && !productId.startsWith('gid://')) {
              productGid = `gid://shopify/Product/${productId}`;
            }
            
            console.log(`🔗 Using product GID: ${productGid} for media creation`);
            
            const productMediaCreateQuery = await this.shopifyAPI.makeGraphQLRequest(`
              mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
                productCreateMedia(productId: $productId, media: $media) {
                  media {
                    id
                    alt
                    ... on MediaImage {
                      image {
                        url
                      }
                    }
                  }
                  mediaUserErrors {
                    field
                    message
                  }
                }
              }
            `, {
              productId: productGid,
              media: [{
                originalSource: imageUrl,
                alt: baseAlt,
                mediaContentType: "IMAGE"
              }]
            });
            
            if (productMediaCreateQuery.errors) {
              console.error('GraphQL errors in product media creation:', productMediaCreateQuery.errors);
              throw new Error(`GraphQL product media creation error: ${productMediaCreateQuery.errors.map(e => e.message).join(', ')}`);
            }
            
            const productMediaCreateResult = productMediaCreateQuery.data?.productCreateMedia;
            
            if (productMediaCreateResult?.mediaUserErrors?.length > 0) {
              console.error('Product media creation user errors:', productMediaCreateResult.mediaUserErrors);
              throw new Error(`Product media creation user errors: ${productMediaCreateResult.mediaUserErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
            }
            
            if (!productMediaCreateResult?.media?.length > 0) {
              console.error('No product media created in response:', productMediaCreateResult);
              throw new Error('No product media created');
            }
            
            const createdMedia = productMediaCreateResult.media[0];
            const createdMediaId = createdMedia.id;
            const createdMediaUrl = createdMedia.image?.url || imageUrl;
            
            // Extract filename from created URL to see if it has UUID
            const createdFilename = createdMediaUrl.split('/').pop() || '';
            const hasUuid = createdFilename.includes('-') && createdFilename.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
            
            console.log(`✅ NEW MEDIA CREATED: ${originalFilename} (${createdMediaId})`);
            console.log(`🌐 Media URL: ${createdMediaUrl}`);
            console.log(`📁 Created filename: ${createdFilename}`);
            console.log(`🔍 Has UUID suffix: ${hasUuid ? 'YES' : 'NO'}`);
            
            if (hasUuid) {
              console.log(`⚠️ WARNING: Created media has UUID suffix!`);
              console.log(`🔍 Expected clean filename: ${originalFilename}`);
              console.log(`🔍 Actual filename: ${createdFilename}`);
            }
            
            productImageId = createdMediaId;
            
            // Get the ProductImage ID from the created media
            // The createdMediaId is a MediaImage GID, we need to get the ProductImage ID
            const productImagesResponse = await this.shopifyAPI.makeRequest('GET', `/products/${productId}/images.json`);
            const productImages = productImagesResponse.images || [];
            const matchingProductImage = productImages.find(img => img.src === createdMediaUrl);
            
            if (matchingProductImage) {
              console.log(`✅ Found matching ProductImage ID: ${matchingProductImage.id} for MediaImage: ${createdMediaId}`);
              
              // Cache the ProductImage ID (not the MediaImage ID) for variant assignment
              this.globalImageCache.set(imageUrl, {
                id: matchingProductImage.id, // Use ProductImage ID for variant assignment
                src: createdMediaUrl,
                alt: baseAlt,
                productId: productId
              });
              
              // Also cache the MediaImage ID for future media operations
              this.globalImageCache.set(`${imageUrl}_media`, {
                id: createdMediaId,
                src: createdMediaUrl,
                alt: baseAlt,
                productId: productId
              });
            } else {
              console.warn(`⚠️ Could not find matching ProductImage for MediaImage ${createdMediaId}`);
              // Cache the MediaImage ID as fallback
              this.globalImageCache.set(imageUrl, {
                id: createdMediaId,
                src: createdMediaUrl,
                alt: baseAlt,
                productId: productId
              });
            }
            
          } catch (uploadError) {
            console.error(`❌ Upload error for ${originalFilename}:`, uploadError);
            throw uploadError;
          }
        }
      }
      
      // Cache the image ID for this color for this product
      if (!this.productColorImageCache.has(productId)) {
        this.productColorImageCache.set(productId, {});
      }
      const colorCache = this.productColorImageCache.get(productId);
      if (!colorCache[colorKey]) {
        // Use ProductImage ID for variant assignment (not MediaImage ID)
        const productImagesResponse = await this.shopifyAPI.makeRequest('GET', `/products/${productId}/images.json`);
        const productImages = productImagesResponse.images || [];
        const matchingProductImage = productImages.find(img => img.src === imageData.src);
        
        if (matchingProductImage) {
          colorCache[colorKey] = matchingProductImage.id; // Use ProductImage ID
          console.log(`🗂️ Cached ProductImage ID ${matchingProductImage.id} for color '${colorKey}' on product ${productId}`);
        } else {
          console.warn(`⚠️ Could not find ProductImage for color '${colorKey}' on product ${productId}`);
          colorCache[colorKey] = productImageId; // Fallback to MediaImage ID
          console.log(`🗂️ Cached MediaImage ID ${productImageId} for color '${colorKey}' on product ${productId}`);
        }
      }
      
      // Add 200ms delay to processing time
      await this.sleep(200);
      
      // Return the product image ID for variant assignment
      return productImageId;
    } catch (error) {
      console.error(`❌ Error in uploadImageWithShopifyFileSystem:`, error.message);
      throw error;
    }
  }

  async importProducts(options = {}) {
    const { dryRun = options.dryRun || false, limit = options.limit || 10 } = options;
    
    // Define categories to import
    const categoriesToImport = [
      'Shopping Bags',
      'Headwear and accessories', 
      'Sweaters',
      'T-shirts',
      'Trousers and jog pants',
      'Polos'
    ];
    
    try {
      console.log('📥 Fetching XML feed...');
      const xmlData = await this.xmlParser.fetchAndParseXML(this.englishFeedUrl);
      
      if (!xmlData.mainostekstiilitcom || !xmlData.mainostekstiilitcom.products) {
        throw new Error('Invalid XML structure: missing products data');
      }

      const allProducts = xmlData.mainostekstiilitcom.products.product;
      const allProductArray = Array.isArray(allProducts) ? allProducts : [allProducts];
      
      console.log(`📊 Found ${allProductArray.length} total products in feed`);
      
      // Filter products by selected categories
      const filteredProducts = allProductArray.filter(product => {
        const category = product.categories?.category?.[0]?.name;
        return category && categoriesToImport.includes(category);
      });
      
      console.log(`🎯 Found ${filteredProducts.length} products in selected categories: ${categoriesToImport.join(', ')}`);
      
      const productArray = filteredProducts;
      console.log(`🔄 Processing ${Math.min(limit, productArray.length)} products...`);
      
      // Create Product Grouping metafield definitions
      await this.createProductGroupingDefinitions();
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < Math.min(limit, productArray.length); i++) {
        const xmlProduct = productArray[i];
        
        try {
          console.log(`\n📦 Processing product ${i + 1}/${Math.min(limit, productArray.length)}: ${xmlProduct.title || xmlProduct.code}`);
          
          // Check if product needs splitting (over 100 variants)
          const shopifyProducts = splitProductBySize(xmlProduct);
          
          if (dryRun) {
            console.log('🔍 DRY RUN - Would create products:');
            shopifyProducts.forEach((product, index) => {
              console.log(`Product ${index + 1}:`);
              console.log(JSON.stringify(product, null, 2));
            });
          } else {
            // Process each split product
            const createdProducts = [];
            
            for (let j = 0; j < shopifyProducts.length; j++) {
              const shopifyProduct = shopifyProducts[j];
              
              // Check if product already exists
              const existingProduct = await this.findExistingProduct(shopifyProduct.handle);
              
              if (existingProduct) {
                console.log(`⏭️ Product already exists: ${existingProduct.title} (ID: ${existingProduct.id})`);
                console.log(`⏭️ Skipping product creation and image upload`);
                createdProducts.push(existingProduct);
              } else {
                console.log(`✨ Creating new product: ${shopifyProduct.title}`);
                const newProduct = await this.createProduct(shopifyProduct);
                createdProducts.push(newProduct);
              }
            }
            
            // Handle images for all products (both single and split)
            if (shopifyProducts.length === 1) {
              // Single product - upload images to product first
              const product = createdProducts[0];
              const productData = shopifyProducts[0];
              
              // Check if this is an existing product (skip image processing)
              const isExistingProduct = await this.findExistingProduct(productData.handle);
              
              if (isExistingProduct) {
                console.log(`⏭️ Skipping image processing for existing product: ${product.title}`);
              } else {
                console.log(`📸 Processing images for single product: ${product.title}`);
                
                if (productData.images && productData.images.length > 0) {
                  // Upload images in batches to avoid overwhelming the API
                  const batchSize = 5;
                  for (let i = 0; i < productData.images.length; i += batchSize) {
                    const batch = productData.images.slice(i, i + batchSize);
                    
                    console.log(`📤 Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(productData.images.length / batchSize)} (${batch.length} images)`);
                    
                    for (const imageData of batch) {
                      await this.uploadImageWithShopifyFileSystem(product.id, imageData, productData.title);
                      await this.sleep(500); // 500ms delay for image uploads
                    }
                    
                    // Add a delay to ensure images are processed before variant assignment
                    console.log(`⏳ Waiting 3 seconds for images to be processed before assigning variant images...`);
                    await this.sleep(3000);
                  }
                  
                  // Assign variant images using product's uploaded images
                  console.log(`📸 Assigning variant images to product ${product.title}`);
                  await this.assignVariantImages(product.id);
                  await this.sleep(1000);
                }
              }
            } else {
              // Split products - upload images to first product, then reference to others
              const originalTitle = xmlProduct.title;
              const splitProductName = shopifyProducts[0].title.split(' - ')[0]; // Get the base name without size
              
              // Create Product Grouping metaobject FIRST (before creating products)
              console.log(`🔗 Creating Product Grouping metaobject for: ${splitProductName}`);
              const groupingInfo = await this.createProductGroupingEntry(splitProductName, []);
              
              if (!groupingInfo) {
                console.warn(`⚠️ Could not create Product Grouping metaobject for ${splitProductName}`);
              } else {
                console.log(`✅ Created Product Grouping metaobject: ${groupingInfo.id}`);
              }
              
              // Get the first split product
              const firstProduct = createdProducts[0];
              const firstProductData = shopifyProducts[0];
              
              // Check if the first split product already exists (skip image processing)
              const isFirstProductExisting = await this.findExistingProduct(firstProductData.handle);
              
              if (isFirstProductExisting) {
                console.log(`⏭️ First split product already exists: ${firstProduct.title}`);
                console.log(`📸 Will reference existing images from first product to other split products`);
                
                // Check if the existing first product has images
                const firstProductImagesResponse = await this.shopifyAPI.makeRequest('GET', `/products/${firstProduct.id}/images.json`);
                const firstProductImages = firstProductImagesResponse.images || [];
                
                if (firstProductImages.length === 0) {
                  console.log(`⚠️ Existing first split product has no images, uploading images to it`);
                  
                  // Upload images to the existing first split product
                  const originalImages = xmlProduct.images?.image ? 
                    (Array.isArray(xmlProduct.images.image) ? xmlProduct.images.image : [xmlProduct.images.image]) : [];
                  
                  if (originalImages.length > 0) {
                    console.log(`📸 Uploading ${originalImages.length} images to existing first split product`);
                    
                    // Convert XML images to Shopify format
                    const shopifyImages = originalImages.map((image, index) => ({
                      src: image.src,
                      alt: image.caption || image.name || 'Product Image',
                      position: index + 1
                    }));
                    
                    // Upload images in batches
                    const batchSize = 5;
                    for (let i = 0; i < shopifyImages.length; i += batchSize) {
                      const batch = shopifyImages.slice(i, i + batchSize);
                      
                      console.log(`📤 Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(shopifyImages.length / batchSize)} (${batch.length} images)`);
                      
                      for (const imageData of batch) {
                        console.log(`📤 Uploading image: ${imageData.alt || 'no alt'} -> ${imageData.src}`);
                        await this.uploadImageWithShopifyFileSystem(firstProduct.id, imageData, firstProductData.title);
                        await this.sleep(500);
                      }
                      
                      if (i + batchSize < shopifyImages.length) {
                        console.log(`⏳ Waiting 2 seconds between batches...`);
                        await this.sleep(2000);
                      }
                    }
                    
                    console.log(`⏳ Waiting 3 seconds for images to be processed...`);
                    await this.sleep(3000);
                  }
                } else {
                  console.log(`✅ Existing first split product has ${firstProductImages.length} images`);
                }
                
                // Assign variant images to existing first split product
                console.log(`📸 Assigning variant images to existing first split product ${firstProduct.title}`);
                await this.assignVariantImages(firstProduct.id);
                await this.sleep(1000);
              } else {
                // Upload images to the first split product ONLY
                console.log(`📸 Processing images for split products...`);
              
                // Step 1: Upload all images to the first split product ONLY
                console.log(`📸 Step 1: Uploading all images to first split product: ${firstProduct.title}`);
                
                // Get images from the original XML product (not the split product data)
                const originalImages = xmlProduct.images?.image ? 
                  (Array.isArray(xmlProduct.images.image) ? xmlProduct.images.image : [xmlProduct.images.image]) : [];
                
                console.log(`📸 Original product images: ${originalImages.length} images`);
                
                if (originalImages.length > 0) {
                  console.log(`📸 Images found in original product:`);
                  originalImages.forEach((img, index) => {
                    console.log(`  ${index + 1}. Caption: "${img.caption || img.name || 'no caption'}" | Src: ${img.src}`);
                  });
                  
                  // Convert XML images to Shopify format
                  const shopifyImages = originalImages.map((image, index) => ({
                    src: image.src,
                    alt: image.caption || image.name || 'Product Image',
                    position: index + 1
                  }));
                  
                  // Upload images in batches to avoid overwhelming the API
                  const batchSize = 5;
                  for (let i = 0; i < shopifyImages.length; i += batchSize) {
                    const batch = shopifyImages.slice(i, i + batchSize);
                    
                    console.log(`📤 Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(shopifyImages.length / batchSize)} (${batch.length} images)`);
                    
                    for (const imageData of batch) {
                      console.log(`📤 Uploading image: ${imageData.alt || 'no alt'} -> ${imageData.src}`);
                      
                      // Use the same upload method as single products to keep original filenames
                      await this.uploadImageWithShopifyFileSystem(firstProduct.id, imageData, firstProductData.title);
                      
                      await this.sleep(500); // 500ms delay for split product image uploads
                    }
                    
                    // Wait between batches
                    if (i + batchSize < shopifyImages.length) {
                      console.log(`⏳ Waiting 2 seconds between batches...`);
                      await this.sleep(2000); // 2 seconds between batches
                    }
                  }
                  
                  // Add a delay to ensure images are processed before referencing
                  console.log(`⏳ Waiting 3 seconds for images to be processed...`);
                  await this.sleep(3000);
                } else {
                  console.warn(`⚠️ No images found in original product data for split products`);
                  console.log(`📸 Original product data:`, JSON.stringify(xmlProduct, null, 2));
                }
                
                // Get updated first product with images
                const firstProductResponse = await this.shopifyAPI.makeRequest('GET', `/products/${firstProduct.id}.json`);
                const updatedFirstProduct = firstProductResponse.product;
                
                // Assign variant images to first split product after images are uploaded
                if (updatedFirstProduct.images && updatedFirstProduct.images.length > 0) {
                  console.log(`📸 Assigning variant images to first split product ${firstProduct.title}`);
                  await this.assignVariantImages(firstProduct.id);
                  await this.sleep(1000);
                }
              }
              
              // Step 2: Share the same images with all other split products using cached image IDs
              console.log(`📸 Step 2: Sharing cached images with other split products (no new uploads)`);
              for (let j = 1; j < createdProducts.length; j++) {
                const product = createdProducts[j];
                const productData = shopifyProducts[j];
                
                console.log(`📸 Sharing cached images from first product to split product ${product.title}`);
                
                // Share the color cache from the first product with this product
                const firstProductColorCache = this.productColorImageCache.get(firstProduct.id) || {};
                this.productColorImageCache.set(product.id, firstProductColorCache);
                
                console.log(`🗂️ Shared color cache from first product to split product ${product.id}`);
                console.log(`  Cached colors: ${Object.keys(firstProductColorCache).join(', ')}`);
                
                // Reference the same images using cached image IDs from first product
                if (Object.keys(firstProductColorCache).length > 0) {
                  console.log(`📸 Referencing cached images to split product ${product.title}`);
                  
                  // Get the first product's media to reference (using GraphQL to get MediaImage IDs)
                  const firstProductMediaQuery = await this.shopifyAPI.makeGraphQLRequest(`
                    query getProductMedia($productId: ID!) {
                      product(id: $productId) {
                        media(first: 50) {
                          edges {
                            node {
                              id
                              alt
                              ... on MediaImage {
                                image {
                                  url
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  `, {
                    productId: `gid://shopify/Product/${firstProduct.id}`
                  });
                  
                  const firstProductMedia = firstProductMediaQuery.data?.product?.media?.edges || [];
                  
                  for (const mediaEdge of firstProductMedia) {
                    const media = mediaEdge.node;
                    if (media.image?.url) {
                      console.log(`📤 Referencing media: ${media.alt || 'no alt'} -> ${media.image.url}`);
                      
                      // Use attachMediaWithRetry to properly share media between products
                      try {
                        const attachmentSuccess = await this.attachMediaWithRetry(media.id, product.id, 3);
                        
                        if (attachmentSuccess) {
                          console.log(`✅ Successfully attached media ${media.id} to split product ${product.title}`);
                          await this.sleep(1500); // Longer delay to prevent UUID creation
                        } else {
                          console.log(`❌ Failed to attach media ${media.id} to split product ${product.title}`);
                        }
                      } catch (attachmentError) {
                        console.error(`❌ Error attaching media ${media.id} to split product ${product.title}:`, attachmentError.message);
                      }
                      
                                              // Add longer delay between media references to prevent UUID creation
                        await this.sleep(2000);
                    }
                  }
                  
                  // Add longer delay to ensure images are referenced and prevent UUID creation
                  console.log(`⏳ Waiting 10 seconds for images to be referenced...`);
                  await this.sleep(10000);
                  
                  // Set the first media as the main image for consistency across split products
                  if (firstProductMedia.length > 0) {
                    const mainMedia = firstProductMedia[0].node; // First media is main image
                    if (mainMedia.image?.url) {
                      console.log(`📸 Setting main image for split product ${product.title}: ${mainMedia.alt || mainMedia.image.url}`);
                      
                      // Use GraphQL to set the main image
                      try {
                        const setMainImageMutation = `
                          mutation productUpdate($input: ProductInput!) {
                            productUpdate(input: $input) {
                              product {
                                id
                                image {
                                  id
                                  url
                                }
                              }
                              userErrors {
                                field
                                message
                              }
                            }
                          }
                        `;
                        
                        const productGid = `gid://shopify/Product/${product.id}`;
                        const setMainImageResponse = await this.shopifyAPI.makeGraphQLRequest(setMainImageMutation, {
                          input: {
                            id: productGid,
                            imageId: mainMedia.id
                          }
                        });
                        
                        if (setMainImageResponse.data?.productUpdate?.userErrors?.length > 0) {
                          console.error(`❌ Failed to set main image for split product ${product.title}:`, setMainImageResponse.data.productUpdate.userErrors);
                        } else {
                          console.log(`✅ Set main image for split product ${product.title}`);
                        }
                        
                        await this.sleep(1000); // Longer delay to prevent UUID creation
                      } catch (error) {
                        console.error(`❌ Failed to set main image for split product ${product.title}:`, error.message);
                      }
                    }
                  }
                  
                  // Assign variant images using the shared cache (no new image uploads)
                  console.log(`📸 Assigning variant images to split product ${product.title} using shared cache`);
                  await this.assignVariantImages(product.id);
                  await this.sleep(2000); // Longer delay to prevent UUID creation
                } else {
                  console.warn(`⚠️ No cached images available for split product ${product.title}`);
                }
                
                // Add delay between split products
                if (j < createdProducts.length - 1) {
                  console.log(`⏳ Waiting 3 seconds between split products...`);
                  await this.sleep(3000);
                }
              }
              
              // Update Product Grouping metafields for each split product
              if (groupingInfo) {
                for (let j = 0; j < createdProducts.length; j++) {
                  const product = createdProducts[j];
                  const size = shopifyProducts[j].title.split(' - ').pop(); // Extract size from title
                  await this.updateProductGroupingMetafields(product.id, splitProductName, size, groupingInfo.id);
                }
                
                // Update the Product Grouping metaobject with all product references
                const productIds = createdProducts.map(product => product.id);
                const updateSuccess = await this.updateProductGroupingWithProducts(groupingInfo.id, productIds);
                
                if (updateSuccess) {
                  console.log(`✅ Successfully updated Product Grouping metaobject with ${productIds.length} product references`);
                } else {
                  console.warn(`⚠️ Failed to update Product Grouping metaobject with product references`);
                }
              }
          }
            
            successCount += shopifyProducts.length;
          }
          
        } catch (error) {
          console.error(`❌ Error processing product ${xmlProduct.code || xmlProduct.id}:`, error.message);
          errorCount++;
        }
        
        // Rate limiting - pause between requests
        if (!dryRun && i < Math.min(limit, productArray.length) - 1) {
          console.log(`⏳ Waiting 2 seconds before next product...`);
          await this.sleep(2000); // 2 second pause to ensure proper order and prevent rate limiting
        }
      }
      
      console.log(`\n✅ Import completed!`);
      console.log(`📊 Summary:`);
      console.log(`   ✅ Successfully processed: ${successCount} products`);
      console.log(`   ❌ Errors: ${errorCount} products`);
      
    } catch (error) {
      console.error('❌ Import failed:', error.message);
      throw error;
    }
  }

  async findExistingProduct(handle) {
    try {
      const response = await this.shopifyAPI.makeRequest('GET', `/products.json?handle=${handle}&limit=1`);
      const products = response.products || [];
      return products.length > 0 ? products[0] : null;
    } catch (error) {
      console.warn(`⚠️ Error finding existing product:`, error.message);
      return null;
    }
  }

  async checkProductImagesExist(productId) {
    try {
      const response = await this.shopifyAPI.makeRequest('GET', `/products/${productId}/images.json`);
      const images = response.images || [];
      return images.length > 0;
    } catch (error) {
      console.warn(`⚠️ Error checking product images:`, error.message);
      return false;
    }
  }

  async findExistingImage(imageSrc) {
    try {
      // First check global cache
      const cachedImage = this.globalImageCache.get(imageSrc);
      if (cachedImage) {
        console.log(`🎨 Found existing image in cache: ${imageSrc} (ID: ${cachedImage.id})`);
        return cachedImage;
      }
      
      // Search for existing image by src URL
      const response = await this.shopifyAPI.makeRequest('GET', `/products.json?limit=250`);
      const products = response.products || [];
      
      for (const product of products) {
        if (product.images && product.images.length > 0) {
          const existingImage = product.images.find(img => img.src === imageSrc);
          if (existingImage) {
            console.log(`🎨 Found existing image: ${imageSrc} in product ${product.title}`);
            
            // Cache the found image globally
            this.globalImageCache.set(imageSrc, {
              id: existingImage.id,
              src: existingImage.src,
              alt: existingImage.alt,
              productId: product.id
            });
            
            return existingImage;
          }
        }
      }
      
      // Also search for images with UUID patterns that match the base filename
      const urlParts = imageSrc.split('/');
      const originalFilename = urlParts[urlParts.length - 1];
      const baseFilename = originalFilename.replace(/\.[^/.]+$/, '');
      
      console.log(`🔍 Searching for UUID versions of: ${baseFilename}`);
      
      for (const product of products) {
        if (product.images && product.images.length > 0) {
          for (const img of product.images) {
            const imgUrlParts = img.src.split('/');
            const imgFilename = imgUrlParts[imgUrlParts.length - 1];
            
            // Check if this image has a UUID pattern with our base filename
            const uuidPattern = new RegExp(`^${baseFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.[a-z]+$`, 'i');
            
            if (uuidPattern.test(imgFilename)) {
              console.log(`🎨 Found UUID version of image: ${imgFilename} (ID: ${img.id})`);
              
              // Cache the found image globally
              this.globalImageCache.set(imageSrc, {
                id: img.id,
                src: img.src,
                alt: img.alt,
                productId: product.id
              });
              
              return img;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️ Error searching for existing image:`, error.message);
      return null;
    }
  }

  async checkAndRenameImageIfNeeded(productId, imageId, originalFilename) {
    try {
      // Get the uploaded image details
      const imageResponse = await this.shopifyAPI.makeRequest('GET', `/products/${productId}/images/${imageId}.json`);
      const image = imageResponse.image;
      
      if (!image || !image.src) {
        console.log(`⚠️ Could not get image details for ID ${imageId}`);
        return;
      }
      
      // Extract filename from the image URL
      const urlParts = image.src.split('/');
      const currentFilename = urlParts[urlParts.length - 1];
      
      // Check if the current filename contains a UUID pattern
      const uuidPattern = /^(.+)_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|gif|webp)$/i;
      const match = currentFilename.match(uuidPattern);
      
      if (match) {
        const baseFilename = match[1]; // The part before the UUID
        const extension = match[2]; // The file extension
        
        console.log(`🔍 Detected UUID filename: ${currentFilename}`);
        console.log(`📝 Base filename: ${baseFilename}`);
        console.log(`📝 Original filename: ${originalFilename}`);
        console.log(`📝 Extension: ${extension}`);
        
        // Check if the base filename matches the original filename (without extension)
        const originalNameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
        
        if (baseFilename === originalNameWithoutExt) {
          console.log(`⚠️ UUID detected but cannot rename - Shopify CDN filenames cannot be modified`);
          console.log(`💡 Solution: Use global image cache to prevent UUID creation in future uploads`);
          
          // Add this image to global cache so future uploads will reuse it
          this.globalImageCache.set(image.src, {
            id: imageId,
            src: image.src,
            alt: image.alt,
            productId: productId
          });
          
          console.log(`🗂️ Added UUID image to global cache for future reuse`);
        } else {
          console.log(`ℹ️ Base filename (${baseFilename}) doesn't match original (${originalNameWithoutExt}), keeping current name`);
        }
      } else {
        console.log(`ℹ️ No UUID detected in filename: ${currentFilename}`);
      }
    } catch (error) {
      console.warn(`⚠️ Error checking image:`, error.message);
    }
  }

  async uploadImageIfNotExists(productId, imageData) {
    try {
      // Check if image already exists
      const existingImage = await this.findExistingImage(imageData.src);
      
      if (existingImage) {
        // Reuse existing image
        console.log(`🔄 Reusing existing image: ${imageData.src}`);
        await this.shopifyAPI.makeRequest('POST', `/products/${productId}/images.json`, {
          image: {
            id: existingImage.id,
            src: existingImage.src,
            alt: imageData.alt || existingImage.alt,
            position: imageData.position
          }
        });
        console.log(`  ✅ Referenced existing image: ${imageData.src}`);
        return existingImage;
      } else {
        // Upload new image
        console.log(`📤 Uploading new image: ${imageData.src}`);
        const response = await this.shopifyAPI.makeRequest('POST', `/products/${productId}/images.json`, {
          image: {
            src: imageData.src,
            alt: imageData.alt,
            position: imageData.position
          }
        });
        
        const uploadedImage = response.image;
        console.log(`  ✅ Uploaded new image: ${imageData.src} (ID: ${uploadedImage.id})`);
        return uploadedImage;
      }
      
    } catch (error) {
      console.warn(`⚠️ Could not upload image ${imageData.src}:`, error.message);
      return null;
    }
  }

  async createProductGroupingDefinitions() {
    try {
      console.log('🔧 Creating Product Grouping metafield definitions...');
      
      // Create Product Grouping Option 1 Entries metaobject definition
      const metaobjectDefRes = await this.shopifyAPI.makeGraphQLRequest(
        `mutation {
          metaobjectDefinitionCreate(definition: {
            name: "Product Grouping Option 1 Entries"
            type: "product_grouping_option_1_entries"
            fields: [
              {
                key: "grouping_name"
                name: "Grouping Name"
                type: "single_line_text_field"
              }
            ]
          }) {
            metaobjectDefinition {
              id
              type
              name
            }
            userErrors {
              field
              message
            }
          }
        }`
      );
      
      const metaobjectDefErrs = metaobjectDefRes.data?.metaobjectDefinitionCreate?.userErrors || [];
      
      if (metaobjectDefErrs.length > 0) {
        // Check if it's already created (duplicate error)
        const isDuplicate = metaobjectDefErrs.some(err => 
          err.message.includes('already exists') || 
          err.message.includes('duplicate')
        );
        
        if (isDuplicate) {
          console.log('✅ Product Grouping metaobject definition already exists');
        } else {
          console.warn('⚠️ Product Grouping metaobject definition creation errors:', metaobjectDefErrs);
        }
      } else {
        console.log('✅ Product Grouping metaobject definition created successfully');
      }
      
      // Create Product Grouping metafield definitions
      const metafieldDefs = [
        {
          namespace: 'stanley_stella',
          key: 'product_grouping_option_1',
          name: 'Product Grouping Option 1',
          type: 'metaobject_reference',
          owner_resource: 'product'
        },
        {
          namespace: 'stanley_stella',
          key: 'product_grouping_option_1_value',
          name: 'Product Grouping Option 1 Value',
          type: 'single_line_text_field',
          owner_resource: 'product'
        }
      ];
      
      for (const def of metafieldDefs) {
        try {
          const metafieldDefRes = await this.shopifyAPI.makeGraphQLRequest(
            `mutation {
              metafieldDefinitionCreate(definition: {
                name: "${def.name}"
                namespace: "${def.namespace}"
                key: "${def.key}"
                type: "${def.type}"
                ownerType: PRODUCT
              }) {
                metafieldDefinition {
                  id
                  key
                  namespace
                }
                userErrors {
                  field
                  message
                }
              }
            }`
          );
          
          const metafieldDefErrs = metafieldDefRes.data?.metafieldDefinitionCreate?.userErrors || [];
          
          if (metafieldDefErrs.length > 0) {
            // Check if it's already created (duplicate error)
            const isDuplicate = metafieldDefErrs.some(err => 
              err.message.includes('already exists') || 
              err.message.includes('duplicate')
            );
            
            if (isDuplicate) {
              console.log(`✅ Metafield definition ${def.namespace}.${def.key} already exists`);
            } else {
              console.warn(`⚠️ Metafield definition ${def.namespace}.${def.key} creation errors:`, metafieldDefErrs);
            }
          } else {
            console.log(`✅ Metafield definition ${def.namespace}.${def.key} created successfully`);
          }
        } catch (error) {
          console.warn(`⚠️ Error creating metafield definition ${def.namespace}.${def.key}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Error creating Product Grouping definitions:', error.message);
    }
  }

  async createProductGroupingEntry(groupingName, products) {
    try {
      console.log(`🔗 Creating Product Grouping entry for: ${groupingName}`);
      console.log(`📦 Grouping ${products.length} products together`);
      
      // Check if metaobject already exists for this grouping name
      const existingGroupingRes = await this.shopifyAPI.makeGraphQLRequest(
        `query {
          metaobjects(type: "product_grouping_option_1_entries", first: 10) {
            edges {
              node {
                id
                fields {
                  key
                  value
                }
              }
            }
          }
        }`
      );
      
      const existingGrouping = existingGroupingRes.data?.metaobjects?.edges?.find(
        edge => edge.node.fields.find(field => field.key === "grouping_name" && field.value === groupingName)
      );
      
      if (existingGrouping) {
        console.log(`⏭️ Found existing Product Grouping Option 1 Entry: ${groupingName}`);
        return {
          id: existingGrouping.node.id,
          name: groupingName,
          products: products.map(product => product.id),
          created_at: new Date().toISOString()
        };
      }
      
      // Create new Product Grouping Option 1 Entries metaobject
      // Only include the grouping_name field (no product_grouping field in metaobject)
      const metaobjectData = {
        type: 'product_grouping_option_1_entries',
        fields: [
          {
            key: 'grouping_name',
            value: groupingName
          }
        ]
      };
      
      console.log('📋 Creating metaobject entry with structure:');
      console.log(JSON.stringify(metaobjectData, null, 2));
      
      try {
        // Create the metaobject using GraphQL Admin API
        const graphqlQuery = `
          mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
            metaobjectCreate(metaobject: $metaobject) {
              metaobject {
                id
                handle
                fields {
                  key
                  value
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;
        
        const response = await this.shopifyAPI.makeGraphQLRequest(graphqlQuery, {
          metaobject: metaobjectData
        });
        
        if (response.data?.metaobjectCreate?.metaobject) {
          console.log(`✅ Created metaobject entry: ${response.data.metaobjectCreate.metaobject.id}`);
          return {
            id: response.data.metaobjectCreate.metaobject.id,
            name: groupingName,
            products: products.map(product => product.id),
            created_at: new Date().toISOString()
          };
        } else if (response.data?.metaobjectCreate?.userErrors?.length > 0) {
          console.warn(`⚠️ GraphQL errors:`, response.data.metaobjectCreate.userErrors);
          throw new Error('GraphQL errors occurred');
        }
        
      } catch (graphqlError) {
        console.warn(`⚠️ Could not create metaobject via GraphQL: ${graphqlError.message}`);
        throw graphqlError;
      }
      
    } catch (error) {
      console.warn('⚠️ Could not create Product Grouping structure:', error.message);
      return null;
    }
  }

  async updateProductGroupingMetafields(productId, groupingName, size, metaobjectId) {
    try {
      console.log(`🔗 Updating Product Grouping metafields for product ${productId}`);
      console.log(`🔗 Metaobject ID: ${metaobjectId}`);
      console.log(`🔗 Size: ${size}`);
      
      // Use the helper function to create grouping metafields
      const metafields = this.createProductGroupingMetafields(metaobjectId, size);
      
      // Create the metafields
      for (const metafield of metafields) {
        await this.shopifyAPI.makeRequest('POST', `/products/${productId}/metafields.json`, {
          metafield: metafield
        });
        console.log(`  ✅ Created metafield: ${metafield.namespace}.${metafield.key} = ${metafield.value}`);
        await this.sleep(250); // Rate limiting
      }
      
    } catch (error) {
      console.warn(`⚠️ Could not update Product Grouping metafields for product ${productId}:`, error.message);
    }
  }

  async updateProductGroupingWithProducts(metaobjectId, productIds) {
    try {
      console.log(`🔗 Updating Product Grouping metaobject ${metaobjectId} with ${productIds.length} product references`);
      
      // Update the metaobject with product references using GraphQL
      const productGids = productIds.map(id => `gid://shopify/Product/${id}`);
      
      const mutation = `
        mutation updateProductGrouping($id: ID!) {
          metaobjectUpdate(input: {
            id: $id,
            fields: [
              { key: "grouping_name", value: "Product Grouping" },
              { key: "products", value: "${productGids.join(',')}" },
              { key: "product_count", value: "${productIds.length}" }
            ]
          }) {
            metaobject {
              id
              fields {
                key
                value
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      
      const variables = {
        id: metaobjectId
      };
      
      const response = await this.shopifyAPI.makeGraphQLRequest(mutation, variables);
      
      if (response.data && response.data.metaobjectUpdate && response.data.metaobjectUpdate.metaobject) {
        console.log(`✅ Successfully updated Product Grouping metaobject with ${productIds.length} product references`);
        return true;
      } else if (response.data && response.data.metaobjectUpdate && response.data.metaobjectUpdate.userErrors) {
        console.warn(`⚠️ GraphQL errors updating Product Grouping metaobject:`, response.data.metaobjectUpdate.userErrors);
        return false;
      } else {
        console.warn(`⚠️ Unexpected response updating Product Grouping metaobject:`, response);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Error updating Product Grouping metaobject:`, error.message);
      return false;
    }
  }

  createProductGroupingMetafields(metaobjectId, size) {
    // Create product grouping metafields with the correct metaobject ID and size
    // This matches the approach from app.import-products.jsx
    return [
      {
        namespace: 'stanley_stella',
        key: 'product_grouping_option_1',
        value: metaobjectId, // Use the metaobject GID as the value
        type: 'metaobject_reference'
      },
      {
        namespace: 'stanley_stella',
        key: 'product_grouping_option_1_value',
        value: size,
        type: 'single_line_text_field'
      }
    ];
  }

  async referenceImagesToProduct(sourceProductId, targetProductId) {
    try {
      console.log(`📸 Referencing images from product ${sourceProductId} to product ${targetProductId}`);
      
      // Get images from source product
      const sourceImagesResponse = await this.shopifyAPI.makeRequest('GET', `/products/${sourceProductId}/images.json`);
      const sourceImages = sourceImagesResponse.images || [];
      
      if (sourceImages.length === 0) {
        console.log(`⚠️ No images found in source product ${sourceProductId}`);
        return;
      }
      
      // Check if target product already has images to avoid duplicates
      const targetImagesResponse = await this.shopifyAPI.makeRequest('GET', `/products/${targetProductId}/images.json`);
      const targetImages = targetImagesResponse.images || [];
      
      // Reference the same images by uploading with the same source URL (Shopify will reuse existing images)
      for (const image of sourceImages) {
        // Check if image already exists in target product
        const alreadyExists = targetImages.find(img => img.src === image.src);
        if (alreadyExists) {
          console.log(`♻️ Image already exists in target product: ${image.alt || image.src} (ID: ${alreadyExists.id})`);
          continue;
        }
        
        // Upload with same source URL - Shopify will reuse the existing image
        const uploadResponse = await this.shopifyAPI.makeRequest('POST', `/products/${targetProductId}/images.json`, {
          image: {
            src: image.src,
            alt: image.alt,
            position: image.position
          }
        });
        
        if (uploadResponse.image && uploadResponse.image.id) {
          console.log(`✅ Referenced image: ${image.alt || image.src} (ID: ${uploadResponse.image.id})`);
        } else {
          console.warn(`⚠️ Failed to reference image: ${image.alt || image.src}`);
        }
        
        // Add small delay between image references
        await this.sleep(200);
      }
      
      console.log(`✅ Successfully referenced ${sourceImages.length} images from product ${sourceProductId} to product ${targetProductId}`);
      
    } catch (error) {
      console.warn(`⚠️ Could not reference images from product ${sourceProductId} to product ${targetProductId}:`, error.message);
    }
  }

  async createProduct(productData) {
    try {
      // Create the product first WITHOUT images to avoid API limits
      const productResponse = await this.shopifyAPI.makeRequest('POST', '/products.json', {
        product: {
          title: productData.title,
          vendor: productData.vendor,
          body_html: productData.body_html,
          handle: productData.handle,
          product_type: productData.product_type,
          category_id: productData.category_id, // Add category ID if available
          tags: productData.tags,
          status: productData.status,
          options: productData.options,
          variants: productData.variants
          // Note: images are uploaded separately to avoid API limits
        }
      });

      const createdProduct = productResponse.product;
      console.log(`✅ Product created: ${createdProduct.title} (ID: ${createdProduct.id})`);

      // Create metafields for the product
      if (productData.metafields && productData.metafields.length > 0) {
        await this.createProductMetafields(createdProduct.id, productData.metafields);
        // Rate limiting between API calls
        await this.sleep(500);
      }

      // Upload images separately using Shopify file system
      if (productData.images && productData.images.length > 0) {
        console.log(`📸 Processing ${productData.images.length} images for product ${createdProduct.title}`);
        
        // Upload images in batches to avoid overwhelming the API
        const batchSize = 5; // Upload 5 images at a time
        for (let i = 0; i < productData.images.length; i += batchSize) {
          const batch = productData.images.slice(i, i + batchSize);
          
          console.log(`📤 Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(productData.images.length / batchSize)} (${batch.length} images)`);
          
          for (const imageData of batch) {
            await this.uploadImageWithShopifyFileSystem(createdProduct.id, imageData, productData.title);
            await this.sleep(1000); // Small delay between individual image uploads
          }
          
          // Wait between batches
          if (i + batchSize < productData.images.length) {
            console.log(`⏳ Waiting 1 second between batches...`);
            await this.sleep(1000);
          }
        }
        
        // Get updated product with images for variant assignment
        const updatedProductResponse = await this.shopifyAPI.makeRequest('GET', `/products/${createdProduct.id}.json`);
        const updatedProduct = updatedProductResponse.product;
        
        // Assign variant images after all images are uploaded
        if (updatedProduct.images && updatedProduct.images.length > 0) {
          console.log(`📸 Assigning variant images to product ${createdProduct.title}`);
          await this.assignVariantImages(createdProduct.id);
          await this.sleep(1000);
        }
      }

      return createdProduct;
    } catch (error) {
      console.error('❌ Error creating product:', error.message);
      throw error;
    }
  }

  async updateProduct(productId, productData) {
    try {
      // Update the product
      const productResponse = await this.shopifyAPI.makeRequest('PUT', `/products/${productId}.json`, {
        product: {
          id: productId,
          title: productData.title,
          vendor: productData.vendor,
          body_html: productData.body_html,
          product_type: productData.product_type,
          category_id: productData.category_id, // Add category ID if available
          tags: productData.tags,
          status: productData.status,
          options: productData.options,
          variants: productData.variants
          // Note: images are handled separately using Shopify file system
        }
      });

      const updatedProduct = productResponse.product;
      console.log(`✅ Product updated: ${updatedProduct.title} (ID: ${updatedProduct.id})`);

      // Update metafields for the product
      if (productData.metafields && productData.metafields.length > 0) {
        await this.updateProductMetafields(productId, productData.metafields);
        // Rate limiting between API calls
        await this.sleep(1000);
      }

      // Check if product already has images before uploading new ones
      const hasExistingImages = await this.checkProductImagesExist(productId);
      if (hasExistingImages) {
        console.log(`📸 Product ${updatedProduct.title} already has images - skipping image upload`);
      } else if (productData.images && productData.images.length > 0) {
        // Only upload images if product doesn't have images and we have images to upload
        console.log(`📸 Processing ${productData.images.length} images for updated product ${updatedProduct.title}`);
        
        // Upload images in batches using Shopify file system
        const batchSize = 5;
        for (let i = 0; i < productData.images.length; i += batchSize) {
          const batch = productData.images.slice(i, i + batchSize);
          
          console.log(`📤 Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(productData.images.length / batchSize)} (${batch.length} images)`);
          
          for (const imageData of batch) {
            await this.uploadImageWithShopifyFileSystem(productId, imageData, productData.title);
            await this.sleep(1000);
          }
          
          // Wait between batches
          if (i + batchSize < productData.images.length) {
            console.log(`⏳ Waiting 1 second between batches...`);
            await this.sleep(1000);
          }
        }
        
        // Get updated product with images for variant assignment
        const updatedProductWithImagesResponse = await this.shopifyAPI.makeRequest('GET', `/products/${productId}.json`);
        const updatedProductWithImages = updatedProductWithImagesResponse.product;
        
        // Assign variant images after all images are uploaded
        if (updatedProductWithImages.images && updatedProductWithImages.images.length > 0) {
          console.log(`📸 Assigning variant images to updated product ${updatedProduct.title}`);
          await this.assignVariantImages(productId);
          await this.sleep(1000);
        }
      }

      return updatedProduct;
    } catch (error) {
      console.error('❌ Error updating product:', error.message);
      throw error;
    }
  }

  async createProductMetafields(productId, metafields) {
    for (const metafield of metafields) {
      try {
        await this.shopifyAPI.makeRequest('POST', `/products/${productId}/metafields.json`, {
          metafield: {
            namespace: metafield.namespace,
            key: metafield.key,
            value: metafield.value,
            type: metafield.type
          }
        });
        console.log(`  ✅ Created metafield: ${metafield.namespace}.${metafield.key}`);
        
        // Rate limiting: wait 1000ms between metafield calls (Shopify limit: 2 calls/second)
        await this.sleep(1000);
      } catch (error) {
        if (error.response?.status === 429) {
          console.warn(`  ⚠️ Rate limited, waiting 5 seconds before retry...`);
          await this.sleep(5000);
          // Retry once
          try {
            await this.shopifyAPI.makeRequest('POST', `/products/${productId}/metafields.json`, {
              metafield: {
                namespace: metafield.namespace,
                key: metafield.key,
                value: metafield.value,
                type: metafield.type
              }
            });
            console.log(`  ✅ Created metafield (retry): ${metafield.namespace}.${metafield.key}`);
          } catch (retryError) {
            console.warn(`  ⚠️ Could not create metafield ${metafield.namespace}.${metafield.key}:`, retryError.message);
          }
        } else {
          console.warn(`  ⚠️ Could not create metafield ${metafield.namespace}.${metafield.key}:`, error.message);
        }
      }
    }
  }

  async createVariantMetafields(productId, variantId, metafields) {
    for (const metafield of metafields) {
      try {
        await this.shopifyAPI.makeRequest('POST', `/products/${productId}/variants/${variantId}/metafields.json`, {
          metafield: {
            namespace: metafield.namespace,
            key: metafield.key,
            value: metafield.value,
            type: metafield.type
          }
        });
        console.log(`  ✅ Created variant metafield: ${metafield.namespace}.${metafield.key}`);
        
        // Rate limiting: wait 1000ms between metafield calls (Shopify limit: 2 calls/second)
        await this.sleep(1000);
      } catch (error) {
        if (error.response?.status === 429) {
          console.warn(`  ⚠️ Rate limited, waiting 5 seconds before retry...`);
          await this.sleep(5000);
          // Retry once
          try {
            await this.shopifyAPI.makeRequest('POST', `/products/${productId}/variants/${variantId}/metafields.json`, {
              metafield: {
                namespace: metafield.namespace,
                key: metafield.key,
                value: metafield.value,
                type: metafield.type
              }
            });
            console.log(`  ✅ Created variant metafield (retry): ${metafield.namespace}.${metafield.key}`);
          } catch (retryError) {
            console.warn(`  ⚠️ Could not create variant metafield ${metafield.namespace}.${metafield.key}:`, retryError.message);
          }
        } else {
          console.warn(`  ⚠️ Could not create variant metafield ${metafield.namespace}.${metafield.key}:`, error.message);
        }
      }
    }
  }

  async updateProductMetafields(productId, metafields) {
    for (const metafield of metafields) {
      try {
        // First try to update existing metafield
        const existingMetafields = await this.shopifyAPI.makeRequest('GET', `/products/${productId}/metafields.json`);
        const existingMetafield = existingMetafields.metafields.find(
          m => m.namespace === metafield.namespace && m.key === metafield.key
        );

        if (existingMetafield) {
          await this.shopifyAPI.makeRequest('PUT', `/products/${productId}/metafields/${existingMetafield.id}.json`, {
            metafield: {
              value: metafield.value
            }
          });
          console.log(`  ✅ Updated metafield: ${metafield.namespace}.${metafield.key}`);
        } else {
          // Create new metafield if it doesn't exist
          await this.createProductMetafields(productId, [metafield]);
        }
        
        // Rate limiting: wait 1000ms between metafield calls (Shopify limit: 2 calls/second)
        await this.sleep(1000);
      } catch (error) {
        if (error.response?.status === 429) {
          console.warn(`  ⚠️ Rate limited, waiting 5 seconds before retry...`);
          await this.sleep(5000);
          // Retry once
          try {
            if (existingMetafield) {
              await this.shopifyAPI.makeRequest('PUT', `/products/${productId}/metafields/${existingMetafield.id}.json`, {
                metafield: {
                  value: metafield.value
                }
              });
            } else {
              await this.shopifyAPI.makeRequest('POST', `/products/${productId}/metafields.json`, {
                metafield: {
                  namespace: metafield.namespace,
                  key: metafield.key,
                  value: metafield.value,
                  type: metafield.type
                }
              });
            }
            console.log(`  ✅ Updated metafield (retry): ${metafield.namespace}.${metafield.key}`);
          } catch (retryError) {
            console.warn(`  ⚠️ Could not update metafield ${metafield.namespace}.${metafield.key}:`, retryError.message);
          }
        } else {
          console.warn(`  ⚠️ Could not update metafield ${metafield.namespace}.${metafield.key}:`, error.message);
        }
      }
    }
  }

  async assignVariantImages(productId) {
    try {
      console.log(`🎨 Assigning variant images for product ${productId}...`);
      
      // Get the product with all its images using GraphQL for better data
      const productGid = `gid://shopify/Product/${productId}`;
      const productQuery = `
        query getProductWithImages($id: ID!) {
          product(id: $id) {
            id
            title
            images(first: 50) {
              edges {
                node {
                  id
                  url
                  altText
                }
              }
            }
            variants(first: 50) {
              edges {
                node {
                  id
                  title
                  image {
                    id
                    url
                  }
                }
              }
            }
          }
        }
      `;
      
      const productResponse = await this.shopifyAPI.makeGraphQLRequest(productQuery, { id: productGid });
      
      if (!productResponse.data?.product) {
        console.log(`⚠️ Product ${productId} not found`);
        return;
      }
      
      const product = productResponse.data.product;
      const images = product.images.edges.map(edge => edge.node);
      const variants = product.variants.edges.map(edge => edge.node);
      
      // Also get product images via REST API to ensure we have the correct ProductImage IDs
      const productImagesResponse = await this.shopifyAPI.makeRequest('GET', `/products/${productId}/images.json`);
      const productImages = productImagesResponse.images || [];
      
      console.log(`📸 Product has ${images.length} GraphQL images and ${productImages.length} REST images`);
      
      if (productImages.length === 0) {
        console.log(`⚠️ No images found for product ${productId}`);
        return;
      }
      
      // Ensure we only work with images that are actually assigned to this product
      console.log(`✅ Using ${productImages.length} existing product images for variant assignment`);
      
      // Debug: Log all images and their alt text
      console.log(`🔍 Available GraphQL images:`);
      images.forEach((img, index) => {
        console.log(`  ${index + 1}. Alt: "${img.altText || 'no alt'}" | ID: ${img.id} | Src: ${img.url}`);
      });
      
      console.log(`🔍 Available REST images:`);
      productImages.forEach((img, index) => {
        const filename = img.src.split('/').pop() || '';
        console.log(`  ${index + 1}. Alt: "${img.alt || 'no alt'}" | ID: ${img.id} | Filename: ${filename}`);
      });
      
      console.log(`🔍 Processing ${variants.length} variants`);
      let assignedCount = 0;
      
      // Use the color-to-image cache for this product
      const colorCache = this.productColorImageCache.get(productId) || {};
      
      for (const variant of variants) {
        // Extract color from variant title - try multiple formats
        const variantTitle = variant.title || '';
        let colorOption = '';
        
        // Try different formats for color extraction
        if (variantTitle.includes(' - ')) {
          colorOption = variantTitle.split(' - ')[0]; // "Color - Size" format
        } else if (variantTitle.includes('/')) {
          colorOption = variantTitle.split('/')[0]; // "Color/Size" format
        } else if (variantTitle.includes(' ')) {
          // If no separator, try to extract color from first word
          const words = variantTitle.split(' ');
          colorOption = words[0];
        } else {
          colorOption = variantTitle; // Use entire title if no separators
        }
        
        if (!colorOption || colorOption.trim() === '') {
          console.log(`⚠️ Variant ${variant.id} has no color option in title: "${variantTitle}"`);
          continue;
        }
        
        console.log(`🎨 Processing variant: "${variantTitle}" -> Color: "${colorOption}"`);
        
        // Add delay between processing variants to avoid rate limiting
        await this.sleep(1000);
        
        const colorKey = colorOption.toLowerCase().trim();
        console.log(`🎨 Looking for image matching variant color: "${colorOption}" (key: '${colorKey}')`);
        
        // Use cache first
        let matchingImageId = colorCache[colorKey];
        if (!matchingImageId) {
          // Find matching image by alt text from REST API images (these are the actual product images)
          console.log(`🔍 Searching for image with alt text matching: "${colorKey}"`);
          
          // First try exact match
          const exactMatch = productImages.find(img => (img.alt || '').toLowerCase().trim() === colorKey);
          if (exactMatch) {
            matchingImageId = exactMatch.id;
            colorCache[colorKey] = matchingImageId;
            console.log(`✅ Found exact alt text match: image ID ${matchingImageId} for color '${colorKey}'`);
          } else {
            // Try case-insensitive exact match
            const caseInsensitiveMatch = productImages.find(img => 
              (img.alt || '').toLowerCase().trim() === colorKey.toLowerCase()
            );
            if (caseInsensitiveMatch) {
              matchingImageId = caseInsensitiveMatch.id;
              colorCache[colorKey] = matchingImageId;
              console.log(`✅ Found case-insensitive match: image ID ${matchingImageId} for color '${colorKey}'`);
            } else {
              // Try partial matching
              console.log(`🔍 Trying partial match for: "${colorKey}"`);
              const partialMatch = productImages.find(img => 
                (img.alt || '').toLowerCase().includes(colorKey) || 
                colorKey.includes((img.alt || '').toLowerCase())
              );
              if (partialMatch) {
                matchingImageId = partialMatch.id;
                colorCache[colorKey] = matchingImageId;
                console.log(`✅ Found partial match: image ID ${matchingImageId} for color '${colorKey}'`);
              } else {
                // Try matching by descriptive filename pattern
                console.log(`🔍 Trying descriptive filename match for: "${colorKey}"`);
                const productName = product.title || '';
                const expectedFilename = this.generateDescriptiveFilename(productName, colorOption);
                console.log(`🔍 Expected filename pattern: "${expectedFilename}"`);
                
                const filenameMatch = productImages.find(img => {
                  const imgFilename = img.src.split('/').pop() || '';
                  return imgFilename.toLowerCase().includes(colorKey.toLowerCase()) ||
                         imgFilename.toLowerCase().includes(expectedFilename.toLowerCase());
                });
                
                if (filenameMatch) {
                  matchingImageId = filenameMatch.id;
                  colorCache[colorKey] = matchingImageId;
                  console.log(`✅ Found filename match: image ID ${matchingImageId} for color '${colorKey}'`);
                }
              }
            }
          }
        }
        
        if (matchingImageId) {
          console.log(`✅ Found image ID ${matchingImageId} for variant ${variant.id} (${colorOption})`);
          
          // Check if variant already has the correct image assigned
          if (variant.image?.id === matchingImageId) {
            console.log(`✅ Variant ${variant.id} already has correct image assigned`);
            assignedCount++;
            continue;
          }
          
          // Try GraphQL first, then fallback to REST API
          let assignmentSuccess = false;
          
          // Method 1: GraphQL productVariantAppendMedia (only for existing images)
          try {
            console.log(`🔄 Method 1: Trying GraphQL productVariantAppendMedia...`);
            const assignImageMutation = `
              mutation productVariantAppendMedia($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) {
                productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) {
                  productVariants {
                    id
                    image {
                      id
                      url
                    }
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }
            `;
            
            const assignResponse = await this.shopifyAPI.makeGraphQLRequest(assignImageMutation, {
              productId: productGid,
              variantMedia: [{
                variantId: variant.id,
                mediaIds: [matchingImageId]
              }]
            });
            
            if (assignResponse.data?.productVariantAppendMedia?.userErrors?.length > 0) {
              console.error(`❌ GraphQL method failed:`, assignResponse.data.productVariantAppendMedia.userErrors);
            } else if (assignResponse.data?.productVariantAppendMedia?.productVariants?.length > 0) {
              const updatedVariant = assignResponse.data.productVariantAppendMedia.productVariants[0];
              if (updatedVariant.image?.id) {
                console.log(`✅ GraphQL method: Assigned existing image ${updatedVariant.image.id} to variant ${variant.id}`);
                assignedCount++;
                assignmentSuccess = true;
              }
            }
          } catch (graphqlError) {
            console.log(`⚠️ GraphQL method failed:`, graphqlError.message);
          }
          
          // Method 2: REST API fallback (the method that worked before)
          if (!assignmentSuccess) {
            try {
              console.log(`🔄 Method 2: Trying REST API variant update...`);
              
              // Verify the image exists in this product (we already have productImages from above)
              const imageExists = productImages.find(img => img.id === matchingImageId);
              
              if (!imageExists) {
                console.warn(`⚠️ Image ID ${matchingImageId} not found in product ${productId}, skipping variant ${variant.id}`);
                continue;
              }
              
              // Update variant with image_id using REST API
              await this.shopifyAPI.makeRequest('PUT', `/variants/${variant.id}.json`, {
                variant: {
                  id: variant.id,
                  image_id: matchingImageId
                }
              });
              
              console.log(`✅ REST API method: Assigned existing image ${matchingImageId} to variant ${variant.id}`);
              assignedCount++;
              assignmentSuccess = true;
              
            } catch (restError) {
              console.error(`❌ REST API method failed for variant ${variant.id}:`, restError.message);
              if (restError.response?.status === 422) {
                console.error(`  Details: Image ID ${matchingImageId} may not be valid for this product`);
              } else if (restError.response?.status === 429) {
                console.warn(`  ⚠️ Rate limited, waiting 5 seconds before continuing...`);
                await this.sleep(5000);
                // Retry once after rate limit
                try {
                  await this.shopifyAPI.makeRequest('PUT', `/variants/${variant.id}.json`, {
                    variant: {
                      id: variant.id,
                      image_id: matchingImageId
                    }
                  });
                  console.log(`✅ REST API method: Assigned existing image ${matchingImageId} to variant ${variant.id} (retry)`);
                  assignedCount++;
                  assignmentSuccess = true;
                } catch (retryError) {
                  console.error(`❌ REST API retry failed for variant ${variant.id}:`, retryError.message);
                }
              }
            }
          }
          
          // Add longer delay between variant updates to avoid rate limiting
          await this.sleep(1500);
        } else {
          console.log(`⚠️ No matching image found for variant ${variant.id} (${colorOption})`);
          console.log(`  Available alt texts: ${productImages.map(img => `"${img.alt || 'no alt'}"`).join(', ')}`);
          
          // Fallback: assign the first available image if no color match found
          if (productImages.length > 0) {
            console.log(`🔄 Fallback: Assigning first available image to variant ${variant.id}`);
            matchingImageId = productImages[0].id;
            colorCache[colorKey] = matchingImageId;
            console.log(`🗂️ Using fallback image ID ${matchingImageId} for color '${colorKey}'`);
          }
        }
      }
      
      console.log(`✅ Assigned images to ${assignedCount} variants for product ${productId}`);
    } catch (error) {
      console.error(`❌ Error assigning variant images for product ${productId}:`, error.message);
    }
  }

  async assignImageToVariant(productId, variantId, imageId) {
    try {
      console.log(`🔗 Attempting to assign image to variant via GraphQL`);
      console.log(`🔗 Product: ${productId}`);
      console.log(`🔗 Variant: ${variantId}`);
      console.log(`🔗 Image: ${imageId}`);
      
      // Convert IDs to GID format for GraphQL
      const productGid = `gid://shopify/Product/${productId}`;
      const variantGid = `gid://shopify/ProductVariant/${variantId}`;
      const imageGid = `gid://shopify/ProductImage/${imageId}`;
      
      console.log(`🔗 Product GID: ${productGid}`);
      console.log(`🔗 Variant GID: ${variantGid}`);
      console.log(`🔗 Image GID: ${imageGid}`);
      
      // First, verify the product exists
      try {
        const productCheck = await this.shopifyAPI.makeRequest('GET', `/products/${productId}.json`);
        console.log(`✅ Product ${productId} exists: ${productCheck.product.title}`);
      } catch (productError) {
        console.error(`❌ Product ${productId} does not exist or is inaccessible:`, productError.message);
        return { success: false, method: 'product_not_found', error: 'Product does not exist' };
      }
      
      // Try Method 1: productVariantAppendMedia (the correct approach)
      console.log(`🔄 Method 1: Trying productVariantAppendMedia...`);
      
      try {
        const appendMediaResponse = await this.shopifyAPI.makeGraphQLRequest(
          `mutation productVariantAppendMedia($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) {
            productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) {
              productVariants {
                id
                image {
                  id
                  url
                }
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            productId: productGid,
            variantMedia: [{
              variantId: variantGid,
              mediaIds: [imageGid]
            }]
          }
        );

        if (appendMediaResponse.errors) {
          console.log(`⚠️ Method 1 GraphQL errors:`, appendMediaResponse.errors);
        } else if (appendMediaResponse.data?.productVariantAppendMedia?.userErrors?.length > 0) {
          console.log(`⚠️ Method 1 user errors:`, appendMediaResponse.data.productVariantAppendMedia.userErrors);
        } else if (appendMediaResponse.data?.productVariantAppendMedia?.productVariants?.length > 0) {
          const updatedVariant = appendMediaResponse.data.productVariantAppendMedia.productVariants[0];
          if (updatedVariant.image?.id) {
            console.log(`✅ Method 1 SUCCESS: Variant image assigned via productVariantAppendMedia`);
            console.log(`   Updated variant image: ${updatedVariant.image.id}`);
            return { success: true, method: 'productVariantAppendMedia', imageId: updatedVariant.image.id };
          }
        }
      } catch (appendError) {
        console.log(`⚠️ Method 1 failed:`, appendError.message);
      }

      // Try Method 2: productVariantsBulkUpdate (without imageId field)
      console.log(`🔄 Method 2: Trying productVariantsBulkUpdate...`);
      
      try {
        const bulkUpdateResponse = await this.shopifyAPI.makeGraphQLRequest(
          `mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkUpdate(productId: $productId, variants: $variants) {
              productVariants {
                id
                image {
                  id
                  url
                }
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            productId: productGid,
            variants: [{
              id: variantGid
              // Note: imageId field is not available in ProductVariantsBulkInput
            }]
          }
        );

        if (bulkUpdateResponse.errors) {
          console.log(`⚠️ Method 2 GraphQL errors:`, bulkUpdateResponse.errors);
        } else if (bulkUpdateResponse.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
          console.log(`⚠️ Method 2 user errors:`, bulkUpdateResponse.data.productVariantsBulkUpdate.userErrors);
        } else if (bulkUpdateResponse.data?.productVariantsBulkUpdate?.productVariants?.length > 0) {
          const updatedVariant = bulkUpdateResponse.data.productVariantsBulkUpdate.productVariants[0];
          if (updatedVariant.image?.id) {
            console.log(`✅ Method 2 SUCCESS: Variant image assigned via productVariantsBulkUpdate`);
            console.log(`   Updated variant image: ${updatedVariant.image.id}`);
            return { success: true, method: 'productVariantsBulkUpdate', imageId: updatedVariant.image.id };
          }
        }
      } catch (bulkError) {
        console.log(`⚠️ Method 2 failed:`, bulkError.message);
      }

      // Try Method 3: productVariantUpdate (single variant update)
      console.log(`🔄 Method 3: Trying productVariantUpdate...`);
      
      try {
        const variantUpdateResponse = await this.shopifyAPI.makeGraphQLRequest(
          `mutation productVariantUpdate($input: ProductVariantInput!) {
            productVariantUpdate(input: $input) {
              productVariant {
                id
                image {
                  id
                  url
                }
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            input: {
              id: variantGid,
              imageId: imageGid
            }
          }
        );

        if (variantUpdateResponse.errors) {
          console.log(`⚠️ Method 3 GraphQL errors:`, variantUpdateResponse.errors);
        } else if (variantUpdateResponse.data?.productVariantUpdate?.userErrors?.length > 0) {
          console.log(`⚠️ Method 3 user errors:`, variantUpdateResponse.data.productVariantUpdate.userErrors);
        } else if (variantUpdateResponse.data?.productVariantUpdate?.productVariant?.image?.id) {
          const updatedVariant = variantUpdateResponse.data.productVariantUpdate.productVariant;
          console.log(`✅ Method 3 SUCCESS: Variant image assigned via productVariantUpdate`);
          console.log(`   Updated variant image: ${updatedVariant.image.id}`);
          return { success: true, method: 'productVariantUpdate', imageId: updatedVariant.image.id };
        }
      } catch (variantError) {
        console.log(`⚠️ Method 3 failed:`, variantError.message);
      }

      // If all GraphQL methods fail
      console.log(`⚠️ All GraphQL methods failed for variant ${variantId}`);
      
      return { success: false, method: 'all_methods_failed', error: 'No GraphQL method succeeded' };
    } catch (error) {
      console.error(`❌ Error in assignImageToVariant:`, error);
      return { success: false, method: 'exception', error: error.message };
    }
  }

  async attachMediaToProduct(productId, mediaId) {
    try {
      console.log(`🔗 Attaching media ${mediaId} to product ${productId}`);
      
      const productGid = `gid://shopify/Product/${productId}`;
      const mediaGid = `gid://shopify/MediaImage/${mediaId}`;
      
      console.log(`🔗 Product GID: ${productGid}`);
      console.log(`🔗 Media GID: ${mediaGid}`);
      
      const response = await this.shopifyAPI.makeGraphQLRequest(
        `mutation productAppendMedia($productId: ID!, $mediaIds: [ID!]!) {
          productAppendMedia(productId: $productId, mediaIds: $mediaIds) {
            product {
              id
              images {
                id
                src
                alt
              }
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          productId: productGid,
          mediaIds: [mediaGid]
        }
      );

      console.log(`🔗 Attachment response:`, JSON.stringify(response, null, 2));

      if (response.errors) {
        console.log(`⚠️ GraphQL errors when attaching media:`, response.errors);
        return false;
      }
      
      if (response.data?.productAppendMedia?.userErrors?.length > 0) {
        console.log(`⚠️ User errors when attaching media:`, response.data.productAppendMedia.userErrors);
        return false;
      }
      
      if (response.data?.productAppendMedia?.product?.images) {
        console.log(`✅ Successfully attached media ${mediaId} to product ${productId}`);
        console.log(`📸 Product now has ${response.data.productAppendMedia.product.images.length} images`);
        return true;
      } else {
        console.log(`⚠️ No product data returned from attachment`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error attaching media to product:`, error.message);
      return false;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ProductImporter; 

// Run the import if this file is executed directly
if (require.main === module) {
  const importer = new ProductImporter();
  importer.importProducts(options)
    .then(() => {
      console.log('✅ Import completed successfully!');
    })
    .catch((error) => {
      console.error('❌ Import failed:', error.message);
      process.exit(1);
    });
} 