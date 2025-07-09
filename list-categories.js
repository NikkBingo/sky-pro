const XMLParser = require('./utils/xml-parser');
require('dotenv').config();

async function listCategories() {
  try {
    console.log('📥 Fetching XML feed...');
    const xmlParser = new XMLParser();
    const xmlData = await xmlParser.fetchAndParseXML(process.env.ENGLISH_FEED_URL);
    console.log('Top-level keys in parsed XML:', Object.keys(xmlData));
    const products = xmlData.mainostekstiilitcom.products.product;
    console.log(`📊 Found ${products.length} products in feed`);
    
    // Extract all unique category names from the first category position
    const categories = new Set();
    
    products.forEach(product => {
      if (product.categories?.category?.[0]?.name) {
        categories.add(product.categories.category[0].name);
      }
    });
    
    // Convert to array and sort alphabetically
    const sortedCategories = Array.from(categories).sort();
    
    console.log('\n📋 All Available Categories (categories.category.0.name):');
    console.log('=' .repeat(50));
    
    sortedCategories.forEach((category, index) => {
      console.log(`${(index + 1).toString().padStart(2, '0')}. ${category}`);
    });
    
    console.log('\n📊 Summary:');
    console.log(`Total unique categories: ${sortedCategories.length}`);
    console.log(`Total products processed: ${products.length}`);
    
    // Show category distribution
    console.log('\n📈 Category Distribution:');
    const categoryCounts = {};
    
    products.forEach(product => {
      const category = product.categories?.category?.[0]?.name;
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });
    
    // Sort by count (descending)
    const sortedByCount = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a);
    
    sortedByCount.forEach(([category, count]) => {
      const percentage = ((count / products.length) * 100).toFixed(1);
      console.log(`${category.padEnd(20)}: ${count.toString().padStart(3)} products (${percentage}%)`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
listCategories(); 