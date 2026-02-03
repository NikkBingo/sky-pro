const XMLParser = require('./utils/xml-parser');
const fs = require('fs');

async function debugBodyHtmlMatching() {
    try {
        const xmlParser = new XMLParser();
        const finnishFeedUrl = process.env.FINNISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products.xml';
        
        console.log(`📡 Fetching Finnish data from: ${finnishFeedUrl}`);
        
        const xmlData = await xmlParser.fetchAndParseXML(finnishFeedUrl);
        const finnishProducts = xmlData.mainostekstiilitcom.products.product || [];
        
        // Map: first 5 digits of code -> product
        const finnishProductMap = new Map();
        finnishProducts.forEach(product => {
            const code = product.code;
            if (code) {
                const firstFive = code.toString().substring(0, 5);
                finnishProductMap.set(firstFive, product);
            }
        });
        console.log(`Created map with ${finnishProductMap.size} Finnish products by SKU prefix`);

        // Read the KH-Print CSV
        const khPrintContent = fs.readFileSync('KH-Print_Oy_translations.csv', 'utf8');
        const lines = khPrintContent.split('\n');
        const dataLines = lines.slice(1);

        // Build Identification -> handle map
        const idToHandle = new Map();
        dataLines.forEach(line => {
            if (!line.trim()) return;
            const parts = line.split(';');
            if (parts.length < 8) return;
            const identification = parts[1];
            const field = parts[2];
            const defaultContent = parts[6];
            if (field === 'handle' && defaultContent) {
                idToHandle.set(identification, defaultContent);
            }
        });
        console.log(`Mapped ${idToHandle.size} handles by Identification`);

        // Check body_html rows
        let bodyHtmlCount = 0;
        let matchedBodyHtml = 0;
        
        dataLines.forEach(line => {
            if (!line.trim()) return;
            const parts = line.split(';');
            if (parts.length < 8) return;
            
            const identification = parts[1];
            const field = parts[2];
            const locale = parts[3];
            
            if (locale === 'fi' && field === 'body_html') {
                bodyHtmlCount++;
                const handle = idToHandle.get(identification);
                if (handle) {
                    const handleDigits = handle.replace(/\D/g, '').substring(0, 5);
                    const finnishProduct = finnishProductMap.get(handleDigits);
                    if (finnishProduct) {
                        matchedBodyHtml++;
                        console.log(`✅ Body HTML match: ${identification} -> handle: ${handle} (${handleDigits}) -> SKU: ${finnishProduct.code}`);
                    } else {
                        console.log(`❌ No Finnish product found for: ${identification} -> handle: ${handle} (${handleDigits})`);
                    }
                } else {
                    console.log(`❌ No handle found for: ${identification}`);
                }
            }
        });
        
        console.log(`\n📊 Body HTML Statistics:`);
        console.log(`- Total body_html rows with fi locale: ${bodyHtmlCount}`);
        console.log(`- Matched body_html rows: ${matchedBodyHtml}`);
        console.log(`- Unmatched body_html rows: ${bodyHtmlCount - matchedBodyHtml}`);
        
    } catch (error) {
        console.error('❌ Error debugging body_html matching:', error.message);
    }
}

debugBodyHtmlMatching(); 