const XMLParser = require('./utils/xml-parser');
require('dotenv').config();

async function debugCategory() {
  try {
    console.log('📥 Fetching XML feed...');
    const xmlParser = new XMLParser();
    const xmlData = await xmlParser.fetchAndParseXML(process.env.ENGLISH_FEED_URL);
    const products = xmlData.mainostekstiilitcom.products.product;
    const productArray = Array.isArray(products) ? products : [products];
    
    // Get the first product
    const firstProduct = productArray[0];
    
    console.log('\n🔍 Debugging first product:');
    console.log('Title:', firstProduct.title);
    console.log('Code:', firstProduct.code);
    
    console.log('\n📋 Categories structure:');
    console.log('Raw categories:', JSON.stringify(firstProduct.categories, null, 2));
    
    console.log('\n🎯 Category filtering check:');
    const category = firstProduct.categories?.category?.[0]?.name;
    console.log('categories.category[0].name:', category);
    
    const categoriesToImport = [
      'Bags',
      'Headwear and accessories', 
      'Shopping Bags',
      'Sweaters',
      'T-shirts',
      'Trousers and jog pants',
      'Polos'
    ];
    
    const isIncluded = category && categoriesToImport.includes(category);
    console.log('Is in selected categories?', isIncluded);
    
    if (isIncluded) {
      console.log('✅ This product SHOULD be imported');
    } else {
      console.log('❌ This product should NOT be imported');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugCategory(); 