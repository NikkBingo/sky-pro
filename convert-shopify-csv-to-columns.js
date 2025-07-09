const fs = require('fs');
const csv = require('csv-parser');

// Function to convert CSV to 2-column format
function convertCSVToTwoColumns(inputFile, outputFile) {
  const results = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(inputFile)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        if (results.length === 0) {
          console.log('No data found in CSV file');
          resolve();
          return;
        }

        // Get the first product (row) for analysis
        const firstProduct = results[0];
        
        // Convert to 2-column format
        const twoColumnData = [];
        twoColumnData.push('Field Name,Value');
        
        Object.keys(firstProduct).forEach(field => {
          const value = firstProduct[field];
          // Escape quotes and wrap in quotes if contains comma or newline
          const escapedValue = String(value).replace(/"/g, '""');
          const finalValue = escapedValue.includes(',') || escapedValue.includes('\n') ? `"${escapedValue}"` : escapedValue;
          
          twoColumnData.push(`${field},${finalValue}`);
        });
        
        // Write to file
        fs.writeFileSync(outputFile, twoColumnData.join('\n'));
        
        console.log(`Converted ${Object.keys(firstProduct).length} fields from Shopify CSV to 2-column format`);
        console.log(`Output saved to: ${outputFile}`);
        
        // Show field summary
        console.log('\nShopify CSV Field Summary:');
        console.log('==========================');
        
        const fieldCategories = {};
        Object.keys(firstProduct).forEach(field => {
          const category = field.includes('metafields') ? 'metafields' : 
                         field.includes('Variant') ? 'variant' :
                         field.includes('Image') ? 'image' :
                         field.includes('SEO') ? 'seo' :
                         field.includes('Google') ? 'google_shopping' :
                         'basic';
          
          if (!fieldCategories[category]) fieldCategories[category] = [];
          fieldCategories[category].push(field);
        });
        
        Object.keys(fieldCategories).forEach(category => {
          console.log(`\n${category} fields (${fieldCategories[category].length}):`);
          fieldCategories[category].slice(0, 5).forEach(field => console.log(`  ${field}`));
          if (fieldCategories[category].length > 5) {
            console.log(`  ... and ${fieldCategories[category].length - 5} more`);
          }
        });
        
        resolve();
      })
      .on('error', reject);
  });
}

// Convert the Shopify CSV
convertCSVToTwoColumns('products_export 4.csv', 'shopify-products-columns.csv')
  .then(() => {
    console.log('\nConversion completed!');
  })
  .catch(error => {
    console.error('Error converting CSV:', error);
  }); 