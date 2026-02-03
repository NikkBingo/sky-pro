const fs = require('fs');
const csv = require('csv-parser');

async function showImportCategories() {
  try {
    console.log('📖 Reading the improved CSV file to extract categories...');
    const csvData = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream('KH-Print_Oy_translations_SkyPro_improved.csv')
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          csvData.push(row);
        })
        .on('end', () => {
          console.log(`📋 Read ${csvData.length} rows from CSV`);
          
          // Extract all unique categories from product_type field
          const categories = new Set();
          const productCategories = {};
          
          csvData.forEach(row => {
            if (row.Field === 'product_type' && row['Default content']) {
              const category = row['Default content'].trim();
              categories.add(category);
              
              // Group by product ID to see which products belong to which categories
              const productId = row.Identification?.replace(/'/g, '');
              if (!productCategories[productId]) {
                productCategories[productId] = [];
              }
              productCategories[productId].push(category);
            }
          });
          
          console.log('\n📊 Import Categories Found:');
          console.log('=' .repeat(50));
          
          const categoryArray = Array.from(categories).sort();
          categoryArray.forEach((category, index) => {
            console.log(`${(index + 1).toString().padStart(2, '0')}. ${category}`);
          });
          
          console.log(`\n📈 Total unique categories: ${categoryArray.length}`);
          
          // Show category distribution
          console.log('\n📊 Category Distribution:');
          console.log('=' .repeat(50));
          
          const categoryCounts = {};
          Object.values(productCategories).forEach(catList => {
            catList.forEach(cat => {
              categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
          });
          
          Object.entries(categoryCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([category, count]) => {
              console.log(`${category}: ${count} products`);
            });
          
          // Show products by category
          console.log('\n📋 Products by Category:');
          console.log('=' .repeat(50));
          
          Object.entries(categoryCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([category, count]) => {
              console.log(`\n${category} (${count} products):`);
              
              // Find products in this category
              const productsInCategory = Object.entries(productCategories)
                .filter(([productId, categories]) => categories.includes(category))
                .slice(0, 5); // Show first 5 products
              
              productsInCategory.forEach(([productId, categories]) => {
                const titleRow = csvData.find(row => 
                  row.Identification?.replace(/'/g, '') === productId && 
                  row.Field === 'title'
                );
                const title = titleRow ? titleRow['Default content'] : 'Unknown';
                console.log(`  - ${productId}: ${title}`);
              });
              
              if (count > 5) {
                console.log(`  ... and ${count - 5} more products`);
              }
            });
          
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
showImportCategories(); 