const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const XMLParser = require('./utils/xml-parser');

async function fixBodyHtmlTranslations() {
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
    
    // Create a map of product codes to Finnish descriptions
    const finnishDescriptionMap = new Map();
    productArray.forEach(product => {
      if (product.code && product.description) {
        finnishDescriptionMap.set(product.code, product.description);
      }
    });
    
    console.log(`🗺️  Created map of ${finnishDescriptionMap.size} Finnish descriptions`);
    
    // Read the CSV file
    console.log('📖 Reading CSV file...');
    const csvData = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream('KH-Print_Oy_translations_SkyPro_updated.csv')
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          csvData.push(row);
        })
        .on('end', async () => {
          console.log(`📋 Read ${csvData.length} rows from CSV`);
          
          // Process only body_html rows
          let updatedCount = 0;
          let matchedCount = 0;
          
          const updatedData = csvData.map(row => {
            if (row.Field === 'body_html') {
              const identification = row.Identification?.replace(/'/g, ''); // Remove single quotes
              
              // Try to find matching Finnish description
              let finnishDescription = '';
              
              // Try exact match first
              if (identification && finnishDescriptionMap.has(identification)) {
                finnishDescription = finnishDescriptionMap.get(identification);
                matchedCount++;
                updatedCount++;
                console.log(`✅ Matched product ${identification}: ${finnishDescription.substring(0, 100)}...`);
              } else {
                // Try partial match by code
                for (const [code, description] of finnishDescriptionMap) {
                  if (identification && (code.includes(identification) || identification.includes(code))) {
                    finnishDescription = description;
                    matchedCount++;
                    updatedCount++;
                    console.log(`✅ Partial match product ${identification} -> ${code}: ${description.substring(0, 100)}...`);
                    break;
                  }
                }
              }
              
              if (finnishDescription) {
                return {
                  ...row,
                  'Translated content': finnishDescription
                };
              }
            }
            
            return row;
          });
          
          // Write updated CSV
          const csvWriter = createCsvWriter({
            path: 'KH-Print_Oy_translations_SkyPro_fixed.csv',
            header: [
              { id: 'Type', title: 'Type' },
              { id: 'Identification', title: 'Identification' },
              { id: 'Field', title: 'Field' },
              { id: 'Locale', title: 'Locale' },
              { id: 'Market', title: 'Market' },
              { id: 'Status', title: 'Status' },
              { id: 'Default content', title: 'Default content' },
              { id: 'Translated content', title: 'Translated content' }
            ],
            fieldDelimiter: ';'
          });
          
          await csvWriter.writeRecords(updatedData);
          
          console.log('✅ Body HTML translations fixed successfully!');
          console.log(`📊 Summary:`);
          console.log(`   - Total CSV rows: ${csvData.length}`);
          console.log(`   - Body HTML rows: ${csvData.filter(row => row.Field === 'body_html').length}`);
          console.log(`   - Finnish descriptions found: ${finnishDescriptionMap.size}`);
          console.log(`   - Products matched: ${matchedCount}`);
          console.log(`   - Translations updated: ${updatedCount}`);
          console.log(`   - Output file: KH-Print_Oy_translations_SkyPro_fixed.csv`);
          
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
fixBodyHtmlTranslations(); 