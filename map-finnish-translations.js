const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const XMLParser = require('./utils/xml-parser');

async function mapFinnishTranslations() {
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
    
    // Read the CSV file
    console.log('📖 Reading CSV file...');
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
          
          const updatedData = csvData.map(row => {
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
                if (identification && code.includes(identification) || identification && identification.includes(code)) {
                  finnishProduct = product;
                  matchedCount++;
                  break;
                }
              }
            }
            
            if (finnishProduct) {
              let finnishContent = '';
              
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
                return {
                  ...row,
                  'Translated content': finnishContent
                };
              }
            }
            
            return row;
          });
          
          // Write updated CSV
          const csvWriter = createCsvWriter({
            path: 'KH-Print_Oy_translations_SkyPro_updated.csv',
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
          
          console.log('✅ Finnish translations mapped successfully!');
          console.log(`📊 Summary:`);
          console.log(`   - Total CSV rows: ${csvData.length}`);
          console.log(`   - Finnish products found: ${finnishProductMap.size}`);
          console.log(`   - Products matched: ${matchedCount}`);
          console.log(`   - Translations added: ${updatedCount}`);
          console.log(`   - Output file: KH-Print_Oy_translations_SkyPro_updated.csv`);
          
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the mapping
mapFinnishTranslations(); 