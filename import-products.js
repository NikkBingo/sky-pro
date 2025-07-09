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
            for (let j = 0; j < shopifyProducts.length; j++) {
              const shopifyProduct = shopifyProducts[j];
              
              // Check if product already exists
              const existingProduct = await this.findExistingProduct(shopifyProduct.handle);
              
              if (existingProduct) {
                console.log(`🔄 Updating existing product: ${existingProduct.title}`);
                await this.updateProduct(existingProduct.id, shopifyProduct);
              } else {
                console.log(`✨ Creating new product: ${shopifyProduct.title}`);
                await this.createProduct(shopifyProduct);
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
          await this.sleep(3000); // 3 second pause to prevent rate limiting
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

  async createProduct(productData) {
    try {
      // Create the product first
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
          variants: productData.variants,
          images: productData.images
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

      // Assign images to variants based on color
      await this.assignVariantImages(createdProduct.id, productData.variants, createdProduct.images);
      // Rate limiting between API calls
      await this.sleep(500);

      // Skip variant metafields to avoid repetition - they're not essential for the import
      // if (productData.variants && productData.variants.length > 0) {
      //   for (let i = 0; i < productData.variants.length; i++) {
      //     const variant = productData.variants[i];
      //     const createdVariant = createdProduct.variants[i];
      //     
      //     if (variant.metafields && variant.metafields.length > 0) {
      //       await this.createVariantMetafields(createdProduct.id, createdVariant.id, variant.metafields);
      //     }
      //   }
      // }

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
      // Create a map of color names to image IDs
      const colorImageMap = {};
      createdImages.forEach(image => {
        const colorName = image.alt;
        if (colorName) {
          colorImageMap[colorName] = image.id;
        }
      });

      // Get the current product to access variants
      const productResponse = await this.shopifyAPI.makeRequest('GET', `/products/${productId}.json`);
      const product = productResponse.product;

      // Update variants with their corresponding images
      const updatedVariants = product.variants.map(variant => {
        const variantColor = variant.option1; // Color is option1
        const matchingImageId = colorImageMap[variantColor];
        
        if (matchingImageId) {
          return {
            id: variant.id,
            image_id: matchingImageId
          };
        }
        return null;
      }).filter(Boolean);

      // Update variants with image assignments
      for (const variant of updatedVariants) {
        try {
          await this.shopifyAPI.makeRequest('PUT', `/products/${productId}/variants/${variant.id}.json`, {
            variant: {
              id: variant.id,
              image_id: variant.image_id
            }
          });
          console.log(`  ✅ Assigned image to variant: ${variant.id}`);
          
          // Rate limiting: wait 500ms between variant updates
          await this.sleep(500);
        } catch (error) {
          console.warn(`  ⚠️ Could not assign image to variant ${variant.id}:`, error.message);
        }
      }
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