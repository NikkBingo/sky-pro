const ShopifyAPI = require('./config/shopify');
require('dotenv').config();

async function checkProductCodes() {
  const shopify = new ShopifyAPI();
  
  try {
    console.log('🔍 Checking Shopify products for product codes...');
    
    // Get first 10 products to check
    const response = await shopify.makeRequest('GET', '/products.json?limit=10');
    const products = response.products;
    
    console.log(`📦 Found ${products.length} products to check`);
    
    for (const product of products) {
      console.log(`\n📋 Product: ${product.title}`);
      console.log(`   Handle: ${product.handle}`);
      console.log(`   ID: ${product.id}`);
      
      // Check metafields
      try {
        const metafieldsResponse = await shopify.makeRequest('GET', `/products/${product.id}/metafields.json`);
        const metafields = metafieldsResponse.metafields;
        
        if (metafields && metafields.length > 0) {
          console.log(`   📝 Metafields (${metafields.length}):`);
          metafields.forEach(mf => {
            console.log(`      ${mf.namespace}.${mf.key}: ${mf.value}`);
          });
        } else {
          console.log(`   📝 No metafields found`);
        }
      } catch (error) {
        console.log(`   ❌ Error fetching metafields: ${error.message}`);
      }
      
      // Check variants for SKUs
      if (product.variants && product.variants.length > 0) {
        console.log(`   🏷️  Variants:`);
        product.variants.forEach((variant, index) => {
          console.log(`      ${index + 1}. SKU: ${variant.sku || 'N/A'}, Title: ${variant.title}`);
        });
      }
    }
    
  } catch (error) {
    console.error('💥 Error checking product codes:', error.message);
  }
}

checkProductCodes(); 