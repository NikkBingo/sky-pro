const XMLParser = require('./utils/xml-parser');

async function showBrandCategories(brandName = 'russel') {
  try {
    console.log('📥 Fetching XML feed...');
    const xmlParser = new XMLParser();
    const xmlData = await xmlParser.fetchAndParseXML('https://www.skypro.fi/tuotteet/products-en.xml');
    const products = xmlData.mainostekstiilitcom.products.product;
    const productArray = Array.isArray(products) ? products : [products];
    
    console.log(`\n🔍 Searching for products with brand: "${brandName}"`);
    console.log('=' .repeat(80));
    
    // Filter products by brand (case-insensitive)
    const filteredProducts = productArray.filter(product => {
      const brand = product.brand;
      return brand && brand.toLowerCase().includes(brandName.toLowerCase());
    });
    
    console.log(`📊 Found ${filteredProducts.length} products with brand "${brandName}"\n`);
    
    if (filteredProducts.length === 0) {
      console.log('❌ No products found with this brand name.');
      console.log('\n💡 Available brands in the feed:');
      const allBrands = [...new Set(productArray.map(p => p.brand).filter(Boolean))].sort();
      allBrands.forEach(brand => console.log(`   - ${brand}`));
      return;
    }
    
    // Collect all unique categories for this brand
    const brandCategories = new Set();
    const categoryCounts = {};
    
    filteredProducts.forEach((product, index) => {
      console.log(`${(index + 1).toString().padStart(2, '0')}. ${product.title}`);
      console.log(`   Code: ${product.code}`);
      console.log(`   Brand: ${product.brand}`);
      
      // Show all categories for this product
      let allCategories = '';
      if (product.categories?.category) {
        const categories = Array.isArray(product.categories.category) 
          ? product.categories.category 
          : [product.categories.category];
        allCategories = categories.map(cat => cat.name).join(', ');
      }
      console.log(`   Categories: ${allCategories}`);
      
      // Collect categories for summary
      if (product.categories?.category) {
        const categories = Array.isArray(product.categories.category) 
          ? product.categories.category 
          : [product.categories.category];
        
        categories.forEach(cat => {
          if (cat.name) {
            brandCategories.add(cat.name);
            categoryCounts[cat.name] = (categoryCounts[cat.name] || 0) + 1;
          }
        });
      }
      
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
    console.log(`Total ${brandName} products: ${filteredProducts.length}`);
    
    // Show category distribution for this brand
    console.log('\n📈 Category Distribution for this brand:');
    const sortedCategories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a);
    
    sortedCategories.forEach(([category, count]) => {
      const percentage = ((count / filteredProducts.length) * 100).toFixed(1);
      console.log(`${category.padEnd(25)}: ${count.toString().padStart(3)} products (${percentage}%)`);
    });
    
    // Show all unique categories
    console.log('\n📋 All Categories for this brand:');
    console.log('=' .repeat(50));
    const sortedUniqueCategories = Array.from(brandCategories).sort();
    sortedUniqueCategories.forEach((category, index) => {
      console.log(`${(index + 1).toString().padStart(2, '0')}. ${category}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get brand name from command line argument or use default
const brandName = process.argv[2] || 'russel';

showBrandCategories(brandName); 