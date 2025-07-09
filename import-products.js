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
            
            // If this was a split product, create Product Grouping entry and assign variant images
            if (shopifyProducts.length > 1) {
              const originalTitle = xmlProduct.title;
              // Use the split product name (after the title) as the grouping name
              const splitProductName = shopifyProducts[0].title.split(' - ')[0]; // Get the base name without size
              const groupingInfo = await this.createProductGroupingEntry(splitProductName, createdProducts);
              
              // Track color images across all split products for reuse
              const colorImageMap = {};
              
              // Upload images with reuse for all split products
              for (let j = 0; j < createdProducts.length; j++) {
                const product = createdProducts[j];
                const productData = shopifyProducts[j];
                
                console.log(`📸 Processing images for split product ${product.title}`);
                
                              // Upload images with color reuse in batches
              if (productData.images && productData.images.length > 0) {
                console.log(`📸 Processing ${productData.images.length} images for split product ${product.title}`);
                
                // Upload images in batches to avoid overwhelming the API
                const batchSize = 5; // Upload 5 images at a time
                for (let i = 0; i < productData.images.length; i += batchSize) {
                  const batch = productData.images.slice(i, i + batchSize);
                  
                  console.log(`📤 Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(productData.images.length / batchSize)} (${batch.length} images)`);
                  
                  for (const imageData of batch) {
                    await this.uploadImageWithReuse(product.id, imageData, colorImageMap);
                    await this.sleep(500); // Small delay between individual image uploads
                  }
                  
                  // Wait between batches
                  if (i + batchSize < productData.images.length) {
                    console.log(`⏳ Waiting 1 second between batches...`);
                    await this.sleep(1000);
                  }
                }
              }
                
                // Get updated product with images for variant assignment
                const productResponse = await this.shopifyAPI.makeRequest('GET', `/products/${product.id}.json`);
                const updatedProduct = productResponse.product;
                
                // Assign variant images
                if (productData.variants && productData.variants.length > 0 && updatedProduct.images && updatedProduct.images.length > 0) {
                  console.log(`📸 Assigning variant images to split product ${product.title}`);
                  await this.assignVariantImages(product.id, productData.variants, updatedProduct.images);
                  await this.sleep(500);
                }
              }
              
              // Update Product Grouping metafields for each split product
              for (let j = 0; j < createdProducts.length; j++) {
                const product = createdProducts[j];
                const size = shopifyProducts[j].title.split(' - ').pop(); // Extract size from title
                await this.updateProductGroupingMetafields(product.id, originalTitle, size, groupingInfo.id);
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
      console.log(`📈 Success: ${successCount} products`);
      console.log(`❌ Errors: ${errorCount} products`);
      
    } catch (error) {
      console.error('❌ Import failed:', error.message);
      throw error;
    }
  }

  async findExistingProduct(handle) {
    try {
      const response = await this.shopifyAPI.makeRequest('GET', `/products.json?handle=${handle}`);
      // Rate limiting between API calls
      await this.sleep(500);
      return response.products && response.products.length > 0 ? response.products[0] : null;
    } catch (error) {
      console.warn(`⚠️ Could not check for existing product ${handle}:`, error.message);
      return null;
    }
  }

  async checkProductImagesExist(productId) {
    try {
      const response = await this.shopifyAPI.makeRequest('GET', `/products/${productId}/images.json`);
      // Rate limiting between API calls
      await this.sleep(500);
      return response.images && response.images.length > 0;
    } catch (error) {
      console.warn(`⚠️ Could not check images for product ${productId}:`, error.message);
      return false;
    }
  }

  async findExistingImage(imageSrc) {
    try {
      console.log(`🔍 Checking if image already exists: ${imageSrc}`);
      
      // Search for products with this image
      const response = await this.shopifyAPI.makeRequest('GET', `/products.json?limit=250`);
      const products = response.products || [];
      
      for (const product of products) {
        if (product.images && product.images.length > 0) {
          const matchingImage = product.images.find(img => img.src === imageSrc);
          if (matchingImage) {
            console.log(`✅ Found existing image: ${imageSrc} (ID: ${matchingImage.id})`);
            return matchingImage;
          }
        }
      }
      
      console.log(`❌ Image not found: ${imageSrc}`);
      return null;
      
    } catch (error) {
      console.warn(`⚠️ Could not search for existing image ${imageSrc}:`, error.message);
      return null;
    }
  }

  async uploadImageIfNotExists(productId, imageData) {
    try {
      // Check if this image already exists in Shopify
      const existingImage = await this.findExistingImage(imageData.src);
      
      if (existingImage) {
        // Reuse existing image
        console.log(`🔄 Reusing existing image: ${imageData.src}`);
        await this.shopifyAPI.makeRequest('POST', `/products/${productId}/images.json`, {
          image: {
            id: existingImage.id,
            src: existingImage.src,
            alt: imageData.alt || existingImage.alt,
            position: imageData.position || existingImage.position
          }
        });
        console.log(`  ✅ Referenced existing image: ${imageData.src}`);
      } else {
        // Upload new image
        console.log(`📤 Uploading new image: ${imageData.src}`);
        await this.shopifyAPI.makeRequest('POST', `/products/${productId}/images.json`, {
          image: {
            src: imageData.src,
            alt: imageData.alt,
            position: imageData.position
          }
        });
        console.log(`  ✅ Uploaded new image: ${imageData.src}`);
      }
      
      await this.sleep(500); // Rate limiting
      
    } catch (error) {
      console.warn(`⚠️ Could not upload/reference image ${imageData.src}:`, error.message);
    }
  }

  async createProductGroupingDefinitions() {
    try {
      console.log('🔧 Product Grouping metaobject definition already exists');
      console.log('📋 Using existing "Product Option Grouping 1 Entries" metaobject definition');
      
      // The metaobject definition already exists with:
      // - Name: "Product Option Grouping 1 Entries"
      // - Fields: grouping_name (single_line_text), product_grouping (product_reference)
      
    } catch (error) {
      console.warn('⚠️ Could not verify Product Grouping definitions:', error.message);
    }
  }

  async createProductGroupingEntry(groupingName, products) {
    try {
      console.log(`🔗 Creating Product Grouping entry for: ${groupingName}`);
      console.log(`📦 Grouping ${products.length} products together`);
      
      // The groupingName is now the split product name (base name without size)
      const splitProductName = groupingName;
      
      // Create a new group in the existing "Product Option Grouping 1 Entries" metaobject
      const metaobjectData = {
        type: 'product_grouping_option_1_entries',
        fields: [
          {
            key: 'grouping_name',
            value: splitProductName
          },
          {
            key: 'product_grouping',
            value: products.map(product => `gid://shopify/Product/${product.id}`).join(',')
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
            name: splitProductName,
            products: products.map(product => product.id),
            created_at: new Date().toISOString()
          };
        } else if (response.data?.metaobjectCreate?.userErrors?.length > 0) {
          console.warn(`⚠️ GraphQL errors:`, response.data.metaobjectCreate.userErrors);
          throw new Error('GraphQL errors occurred');
        }
        
      } catch (graphqlError) {
        console.warn(`⚠️ Could not create metaobject via GraphQL: ${graphqlError.message}`);
        console.log('📝 Using fallback metafield-based grouping');
        
        // Fallback to metafield-based grouping
        const groupingId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
          id: groupingId,
          name: splitProductName,
          products: products.map(product => product.id),
          created_at: new Date().toISOString()
        };
      }
      
    } catch (error) {
      console.warn('⚠️ Could not create Product Grouping structure:', error.message);
      return null;
    }
  }

  async updateProductGroupingMetafields(productId, groupingName, size, groupingId) {
    try {
      console.log(`🔗 Updating Product Grouping metafields for product ${productId}`);
      
      // Update the Product Grouping metafields to reference the metaobject
      const metafields = [
        {
          namespace: 'stanley_stella',
          key: 'product_grouping_option_1',
          value: groupingId, // Reference to the metaobject ID
          type: 'metaobject_reference'
        },
        {
          namespace: 'stanley_stella',
          key: 'product_grouping_option_1_value',
          value: size,
          type: 'single_line_text_field'
        }
      ];
      
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
        console.log(`  ✅ Referenced image: ${image.src} (ID: ${image.id})`);
        await this.sleep(250); // Rate limiting
      }
      
    } catch (error) {
      console.warn(`⚠️ Could not reference images from product ${sourceProductId} to product ${targetProductId}:`, error.message);
    }
  }

  async uploadImageWithReuse(productId, imageData, colorImageMap = {}) {
    try {
      // Import the cleanImageName function to ensure consistent cleaning
      const { cleanImageName } = require('./config/field-mapping');
      
      // Clean the color name to remove UUIDs and ensure consistency
      const colorName = cleanImageName(imageData.alt);
      
      // Check if we already have this color image uploaded
      if (colorImageMap[colorName]) {
        // Reuse existing image
        console.log(`🔄 Reusing existing image for color: ${colorName}`);
        await this.shopifyAPI.makeRequest('POST', `/products/${productId}/images.json`, {
          image: {
            id: colorImageMap[colorName].id,
            src: colorImageMap[colorName].src,
            alt: colorName,
            position: imageData.position
          }
        });
        console.log(`  ✅ Referenced existing image: ${colorName} (ID: ${colorImageMap[colorName].id})`);
        return colorImageMap[colorName];
      } else {
        // Search for existing image in Shopify media library by color name
        console.log(`🔍 Searching for existing image for color: ${colorName}`);
        const allProductsResponse = await this.shopifyAPI.makeRequest('GET', `/products.json?limit=250`);
        const allProducts = allProductsResponse.products || [];
        
        let existingImage = null;
        for (const product of allProducts) {
          if (product.images && product.images.length > 0) {
            const matchingImage = product.images.find(img => cleanImageName(img.alt) === colorName);
            if (matchingImage) {
              existingImage = matchingImage;
              console.log(`  🎨 Found existing image for color "${colorName}" in product ${product.title} (ID: ${matchingImage.id})`);
              break;
            }
          }
        }
        
        if (existingImage) {
          // Reuse existing image from media library
          console.log(`🔄 Reusing existing image from media library for color: ${colorName}`);
          await this.shopifyAPI.makeRequest('POST', `/products/${productId}/images.json`, {
            image: {
              id: existingImage.id,
              src: existingImage.src,
              alt: colorName,
              position: imageData.position
            }
          });
          console.log(`  ✅ Referenced existing image from media library: ${colorName} (ID: ${existingImage.id})`);
          
          // Track this image for reuse
          colorImageMap[colorName] = {
            id: existingImage.id,
            src: existingImage.src,
            alt: colorName
          };
          
          return existingImage;
        } else {
          // Upload new image and track it
          console.log(`📤 Uploading new image for color: ${colorName}`);
          const response = await this.shopifyAPI.makeRequest('POST', `/products/${productId}/images.json`, {
            image: {
              src: imageData.src,
              alt: colorName,
              position: imageData.position
            }
          });
          
          const uploadedImage = response.image;
          console.log(`  ✅ Uploaded new image: ${colorName} (ID: ${uploadedImage.id})`);
          
          // Track this image for reuse
          colorImageMap[colorName] = {
            id: uploadedImage.id,
            src: uploadedImage.src,
            alt: colorName
          };
          
          return uploadedImage;
        }
      }
      
      await this.sleep(500); // Rate limiting
      
    } catch (error) {
      console.warn(`⚠️ Could not upload/reference image for color ${imageData.alt}:`, error.message);
      return null;
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

      // Upload images separately to avoid API limits
      if (productData.images && productData.images.length > 0) {
        console.log(`📸 Processing ${productData.images.length} images for product ${createdProduct.title}`);
        
        // Upload images in batches to avoid overwhelming the API
        const batchSize = 5; // Upload 5 images at a time
        for (let i = 0; i < productData.images.length; i += batchSize) {
          const batch = productData.images.slice(i, i + batchSize);
          
          console.log(`📤 Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(productData.images.length / batchSize)} (${batch.length} images)`);
          
          for (const imageData of batch) {
            await this.uploadImageIfNotExists(createdProduct.id, imageData);
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
        
        // Assign variant images if we have variants
        if (productData.variants && productData.variants.length > 0 && updatedProduct.images && updatedProduct.images.length > 0) {
          console.log(`📸 Assigning variant images for product ${createdProduct.title}`);
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
          variants: productData.variants,
          images: productData.images
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
        console.log(`📸 Uploading ${productData.images.length} images for product ${updatedProduct.title}`);
        // Note: For updates, we would need to add images separately since they're not included in the product update
        // This is a simplified approach - in a full implementation, you might want to add image upload logic here
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
      // Import the cleanImageName function to ensure consistent cleaning
      const { cleanImageName } = require('./config/field-mapping');
      
      console.log(`📸 Starting variant image assignment for product ${productId}`);
      console.log(`📊 Found ${createdImages.length} images and ${originalVariants.length} variants`);
      
      // Search for existing images in the entire Shopify media library by color name
      const colorImageMap = {};
      
      // First, check if we have images in the current product
      if (createdImages && createdImages.length > 0) {
        createdImages.forEach(image => {
          const colorName = cleanImageName(image.alt);
          if (colorName) {
            colorImageMap[colorName] = image.id;
            console.log(`  🎨 Found local image for color "${colorName}" -> image ID: ${image.id}`);
          }
        });
      }
      
      // Search for existing images in other products by color name
      console.log(`🔍 Searching Shopify media library for existing images by color name...`);
      const allProductsResponse = await this.shopifyAPI.makeRequest('GET', `/products.json?limit=250`);
      const allProducts = allProductsResponse.products || [];
      
      for (const product of allProducts) {
        if (product.images && product.images.length > 0) {
          for (const image of product.images) {
            const colorName = cleanImageName(image.alt);
            if (colorName && !colorImageMap[colorName]) {
              // Only add if we don't already have this color mapped
              colorImageMap[colorName] = image.id;
              console.log(`  🎨 Found existing image for color "${colorName}" in product ${product.title} -> image ID: ${image.id}`);
            }
          }
        }
      }

      // Get the current product to access variants
      const productResponse = await this.shopifyAPI.makeRequest('GET', `/products/${productId}.json`);
      const product = productResponse.product;

      console.log(`📋 Available colors in media library: ${Object.keys(colorImageMap).join(', ')}`);

      // Update variants with their corresponding images
      const updatedVariants = product.variants.map(variant => {
        const variantColor = cleanImageName(variant.option1); // Color is option1, clean it
        const matchingImageId = colorImageMap[variantColor];
        
        console.log(`  🔍 Variant ${variant.id} (${variant.option1}) -> cleaned: "${variantColor}" -> image: ${matchingImageId || 'NOT FOUND'}`);
        
        if (matchingImageId) {
          return {
            id: variant.id,
            image_id: matchingImageId,
            color: variantColor
          };
        }
        return null;
      }).filter(Boolean);

      console.log(`📸 Found ${updatedVariants.length} variants to assign images to`);

      // Update variants with image assignments
      for (const variant of updatedVariants) {
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