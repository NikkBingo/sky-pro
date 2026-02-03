const XMLParser = require('./utils/xml-parser');

async function checkFinnishDescriptions() {
  try {
    console.log('📥 Fetching Finnish XML feed...');
    const xmlParser = new XMLParser();
    const xmlData = await xmlParser.fetchAndParseXML('https://www.skypro.fi/tuotteet/products.xml');
    
    if (!xmlData.mainostekstiilitcom || !xmlData.mainostekstiilitcom.products) {
      throw new Error('Invalid XML structure: missing products data');
    }

    const products = xmlData.mainostekstiilitcom.products.product;
    const productArray = Array.isArray(products) ? products : [products];
    
    console.log(`📊 Found ${productArray.length} products in Finnish feed`);
    
    // Check the structure of a few products to see what fields are available
    console.log('\n🔍 Product Structure Analysis:');
    console.log('=' .repeat(50));
    
    const sampleProduct = productArray[0];
    console.log('Sample product fields:');
    Object.keys(sampleProduct).forEach(key => {
      console.log(`  - ${key}: ${typeof sampleProduct[key]}`);
    });
    
    // Look for products with Finnish descriptions
    console.log('\n🇫🇮 Products with Finnish descriptions:');
    console.log('=' .repeat(50));
    
    const productsWithFinnishDesc = productArray.filter(product => 
      product.description && 
      (product.description.includes('paita') || 
       product.description.includes('takki') || 
       product.description.includes('huppari') ||
       product.description.includes('liivi') ||
       product.description.includes('housut'))
    );
    
    console.log(`Found ${productsWithFinnishDesc.length} products with Finnish descriptions`);
    
    productsWithFinnishDesc.slice(0, 5).forEach(product => {
      console.log(`\n${product.code}: "${product.title}"`);
      console.log(`Description: ${product.description?.substring(0, 200)}...`);
    });
    
    // Check if there are any products with actual Finnish titles
    console.log('\n🇫🇮 Products with Finnish titles:');
    console.log('=' .repeat(50));
    
    const finnishTitledProducts = productArray.filter(product => 
      product.title && 
      (product.title.includes('PYYHE') || 
       product.title.includes('TORKKUPEITTO') || 
       product.title.includes('KYLPYTAKKI') ||
       product.title.includes('HAMAM'))
    );
    
    console.log(`Found ${finnishTitledProducts.length} products with Finnish titles`);
    
    finnishTitledProducts.slice(0, 5).forEach(product => {
      console.log(`\n${product.code}: "${product.title}"`);
      console.log(`Description: ${product.description?.substring(0, 200)}...`);
    });
    
    // Check if there's a separate Finnish title field
    console.log('\n🔍 Checking for alternative title fields:');
    console.log('=' .repeat(50));
    
    const allFields = new Set();
    productArray.slice(0, 10).forEach(product => {
      Object.keys(product).forEach(key => allFields.add(key));
    });
    
    console.log('All available fields:');
    Array.from(allFields).sort().forEach(field => {
      console.log(`  - ${field}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the Finnish description check
checkFinnishDescriptions(); 