const XMLParser = require('./utils/xml-parser');

async function checkFinnishTitles() {
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
    
    // Look for specific products that should have Finnish titles
    const searchTerms = ['basic', 'power', 'luxury', 'super premium', 'kensington'];
    
    console.log('\n🔍 Searching for Finnish titles:');
    console.log('=' .repeat(50));
    
    searchTerms.forEach(term => {
      const matchingProducts = productArray.filter(product => 
        product.title && product.title.toLowerCase().includes(term.toLowerCase())
      );
      
      if (matchingProducts.length > 0) {
        console.log(`\n"${term}" matches:`);
        matchingProducts.forEach(product => {
          console.log(`  - ${product.code}: "${product.title}"`);
        });
      }
    });
    
    // Show some random Finnish products to see the actual titles
    console.log('\n🇫🇮 Sample Finnish Product Titles:');
    console.log('=' .repeat(50));
    
    const sampleProducts = productArray.slice(0, 20);
    sampleProducts.forEach(product => {
      if (product.title) {
        console.log(`  - ${product.code}: "${product.title}"`);
      }
    });
    
    // Check if there are any products with actual Finnish words
    const finnishWords = ['paita', 't-paita', 'huppari', 'takki', 'liivi', 'housut'];
    
    console.log('\n🇫🇮 Products with Finnish words:');
    console.log('=' .repeat(50));
    
    finnishWords.forEach(word => {
      const matchingProducts = productArray.filter(product => 
        product.title && product.title.toLowerCase().includes(word.toLowerCase())
      );
      
      if (matchingProducts.length > 0) {
        console.log(`\n"${word}" matches:`);
        matchingProducts.slice(0, 5).forEach(product => {
          console.log(`  - ${product.code}: "${product.title}"`);
        });
        if (matchingProducts.length > 5) {
          console.log(`  ... and ${matchingProducts.length - 5} more`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the Finnish title check
checkFinnishTitles(); 