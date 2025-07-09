const XMLParser = require('./utils/xml-parser');
require('dotenv').config();

async function showBags(categoryName = 'Bags') {
  try {
    console.log('📥 Fetching XML feed...');
    const xmlParser = new XMLParser();
    const xmlData = await xmlParser.fetchAndParseXML(process.env.ENGLISH_FEED_URL);
    const products = xmlData.mainostekstiilitcom.products.product;
    const productArray = Array.isArray(products) ? products : [products];
    
    console.log(`\n👜 All Products in ${categoryName} Category:`);
    console.log('=' .repeat(80));
    
    const filteredProducts = productArray.filter(product => {
      const category = product.categories?.category?.[0]?.name;
      return category === categoryName;
    });
    
    console.log(`📊 Found ${filteredProducts.length} products in ${categoryName} category\n`);
    
    filteredProducts.forEach((product, index) => {
      console.log(`${(index + 1).toString().padStart(2, '0')}. ${product.title}`);
      console.log(`   Code: ${product.code}`);
      console.log(`   Brand: ${product.brand}`);
      
      // Show all categories for this product
      const allCategories = product.categories?.category?.map(cat => cat.name).join(', ');
      console.log(`   Categories: ${allCategories}`);
      
      // Show variants info
      if (product.variants?.variant) {
        const variants = Array.isArray(product.variants.variant) ? product.variants.variant : [product.variants.variant];
        const colors = [...new Set(variants.map(v => v.color_name).filter(Boolean))];
        const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
        
        console.log(`   Colors: ${colors.join(', ')}`);
        console.log(`   Sizes: ${sizes.join(', ')}`);
        console.log(`   Variants: ${variants.length}`);
      }
      
      console.log(''); // Empty line for readability
    });
    
    console.log('📊 Summary:');
    console.log(`Total ${categoryName} products: ${filteredProducts.length}`);
    
    // Show brand distribution
    const brandCounts = {};
    filteredProducts.forEach(product => {
      const brand = product.brand;
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    });
    
    console.log(`\n🏷️  Brand Distribution:`);
    Object.entries(brandCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([brand, count]) => {
        console.log(`   ${brand.padEnd(20)}: ${count} products`);
      });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Accept category name as a command-line argument
const categoryArg = process.argv[2] || 'Bags';
showBags(categoryArg); 