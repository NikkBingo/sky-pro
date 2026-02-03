const XMLParser = require('./utils/xml-parser');
const fs = require('fs');

async function debugProductCodes() {
    try {
        const xmlParser = new XMLParser();
        const finnishFeedUrl = process.env.FINNISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products.xml';
        
        console.log(`📡 Fetching Finnish data from: ${finnishFeedUrl}`);
        
        const xmlData = await xmlParser.fetchAndParseXML(finnishFeedUrl);
        const finnishProducts = xmlData.mainostekstiilitcom.products.product || [];
        
        // Get Finnish product codes
        const finnishCodes = finnishProducts.map(p => p.code).filter(Boolean);
        console.log(`\n📋 Finnish product codes (first 10):`);
        finnishCodes.slice(0, 10).forEach(code => console.log(`  ${code}`));
        
        // Read KH-Print CSV and extract product codes
        const khPrintContent = fs.readFileSync('KH-Print_Oy_translations_SkyPro.csv', 'utf8');
        const lines = khPrintContent.split('\n');
        const khPrintCodes = new Set();
        
        lines.slice(1).forEach(line => {
            if (line.trim()) {
                const parts = line.split(';');
                if (parts.length >= 2) {
                    const identification = parts[1];
                    const productCode = identification.replace(/^'/, '');
                    if (productCode) {
                        khPrintCodes.add(productCode);
                    }
                }
            }
        });
        
        console.log(`\n📋 KH-Print product codes (first 10):`);
        Array.from(khPrintCodes).slice(0, 10).forEach(code => console.log(`  ${code}`));
        
        // Check for matches
        const matchingCodes = finnishCodes.filter(code => khPrintCodes.has(code));
        console.log(`\n📊 Matching codes: ${matchingCodes.length}`);
        console.log(`Finnish codes: ${finnishCodes.length}`);
        console.log(`KH-Print codes: ${khPrintCodes.size}`);
        
        if (matchingCodes.length > 0) {
            console.log(`\n📋 First 5 matching codes:`);
            matchingCodes.slice(0, 5).forEach(code => console.log(`  ${code}`));
        } else {
            console.log(`\n❌ No matching codes found!`);
            
            // Check if there are any similar codes
            const finnishCodeSet = new Set(finnishCodes);
            const similarCodes = Array.from(khPrintCodes).filter(code => {
                // Check if any Finnish code contains this code or vice versa
                return Array.from(finnishCodeSet).some(finnishCode => 
                    finnishCode.includes(code) || code.includes(finnishCode)
                );
            });
            
            if (similarCodes.length > 0) {
                console.log(`\n🔍 Found ${similarCodes.length} similar codes:`);
                similarCodes.slice(0, 5).forEach(code => console.log(`  ${code}`));
            }
        }
        
    } catch (error) {
        console.error('❌ Error debugging product codes:', error.message);
    }
}

debugProductCodes(); 