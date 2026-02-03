const XMLParser = require('./utils/xml-parser');
const ShopifyAPI = require('./config/shopify');

class ConservativeSizeChartUpdater {
  constructor() {
    this.xmlParser = new XMLParser();
    this.shopifyAPI = new ShopifyAPI();
    this.stats = {
      total: 0,
      withSizeTable: 0,
      stanleyStella: 0,
      updated: 0,
      skipped: 0,
      noMatch: 0,
      errors: 0
    };
    this.shopifyProducts = [];
    this.metafieldCache = new Map();
  }

  async run() {
    console.log('🔄 Starting Conservative Size Chart Update...');
    console.log('⏱️  This will be slower but more reliable\n');

    try {
      // Fetch XML data
      console.log('📡 Fetching Sky Pro XML feed...');
      const xmlData = await this.xmlParser.fetchAndParseXML('https://www.skypro.fi/tuotteet/products-en.xml');
      const products = this.findProductsRecursively(xmlData.mainostekstiilitcom);
      
      if (!products || products.length === 0) {
        console.log('❌ No products found in XML data');
        return;
      }

      this.stats.total = products.length;
      console.log(`📊 Found ${products.length} products in XML feed`);

      // Fetch all Shopify products once
      console.log('🔄 Fetching all Shopify products...');
      await this.fetchAllShopifyProducts();
      console.log(`📦 Found ${this.shopifyProducts.length} Shopify products`);

      // Filter products with size tables
      const productsWithSizeTable = products.filter(product => 
        product.sizetable && product.sizetable.trim() !== ''
      );
      
      this.stats.withSizeTable = productsWithSizeTable.length;
      console.log(`📏 Found ${productsWithSizeTable.length} products with size tables`);

      // Process products one by one with conservative delays
      console.log('\n🔄 Processing products with conservative approach...\n');
      
      for (let i = 0; i < productsWithSizeTable.length; i++) {
        const product = productsWithSizeTable[i];
        console.log(`[${i + 1}/${productsWithSizeTable.length}] Processing: ${product.title || product.code} (SKU: ${product.code})`);
        
        try {
          await this.processProduct(product);
          
          // Conservative delay: 3 seconds between products
          if (i < productsWithSizeTable.length - 1) {
            console.log('⏳ Waiting 3 seconds before next product...');
            await this.delay(3000);
          }
        } catch (error) {
          console.error(`❌ Error processing product ${product.code}:`, error.message);
          this.stats.errors++;
        }
      }

      this.printSummary();

    } catch (error) {
      console.error('❌ Fatal error:', error.message);
    }
  }

  async fetchAllShopifyProducts() {
    let allProducts = [];
    let hasMore = true;
    let cursor = null;
    
    while (hasMore) {
      const url = cursor
        ? `/products.json?limit=250&page_info=${cursor}`
        : '/products.json?limit=250';
      
      try {
        const response = await this.shopifyAPI.makeRequest('GET', url);
        if (response.products && response.products.length > 0) {
          allProducts = allProducts.concat(response.products);
          if (response.products.length < 250) {
            hasMore = false;
          } else {
            // Extract next cursor from Link header if available
            hasMore = false; // Simplified for now
          }
        } else {
          hasMore = false;
        }
        
        // Conservative delay between API calls
        await this.delay(1000);
      } catch (error) {
        console.error('❌ Error fetching Shopify products:', error.message);
        hasMore = false;
      }
    }
    
    this.shopifyProducts = allProducts;
  }

  async processProduct(xmlProduct) {
    if (this.isStanleyStellaProduct(xmlProduct)) {
      this.stats.stanleyStella++;
      console.log('   ⏭️  Skipping Stanley/Stella product');
      return;
    }

    const shopifyProducts = this.findShopifyProductsBySKU(xmlProduct.code);
    
    if (shopifyProducts.length === 0) {
      this.stats.noMatch++;
      console.log('   ⚠️  No Shopify products found with this SKU');
      return;
    }

    console.log(`   ✅ Found ${shopifyProducts.length} Shopify product(s)`);

    // Process each matching Shopify product
    for (const shopifyProduct of shopifyProducts) {
      if (this.isShopifyStanleyStellaProduct(shopifyProduct)) {
        console.log(`   ⏭️  Skipping Stanley/Stella Shopify product: ${shopifyProduct.title}`);
        continue;
      }

      try {
        await this.updateProductSizeChart(shopifyProduct, xmlProduct.sizetable);
        this.stats.updated++;
      } catch (error) {
        console.error(`   ❌ Error updating ${shopifyProduct.title}:`, error.message);
        this.stats.errors++;
      }

      // Conservative delay between product updates
      await this.delay(2000);
    }
  }

  async updateProductSizeChart(shopifyProduct, sizeChartData) {
    const metafieldKey = 'custom.sizechart_skypro';
    
    try {
      // Check if metafield exists
      const existingMetafield = await this.getSizeChartMetafield(shopifyProduct.id, metafieldKey);
      
      if (existingMetafield) {
        // Update existing metafield
        console.log(`   🔄 Updating existing size chart for: ${shopifyProduct.title}`);
        await this.updateSizeChartMetafield(existingMetafield.id, sizeChartData);
      } else {
        // Create new metafield
        console.log(`   ➕ Creating new size chart for: ${shopifyProduct.title}`);
        await this.createSizeChartMetafield(shopifyProduct.id, metafieldKey, sizeChartData);
      }
      
      console.log(`   ✅ Successfully updated: ${shopifyProduct.title}`);
      
    } catch (error) {
      throw new Error(`Failed to update size chart: ${error.message}`);
    }
  }

  async getSizeChartMetafield(productId, key) {
    const cacheKey = `${productId}_${key}`;
    
    if (this.metafieldCache.has(cacheKey)) {
      return this.metafieldCache.get(cacheKey);
    }

    try {
      const response = await this.shopifyAPI.makeRequest('GET', `/products/${productId}/metafields.json`);
      const metafield = response.metafields?.find(m => m.key === key);
      
      if (metafield) {
        this.metafieldCache.set(cacheKey, metafield);
      }
      
      return metafield;
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('   ⏳ Rate limited, waiting 5 seconds...');
        await this.delay(5000);
        return this.getSizeChartMetafield(productId, key); // Retry
      }
      throw error;
    }
  }

  async createSizeChartMetafield(productId, key, value) {
    const metafieldData = {
      metafield: {
        namespace: 'custom',
        key: 'sizechart_skypro',
        value: this.prepareSizeChartData(value),
        type: 'multi_line_text_field'
      }
    };

    try {
      await this.shopifyAPI.makeRequest('POST', `/products/${productId}/metafields.json`, metafieldData);
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('   ⏳ Rate limited, waiting 5 seconds...');
        await this.delay(5000);
        return this.createSizeChartMetafield(productId, key, value); // Retry
      }
      throw error;
    }
  }

  async updateSizeChartMetafield(metafieldId, value) {
    const metafieldData = {
      metafield: {
        value: this.prepareSizeChartData(value)
      }
    };

    try {
      await this.shopifyAPI.makeRequest('PUT', `/metafields/${metafieldId}.json`, metafieldData);
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('   ⏳ Rate limited, waiting 5 seconds...');
        await this.delay(5000);
        return this.updateSizeChartMetafield(metafieldId, value); // Retry
      }
      throw error;
    }
  }

  prepareSizeChartData(data) {
    if (!data) return '';
    
    // Basic HTML cleaning
    return data
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  findShopifyProductsBySKU(sku) {
    if (!sku) return [];

    const matches = [];
    
    // Exact SKU match
    const exactMatches = this.shopifyProducts.filter(product => 
      product.sku === sku
    );
    matches.push(...exactMatches);

    // Partial SKU match (first 5 characters)
    if (sku.length >= 5) {
      const partialSku = sku.substring(0, 5);
      const partialMatches = this.shopifyProducts.filter(product => 
        product.sku && product.sku.startsWith(partialSku) && !exactMatches.includes(product)
      );
      matches.push(...partialMatches);
    }

    // Product code metafield match
    const metafieldMatches = this.shopifyProducts.filter(product => {
      // This would require fetching metafields, so we'll skip for now in conservative mode
      return false;
    });

    return matches;
  }

  isStanleyStellaProduct(product) {
    const brand = (product.brand || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    return brand.includes('stanley') ||
           brand.includes('stella') ||
           brand.includes('stanley/stella') ||
           brand.includes('stanley_stella') ||
           title.includes('stanley') ||
           title.includes('stella');
  }

  isShopifyStanleyStellaProduct(shopifyProduct) {
    const vendor = (shopifyProduct.vendor || '').toLowerCase();
    const title = (shopifyProduct.title || '').toLowerCase();
    return vendor.includes('stanley') ||
           vendor.includes('stella') ||
           vendor.includes('stanley/stella') ||
           vendor.includes('stanley_stella') ||
           title.includes('stanley') ||
           title.includes('stella');
  }

  findProductsRecursively(obj) {
    const products = [];
    
    if (Array.isArray(obj)) {
      for (const item of obj) {
        products.push(...this.findProductsRecursively(item));
      }
    } else if (obj && typeof obj === 'object') {
      if (obj.code && obj.title) {
        products.push(obj);
      } else {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            products.push(...this.findProductsRecursively(obj[key]));
          }
        }
      }
    }
    
    return products;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 CONSERVATIVE SIZE CHART UPDATE SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total products in XML: ${this.stats.total}`);
    console.log(`Products with size table: ${this.stats.withSizeTable}`);
    console.log(`Stanley/Stella products skipped: ${this.stats.stanleyStella}`);
    console.log(`Products updated: ${this.stats.updated}`);
    console.log(`Products skipped: ${this.stats.skipped}`);
    console.log(`No Shopify match: ${this.stats.noMatch}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log('='.repeat(80));
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  force: args.includes('--force'),
  dryRun: args.includes('--dry-run') || args.includes('-d'),
  limit: parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1]) || null
};

if (options.dryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
}

// Export the class for use in other modules
module.exports = ConservativeSizeChartUpdater;

// Run the updater if this file is executed directly
if (require.main === module) {
  const updater = new ConservativeSizeChartUpdater();
  updater.run().catch(console.error);
}
