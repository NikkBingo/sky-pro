const fs = require('fs');
const csv = require('csv-parser');

async function showFinnishBodyHtml() {
  try {
    console.log('📖 Reading fixed CSV file...');
    const csvData = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream('KH-Print_Oy_translations_SkyPro_fixed.csv')
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          csvData.push(row);
        })
        .on('end', () => {
          console.log(`📋 Read ${csvData.length} rows from CSV`);
          
          // Filter for body_html rows with Finnish translations
          const bodyHtmlTranslations = csvData.filter(row => 
            row.Field === 'body_html' && 
            row['Translated content'] && 
            row['Translated content'].includes('Torkkupeitto') || 
            row['Translated content'].includes('Pyyhe') ||
            row['Translated content'].includes('puuvilla')
          );
          
          console.log(`\n🇫🇮 Finnish Body HTML Translations:`);
          console.log(`📊 Total Finnish body_html translations: ${bodyHtmlTranslations.length}`);
          console.log('=' .repeat(80));
          
          bodyHtmlTranslations.forEach((row, index) => {
            console.log(`\n${index + 1}. Product ID: ${row.Identification}`);
            console.log(`   English: ${row['Default content'].substring(0, 100)}...`);
            console.log(`   Finnish: ${row['Translated content']}`);
            console.log('-'.repeat(60));
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

showFinnishBodyHtml(); 