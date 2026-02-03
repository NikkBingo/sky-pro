const fs = require('fs');
const csv = require('csv-parser');

async function showFinnishTranslations() {
  try {
    console.log('📖 Reading updated CSV file...');
    const csvData = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream('KH-Print_Oy_translations_SkyPro_updated.csv')
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          csvData.push(row);
        })
        .on('end', () => {
          console.log(`📋 Read ${csvData.length} rows from CSV`);
          
          // Filter for the three specific fields
          const targetFields = ['title', 'body_html', 'product_type'];
          const translations = csvData.filter(row => 
            targetFields.includes(row.Field) && row['Translated content']
          );
          
          console.log(`\n🇫🇮 Finnish Translations Found:`);
          console.log(`📊 Total translations: ${translations.length}`);
          console.log('=' .repeat(80));
          
          // Group by field type
          const byField = {};
          targetFields.forEach(field => {
            byField[field] = translations.filter(row => row.Field === field);
          });
          
          // Show translations for each field
          targetFields.forEach(field => {
            const fieldTranslations = byField[field];
            console.log(`\n📝 ${field.toUpperCase()} translations (${fieldTranslations.length}):`);
            console.log('-'.repeat(50));
            
            fieldTranslations.slice(0, 5).forEach((row, index) => {
              console.log(`${index + 1}. Product ID: ${row.Identification}`);
              console.log(`   English: ${row['Default content']}`);
              console.log(`   Finnish: ${row['Translated content']}`);
              console.log('');
            });
            
            if (fieldTranslations.length > 5) {
              console.log(`   ... and ${fieldTranslations.length - 5} more`);
            }
          });
          
          // Show summary by field
          console.log('\n📊 Summary by Field:');
          console.log('=' .repeat(30));
          targetFields.forEach(field => {
            const count = byField[field].length;
            console.log(`${field.padEnd(12)}: ${count} translations`);
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

showFinnishTranslations(); 