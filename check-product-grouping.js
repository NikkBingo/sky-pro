const ShopifyAPI = require('./config/shopify');

class ProductGroupingChecker {
  constructor() {
    this.shopifyAPI = new ShopifyAPI();
  }

  async checkProductGroupingDefinitions() {
    try {
      console.log('🔍 Checking Product Grouping metafield definitions...');
      
      // Check for existing metafield definitions
      const response = await this.shopifyAPI.makeRequest('GET', '/metafield_definitions.json');
      
      console.log('📋 Found metafield definitions:');
      response.metafield_definitions.forEach(def => {
        if (def.namespace.includes('product_grouping')) {
          console.log(`✅ Product Grouping definition found:`);
          console.log(`   Namespace: ${def.namespace}`);
          console.log(`   Key: ${def.key}`);
          console.log(`   Type: ${def.type}`);
          console.log(`   Name: ${def.name}`);
          console.log('---');
        }
      });
      
    } catch (error) {
      console.error('❌ Error checking metafield definitions:', error.message);
    }
  }

  async checkProductGroupingMetafields() {
    try {
      console.log('\n🔍 Checking products with Product Grouping metafields...');
      
      // Get products with Product Grouping metafields
      const response = await this.shopifyAPI.makeRequest('GET', '/products.json?limit=10');
      
      console.log('📦 Products with Product Grouping:');
      
      for (const product of response.products) {
        // Get metafields for this product
        const metafieldsResponse = await this.shopifyAPI.makeRequest('GET', `/products/${product.id}/metafields.json`);
        
        const groupingMetafields = metafieldsResponse.metafields.filter(mf => 
          mf.namespace.includes('product_grouping')
        );
        
        if (groupingMetafields.length > 0) {
          console.log(`\n✅ Product: ${product.title} (ID: ${product.id})`);
          console.log(`   Handle: ${product.handle}`);
          
          groupingMetafields.forEach(mf => {
            console.log(`   📋 ${mf.namespace}.${mf.key}: ${mf.value} (${mf.type})`);
          });
        }
        
        // Rate limiting
        await this.sleep(500);
      }
      
    } catch (error) {
      console.error('❌ Error checking product metafields:', error.message);
    }
  }

  async createProductGroupingDefinitions() {
    try {
      console.log('\n🔧 Creating Product Grouping metafield definitions...');
      
      // Create Product Grouping Option 1 Entries definition
      const entriesDefinition = {
        metafield_definition: {
          name: 'Product Grouping Option 1 Entries',
          namespace: 'product_grouping_option_1_entries',
          key: 'product_grouping_option_1_entries',
          type: 'list.product_reference',
          description: 'Product grouping entries for split products',
          owner_resource: 'product'
        }
      };
      
      // Create Product Grouping Option 1 definition
      const optionDefinition = {
        metafield_definition: {
          name: 'Product Grouping Option 1',
          namespace: 'product_grouping_option_1',
          key: 'product_grouping_option_1',
          type: 'single_line_text_field',
          description: 'Product grouping option value (size)',
          owner_resource: 'product'
        }
      };
      
      console.log('📋 Creating metafield definitions...');
      console.log('Entries Definition:', JSON.stringify(entriesDefinition, null, 2));
      console.log('Option Definition:', JSON.stringify(optionDefinition, null, 2));
      
      // Note: In a full implementation, you would create these using Shopify's Admin API
      // For now, we'll log the structure for manual creation in Shopify admin
      
    } catch (error) {
      console.error('❌ Error creating definitions:', error.message);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    console.log('🚀 Product Grouping Checker');
    console.log('========================\n');
    
    await this.checkProductGroupingDefinitions();
    await this.checkProductGroupingMetafields();
    await this.createProductGroupingDefinitions();
    
    console.log('\n✅ Product Grouping check completed!');
  }
}

// Run the checker
const checker = new ProductGroupingChecker();
checker.run().catch(console.error); 