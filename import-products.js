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
  }

  // Helper function to generate image identifier (from app.import-products.jsx)
  generateImageIdentifier(styleName) {
    return styleName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
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
      const baseAlt = styleName; // Use the style name as alt text
      
      // Get original filename from image data or generate one
      let originalFilename = '';
      if (imageData.filename) {
        originalFilename = imageData.filename;
      } else {
        // Fallback: generate filename from style name
        originalFilename = `${this.generateImageIdentifier(baseAlt)}.jpg`;
      }
      
      console.log(`📸 Processing image for ${styleName}: ${this.truncateForLog(imageUrl)}`);
      console.log(`📸 Original filename: ${originalFilename}`);
      
      let mediaId = null;
      
      // Check global cache first (fastest)
      if (this.globalMediaCache.has(baseAlt)) {
        const cachedMedia = this.globalMediaCache.get(baseAlt);
        console.log(`🚀 Found image in global cache for '${baseAlt}': ${cachedMedia.mediaId}`);
        mediaId = cachedMedia.mediaId;
      } 
      // Check URL cache to prevent duplicate uploads of the same image URL
      else if (this.urlToMediaCache.has(imageUrl)) {
        const cached = this.urlToMediaCache.get(imageUrl);
        console.log(`🚀 Reusing cached image for URL: ${this.truncateForLog(imageUrl)}`);
        mediaId = cached.mediaId;
      } else {
        // Check if a file with this identifier already exists to avoid duplicates across runs
        let existingNode = null;
        
        try {
          // Enhanced search with more comprehensive queries (from app.import-products.jsx)
          const searchQueries = [
            `filename:"${originalFilename}"`, // Exact filename match (most reliable)
            `alt:"${baseAlt}"`, // Exact alt text match
            `alt:"${originalFilename}"`, // Alt text with filename
            `"${baseAlt}"`, // Simple text search for alt
            `"${originalFilename}"` // Simple filename search
          ];
          
          // Try multiple search strategies to find existing media
          for (const searchQ of searchQueries) {
            console.log(`🔍 Searching for existing media with query: ${this.truncateForLog(searchQ)}`);
            
            const searchRes = await this.shopifyAPI.makeGraphQLRequest(
              `query ($q: String!) { files(first: 50, query: $q) { edges { node { id alt ... on MediaImage { image { url } } } } } }`,
              { q: searchQ }
            );
            
            const edges = searchRes.data?.files?.edges || [];
            console.log(`🔍 Search query '${this.truncateForLog(searchQ)}' returned ${edges.length} results`);
            
            if (edges.length > 0) {
              // Look for exact matches first (by alt text or filename pattern)
              for (const edge of edges) {
                const node = edge.node;
                const nodeAlt = node.alt || '';
                const nodeUrl = node.image?.url || '';
                
                // Prefer files without UUID suffixes (original files)
                const hasUUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(nodeUrl);
                
                // Check for exact matches
                if (nodeAlt === baseAlt || nodeAlt === originalFilename) {
                  if (!hasUUID || !existingNode) {
                    existingNode = node;
                    console.log(`✅ Found exact alt match: ${existingNode.id} (alt: '${nodeAlt}') ${hasUUID ? '[has UUID]' : '[original]'}`);
                    if (!hasUUID) break; // Prefer original filename
                  }
                }
                
                // Check if the filename pattern matches (for images uploaded with custom filenames)
                if (nodeAlt.includes(originalFilename) || nodeAlt.includes(baseAlt.replace(/\s+/g, '_'))) {
                  if (!hasUUID || !existingNode) {
                    existingNode = node;
                    console.log(`✅ Found pattern match: ${existingNode.id} (alt: '${nodeAlt}') ${hasUUID ? '[has UUID]' : '[original]'}`);
                    if (!hasUUID) break; // Prefer original filename
                  }
                }
              }
              
              // If no exact match, use the first result as fallback (prefer non-UUID)
              if (!existingNode && searchQ.includes('filename:')) {
                // Find the first file without UUID, or fallback to first file
                for (const edge of edges) {
                  const node = edge.node;
                  const nodeUrl = node.image?.url || '';
                  const hasUUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(nodeUrl);
                  
                  if (!hasUUID) {
                    existingNode = node;
                    console.log(`✅ Using first non-UUID filename search result: ${existingNode.id} (alt: '${existingNode.alt || 'no alt'}')`);
                    break;
                  }
                }
                
                // If all have UUIDs, use the first one
                if (!existingNode) {
                  existingNode = edges[0].node;
                  console.log(`✅ Using first filename search result: ${existingNode.id} (alt: '${existingNode.alt || 'no alt'}')`);
                }
              }
              
              if (existingNode) break;
            }
          }
        } catch (searchErr) {
          console.error("Media search failed", searchErr);
          existingNode = null; // Reset so we upload new image
        }

        if (existingNode) {
          // Re-use existing file and add to global cache
          console.log(`♻️ Found existing media for '${baseAlt}', re-using (id: ${existingNode.id})`);
          mediaId = existingNode.id;
          
          // Add to global cache for future use
          this.globalMediaCache.set(baseAlt, {
            mediaId: existingNode.id,
            imageUrl: existingNode.image?.url || imageUrl,
            altText: existingNode.alt || baseAlt
          });
          
          // Also add to URL cache to prevent future duplicate uploads
          this.urlToMediaCache.set(imageUrl, {
            mediaId: existingNode.id,
            imageUrl: existingNode.image?.url || imageUrl,
            altText: existingNode.alt || baseAlt,
            filename: existingNode.alt || originalFilename
          });
          
          console.log(`🔗 Added existing file to URL cache: ${this.truncateForLog(imageUrl)} -> ${existingNode.id}`);
          console.log(`✅ Successfully found existing media: ${existingNode.id} (added to cache)`);
        }
        
        if (!existingNode) {
          // Upload fresh image (first time we see this style or reuse failed) with custom filename
          console.log(`📤 Uploading new image for StyleName: '${baseAlt}'`);
          
          try {
            // First create the file with custom filename (from app.import-products.jsx)
            const fileRes = await this.shopifyAPI.makeGraphQLRequest(
              `mutation fileCreate($files: [FileCreateInput!]!) {
                 fileCreate(files: $files) {
                   files { id alt ... on MediaImage { image { url } } }
                   userErrors { field message }
                 }
               }`,
              {
                files: [
                  {
                    originalSource: imageUrl,
                    alt: baseAlt, // Use StyleName as alt text
                    filename: originalFilename, // Use original filename
                    contentType: "IMAGE",
                  },
                ],
              }
            );
            const fileErrs = fileRes.data?.fileCreate?.userErrors || [];
            if (fileErrs.length) {
              console.error("File create errors", fileErrs);
              throw new Error(`Image creation failed: ${fileErrs[0].message}`);
            } else {
              const createdFile = fileRes.data?.fileCreate?.files?.[0];
              if (createdFile) {
                console.log(`Image uploaded for URL: ${imageUrl} with alt text: "${baseAlt}"`);
                mediaId = createdFile.id;
                
                // Add to global cache
                this.globalMediaCache.set(baseAlt, {
                  mediaId: createdFile.id,
                  imageUrl: createdFile.image?.url || imageUrl,
                  altText: createdFile.alt || baseAlt
                });
                
                // Add to URL cache to prevent duplicate uploads of the same image URL
                this.urlToMediaCache.set(imageUrl, {
                  mediaId: createdFile.id,
                  imageUrl: createdFile.image?.url || imageUrl,
                  altText: createdFile.alt || baseAlt,
                  filename: originalFilename
                });
                
                console.log(`🔗 Added to URL cache: ${this.truncateForLog(imageUrl)} -> ${createdFile.id}`);
                console.log(`✅ Successfully uploaded new image with filename '${originalFilename}': ${createdFile.id} (added to cache)`);
              }
            }
          } catch (uploadErr) {
            console.error("Image upload failed", uploadErr);
            throw new Error(`Image upload failed: ${uploadErr.message}`);
          }
        }
      }
      
      // Attach the image to the product
      if (mediaId) {
        console.log(`📎 Attaching image ${mediaId} to product ${productId}`);
        
        const attachSuccess = await this.attachMediaWithRetry(mediaId, productId);
        if (attachSuccess) {
          console.log(`✅ Successfully attached image to product: ${productId}`);
          return mediaId;
        } else {
          console.error(`❌ Failed to attach image to product: ${productId}`);
          throw new Error(`Failed to attach image to product: ${productId}`);
        }
      }
      
      return null;
      
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
                console.log(`🔄 Updating existing product: ${existingProduct.title}`);
                await this.updateProduct(existingProduct.id, shopifyProduct);
                createdProducts.push(existingProduct);
              } else {
                console.log(`✨ Creating new product: ${shopifyProduct.title}`);
                const newProduct = await this.createProduct(shopifyProduct);
                createdProducts.push(newProduct);
              }
            }
            
            // If this was a split product, create Product Grouping entry and handle images properly
            if (shopifyProducts.length > 1) {
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
              
              // NEW IMAGE HANDLING: Use Shopify file system approach
              console.log(`📸 Processing images for split products using Shopify file system...`);
              
              // Step 1: Upload all images to the first split product only
              if (createdProducts.length > 0) {
                const firstProduct = createdProducts[0];
                const firstProductData = shopifyProducts[0];
                
                console.log(`📸 Step 1: Uploading all images to first split product: ${firstProduct.title}`);
                
                // Upload images to the first product only using Shopify file system
                if (firstProductData.images && firstProductData.images.length > 0) {
                  console.log(`📸 Processing ${firstProductData.images.length} images for first split product`);
                  
                  // Upload images in batches to avoid overwhelming the API
                  const batchSize = 5; // Upload 5 images at a time
                  for (let i = 0; i < firstProductData.images.length; i += batchSize) {
                    const batch = firstProductData.images.slice(i, i + batchSize);
                    
                    console.log(`📤 Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(firstProductData.images.length / batchSize)} (${batch.length} images)`);
                    
                    for (const imageData of batch) {
                      await this.uploadImageWithShopifyFileSystem(firstProduct.id, imageData, originalTitle);
                      await this.sleep(200); // 200ms delay for split product image uploads
                    }
                    
                    // Wait between batches
                    if (i + batchSize < firstProductData.images.length) {
                      console.log(`⏳ Waiting 1 second between batches...`);
                      await this.sleep(1000);
                    }
                  }
                }
                
                // Get updated first product with images
                const firstProductResponse = await this.shopifyAPI.makeRequest('GET', `/products/${firstProduct.id}.json`);
                const updatedFirstProduct = firstProductResponse.product;
                
                // Assign variant images to first split product after images are uploaded
                if (updatedFirstProduct.images && updatedFirstProduct.images.length > 0) {
                  console.log(`📸 Assigning variant images to first split product ${firstProduct.title}`);
                  await this.assignVariantImages(firstProduct.id, firstProductData.variants, updatedFirstProduct.images);
                  await this.sleep(500);
                }
                
                // Step 2: Reference images to all other split products (reuse the same images)
                console.log(`📸 Step 2: Referencing images to other split products`);
                for (let j = 1; j < createdProducts.length; j++) {
                  const product = createdProducts[j];
                  const productData = shopifyProducts[j];
                  
                  console.log(`📸 Referencing images from first product to split product ${product.title}`);
                  
                  // Reference all images from the first product (reuse the same images)
                  await this.referenceImagesToProduct(firstProduct.id, product.id);
                  
                  // Get updated product with images for variant assignment
                  const productResponse = await this.shopifyAPI.makeRequest('GET', `/products/${product.id}.json`);
                  const updatedProduct = productResponse.product;
                  
                  // Assign variant images after all images are uploaded
                  if (updatedProduct.images && updatedProduct.images.length > 0) {
                    console.log(`📸 Assigning variant images to split product ${product.title}`);
                    await this.assignVariantImages(product.id, productData.variants, updatedProduct.images);
                    await this.sleep(500);
                  }
                  
                  // Add delay between split products
                  if (j < createdProducts.length - 1) {
                    console.log(`⏳ Waiting 200ms between split products...`);
                    await this.sleep(200);
                  }
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
      // Search for existing image by src URL
      const response = await this.shopifyAPI.makeRequest('GET', `/products.json?limit=250`);
      const products = response.products || [];
      
      for (const product of products) {
        if (product.images && product.images.length > 0) {
          const existingImage = product.images.find(img => img.src === imageSrc);
          if (existingImage) {
            console.log(`🎨 Found existing image: ${imageSrc} in product ${product.title}`);
            return existingImage;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️ Error searching for existing image:`, error.message);
      return null;
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
      
      // Update the metaobject to include product references
      const updateQuery = `
        mutation metaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
          metaobjectUpdate(id: $id, metaobject: $metaobject) {
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
      
      const updateData = {
        id: metaobjectId,
        metaobject: {
          fields: [
            {
              key: 'product_grouping',
              value: productIds.map(productId => `gid://shopify/Product/${productId}`).join(',')
            }
          ]
        }
      };
      
      const response = await this.shopifyAPI.makeGraphQLRequest(updateQuery, updateData);
      
      if (response.data?.metaobjectUpdate?.metaobject) {
        console.log(`✅ Successfully updated Product Grouping metaobject with product references`);
        return true;
      } else if (response.data?.metaobjectUpdate?.userErrors?.length > 0) {
        console.warn(`⚠️ GraphQL errors updating metaobject:`, response.data.metaobjectUpdate.userErrors);
        return false;
      }
      
      return false;
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
      
      // Reference the same images by ID instead of copying
      for (const image of sourceImages) {
        await this.shopifyAPI.makeRequest('POST', `/products/${targetProductId}/images.json`, {
          image: {
            id: image.id, // Reference the same image ID
            src: image.src,
            alt: image.alt,
            position: image.position
          }
        });
        console.log(`  ✅ Referenced image: ${image.alt || image.src} (ID: ${image.id})`);
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
            await this.sleep(500); // Small delay between individual image uploads
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
          await this.assignVariantImages(createdProduct.id, productData.variants, updatedProduct.images);
          await this.sleep(500);
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
        await this.sleep(500);
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
            await this.sleep(500);
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
          await this.assignVariantImages(productId, productData.variants, updatedProductWithImages.images);
          await this.sleep(500);
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
        
        // Rate limiting: wait 500ms between metafield calls
        await this.sleep(500);
      } catch (error) {
        if (error.response?.status === 429) {
          console.warn(`  ⚠️ Rate limited, waiting 2 seconds before retry...`);
          await this.sleep(2000);
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
        
        // Rate limiting: wait 500ms between metafield calls
        await this.sleep(500);
      } catch (error) {
        if (error.response?.status === 429) {
          console.warn(`  ⚠️ Rate limited, waiting 2 seconds before retry...`);
          await this.sleep(2000);
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
      } catch (error) {
        console.warn(`  ⚠️ Could not update metafield ${metafield.namespace}.${metafield.key}:`, error.message);
      }
    }
  }

  async assignVariantImages(productId, originalVariants, createdImages) {
    try {
      console.log(`📸 Starting variant image assignment for product ${productId}`);
      console.log(`📊 Found ${createdImages?.length || 0} images and ${originalVariants?.length || 0} variants`);
      
      if (!createdImages || createdImages.length === 0) {
        console.log(`⚠️ No images available for variant assignment`);
        return;
      }
      
      // Get the current product to access variants
      const productResponse = await this.shopifyAPI.makeRequest('GET', `/products/${productId}.json`);
      const product = productResponse.product;
      
      if (!product.variants || product.variants.length === 0) {
        console.log(`⚠️ No variants found for product ${productId}`);
        return;
      }
      
      // Create a map of color names to image IDs
      const colorImageMap = {};
      
      // Map images by their alt text (color name)
      createdImages.forEach(image => {
        if (image.alt) {
          const colorName = image.alt.trim();
          colorImageMap[colorName] = image.id;
          console.log(`  🎨 Mapped color "${colorName}" to image ID: ${image.id}`);
        }
      });
      
      console.log(`📋 Available colors in product images: ${Object.keys(colorImageMap).join(', ')}`);
      
      // Update variants with their corresponding images
      const variantsToUpdate = [];
      
      product.variants.forEach(variant => {
        // Try to match variant by color option (option1 is typically color)
        const variantColor = variant.option1;
        const matchingImageId = colorImageMap[variantColor];
        
        console.log(`  🔍 Variant ${variant.id} (${variantColor}) -> image: ${matchingImageId || 'NOT FOUND'}`);
        
        if (matchingImageId) {
          variantsToUpdate.push({
            id: variant.id,
            image_id: matchingImageId,
            color: variantColor
          });
        }
      });
      
      console.log(`📸 Found ${variantsToUpdate.length} variants to assign images to`);
      
      // Update variants with image assignments
      for (const variant of variantsToUpdate) {
        try {
          await this.shopifyAPI.makeRequest('PUT', `/products/${productId}/variants/${variant.id}.json`, {
            variant: {
              id: variant.id,
              image_id: variant.image_id
            }
          });
          console.log(`  ✅ Assigned image ${variant.image_id} to variant ${variant.id} (${variant.color})`);
          
          // Rate limiting: wait 500ms between variant updates
          await this.sleep(500);
        } catch (error) {
          console.warn(`  ⚠️ Could not assign image to variant ${variant.id}:`, error.message);
        }
      }
      
      console.log(`🎯 Variant image assignment completed for product ${productId}`);
    } catch (error) {
      console.warn(`  ⚠️ Could not assign variant images:`, error.message);
    }
  }

  sleep(ms) {
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