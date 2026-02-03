const fs = require('fs');
const csv = require('csv-parser');
const XMLParser = require('./utils/xml-parser');

async function importApparelFinnish() {
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
    
    // Filter for Apparel category products
    const apparelProducts = productArray.filter(product => {
      if (product.categories?.category) {
        const categories = Array.isArray(product.categories.category) 
          ? product.categories.category 
          : [product.categories.category];
        
        return categories.some(cat => 
          cat.name && cat.name.toLowerCase().includes('apparel')
        );
      }
      return false;
    });
    
    console.log(`👕 Found ${apparelProducts.length} Apparel products in Finnish feed`);
    
    // Create maps for Apparel products
    const apparelProductMapByCode = new Map();
    const apparelProductMapByTitle = new Map();
    
    apparelProducts.forEach(product => {
      if (product.code) {
        apparelProductMapByCode.set(product.code, product);
      }
      if (product.title) {
        const normalizedTitle = product.title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
        apparelProductMapByTitle.set(normalizedTitle, product);
      }
    });
    
    console.log(`🗺️  Created maps: ${apparelProductMapByCode.size} by code, ${apparelProductMapByTitle.size} by title`);
    
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
          
          // Find Apparel products in CSV
          const apparelProductIds = new Set();
          Object.keys(rowsByProduct).forEach(productId => {
            const productTypeRow = rowsByProduct[productId].find(row => row.Field === 'product_type');
            if (productTypeRow && productTypeRow['Default content'] === 'Apparel') {
              apparelProductIds.add(productId);
            }
          });
          
          console.log(`👕 Found ${apparelProductIds.size} Apparel products in CSV`);
          
          // Process each row for Apparel products only
          let updatedCount = 0;
          let matchedCount = 0;
          
          const updatedRows = [];
          
          // Add header
          updatedRows.push('Type;Identification;Field;Locale;Market;Status;Default content;Translated content');
          
          csvData.forEach(row => {
            const identification = row.Identification?.replace(/'/g, '');
            const field = row.Field;
            const originalDefaultContent = row['Default content'] || '';
            
            // Only process if this product is in the Apparel category
            if (!apparelProductIds.has(row.Identification)) {
              // Keep original row without translation
              const escapedDefaultContent = `"${originalDefaultContent.replace(/"/g, '""')}"`;
              const escapedTranslatedContent = `""`;
              const csvRow = `${row.Type};${row.Identification};${row.Field};${row.Locale};${row.Market};${row.Status};${escapedDefaultContent};${escapedTranslatedContent}`;
              updatedRows.push(csvRow);
              return;
            }
            
            // Get product title for matching
            const titleRow = rowsByProduct[row.Identification].find(r => r.Field === 'title');
            const productTitle = titleRow ? titleRow['Default content'] : '';
            
            // Try to find matching Finnish Apparel product
            let finnishProduct = null;
            
            // Strategy 1: Try to match by title first
            if (productTitle) {
              const normalizedTitle = productTitle.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
              
              // Try exact title match
              if (apparelProductMapByTitle.has(normalizedTitle)) {
                finnishProduct = apparelProductMapByTitle.get(normalizedTitle);
                console.log(`✅ Apparel title match: "${productTitle}" -> "${finnishProduct.title}"`);
                matchedCount++;
              } else {
                // Try partial title match
                for (const [finnishTitle, product] of apparelProductMapByTitle) {
                  if (normalizedTitle.includes(finnishTitle) || finnishTitle.includes(normalizedTitle)) {
                    finnishProduct = product;
                    console.log(`✅ Apparel partial title match: "${productTitle}" -> "${product.title}"`);
                    matchedCount++;
                    break;
                  }
                }
              }
            }
            
            // Strategy 2: If no title match, try code match
            if (!finnishProduct && identification) {
              if (apparelProductMapByCode.has(identification)) {
                finnishProduct = apparelProductMapByCode.get(identification);
                console.log(`✅ Apparel code match: ${identification} -> ${finnishProduct.code}`);
                matchedCount++;
              } else {
                // Try partial code match
                for (const [code, product] of apparelProductMapByCode) {
                  if (identification.includes(code) || code.includes(identification)) {
                    finnishProduct = product;
                    console.log(`✅ Apparel partial code match: ${identification} -> ${code}`);
                    matchedCount++;
                    break;
                  }
                }
              }
            }
            
            let finnishTranslation = '';
            
            if (finnishProduct) {
              // Map fields based on the Field column
              switch (field) {
                case 'title':
                  // Capitalize the Finnish title
                  finnishTranslation = finnishProduct.title ? finnishProduct.title.toUpperCase() : '';
                  break;
                case 'body_html':
                  finnishTranslation = finnishProduct.description || '';
                  break;
                case 'handle':
                  finnishTranslation = finnishProduct.code || '';
                  break;
                case 'product_type':
                  // Map category to product type
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
          fs.writeFileSync('KH-Print_Oy_translations_SkyPro_apparel.csv', updatedRows.join('\n'));
          
          console.log('✅ CSV with Apparel Finnish translations created successfully!');
          console.log(`📊 Summary:`);
          console.log(`   - Total CSV rows: ${csvData.length}`);
          console.log(`   - Apparel products in CSV: ${apparelProductIds.size}`);
          console.log(`   - Apparel products in Finnish feed: ${apparelProducts.length}`);
          console.log(`   - Apparel products matched: ${matchedCount}`);
          console.log(`   - Finnish translations added: ${updatedCount}`);
          console.log(`   - Output file: KH-Print_Oy_translations_SkyPro_apparel.csv`);
          console.log(`\n📝 Apparel Import Strategy:`);
          console.log(`   1. Filter for Apparel category products only`);
          console.log(`   2. Match by exact product title first`);
          console.log(`   3. Match by partial title similarity`);
          console.log(`   4. Fallback to code matching`);
          console.log(`   5. Capitalize Finnish titles`);
          console.log(`   6. Keep Default content as English`);
          console.log(`   7. Add Finnish to Translated content`);
          
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the Apparel import
importApparelFinnish(); 