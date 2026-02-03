const fs = require('fs');
const csv = require('csv-parser');
const XMLParser = require('./utils/xml-parser');

async function createFinnishTranslations() {
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
    
    // Create a mapping of English titles to Finnish translations
    const finnishTranslations = {
      // T-shirts
      'Basic Tee': 'PERUSTEE',
      'Power Tee': 'VOIMATEE',
      'Luxury Tee': 'LUXUSTEE',
      'Super Premium T': 'SUPER PREMIUM T-PAITA',
      'Valueweight T': 'VALUEWEIGHT T-PAITA',
      'Stretch Tee': 'VENYTELIJÄTEE',
      'Interlock Tee': 'INTERLOCK TEE',
      'Sof Tee': 'SOF TEE',
      'Cooldry Tee': 'COOLDRY TEE',
      'Baseball Tee': 'BASEBALL TEE',
      'Long Sleeve Tee': 'PITKÄHIHAINEN TEE',
      'Ladies Stretch Tee': 'NAISTEN VENYTELIJÄTEE',
      'Mens Interlock Tee': 'MIESTEN INTERLOCK TEE',
      'Ladies Interlock Tee': 'NAISTEN INTERLOCK TEE',
      'Ladies Luxury Tee': 'NAISTEN LUXUSTEE',
      'Ladies Stretch Tee Extra Long': 'NAISTEN PITKÄ VENYTELIJÄTEE',
      'Ladies 3/4 Sleeve Stretch Tee': 'NAISTEN 3/4-HIHAINEN VENYTELIJÄTEE',
      'Long Sleeve Cooldry Tee': 'PITKÄHIHAINEN COOLDRY TEE',
      'Mens Fashion Sof Tee': 'MIESTEN MUOTI SOF TEE',
      'Long Sleeve Fashion Sof Tee': 'PITKÄHIHAINEN MUOTI SOF TEE',
      'Ladies Fashion Sof-tee': 'NAISTEN MUOTI SOF TEE',
      
      // Polo shirts
      'Pima Pikee': 'PIMA PIKEE',
      'Interlock Tee': 'INTERLOCK TEE',
      'Naisten Interlock Tee': 'NAISTEN INTERLOCK TEE',
      'Naisten Luxury Stretch Pikee': 'NAISTEN LUXUS VENYTELIJÄ PIKEE',
      'Luxury Long Sleeve Polo': 'LUXUS PITKÄHIHAINEN PIKEE',
      'Ladies Luxury Long Sleeve Polo': 'NAISTEN LUXUS PITKÄHIHAINEN PIKEE',
      
      // Hoodies and sweatshirts
      'Classic Set-in Sweat': 'KLASSINEN SWEAT',
      'Premium Sweat Jacket': 'PREMIUM SWEAT TAKKI',
      'Classic Hooded Sweat Jacket': 'KLASSINEN HUPPARITAKKI',
      'Lady-fit Premium Hooded Sweat Jacket': 'NAISTEN PREMIUM HUPPARITAKKI',
      
      // Shorts and pants
      'Kensington Shorts': 'KENSINGTON SHORTSIT',
      'Classic Elasticated Cuff Jog Pants': 'KLASSINEN VENYTELIJÄ JUOKSUHOUSUT',
      'Premium Elasticated Cuff Jog Pants': 'PREMIUM VENYTELIJÄ JUOKSUHOUSUT',
      'Sweat Pants': 'SWEAT HOUSUT',
      
      // Workwear
      'Heavy Duty T-shirt': 'RASKAS TYÖTEE',
      'Safe-guard Recycled Safety T-shirt': 'TURVALLISUUS KIERRÄTETTY TURVATEE',
      
      // Kids
      'Kids Valueweight T': 'LASTEN VALUEWEIGHT T-PAITA',
      'Kids Set-in Sweat': 'LASTEN SWEAT',
      'Kids Cool T-shirt': 'LASTEN COOL TEE',
      'Junior Reflective Orion Beanie': 'NUORI HEIJASTAVA ORION PIPPO',
      
      // Sports
      'Girlie Cool T-shirt': 'TYYTÖJEN COOL TEE',
      'Women\'s Long Sleeve Cool T': 'NAISTEN PITKÄHIHAINEN COOL T',
      
      // Accessories
      'Fedora': 'FEDORA HATTU',
      'Original Cuffed Beanie': 'ALKUPERÄINEN KÄÄNNETTÄVÄ PIPPO',
      'Microknit Snapback Trucker': 'MIKROKUTTU SNAPBACK TRUCKER-LIPPIS',
      'Vintage Snapback Trucker': 'VINTAGE SNAPBACK TRUCKER-LIPPIS',
      'Original Flat Peak Snapback': 'ALKUPERÄINEN LITTEÄ SNAPBACK LIPPIS',
      'Chef\'s Zandana Scarf': 'KOKIN ZANDANA',
      'Draco Snapback': 'DRACO SNAPBACK LIPPIS',
      
      // Generic translations
      'T-shirt': 'T-PAITA',
      'Polo': 'PIKEE',
      'Hoodie': 'HUPPARI',
      'Jacket': 'TAKKI',
      'Shorts': 'SHORTSIT',
      'Pants': 'HOUSUT',
      'Sweatshirt': 'SWEAT',
      'Beanie': 'PIPPO',
      'Cap': 'LIPPIS',
      'Scarf': 'HUIVI'
    };
    
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
            
            // Generate Finnish translation
            if (finnishProduct) {
              switch (field) {
                case 'title':
                  // Use predefined translations or create from Finnish product
                  if (finnishTranslations[productTitle]) {
                    finnishTranslation = finnishTranslations[productTitle];
                  } else if (finnishProduct.title.includes('PYYHE') || finnishProduct.title.includes('TORKKUPEITTO')) {
                    // Use actual Finnish titles
                    finnishTranslation = finnishProduct.title.toUpperCase();
                  } else {
                    // Create Finnish translation from English title
                    finnishTranslation = createFinnishTitle(productTitle, finnishProduct);
                  }
                  break;
                case 'body_html':
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
          fs.writeFileSync('KH-Print_Oy_translations_SkyPro_finnish.csv', updatedRows.join('\n'));
          
          console.log('✅ CSV with proper Finnish translations created successfully!');
          console.log(`📊 Summary:`);
          console.log(`   - Total CSV rows: ${csvData.length}`);
          console.log(`   - Finnish products found: ${finnishProductMapByCode.size}`);
          console.log(`   - Products matched: ${matchedCount}`);
          console.log(`   - Finnish translations added: ${updatedCount}`);
          console.log(`   - Output file: KH-Print_Oy_translations_SkyPro_finnish.csv`);
          
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Helper function to create Finnish titles
function createFinnishTitle(englishTitle, finnishProduct) {
  // If the Finnish product has a Finnish title, use it
  if (finnishProduct.title.includes('PYYHE') || 
      finnishProduct.title.includes('TORKKUPEITTO') || 
      finnishProduct.title.includes('KYLPYTAKKI') ||
      finnishProduct.title.includes('HAMAM')) {
    return finnishProduct.title.toUpperCase();
  }
  
  // Otherwise, create a Finnish translation
  const translations = {
    'T': 'T-PAITA',
    'Tee': 'TEE',
    'T-shirt': 'T-PAITA',
    'Polo': 'PIKEE',
    'Hoodie': 'HUPPARI',
    'Jacket': 'TAKKI',
    'Shorts': 'SHORTSIT',
    'Pants': 'HOUSUT',
    'Sweatshirt': 'SWEAT',
    'Beanie': 'PIPPO',
    'Cap': 'LIPPIS',
    'Scarf': 'HUIVI',
    'Ladies': 'NAISTEN',
    'Mens': 'MIESTEN',
    'Kids': 'LASTEN',
    'Long Sleeve': 'PITKÄHIHAINEN',
    'Short Sleeve': 'LYHYTHIHAINEN',
    'Premium': 'PREMIUM',
    'Luxury': 'LUXUS',
    'Basic': 'PERUS',
    'Power': 'VOIMA',
    'Super': 'SUPER',
    'Classic': 'KLASSINEN',
    'Fashion': 'MUOTI',
    'Stretch': 'VENYTELIJÄ',
    'Interlock': 'INTERLOCK',
    'Sof': 'SOF',
    'Cooldry': 'COOLDRY',
    'Baseball': 'BASEBALL'
  };
  
  let finnishTitle = englishTitle;
  
  // Replace English words with Finnish equivalents
  Object.entries(translations).forEach(([english, finnish]) => {
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    finnishTitle = finnishTitle.replace(regex, finnish);
  });
  
  return finnishTitle.toUpperCase();
}

// Run the Finnish translation creation
createFinnishTranslations(); 