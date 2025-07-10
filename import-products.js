const XMLParser = require('./utils/xml-parser');
const ShopifyAPI = require('./config/shopify');
const { createShopifyProduct, splitProductBySize } = require('./config/field-mapping');
require('dotenv').config();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run') || args.includes('-d'),
  limit: parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1]) || 10,
  fixVariantImages: args.includes('--fix-variant-images'),
  checkVariantImages: args.includes('--check-variant-images'),
  force: args.includes('--force') || args.includes('-f')
};

// Only the metafields we actually need
const FIELD_MAPPING = {
  "categories.category.0.name": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "product_category" },
  "categories.category.1.name": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "type" },
  "categories.category.2.name": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "subtype" }
};

// No fields are excluded since all definitions exist
const EXCLUDED_FIELDS = [];



// Helper function to get field value with fallback
function getField(obj, logicalKey) {
  const direct = obj[logicalKey];
  if (direct !== undefined) return direct;
  const keys = [logicalKey, logicalKey.toLowerCase(), logicalKey.toUpperCase()];
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key];
  }
  return undefined;
}

// Helper function to process field value
function processFieldValue(fieldValue, fieldType) {
  if (fieldValue === null || fieldValue === undefined) {
    switch (fieldType) {
      case "number_decimal":
      case "number_integer":
        return 0;
      case "boolean":
        return false;
      case "url":
        return null; // Skip URL fields that are null
      default:
        return "N/A";
    }
  }

  const stringValue = String(fieldValue).trim();
  
  switch (fieldType) {
    case "boolean":
      const boolStr = stringValue.toLowerCase();
      return boolStr === "true" || boolStr === "1" || boolStr === "yes";
    case "number_integer":
      const intValue = parseInt(stringValue, 10);
      return isNaN(intValue) ? 0 : intValue;
    case "number_decimal":
      const floatValue = parseFloat(stringValue);
      return isNaN(floatValue) ? 0 : floatValue;
    case "url":
      if (stringValue === "" || stringValue === "null" || stringValue === "undefined") {
        return null; // Skip empty URLs
      }
      return stringValue;
    case "multi_line_text_field":
      return stringValue === "" ? "N/A" : stringValue;
    case "single_line_text_field":
      const singleLineValue = stringValue.replace(/\n/g, " ").replace(/\r/g, " ").replace(/\t/g, " ");
      return singleLineValue === "" ? "N/A" : singleLineValue;
    default:
      return stringValue === "" ? "N/A" : stringValue;
  }
}

// Helper function to create metafield definitions
async function ensureMetafieldDefinitions(shopifyAPI, metafields, ownerType = "PRODUCT") {
  const definitions = new Map();
  const results = {
    created: 0,
    existing: 0,
    errors: []
  };

  // Group metafields by namespace and key to avoid duplicates
  metafields.forEach((mf) => {
    const key = `${mf.namespace}.${mf.key}`;
    if (!definitions.has(key)) {
      definitions.set(key, {
        namespace: mf.namespace,
        key: mf.key,
        type: mf.type,
        ownerType
      });
    }
  });

  // Create definitions for each unique metafield
  for (const def of definitions.values()) {
    try {
      // Check if definition already exists
      const existingRes = await shopifyAPI.makeGraphQLRequest(`
        query ($namespace: String!, $key: String!, $ownerType: MetafieldOwnerType!) {
          metafieldDefinitions(first: 50, namespace: $namespace, key: $key, ownerType: $ownerType) {
            edges {
              node {
                id
                namespace
                key
                type {
                  name
                }
              }
            }
          }
        }
      `, {
        namespace: def.namespace,
        key: def.key,
        ownerType: def.ownerType
      });

      const existingDef = existingRes.data?.metafieldDefinitions?.edges?.[0]?.node;
      
      if (existingDef) {
        const currentType = existingDef.type.name;
        if (currentType === def.type) {
          console.log(`✅ Metafield definition already exists with correct type: ${def.namespace}.${def.key} (${currentType})`);
          results.existing++;
          continue;
        } else {
          console.log(`🔧 Metafield definition exists but has wrong type: ${def.namespace}.${def.key} (${currentType} -> ${def.type})`);
          // Try to recreate with correct type
          try {
            await shopifyAPI.makeGraphQLRequest(`
              mutation ($id: ID!) {
                metafieldDefinitionDelete(id: $id) {
                  deletedDefinitionId
                  userErrors {
                    field
                    message
                  }
                }
              }
            `, { id: existingDef.id });
            console.log(`✅ Deleted old metafield definition: ${def.namespace}.${def.key}`);
          } catch (deleteError) {
            console.warn(`⚠️ Could not delete existing definition ${def.namespace}.${def.key}:`, deleteError.message);
            results.existing++;
            continue;
          }
        }
      }

      // Create new definition
      const createRes = await shopifyAPI.makeGraphQLRequest(`
        mutation ($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
              id
              namespace
              key
              type {
                name
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        definition: {
          namespace: def.namespace,
          key: def.key,
          type: def.type,
          ownerType: def.ownerType,
          name: def.key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
        }
      });

      const errors = createRes.data?.metafieldDefinitionCreate?.userErrors || [];
      if (errors.length > 0) {
        const alreadyExistsError = errors.find((err) => 
          err.message.includes("already exists") || 
          err.message.includes("taken") || 
          err.message.includes("in use")
        );
        if (alreadyExistsError) {
          console.log(`✅ Metafield definition already exists: ${def.namespace}.${def.key}`);
          results.existing++;
        } else {
          console.error(`❌ Error creating metafield definition ${def.namespace}.${def.key}:`, errors);
          results.errors.push(...errors.map((e) => `${def.namespace}.${def.key}: ${e.message}`));
        }
      } else {
        console.log(`✅ Created metafield definition: ${def.namespace}.${def.key}`);
        results.created++;
      }
    } catch (error) {
      console.error(`❌ Error creating metafield definition ${def.namespace}.${def.key}:`, error);
      results.errors.push(`${def.namespace}.${def.key}: ${error.message}`);
    }
  }

  return results;
}

// Helper function to ensure all required metafield definitions exist
async function ensureAllMetafieldDefinitions(shopifyAPI) {
  console.log("🔧 Creating all required metafield definitions...");
  
  const productMetafields = [];
  const variantMetafields = [];

  // Process all field mappings
  for (const [fieldKey, mapping] of Object.entries(FIELD_MAPPING)) {
    if (EXCLUDED_FIELDS.includes(fieldKey)) {
      continue;
    }

    const metafieldDef = {
      namespace: mapping.namespace,
      key: mapping.key,
      type: mapping.type
    };

    if (mapping.target === "product_metafield") {
      productMetafields.push(metafieldDef);
    } else {
      variantMetafields.push(metafieldDef);
    }
  }

  console.log(`📝 Will create ${productMetafields.length} product + ${variantMetafields.length} variant = ${productMetafields.length + variantMetafields.length} total metafield definitions`);

  // Create product metafield definitions
  const productResult = await ensureMetafieldDefinitions(shopifyAPI, productMetafields, "PRODUCT");
  
  // Create variant metafield definitions
  const variantResult = await ensureMetafieldDefinitions(shopifyAPI, variantMetafields, "PRODUCTVARIANT");

  const totalCreated = (productResult.created || 0) + (variantResult.created || 0);
  const totalExisting = (productResult.existing || 0) + (variantResult.existing || 0);
  const totalErrors = (productResult.errors || []).length + (variantResult.errors || []).length;

  console.log(`✅ Metafield definitions complete: ${totalCreated} created, ${totalExisting} existing, ${totalErrors} errors`);

  return {
    created: totalCreated,
    existing: totalExisting,
    errors: [...(productResult.errors || []), ...(variantResult.errors || [])]
  };
}

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
      'Headwear and accessories'
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
      
      // Ensure all metafield definitions exist (including grouping definitions)
      console.log('🔧 Ensuring all metafield definitions exist...');
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
              // Initialize createdProducts array for both single and split scenarios
              const createdProducts = [];
              
              console.log(`🔍 Processing ${shopifyProducts.length} products - checking if split products...`);
              
              // Only create grouping metaobject if there are multiple split products
              if (shopifyProducts.length > 1) {
                console.log(`✅ Found ${shopifyProducts.length} split products - creating grouping metaobject`);
                const splitProductName = shopifyProducts[0].title.split(' - ')[0]; // Get the base name without size
                
                // Create Product Grouping metaobject FIRST (before creating products)
                console.log(`🔗 Creating Product Grouping metaobject for: ${splitProductName}`);
                const groupingInfo = await this.createProductGroupingEntry(splitProductName, []);
                
                if (!groupingInfo) {
                  console.warn(`⚠️ Could not create Product Grouping metaobject for ${splitProductName}`);
                } else {
                  console.log(`✅ Created Product Grouping metaobject: ${groupingInfo.id}`);
                }
                
                // Process each split product with grouping information
                for (let j = 0; j < shopifyProducts.length; j++) {
                  const shopifyProduct = shopifyProducts[j];
                  const size = shopifyProduct.title.split(' - ').pop(); // Extract size from title
                  
                  // Store grouping information for later use (only for split products)
                  if (groupingInfo) {
                    shopifyProduct.splitSize = size;
                    shopifyProduct.productGroupingMetaobjectId = groupingInfo.id;
                    console.log(`🔗 Stored grouping data for product: splitSize=${size}, metaobjectId=${groupingInfo.id}`);
                  } else {
                    console.log(`⚠️ No grouping info available for split product: ${shopifyProduct.title}`);
                  }
                  
                  // Check if product already exists
                  const existingProduct = await this.findExistingProduct(shopifyProduct.handle);
                  
                  if (existingProduct && !options.force) {
                    console.log(`⏭️ Product already exists: ${existingProduct.title} (ID: ${existingProduct.id})`);
                    console.log(`⏭️ Skipping product creation and image upload`);
                    createdProducts.push(existingProduct);
                  } else {
                    if (existingProduct && options.force) {
                      console.log(`🔄 Force mode: Recreating product: ${shopifyProduct.title}`);
                      // Delete existing product first
                      try {
                        await this.shopifyAPI.makeRequest('DELETE', `/products/${existingProduct.id}.json`);
                        console.log(`🗑️ Deleted existing product: ${existingProduct.title}`);
                        await this.sleep(1000); // Wait for deletion to complete
                      } catch (error) {
                        console.warn(`⚠️ Could not delete existing product: ${error.message}`);
                      }
                    } else {
                      console.log(`✨ Creating new product: ${shopifyProduct.title}`);
                    }
                    
                    const newProduct = await this.createProduct(shopifyProduct);
                    createdProducts.push(newProduct);
                  }
                }
                
                // Add grouping metafields to split products after creation
                if (groupingInfo && createdProducts.length > 0) {
                  console.log(`🔗 Adding grouping metafields to ${createdProducts.length} split products...`);
                  
                  for (let j = 0; j < createdProducts.length; j++) {
                    const product = createdProducts[j];
                    const size = shopifyProducts[j].splitSize;
                    
                    if (size && product.id) {
                      console.log(`🔗 Adding grouping metafields to product ${product.title} (ID: ${product.id})`);
                      console.log(`🔗 Size: ${size}, Metaobject ID: ${groupingInfo.id}`);
                      
                      // Create grouping metafields
                      const groupingMetafields = this.createProductGroupingMetafields(groupingInfo.id, size);
                      
                      // Debug printout for dry run
                      if (options.dryRun) {
                        console.log('🔍 [DRY RUN] Would create grouping metafields:', JSON.stringify(groupingMetafields, null, 2), 'for product', product.title);
                      } else {
                        for (const metafield of groupingMetafields) {
                          try {
                            await this.shopifyAPI.makeRequest('POST', `/products/${product.id}/metafields.json`, {
                              metafield: metafield
                            });
                            console.log(`  ✅ Created grouping metafield: ${metafield.namespace}.${metafield.key} = ${metafield.value}`);
                            await this.sleep(250); // Rate limiting
                          } catch (error) {
                            console.warn(`  ⚠️ Could not create grouping metafield ${metafield.namespace}.${metafield.key}:`, error.message);
                          }
                        }
                      }
                    }
                  }
                  
                  // Update the Product Grouping metaobject with all product references
                  const productIds = createdProducts.map(product => product.id);
                  const updateSuccess = await this.updateProductGroupingWithProducts(groupingInfo.id, productIds, splitProductName);
                  
                  if (updateSuccess) {
                    console.log(`✅ Successfully updated Product Grouping metaobject with ${productIds.length} product references`);
                  } else {
                    console.warn(`⚠️ Could not update Product Grouping metaobject with product references`);
                  }
                }
              } else {
                // Single product - no grouping metaobject or metafields needed
                console.log(`ℹ️ Found ${shopifyProducts.length} single product - no grouping needed`);
                for (let j = 0; j < shopifyProducts.length; j++) {
                  const shopifyProduct = shopifyProducts[j];
                  // Check if product already exists
                  const existingProduct = await this.findExistingProduct(shopifyProduct.handle);
                  if (existingProduct && !options.force) {
                    console.log(`⏭️ Product already exists: ${existingProduct.title} (ID: ${existingProduct.id})`);
                    console.log(`⏭️ Skipping product creation and image upload`);
                    createdProducts.push(existingProduct);
                  } else {
                    if (existingProduct && options.force) {
                      console.log(`🔄 Force mode: Recreating product: ${shopifyProduct.title}`);
                      // Delete existing product first
                      try {
                        await this.shopifyAPI.makeRequest('DELETE', `/products/${existingProduct.id}.json`);
                        console.log(`🗑️ Deleted existing product: ${existingProduct.title}`);
                        await this.sleep(1000); // Wait for deletion to complete
                      } catch (error) {
                        console.warn(`⚠️ Could not delete existing product: ${error.message}`);
                      }
                    } else {
                      console.log(`✨ Creating new product: ${shopifyProduct.title}`);
                    }
                    const newProduct = await this.createProduct(shopifyProduct);
                    createdProducts.push(newProduct);
                  }
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
                  
                  // Check the results of variant image assignment
                  console.log(`🔍 Checking variant image assignment results for product ${product.title}...`);
                  await this.checkVariantImageAssignments(product.id);
                }
              }
            } else {
              // Split products - upload images to first product, then reference to others
              const originalTitle = xmlProduct.title;
              const splitProductName = shopifyProducts[0].title.split(' - ')[0]; // Get the base name without size
              
              // Use the grouping info that was created earlier during product creation
              let groupingInfo = null;
              try {
                // Try to find existing grouping metaobject
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
                  edge => edge.node.fields.find(field => field.key === "grouping_name" && field.value === splitProductName)
                );
                
                if (existingGrouping) {
                  groupingInfo = {
                    id: existingGrouping.node.id,
                    name: splitProductName
                  };
                  console.log(`✅ Found existing Product Grouping metaobject: ${groupingInfo.id}`);
                }
              } catch (error) {
                console.warn(`⚠️ Could not find existing grouping metaobject: ${error.message}`);
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
                
                // Check the results of variant image assignment
                console.log(`🔍 Checking variant image assignment results for existing first split product ${firstProduct.title}...`);
                await this.checkVariantImageAssignments(firstProduct.id);
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
                  
                  // Check the results of variant image assignment
                  console.log(`🔍 Checking variant image assignment results for first split product ${firstProduct.title}...`);
                  await this.checkVariantImageAssignments(firstProduct.id);
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
                  
                  // Check the results of variant image assignment
                  console.log(`🔍 Checking variant image assignment results for split product ${product.title}...`);
                  await this.checkVariantImageAssignments(product.id);
                } else {
                  console.warn(`⚠️ No cached images available for split product ${product.title}`);
                }
                
                // Add delay between split products
                if (j < createdProducts.length - 1) {
                  console.log(`⏳ Waiting 3 seconds between split products...`);
                  await this.sleep(3000);
                }
              }
              
              // Update the Product Grouping metaobject with all product references (metafields already created during product creation)
              if (groupingInfo) {
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
      
      if (products.length > 0) {
        const product = products[0];
        
        // Check if the product has basic data (not just metafield definitions)
        const hasBasicData = product.title && product.vendor && product.variants && product.variants.length > 0;
        
        if (!hasBasicData) {
          console.log(`⚠️ Found incomplete product with handle "${handle}" - missing basic data`);
          return null; // Treat as non-existent
        }
        
        return product;
      }
      
      return null;
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
          ownerType: 'PRODUCT'
        },
        {
          namespace: 'stanley_stella',
          key: 'product_grouping_option_1_value',
          name: 'Product Grouping Option 1 Value',
          type: 'single_line_text_field',
          ownerType: 'PRODUCT'
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

  async updateProductGroupingWithProducts(metaobjectId, productIds, groupingName) {
    try {
      console.log(`🔗 Updating Product Grouping metaobject ${metaobjectId} with ${productIds.length} product references`);
      
      // Update the metaobject with product references using GraphQL
      const productGids = productIds.map(id => `gid://shopify/Product/${id}`);
      
      const mutation = `
        mutation updateProductGrouping($id: ID!, $metaobject: MetaobjectUpdateInput!) {
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
      
      const variables = {
        id: metaobjectId,
        metaobject: {
          fields: [
            { key: "grouping_name", value: groupingName },
            { key: "products", value: productGids.join(',') },
            { key: "product_count", value: productIds.length.toString() }
          ]
        }
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

      // Create product metafields
      if (productData.metafields && productData.metafields.length > 0) {
        console.log(`🔧 Creating ${productData.metafields.length} product metafields for ${createdProduct.title}...`);
        await this.createProductMetafields(createdProduct.id, productData.metafields);
        await this.sleep(1000); // Rate limiting
      }

      // Create variant metafields
      if (productData.variants) {
        // Get the created product with variants to get their IDs
        const productWithVariantsResponse = await this.shopifyAPI.makeRequest('GET', `/products/${createdProduct.id}.json`);
        const productWithVariants = productWithVariantsResponse.product;
        
        for (let i = 0; i < productData.variants.length; i++) {
          const variantData = productData.variants[i];
          const createdVariant = productWithVariants.variants[i];
          
          if (variantData.metafields && variantData.metafields.length > 0 && createdVariant) {
            console.log(`🔧 Creating ${variantData.metafields.length} metafields for variant ${variantData.sku} (ID: ${createdVariant.id})...`);
            await this.createVariantMetafields(createdProduct.id, createdVariant.id, variantData.metafields);
            await this.sleep(1000); // Increased rate limiting delay
          }
        }
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
          
          // Check the results of variant image assignment
          console.log(`🔍 Checking variant image assignment results for product ${createdProduct.title}...`);
          await this.checkVariantImageAssignments(createdProduct.id);
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
          
          // Check the results of variant image assignment
          console.log(`🔍 Checking variant image assignment results for updated product ${updatedProduct.title}...`);
          await this.checkVariantImageAssignments(productId);
        }
      }

      return updatedProduct;
    } catch (error) {
      console.error('❌ Error updating product:', error.message);
      throw error;
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
          await this.shopifyAPI.makeRequest('POST', `/products/${productId}/metafields.json`, {
            metafield: {
              namespace: metafield.namespace,
              key: metafield.key,
              value: metafield.value,
              type: metafield.type
            }
          });
          console.log(`  ✅ Created metafield: ${metafield.namespace}.${metafield.key}`);
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
      let skippedCount = 0;
      let failedCount = 0;
      
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
          // Use fallback for variants without clear color
          colorOption = 'default';
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
        
        // If still no match found, use fallback
        if (!matchingImageId) {
          console.log(`⚠️ No matching image found for variant ${variant.id} (${colorOption})`);
          console.log(`  Available alt texts: ${productImages.map(img => `"${img.alt || 'no alt'}"`).join(', ')}`);
          
          // Fallback: assign the first available image if no color match found
          if (productImages.length > 0) {
            console.log(`🔄 Fallback: Assigning first available image to variant ${variant.id}`);
            matchingImageId = productImages[0].id;
            colorCache[colorKey] = matchingImageId;
            console.log(`🗂️ Using fallback image ID ${matchingImageId} for color '${colorKey}'`);
          } else {
            console.log(`❌ No images available for fallback, skipping variant ${variant.id}`);
            skippedCount++;
            continue;
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
                failedCount++;
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
                failedCount++;
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
                  failedCount++;
                }
              } else {
                failedCount++;
              }
            }
          }
          
          // Add longer delay between variant updates to avoid rate limiting
          await this.sleep(1500);
        } else {
          console.log(`❌ No matching image found and no fallback available for variant ${variant.id}`);
          failedCount++;
        }
      }
      
      // Update the cache for this product
      this.productColorImageCache.set(productId, colorCache);
      
      console.log(`📊 Variant image assignment summary for product ${productId}:`);
      console.log(`  ✅ Successfully assigned: ${assignedCount} variants`);
      console.log(`  ⏭️ Skipped (already assigned): ${skippedCount} variants`);
      console.log(`  ❌ Failed to assign: ${failedCount} variants`);
      console.log(`  📊 Total processed: ${variants.length} variants`);
      
      if (failedCount > 0) {
        console.log(`⚠️ Warning: ${failedCount} variants failed to get image assignments`);
      }
      
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

  async checkVariantImageAssignments(productId) {
    try {
      console.log(`🔍 Checking variant image assignments for product ${productId}...`);
      
      const productGid = `gid://shopify/Product/${productId}`;
      const productQuery = `
        query getProductWithVariants($id: ID!) {
          product(id: $id) {
            id
            title
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
      const variants = product.variants.edges.map(edge => edge.node);
      
      console.log(`📊 Variant image assignment status for "${product.title}":`);
      console.log(`  📦 Total variants: ${variants.length}`);
      
      let assignedCount = 0;
      let unassignedCount = 0;
      
      variants.forEach((variant, index) => {
        const hasImage = variant.image && variant.image.id;
        const status = hasImage ? '✅' : '❌';
        const imageInfo = hasImage ? `(ID: ${variant.image.id})` : '(no image)';
        
        console.log(`  ${index + 1}. ${status} "${variant.title}" ${imageInfo}`);
        
        if (hasImage) {
          assignedCount++;
        } else {
          unassignedCount++;
        }
      });
      
      console.log(`\n📊 Summary:`);
      console.log(`  ✅ Variants with images: ${assignedCount}`);
      console.log(`  ❌ Variants without images: ${unassignedCount}`);
      console.log(`  📊 Assignment rate: ${((assignedCount / variants.length) * 100).toFixed(1)}%`);
      
      if (unassignedCount > 0) {
        console.log(`\n⚠️ The following variants need image assignments:`);
        variants.forEach((variant, index) => {
          if (!variant.image || !variant.image.id) {
            console.log(`  - "${variant.title}"`);
          }
        });
      }
      
    } catch (error) {
      console.error(`❌ Error checking variant image assignments for product ${productId}:`, error.message);
    }
  }

  async fixVariantImageAssignments() {
    try {
      console.log('🔧 Fixing variant image assignments for existing products...');
      
      // Get all products
      const response = await this.shopifyAPI.makeRequest('GET', '/products.json?limit=50');
      const products = response.products || [];
      
      console.log(`📦 Found ${products.length} products to check`);
      
      let totalFixed = 0;
      let totalProducts = 0;
      
      for (const product of products) {
        console.log(`\n🔍 Checking product: "${product.title}" (ID: ${product.id})`);
        
        const variants = product.variants || [];
        let unassignedVariants = [];
        
        // Check which variants need image assignments
        variants.forEach(variant => {
          if (!variant.image_id || variant.image_id === 0) {
            unassignedVariants.push(variant);
          }
        });
        
        if (unassignedVariants.length === 0) {
          console.log(`  ✅ All variants already have images assigned`);
          continue;
        }
        
        console.log(`  ⚠️ Found ${unassignedVariants.length} variants without images`);
        
        // Check if product has images
        const productImagesResponse = await this.shopifyAPI.makeRequest('GET', `/products/${product.id}/images.json`);
        const productImages = productImagesResponse.images || [];
        
        if (productImages.length === 0) {
          console.log(`  ❌ Product has no images, skipping`);
          continue;
        }
        
        console.log(`  📸 Product has ${productImages.length} images available`);
        
        // Try to assign images to unassigned variants
        let fixedCount = 0;
        
        for (const variant of unassignedVariants) {
          console.log(`  🎨 Processing variant: "${variant.title}"`);
          
          // Extract color from variant title
          const variantTitle = variant.title || '';
          let colorOption = '';
          
          if (variantTitle.includes(' - ')) {
            colorOption = variantTitle.split(' - ')[0];
          } else if (variantTitle.includes('/')) {
            colorOption = variantTitle.split('/')[0];
          } else if (variantTitle.includes(' ')) {
            const words = variantTitle.split(' ');
            colorOption = words[0];
          } else {
            colorOption = variantTitle;
          }
          
          if (!colorOption || colorOption.trim() === '') {
            colorOption = 'default';
          }
          
          const colorKey = colorOption.toLowerCase().trim();
          console.log(`    🎨 Looking for image matching color: "${colorKey}"`);
          
          // Find matching image
          let matchingImageId = null;
          
          // Try exact match first
          const exactMatch = productImages.find(img => (img.alt || '').toLowerCase().trim() === colorKey);
          if (exactMatch) {
            matchingImageId = exactMatch.id;
            console.log(`    ✅ Found exact match: image ID ${matchingImageId}`);
          } else {
            // Try partial match
            const partialMatch = productImages.find(img => 
              (img.alt || '').toLowerCase().includes(colorKey) || 
              colorKey.includes((img.alt || '').toLowerCase())
            );
            if (partialMatch) {
              matchingImageId = partialMatch.id;
              console.log(`    ✅ Found partial match: image ID ${matchingImageId}`);
            } else {
              // Use first available image as fallback
              matchingImageId = productImages[0].id;
              console.log(`    🗂️ Using fallback image: image ID ${matchingImageId}`);
            }
          }
          
          // Assign image to variant
          if (matchingImageId) {
            try {
              await this.shopifyAPI.makeRequest('PUT', `/variants/${variant.id}.json`, {
                variant: {
                  id: variant.id,
                  image_id: matchingImageId
                }
              });
              
              console.log(`    ✅ Successfully assigned image ${matchingImageId} to variant "${variant.title}"`);
              fixedCount++;
              
              // Add delay between assignments
              await this.sleep(1000);
              
            } catch (error) {
              console.error(`    ❌ Failed to assign image to variant "${variant.title}":`, error.message);
            }
          }
        }
        
        if (fixedCount > 0) {
          console.log(`  ✅ Fixed ${fixedCount}/${unassignedVariants.length} variants for product "${product.title}"`);
          totalFixed += fixedCount;
        }
        
        totalProducts++;
        
        // Add delay between products
        await this.sleep(2000);
      }
      
      console.log(`\n📊 FIX SUMMARY:`);
      console.log(`  📦 Total products processed: ${totalProducts}`);
      console.log(`  ✅ Total variants fixed: ${totalFixed}`);
      
      if (totalFixed > 0) {
        console.log(`\n✅ Successfully fixed ${totalFixed} variant image assignments!`);
      } else {
        console.log(`\n✅ No variant image assignments needed fixing.`);
      }
      
    } catch (error) {
      console.error('❌ Error fixing variant image assignments:', error.message);
    }
  }

  // Create product metafields
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
        console.log(`  ✅ Created product metafield: ${metafield.namespace}.${metafield.key}`);
        await this.sleep(1000); // Increased rate limiting delay
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
            console.log(`  ✅ Created product metafield (retry): ${metafield.namespace}.${metafield.key}`);
          } catch (retryError) {
            console.warn(`  ⚠️ Could not create product metafield ${metafield.namespace}.${metafield.key}:`, retryError.message);
          }
        } else {
          console.warn(`  ⚠️ Could not create product metafield ${metafield.namespace}.${metafield.key}:`, error.message);
        }
      }
    }
  }

  // Create variant metafields
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
        await this.sleep(1000); // Increased rate limiting delay
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
}

module.exports = ProductImporter; 

// Run the import if this file is executed directly
if (require.main === module) {
  const importer = new ProductImporter();
  
  if (options.checkVariantImages) {
    // Check variant image assignments
    const { checkVariantImages } = require('./check-variant-images.js');
    checkVariantImages()
      .then(() => {
        console.log('✅ Check completed successfully!');
      })
      .catch((error) => {
        console.error('❌ Check failed:', error.message);
        process.exit(1);
      });
  } else if (options.fixVariantImages) {
    // Fix variant image assignments
    importer.fixVariantImageAssignments()
      .then(() => {
        console.log('✅ Fix completed successfully!');
      })
      .catch((error) => {
        console.error('❌ Fix failed:', error.message);
        process.exit(1);
      });
  } else {
    // Normal import process
    importer.importProducts(options)
      .then(() => {
        console.log('✅ Import completed successfully!');
      })
      .catch((error) => {
        console.error('❌ Import failed:', error.message);
        process.exit(1);
      });
  }
}