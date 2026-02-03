const fs = require('fs');
const csv = require('csv-parser');
const XMLParser = require('./utils/xml-parser');

async function finnishDescriptionsOnly() {
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
    
    // Create maps for matching
    const finnishProductMapByCode = new Map();
    const finnishProductMapByTitle = new Map();
    
    productArray.forEach(product => {
      if (product.code) {
        finnishProductMapByCode.set(product.code, product);
      }
      if (product.title) {
        const normalizedTitle = product.title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
        finnishProductMapByTitle.set(normalizedTitle, product);
      }
    });
    
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
          
          // Group rows by product ID
          const rowsByProduct = {};
          csvData.forEach(row => {
            const productId = row.Identification;
            if (!rowsByProduct[productId]) {
              rowsByProduct[productId] = [];
            }
            rowsByProduct[productId].push(row);
          });
          
          // Process each row
          let updatedCount = 0;
          let matchedCount = 0;
          
          const updatedRows = [];
          
          // Add header
          updatedRows.push('Type;Identification;Field;Locale;Market;Status;Default content;Translated content');
          
          csvData.forEach(row => {
            const identification = row.Identification?.replace(/'/g, '');
            const field = row.Field;
            const originalDefaultContent = row['Default content'] || '';
            
            // Get product title for matching
            const titleRow = rowsByProduct[row.Identification]?.find(r => r.Field === 'title');
            const productTitle = titleRow ? titleRow['Default content'] : '';
            
            // Try to find matching Finnish product
            let finnishProduct = null;
            let finnishTranslation = '';
            
            // Strategy 1: Try to match by title first
            if (productTitle) {
              const normalizedTitle = productTitle.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
              
              // Try exact title match
              if (finnishProductMapByTitle.has(normalizedTitle)) {
                finnishProduct = finnishProductMapByTitle.get(normalizedTitle);
                console.log(`✅ Title match: "${productTitle}" -> "${finnishProduct.title}"`);
                matchedCount++;
              } else {
                // Try partial title match
                for (const [finnishTitle, product] of finnishProductMapByTitle) {
                  if (normalizedTitle.includes(finnishTitle) || finnishTitle.includes(normalizedTitle)) {
                    finnishProduct = product;
                    console.log(`✅ Partial title match: "${productTitle}" -> "${product.title}"`);
                    matchedCount++;
                    break;
                  }
                }
              }
            }
            
            // Strategy 2: If no title match, try code match
            if (!finnishProduct && identification) {
              if (finnishProductMapByCode.has(identification)) {
                finnishProduct = finnishProductMapByCode.get(identification);
                console.log(`✅ Code match: ${identification} -> ${finnishProduct.code}`);
                matchedCount++;
              } else {
                // Try partial code match
                for (const [code, product] of finnishProductMapByCode) {
                  if (identification.includes(code) || code.includes(identification)) {
                    finnishProduct = product;
                    console.log(`✅ Partial code match: ${identification} -> ${code}`);
                    matchedCount++;
                    break;
                  }
                }
              }
            }
            
            // Generate Finnish translation based on field type
            if (finnishProduct) {
              switch (field) {
                case 'title':
                  // Keep the original English title as is
                  finnishTranslation = originalDefaultContent;
                  break;
                case 'body_html':
                  // Use the Finnish description from XML
                  finnishTranslation = finnishProduct.description || '';
                  break;
                case 'handle':
                  finnishTranslation = finnishProduct.code || '';
                  break;
                case 'product_type':
                  const category = finnishProduct.categories?.category?.[0]?.name;
                  finnishTranslation = category || '';
                  break;
                default:
                  finnishTranslation = '';
              }
              
              if (finnishTranslation) {
                updatedCount++;
              }
            }
            
            // Create CSV row: keep Default content as English, add Finnish to Translated content
            const escapedDefaultContent = `"${originalDefaultContent.replace(/"/g, '""')}"`;
            const escapedTranslatedContent = `"${finnishTranslation.replace(/"/g, '""')}"`;
            
            const csvRow = `${row.Type};${row.Identification};${row.Field};${row.Locale};${row.Market};${row.Status};${escapedDefaultContent};${escapedTranslatedContent}`;
            updatedRows.push(csvRow);
          });
          
          // Write updated CSV
          fs.writeFileSync('KH-Print_Oy_translations_SkyPro_descriptions.csv', updatedRows.join('\n'));
          
          console.log('✅ CSV with Finnish descriptions created successfully!');
          console.log(`📊 Summary:`);
          console.log(`   - Total CSV rows: ${csvData.length}`);
          console.log(`   - Finnish products found: ${finnishProductMapByCode.size}`);
          console.log(`   - Products matched: ${matchedCount}`);
          console.log(`   - Finnish translations added: ${updatedCount}`);
          console.log(`   - Output file: KH-Print_Oy_translations_SkyPro_descriptions.csv`);
          console.log(`\n📝 Translation Strategy:`);
          console.log(`   1. Keep titles as English (no translation)`);
          console.log(`   2. Use Finnish descriptions from XML feed for body_html`);
          console.log(`   3. Use Finnish product codes for handle`);
          console.log(`   4. Use Finnish categories for product_type`);
          
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the Finnish descriptions only script
finnishDescriptionsOnly(); 