const ShopifyAPI = require('./config/shopify');
const XMLParser = require('./utils/xml-parser');
require('dotenv').config();

class ProductImporter {
  constructor() {
    this.shopify = new ShopifyAPI();
    this.xmlParser = new XMLParser();
    this.importedProducts = new Map(); // Track imported products by code
  }

  async importProducts() {
    try {
      console.log('🚀 Starting Sky Pro product import...');
      
      // Fetch and parse the English XML feed
      const englishFeedUrl = process.env.ENGLISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products-en.xml';
      const xmlData = await this.xmlParser.fetchAndParseXML(englishFeedUrl);
      
      if (!xmlData.mainostekstiilitcom || !xmlData.mainostekstiilitcom.products) {
        throw new Error('Invalid XML structure: missing products data');
      }

      const products = xmlData.mainostekstiilitcom.products.product;
      const productArray = Array.isArray(products) ? products : [products];
      
      console.log(`📦 Found ${productArray.length} products in the feed`);
      
      // Limit products for testing if MAX_PRODUCTS is set
      const maxProducts = process.env.MAX_PRODUCTS ? parseInt(process.env.MAX_PRODUCTS) : productArray.length;
      const productsToImport = productArray.slice(0, maxProducts);
      
      console.log(`🔄 Importing ${productsToImport.length} products...`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const productXml of productsToImport) {
        try {
          await this.importProduct(productXml);
          successCount++;
          console.log(`✅ Imported: ${productXml.title} (${productXml.code})`);
        } catch (error) {
          errorCount++;
          console.error(`❌ Failed to import ${productXml.title} (${productXml.code}):`, error.message);
        }
        
        // Add a small delay to avoid rate limiting
        await this.delay(1000);
      }
      
      console.log('\n📊 Import Summary:');
      console.log(`✅ Successfully imported: ${successCount} products`);
      console.log(`❌ Failed imports: ${errorCount} products`);
      console.log(`📝 Total processed: ${productsToImport.length} products`);
      
    } catch (error) {
      console.error('💥 Import failed:', error.message);
      process.exit(1);
    }
  }

  async importProduct(productXml) {
    // Parse the product from XML
    const product = this.xmlParser.parseProduct(productXml);
    
    // Convert to Shopify format
    const shopifyProduct = this.xmlParser.convertToShopifyProduct(product, true);
    
    // Check if product already exists by handle
    const existingProduct = await this.findExistingProduct(shopifyProduct.handle);
    
    if (existingProduct) {
      console.log(`🔄 Updating existing product: ${shopifyProduct.title}`);
      await this.shopify.updateProduct(existingProduct.id, shopifyProduct);
      this.importedProducts.set(product.code, existingProduct.id);
    } else {
      console.log(`🆕 Creating new product: ${shopifyProduct.title}`);
      const result = await this.shopify.createProduct(shopifyProduct);
      this.importedProducts.set(product.code, result.product.id);
    }
  }

  async findExistingProduct(handle) {
    try {
      const response = await this.shopify.getProductByHandle(handle);
      return response.products && response.products.length > 0 ? response.products[0] : null;
    } catch (error) {
      // Product not found, which is expected for new products
      return null;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get imported product IDs for translation import
  getImportedProductIds() {
    return this.importedProducts;
  }
}

// Run the import if this file is executed directly
if (require.main === module) {
  const importer = new ProductImporter();
  importer.importProducts()
    .then(() => {
      console.log('🎉 Product import completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Product import failed:', error);
      process.exit(1);
    });
}

module.exports = ProductImporter; 