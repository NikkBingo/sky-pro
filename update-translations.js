const ShopifyAPI = require('./config/shopify');
const XMLParser = require('./utils/xml-parser');
require('dotenv').config();

class TranslationUpdater {
  constructor() {
    this.shopify = new ShopifyAPI();
    this.xmlParser = new XMLParser();
    this.finnishProducts = new Map(); // Store Finnish product data by code
  }

  async updateTranslations(options = {}) {
    const {
      dryRun = false,
      limit = null,
      categories = null,
      forceUpdate = false
    } = options;

    try {
      console.log('🌍 Starting Sky Pro translation update...');
      if (dryRun) console.log('🧪 DRY RUN MODE - No changes will be made');
      
      // Fetch and parse the Finnish XML feed
      const finnishFeedUrl = process.env.FINNISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products.xml';
      console.log(`📡 Fetching Finnish data from: ${finnishFeedUrl}`);
      
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
      
      // Filter products by categories if specified
      let filteredProducts = shopifyProducts;
      if (categories && categories.length > 0) {
        filteredProducts = shopifyProducts.filter(product => {
          const productTags = product.tags ? product.tags.split(',').map(tag => tag.trim()) : [];
          return categories.some(category => 
            productTags.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
          );
        });
        console.log(`📋 Filtered to ${filteredProducts.length} products in categories: ${categories.join(', ')}`);
      }
      
      // Apply limit if specified
      if (limit) {
        filteredProducts = filteredProducts.slice(0, limit);
        console.log(`📏 Limited to ${filteredProducts.length} products`);
      }
      
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      let updatedCount = 0;
      
      for (const shopifyProduct of filteredProducts) {
        try {
          const result = await this.updateProductTranslation(shopifyProduct, { dryRun, forceUpdate });
          if (result === 'success') {
            successCount++;
          } else if (result === 'updated') {
            updatedCount++;
          } else if (result === 'skipped') {
            skippedCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Failed to update translation for ${shopifyProduct.title}:`, error.message);
        }
        
        // Add a small delay to avoid rate limiting
        await this.delay(1000);
      }
      
      console.log('\n📊 Translation Update Summary:');
      console.log(`✅ Successfully processed: ${successCount} translations`);
      console.log(`🔄 Updated existing: ${updatedCount} translations`);
      console.log(`⏭️  Skipped (no Finnish data): ${skippedCount} products`);
      console.log(`❌ Failed updates: ${errorCount} products`);
      console.log(`📝 Total processed: ${filteredProducts.length} products`);
      
    } catch (error) {
      console.error('💥 Translation update failed:', error.message);
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

  async updateProductTranslation(shopifyProduct, options = {}) {
    const { dryRun = false, forceUpdate = false } = options;
    
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
    
    console.log(`🌍 Processing Finnish translation for: ${shopifyProduct.title} (${productCode})`);
    
    // Check if translation already exists
    let hasFinnishTranslation = false;
    try {
      const existingTranslations = await this.shopify.getTranslations('products', shopifyProduct.id);
      hasFinnishTranslation = existingTranslations.translations?.some(t => t.locale === 'fi');
      
      if (hasFinnishTranslation && !forceUpdate) {
        console.log(`ℹ️  Finnish translation already exists for: ${shopifyProduct.title}`);
        return 'skipped';
      }
    } catch (error) {
      if (error.message.includes('Translate & Adapt app')) {
        console.log(`⚠️  Shopify Translate & Adapt app not installed. Will attempt to create translations anyway.`);
      } else {
        console.log(`⚠️  Could not check existing translations: ${error.message}`);
      }
    }
    
    // Prepare translation data
    const translationData = {
      resource_type: 'product',
      resource_id: shopifyProduct.id,
      locale: 'fi',
      title: finnishProduct.title,
      body_html: this.xmlParser.formatDescription(finnishProduct.description),
    };
    
    if (dryRun) {
      console.log(`🧪 [DRY RUN] Would update translation for: ${shopifyProduct.title}`);
      console.log(`   Title: ${finnishProduct.title}`);
      console.log(`   Description: ${finnishProduct.description?.substring(0, 100)}...`);
      return 'success';
    }
    
    // Create or update translation
    try {
      if (hasFinnishTranslation) {
        // Find existing translation ID
        const existingTranslation = existingTranslations.translations.find(t => t.locale === 'fi');
        await this.shopify.updateTranslation(existingTranslation.id, translationData);
        console.log(`🔄 Updated existing Finnish translation for: ${shopifyProduct.title}`);
        return 'updated';
      } else {
        await this.shopify.createTranslation(translationData);
        console.log(`✅ Created Finnish translation for: ${shopifyProduct.title}`);
        return 'success';
      }
    } catch (error) {
      if (error.message.includes('Translate & Adapt app')) {
        console.log(`⚠️  Shopify Translate & Adapt app not installed. Skipping: ${shopifyProduct.title}`);
        return 'skipped';
      }
      throw error;
    }
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
    const handle = shopifyProduct.handle;
    const title = shopifyProduct.title;
    
    // Look for patterns that might indicate the product code
    const codePattern = /[A-Z]{1,4}\d{3,4}/;
    const handleMatch = handle.match(codePattern);
    const titleMatch = title.match(codePattern);
    
    return handleMatch ? handleMatch[0] : (titleMatch ? titleMatch[0] : null);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    limit: null,
    categories: null,
    forceUpdate: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--categories=')) {
      options.categories = arg.split('=')[1].split(',').map(cat => cat.trim());
    } else if (arg === '--force-update' || arg === '-f') {
      options.forceUpdate = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
🌍 Sky Pro Translation Updater

Usage: node update-translations.js [options]

Options:
  --dry-run, -d              Run in dry-run mode (no changes made)
  --limit=<n>                Limit the number of products to process
  --categories=<cat1,cat2>   Only process products in specific categories
  --force-update, -f         Force update even if translation exists
  --help, -h                 Show this help message

Examples:
  node update-translations.js --dry-run
  node update-translations.js --limit=10 --categories="Shopping Bags,Headwear"
  node update-translations.js --force-update
      `);
      process.exit(0);
    }
  }
  
  return options;
}

// Run the update if this file is executed directly
if (require.main === module) {
  const options = parseArguments();
  const updater = new TranslationUpdater();
  
  updater.updateTranslations(options)
    .then(() => {
      console.log('🎉 Translation update completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Translation update failed:', error);
      process.exit(1);
    });
}

module.exports = TranslationUpdater; 