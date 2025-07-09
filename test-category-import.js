const XMLParser = require('./utils/xml-parser');
require('dotenv').config();

async function testCategoryImport() {
  try {
    console.log('📥 Fetching XML feed...');
    const xmlParser = new XMLParser();
    const xmlData = await xmlParser.fetchAndParseXML(process.env.ENGLISH_FEED_URL);
    const products = xmlData.mainostekstiilitcom.products.product;
    const productArray = Array.isArray(products) ? products : [products];
    
    const categoriesToImport = [
      'Shopping Bags',
      'Headwear and accessories', 
      'Sweaters',
      'T-shirts',
      'Trousers and jog pants',
      'Polos'
    ];
    
    console.log('\n🎯 Testing one product from each category:');
    console.log('=' .repeat(60));
    
    // Group products by category
    const productsByCategory = {};
    
    productArray.forEach(product => {
      const category = product.categories?.category?.[0]?.name;
      if (category && categoriesToImport.includes(category)) {
        if (!productsByCategory[category]) {
          productsByCategory[category] = [];
        }
        productsByCategory[category].push(product);
      }
    });
    
    // Show one product from each category
    categoriesToImport.forEach(category => {
      const categoryProducts = productsByCategory[category];
      
      if (categoryProducts && categoryProducts.length > 0) {
        const sampleProduct = categoryProducts[0];
        console.log(`\n📦 ${category}:`);
        console.log(`   Title: ${sampleProduct.title}`);
        console.log(`   Code: ${sampleProduct.code}`);
        console.log(`   Brand: ${sampleProduct.brand}`);
        console.log(`   Products in category: ${categoryProducts.length}`);
        
        // Show all categories for this product
        const allCategories = sampleProduct.categories?.category?.map(cat => cat.name).join(', ');
        console.log(`   All categories: ${allCategories}`);
      } else {
        console.log(`\n❌ ${category}: No products found`);
      }
    });
    
    console.log('\n📊 Summary:');
    console.log('=' .repeat(60));
    categoriesToImport.forEach(category => {
      const count = productsByCategory[category]?.length || 0;
      console.log(`${category.padEnd(25)}: ${count} products`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testCategoryImport(); 