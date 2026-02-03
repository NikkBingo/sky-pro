const XMLParser = require('./utils/xml-parser');
const fs = require('fs');

async function debugHandleMatching() {
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
                // Handle both numeric and alphanumeric codes
                const codeStr = code.toString().toUpperCase();
                // Store by the full code (normalized to uppercase)
                finnishProductMap.set(codeStr, product);
                // Also store by first 5 digits for backward compatibility
                const firstFive = codeStr.substring(0, 5);
                finnishProductMap.set(firstFive, product);
            }
        });
        console.log(`Created map with ${finnishProductMap.size} Finnish products by SKU prefix`);

        // Read the KH-Print CSV
        const khPrintContent = fs.readFileSync('KH-Print_Oy_translations_updated.csv', 'utf8');
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

        // Check specific handles that should match
        const testHandles = ['10360-size-s', '10360-size-m', '10360-size-l', '10360-size-xl'];
        testHandles.forEach(handle => {
            console.log(`\n🔍 Testing handle: "${handle}"`);
            
            const handleUpper = handle.toUpperCase();
            let finnishProduct = finnishProductMap.get(handleUpper);
            
            if (!finnishProduct) {
                const baseCode = handleUpper.split('-')[0];
                console.log(`  Base code: "${baseCode}"`);
                finnishProduct = finnishProductMap.get(baseCode);
            }
            
            if (!finnishProduct) {
                const handleDigits = handle.replace(/\D/g, '').substring(0, 5);
                console.log(`  Handle digits: "${handleDigits}"`);
                finnishProduct = finnishProductMap.get(handleDigits);
            }
            
            if (finnishProduct) {
                console.log(`  ✅ MATCHED: "${handle}" -> Code: ${finnishProduct.code}, Title: ${finnishProduct.title}`);
            } else {
                console.log(`  ❌ NO MATCH for: "${handle}"`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error debugging handle matching:', error.message);
    }
}

debugHandleMatching(); 