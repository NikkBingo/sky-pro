const XMLParser = require('./utils/xml-parser');

async function checkFinnishCategories() {
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
    
    // Collect all categories
    const allCategories = new Set();
    const categoryProducts = {};
    
    productArray.forEach(product => {
      if (product.categories?.category) {
        const categories = Array.isArray(product.categories.category) 
          ? product.categories.category 
          : [product.categories.category];
        
        categories.forEach(cat => {
          if (cat.name) {
            allCategories.add(cat.name);
            
            if (!categoryProducts[cat.name]) {
              categoryProducts[cat.name] = [];
            }
            categoryProducts[cat.name].push({
              code: product.code,
              title: product.title
            });
          }
        });
      }
    });
    
    console.log('\n📊 Finnish Categories Found:');
    console.log('=' .repeat(50));
    
    const categoryArray = Array.from(allCategories).sort();
    categoryArray.forEach((category, index) => {
      const productCount = categoryProducts[category]?.length || 0;
      console.log(`${(index + 1).toString().padStart(2, '0')}. ${category} (${productCount} products)`);
    });
    
    console.log(`\n📈 Total unique categories: ${categoryArray.length}`);
    
    // Show products in each category
    console.log('\n📋 Sample Products by Category:');
    console.log('=' .repeat(50));
    
    Object.entries(categoryProducts)
      .sort(([,a], [,b]) => b.length - a.length)
      .forEach(([category, products]) => {
        console.log(`\n${category} (${products.length} products):`);
        products.slice(0, 5).forEach(product => {
          console.log(`  - ${product.code}: ${product.title}`);
        });
        if (products.length > 5) {
          console.log(`  ... and ${products.length - 5} more products`);
        }
      });
    
    // Check for categories that might correspond to "Apparel"
    console.log('\n🔍 Categories that might match "Apparel":');
    console.log('=' .repeat(50));
    
    const apparelRelated = categoryArray.filter(cat => 
      cat.toLowerCase().includes('vaate') || 
      cat.toLowerCase().includes('paita') || 
      cat.toLowerCase().includes('tee') ||
      cat.toLowerCase().includes('polo') ||
      cat.toLowerCase().includes('sweat') ||
      cat.toLowerCase().includes('jacket') ||
      cat.toLowerCase().includes('shirt')
    );
    
    apparelRelated.forEach(category => {
      const productCount = categoryProducts[category]?.length || 0;
      console.log(`✅ ${category} (${productCount} products)`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the category check
checkFinnishCategories(); 