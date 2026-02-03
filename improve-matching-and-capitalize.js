const fs = require('fs');
const csv = require('csv-parser');
const XMLParser = require('./utils/xml-parser');

async function improveMatchingAndCapitalize() {
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
    
    // Create maps for different matching strategies
    const finnishProductMapByCode = new Map();
    const finnishProductMapByTitle = new Map();
    const finnishProductMapByCategory = new Map();
    
    productArray.forEach(product => {
      if (product.code) {
        finnishProductMapByCode.set(product.code, product);
      }
      if (product.title) {
        // Create a normalized title for matching
        const normalizedTitle = product.title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
        finnishProductMapByTitle.set(normalizedTitle, product);
      }
      // Add category-based mapping
      if (product.categories?.category) {
        const categories = Array.isArray(product.categories.category) 
          ? product.categories.category 
          : [product.categories.category];
        
        categories.forEach(cat => {
          if (cat.name) {
            const categoryName = cat.name.toLowerCase().trim();
            if (!finnishProductMapByCategory.has(categoryName)) {
              finnishProductMapByCategory.set(categoryName, []);
            }
            finnishProductMapByCategory.get(categoryName).push(product);
          }
        });
      }
    });
    
    console.log(`🗺️  Created maps: ${finnishProductMapByCode.size} by code, ${finnishProductMapByTitle.size} by title, ${finnishProductMapByCategory.size} by category`);
    
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
          
          // Group rows by product ID to find titles and categories first
          const rowsByProduct = {};
          csvData.forEach(row => {
            const productId = row.Identification;
            if (!rowsByProduct[productId]) {
              rowsByProduct[productId] = [];
            }
            rowsByProduct[productId].push(row);
          });
          
          // Find titles and categories for each product
          const productInfo = {};
          Object.keys(rowsByProduct).forEach(productId => {
            const titleRow = rowsByProduct[productId].find(row => row.Field === 'title');
            const productTypeRow = rowsByProduct[productId].find(row => row.Field === 'product_type');
            
            productInfo[productId] = {
              title: titleRow ? titleRow['Default content'] : '',
              category: productTypeRow ? productTypeRow['Default content'] : ''
            };
          });
          
          console.log(`📝 Found ${Object.keys(productInfo).length} products with info`);
          
          // Process each row with improved matching
          let updatedCount = 0;
          let matchedCount = 0;
          
          const updatedRows = [];
          
          // Add header
          updatedRows.push('Type;Identification;Field;Locale;Market;Status;Default content;Translated content');
          
          csvData.forEach(row => {
            const identification = row.Identification?.replace(/'/g, ''); // Remove single quotes
            const field = row.Field;
            const originalDefaultContent = row['Default content'] || '';
            
            // Get the product info for this product
            const currentProductInfo = productInfo[row.Identification];
            
            // Try to find matching Finnish product
            let finnishProduct = null;
            let matchType = '';
            
            // Strategy 1: Try to match by title first
            if (currentProductInfo?.title) {
              const normalizedTitle = currentProductInfo.title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
              
              // Try exact title match
              if (finnishProductMapByTitle.has(normalizedTitle)) {
                finnishProduct = finnishProductMapByTitle.get(normalizedTitle);
                matchType = 'exact_title';
                console.log(`✅ Exact title match: "${currentProductInfo.title}" -> "${finnishProduct.title}"`);
                matchedCount++;
              } else {
                // Try partial title match
                for (const [finnishTitle, product] of finnishProductMapByTitle) {
                  if (normalizedTitle.includes(finnishTitle) || finnishTitle.includes(normalizedTitle)) {
                    finnishProduct = product;
                    matchType = 'partial_title';
                    console.log(`✅ Partial title match: "${currentProductInfo.title}" -> "${product.title}"`);
                    matchedCount++;
                    break;
                  }
                }
              }
            }
            
            // Strategy 2: If no title match, try category-based matching
            if (!finnishProduct && currentProductInfo?.category) {
              const categoryName = currentProductInfo.category.toLowerCase().trim();
              
              if (finnishProductMapByCategory.has(categoryName)) {
                const categoryProducts = finnishProductMapByCategory.get(categoryName);
                // Take the first product in this category as a fallback
                finnishProduct = categoryProducts[0];
                matchType = 'category';
                console.log(`✅ Category match: "${currentProductInfo.category}" -> "${finnishProduct.title}"`);
                matchedCount++;
              }
            }
            
            // Strategy 3: If no category match, try code match
            if (!finnishProduct && identification) {
              if (finnishProductMapByCode.has(identification)) {
                finnishProduct = finnishProductMapByCode.get(identification);
                matchType = 'exact_code';
                console.log(`✅ Code match: ${identification} -> ${finnishProduct.code}`);
                matchedCount++;
              } else {
                // Try partial code match
                for (const [code, product] of finnishProductMapByCode) {
                  if (identification.includes(code) || code.includes(identification)) {
                    finnishProduct = product;
                    matchType = 'partial_code';
                    console.log(`✅ Partial code match: ${identification} -> ${code}`);
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
          fs.writeFileSync('KH-Print_Oy_translations_SkyPro_improved.csv', updatedRows.join('\n'));
          
          console.log('✅ CSV with improved matching and capitalized titles created successfully!');
          console.log(`📊 Summary:`);
          console.log(`   - Total CSV rows: ${csvData.length}`);
          console.log(`   - Finnish products found: ${finnishProductMapByCode.size}`);
          console.log(`   - Products matched: ${matchedCount}`);
          console.log(`   - Finnish translations added: ${updatedCount}`);
          console.log(`   - Output file: KH-Print_Oy_translations_SkyPro_improved.csv`);
          console.log(`\n📝 Improved Matching Strategy:`);
          console.log(`   1. Match by exact product title first`);
          console.log(`   2. Match by partial title similarity`);
          console.log(`   3. Match by category (using categories from import)`);
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

// Run the improved matching
improveMatchingAndCapitalize(); 