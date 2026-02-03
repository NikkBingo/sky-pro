const fs = require('fs');
const csv = require('csv-parser');
const XMLParser = require('./utils/xml-parser');

async function fixCsvDelimiter() {
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
    
    // Create a map of product codes to Finnish data
    const finnishProductMap = new Map();
    productArray.forEach(product => {
      if (product.code) {
        finnishProductMap.set(product.code, product);
      }
    });
    
    console.log(`🗺️  Created map of ${finnishProductMap.size} Finnish products`);
    
    // Read the original CSV file
    console.log('📖 Reading original CSV file...');
    const csvData = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream('KH-Print_Oy_translations_SkyPro.csv')
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          csvData.push(row);
        })
        .on('end', async () => {
          console.log(`📋 Read ${csvData.length} rows from CSV`);
          
          // Process each row and add Finnish translations
          let updatedCount = 0;
          let matchedCount = 0;
          
          const updatedRows = [];
          
          // Add header
          updatedRows.push('Type;Identification;Field;Locale;Market;Status;Default content;Translated content');
          
          csvData.forEach(row => {
            const identification = row.Identification?.replace(/'/g, ''); // Remove single quotes
            const field = row.Field;
            
            // Try to find matching Finnish product
            let finnishProduct = null;
            
            // Try exact match first
            if (identification && finnishProductMap.has(identification)) {
              finnishProduct = finnishProductMap.get(identification);
              matchedCount++;
            } else {
              // Try partial match by code
              for (const [code, product] of finnishProductMap) {
                if (identification && (code.includes(identification) || identification.includes(code))) {
                  finnishProduct = product;
                  matchedCount++;
                  break;
                }
              }
            }
            
            let finnishContent = '';
            
            if (finnishProduct) {
              // Map fields based on the Field column
              switch (field) {
                case 'title':
                  finnishContent = finnishProduct.title || '';
                  break;
                case 'body_html':
                  finnishContent = finnishProduct.description || '';
                  break;
                case 'handle':
                  finnishContent = finnishProduct.code || '';
                  break;
                case 'product_type':
                  // Map category to product type
                  const category = finnishProduct.categories?.category?.[0]?.name;
                  finnishContent = category || '';
                  break;
                default:
                  finnishContent = '';
              }
              
              if (finnishContent) {
                updatedCount++;
              }
            }
            
            // Create CSV row with proper escaping
            const escapedDefaultContent = `"${(row['Default content'] || '').replace(/"/g, '""')}"`;
            const escapedTranslatedContent = `"${finnishContent.replace(/"/g, '""')}"`;
            
            const csvRow = `${row.Type};${row.Identification};${row.Field};${row.Locale};${row.Market};${row.Status};${escapedDefaultContent};${escapedTranslatedContent}`;
            updatedRows.push(csvRow);
          });
          
          // Write updated CSV with proper semicolon delimiter
          fs.writeFileSync('KH-Print_Oy_translations_SkyPro_corrected.csv', updatedRows.join('\n'));
          
          console.log('✅ CSV with Finnish translations created successfully!');
          console.log(`📊 Summary:`);
          console.log(`   - Total CSV rows: ${csvData.length}`);
          console.log(`   - Finnish products found: ${finnishProductMap.size}`);
          console.log(`   - Products matched: ${matchedCount}`);
          console.log(`   - Translations added: ${updatedCount}`);
          console.log(`   - Output file: KH-Print_Oy_translations_SkyPro_corrected.csv`);
          
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixCsvDelimiter(); 