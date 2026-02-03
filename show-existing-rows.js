const fs = require('fs');
const csv = require('csv-parser');

async function showExistingRows() {
  try {
    console.log('📖 Reading the title-matched CSV file...');
    const csvData = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream('KH-Print_Oy_translations_SkyPro_title_matched.csv')
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          csvData.push(row);
        })
        .on('end', () => {
          console.log(`📋 Read ${csvData.length} rows from CSV`);
          
          // Filter rows that have Finnish translations
          const rowsWithTranslations = csvData.filter(row => 
            row['Translated content'] && row['Translated content'].trim() !== ''
          );
          
          console.log(`✅ Found ${rowsWithTranslations.length} rows with Finnish translations`);
          
          // Create a summary CSV
          const summaryRows = [];
          summaryRows.push('Product ID,Field,English Content,Finnish Translation');
          
          rowsWithTranslations.forEach(row => {
            const productId = row.Identification?.replace(/'/g, '');
            const field = row.Field;
            const englishContent = row['Default content'] || '';
            const finnishTranslation = row['Translated content'] || '';
            
            // Truncate long content for readability
            const truncatedEnglish = englishContent.length > 100 ? 
              englishContent.substring(0, 100) + '...' : englishContent;
            const truncatedFinnish = finnishTranslation.length > 100 ? 
              finnishTranslation.substring(0, 100) + '...' : finnishTranslation;
            
            summaryRows.push(`"${productId}","${field}","${truncatedEnglish}","${truncatedFinnish}"`);
          });
          
          // Write summary CSV
          fs.writeFileSync('existing_translations_summary.csv', summaryRows.join('\n'));
          
          // Show detailed breakdown by field
          const fieldBreakdown = {};
          rowsWithTranslations.forEach(row => {
            const field = row.Field;
            if (!fieldBreakdown[field]) {
              fieldBreakdown[field] = 0;
            }
            fieldBreakdown[field]++;
          });
          
          console.log('\n📊 Breakdown by field:');
          Object.entries(fieldBreakdown).forEach(([field, count]) => {
            console.log(`   ${field}: ${count} translations`);
          });
          
          console.log('\n📄 Summary CSV created: existing_translations_summary.csv');
          console.log('📋 Full CSV file: KH-Print_Oy_translations_SkyPro_title_matched.csv');
          
          // Show first few examples
          console.log('\n🇫🇮 Examples of Finnish translations:');
          rowsWithTranslations.slice(0, 5).forEach((row, index) => {
            console.log(`\n${index + 1}. Product ${row.Identification?.replace(/'/g, '')} (${row.Field}):`);
            console.log(`   English: ${row['Default content']?.substring(0, 80)}...`);
            console.log(`   Finnish: ${row['Translated content']?.substring(0, 80)}...`);
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
showExistingRows(); 