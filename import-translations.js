const ShopifyAPI = require('./config/shopify');
const XMLParser = require('./utils/xml-parser');
require('dotenv').config();

class TranslationImporter {
  constructor() {
    this.shopify = new ShopifyAPI();
    this.xmlParser = new XMLParser();
    this.finnishProducts = new Map(); // Store Finnish product data by code
  }

  async importTranslations() {
    try {
      console.log('🌍 Starting Sky Pro translation import...');
      
      // Fetch and parse the Finnish XML feed
      const finnishFeedUrl = process.env.FINNISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products.xml';
      const xmlData = await this.xmlParser.fetchAndParseXML(finnishFeedUrl);
      
      if (!xmlData.mainostekstiilitcom || !xmlData.mainostekstiilitcom.products) {
        throw new Error('Invalid XML structure: missing products data');
      }

      const products = xmlData.mainostekstiilitcom.products.product;
      const productArray = Array.isArray(products) ? products : [products];
      
      console.log(`📦 Found ${productArray.length} Finnish products in the feed`);
      
      // Store Finnish product data by code for easy lookup
      for (const productXml of productArray) {
        const product = this.xmlParser.parseProduct(productXml);
        this.finnishProducts.set(product.code, product);
      }
      
      // Get all products from Shopify to find matching ones
      console.log('🔍 Fetching existing Shopify products...');
      const shopifyProducts = await this.getAllShopifyProducts();
      
      console.log(`🔄 Found ${shopifyProducts.length} products in Shopify`);
      
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      
      for (const shopifyProduct of shopifyProducts) {
        try {
          const result = await this.importProductTranslation(shopifyProduct);
          if (result === 'success') {
            successCount++;
          } else if (result === 'skipped') {
            skippedCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Failed to import translation for ${shopifyProduct.title}:`, error.message);
        }
        
        // Add a small delay to avoid rate limiting
        await this.delay(1000);
      }
      
      console.log('\n📊 Translation Import Summary:');
      console.log(`✅ Successfully imported: ${successCount} translations`);
      console.log(`⏭️  Skipped (no Finnish data): ${skippedCount} products`);
      console.log(`❌ Failed imports: ${errorCount} products`);
      console.log(`📝 Total processed: ${shopifyProducts.length} products`);
      
    } catch (error) {
      console.error('💥 Translation import failed:', error.message);
      process.exit(1);
    }
  }

  async getAllShopifyProducts() {
    const products = [];
    let pageInfo = null;
    
    do {
      const endpoint = pageInfo 
        ? `/products.json?limit=250&page_info=${pageInfo}`
        : '/products.json?limit=250';
      
      const response = await this.shopify.makeRequest('GET', endpoint);
      products.push(...response.products);
      
      // Get next page info from Link header
      pageInfo = this.extractPageInfo(response.headers?.link);
    } while (pageInfo);
    
    return products;
  }

  extractPageInfo(linkHeader) {
    if (!linkHeader) return null;
    
    const match = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/);
    return match ? match[1] : null;
  }

  async importProductTranslation(shopifyProduct) {
    // Try to find the product code from metafields or handle
    const productCode = this.extractProductCode(shopifyProduct);
    
    if (!productCode) {
      console.log(`⚠️  No product code found for: ${shopifyProduct.title}`);
      return 'skipped';
    }
    
    // Find corresponding Finnish product data
    const finnishProduct = this.finnishProducts.get(productCode);
    
    if (!finnishProduct) {
      console.log(`⚠️  No Finnish data found for product code: ${productCode}`);
      return 'skipped';
    }
    
    console.log(`🌍 Importing Finnish translation for: ${shopifyProduct.title} (${productCode})`);
    
    // Prepare translation data
    const translationData = {
      title: finnishProduct.title,
      body_html: this.xmlParser.formatDescription(finnishProduct.description),
    };
    
    // Import translation
    await this.shopify.createTranslation({
      resource_type: 'product',
      resource_id: shopifyProduct.id,
      locale: 'fi',
      ...translationData
    });
    
    // Also translate variant options if they exist
    await this.translateVariantOptions(shopifyProduct, finnishProduct);
    
    return 'success';
  }

  extractProductCode(shopifyProduct) {
    // Try to get product code from metafields first
    if (shopifyProduct.metafields) {
      const productCodeMetafield = shopifyProduct.metafields.find(
        mf => mf.namespace === 'custom' && mf.key === 'product_code'
      );
      if (productCodeMetafield) {
        return productCodeMetafield.value;
      }
    }
    
    // Try to extract from SKUs in variants
    if (shopifyProduct.variants && shopifyProduct.variants.length > 0) {
      for (const variant of shopifyProduct.variants) {
        if (variant.sku) {
          // Extract the main product code from SKU (e.g., "10330" from "1033040140")
          const skuMatch = variant.sku.match(/^(\d{5})/);
          if (skuMatch) {
            return skuMatch[1];
          }
        }
      }
    }
    
    // Fallback: try to extract from handle or title
    // This is less reliable but might work for some products
    const handle = shopifyProduct.handle;
    const title = shopifyProduct.title;
    
    // Look for patterns that might indicate the product code
    const codePattern = /[A-Z]{1,4}\d{3,4}/;
    const handleMatch = handle.match(codePattern);
    const titleMatch = title.match(codePattern);
    
    return handleMatch ? handleMatch[0] : (titleMatch ? titleMatch[0] : null);
  }

  async translateVariantOptions(shopifyProduct, finnishProduct) {
    if (!shopifyProduct.variants || !finnishProduct.variants) return;
    
    // Create a map of Finnish color names
    const finnishColorMap = new Map();
    finnishProduct.variants.forEach(variant => {
      if (variant.color && variant.colorName) {
        finnishColorMap.set(variant.color, variant.colorName);
      }
    });
    
    // Translate variant options
    for (const variant of shopifyProduct.variants) {
      if (variant.option1 && finnishColorMap.has(variant.option1)) {
        // Translate color option
        const translationData = {
          option1: finnishColorMap.get(variant.option1),
        };
        
        try {
          await this.shopify.createTranslation({
            resource_type: 'variant',
            resource_id: variant.id,
            locale: 'fi',
            ...translationData
          });
        } catch (error) {
          console.log(`⚠️  Could not translate variant ${variant.id}: ${error.message}`);
        }
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the import if this file is executed directly
if (require.main === module) {
  const importer = new TranslationImporter();
  importer.importTranslations()
    .then(() => {
      console.log('🎉 Translation import completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Translation import failed:', error);
      process.exit(1);
    });
}

module.exports = TranslationImporter; 