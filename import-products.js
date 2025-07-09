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
      const baseAlt = imageData.alt || styleName;
      let originalFilename = imageData.filename || `${this.generateImageIdentifier(baseAlt)}.jpg`;
      let productImageId = null;
      // Upload directly to product images (no Shopify Files system)
      console.log(`📤 Uploading image for Color: '${baseAlt}' directly to product`);
      console.log(`  URL: ${imageUrl}`);
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
        // Upload as classic product image
        console.log(`📤 Uploading new image with alt: "${baseAlt}"`);
        const uploadRes = await this.shopifyAPI.makeRequest('POST', `/products/${productId}/images.json`, {
          image: {
            src: imageUrl,
            alt: baseAlt,
            position: imageData.position
          }
        });
        if (uploadRes.image && uploadRes.image.id) {
          productImageId = uploadRes.image.id;
          console.log(`✅ Uploaded image to product: ${imageUrl} (id: ${productImageId})`);
        } else {
          throw new Error('Failed to upload image as product image');
        }
      }
      // Cache the image ID for this color for this product
      if (!this.productColorImageCache.has(productId)) {
        this.productColorImageCache.set(productId, {});
      }
      const colorCache = this.productColorImageCache.get(productId);
      if (!colorCache[colorKey]) {
        colorCache[colorKey] = productImageId;
        console.log(`🗂️ Cached image ID ${productImageId} for color '${colorKey}' on product ${productId}`);
      }
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
                console.log(`🔄 Updating existing product: ${existingProduct.title}`);
                await this.updateProduct(existingProduct.id, shopifyProduct);
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
                  
                  // Wait between batches
                  if (i + batchSize < productData.images.length) {
                    console.log(`⏳ Waiting 2 seconds between batches...`);
                    await this.sleep(2000); // 2 seconds between batches
                  }
                }
                
                // Add a delay to ensure images are processed before variant assignment
                console.log(`⏳ Waiting 3 seconds for images to be processed before assigning variant images...`);
                await this.sleep(3000);
              }
              
              // Assign variant images using product's uploaded images
              console.log(`📸 Assigning variant images to product ${product.title}`);
              await this.assignVariantImages(product.id);
              await this.sleep(1000);
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
              
              // Upload images to the first split product
              console.log(`📸 Processing images for split products...`);
              
              // Get the first split product
              const firstProduct = createdProducts[0];
              const firstProductData = shopifyProducts[0];
              
              // Step 1: Upload all images to the first split product
              console.log(`📸 Step 1: Uploading all images to first split product: ${firstProduct.title}`);
              if (firstProductData.images && firstProductData.images.length > 0) {
                // Upload images in batches to avoid overwhelming the API
                const batchSize = 5;
                for (let i = 0; i < firstProductData.images.length; i += batchSize) {
                  const batch = firstProductData.images.slice(i, i + batchSize);
                  
                  console.log(`📤 Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(firstProductData.images.length / batchSize)} (${batch.length} images)`);
                  
                  for (const imageData of batch) {
                    await this.uploadImageWithShopifyFileSystem(firstProduct.id, imageData, firstProductData.title);
                    await this.sleep(500); // 500ms delay for split product image uploads
                  }
                  
                  // Wait between batches
                  if (i + batchSize < firstProductData.images.length) {
                    console.log(`⏳ Waiting 2 seconds between batches...`);
                    await this.sleep(2000); // 2 seconds between batches
                  }
                }
                
                // Add a delay to ensure images are processed before referencing
                console.log(`⏳ Waiting 3 seconds for images to be processed...`);
                await this.sleep(3000);
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
              
              // Step 2: Reference images to all other split products (reuse the same images)
              console.log(`📸 Step 2: Referencing images to other split products`);
              for (let j = 1; j < createdProducts.length; j++) {
                const product = createdProducts[j];
                const productData = shopifyProducts[j];
                
                console.log(`📸 Referencing images from first product to split product ${product.title}`);
                
                // Reference all images from the first product (reuse the same images)
                await this.referenceImagesToProduct(firstProduct.id, product.id);
                
                // Add delay to ensure images are referenced before variant assignment
                console.log(`⏳ Waiting 2 seconds for images to be referenced...`);
                await this.sleep(2000);
                
                // Get updated product with images for variant assignment
                const productResponse = await this.shopifyAPI.makeRequest('GET', `/products/${product.id}.json`);
                const updatedProduct = productResponse.product;
                
                // Assign variant images after all images are uploaded
                if (updatedProduct.images && updatedProduct.images.length > 0) {
                  console.log(`📸 Assigning variant images to split product ${product.title}`);
                  await this.assignVariantImages(product.id);
                  await this.sleep(1000);
                }
                
                // Add delay between split products
                if (j < createdProducts.length - 1) {
                  console.log(`⏳ Waiting 200ms between split products...`);
                  await this.sleep(200);
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
      
      // Note: The metaobject only has a 'grouping_name' field, not a 'product_grouping' field
      // Product references are handled through metafields on the products themselves
      // This function is kept for compatibility but doesn't need to update the metaobject
      console.log(`✅ Product Grouping metaobject ${metaobjectId} is ready for use`);
      console.log(`📋 Product references are stored in metafields on each product`);
      return true;
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
      // Get the product with all its images
      const productRes = await this.shopifyAPI.makeRequest('GET', `/products/${productId}.json`);
      const product = productRes.product;
      const images = product.images || [];
      if (images.length === 0) {
        console.log(`⚠️ No images found for product ${productId}`);
        return;
      }
      // Debug: Log all images and their alt text
      console.log(`🔍 Available images:`);
      images.forEach((img, index) => {
        console.log(`  ${index + 1}. Alt: "${img.alt || 'no alt'}" | ID: ${img.id} | Src: ${img.src}`);
      });
      // Get all variants
      const variants = product.variants || [];
      console.log(`🔍 Processing ${variants.length} variants`);
      let assignedCount = 0;
      // Use the color-to-image cache for this product
      const colorCache = this.productColorImageCache.get(productId) || {};
      for (const variant of variants) {
        const colorOption = variant.option1; // Assuming color is option1
        if (!colorOption) {
          console.log(`⚠️ Variant ${variant.id} has no color option`);
          continue;
        }
        const colorKey = colorOption.toLowerCase().trim();
        console.log(`🎨 Looking for image matching variant color: "${colorOption}" (key: '${colorKey}')`);
        // Use cache first
        let matchingImageId = colorCache[colorKey];
        if (!matchingImageId) {
          // Fallback: find matching image by alt text
          const matchingImage = images.find(img => (img.alt || '').toLowerCase().trim() === colorKey);
          if (matchingImage) {
            matchingImageId = matchingImage.id;
            // Update cache for future
            colorCache[colorKey] = matchingImageId;
            console.log(`🗂️ Updated cache with image ID ${matchingImageId} for color '${colorKey}'`);
          }
        }
        if (matchingImageId) {
          console.log(`✅ Found image ID ${matchingImageId} for variant ${variant.id} (${colorOption})`);
          // Check if variant already has the correct image assigned
          if (variant.image_id === matchingImageId) {
            console.log(`✅ Variant ${variant.id} already has correct image assigned`);
            assignedCount++;
            continue;
          }
          // Update variant with image_id
          try {
            await this.shopifyAPI.makeRequest('PUT', `/variants/${variant.id}.json`, {
              variant: {
                id: variant.id,
                image_id: matchingImageId
              }
            });
            console.log(`✅ Assigned image ${matchingImageId} to variant ${variant.id}`);
            assignedCount++;
            // Add delay between variant updates
            await this.delay(200);
          } catch (error) {
            console.error(`❌ Failed to assign image to variant ${variant.id}:`, error.message);
          }
        } else {
          console.log(`⚠️ No matching image found for variant ${variant.id} (${colorOption})`);
          console.log(`  Available alt texts: ${images.map(img => `"${img.alt || 'no alt'}"`).join(', ')}`);
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