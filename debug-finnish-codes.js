const XMLParser = require('./utils/xml-parser');

async function debugFinnishCodes() {
    try {
        const xmlParser = new XMLParser();
        const finnishFeedUrl = process.env.FINNISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products.xml';
        
        console.log(`📡 Fetching Finnish data from: ${finnishFeedUrl}`);
        
        const xmlData = await xmlParser.fetchAndParseXML(finnishFeedUrl);
        const finnishProducts = xmlData.mainostekstiilitcom.products.product || [];
        
        console.log(`\n📋 First 20 Finnish product codes:`);
        finnishProducts.slice(0, 20).forEach((product, index) => {
            console.log(`${index + 1}. Code: ${product.code}, Title: ${product.title}`);
        });
        
        // Check if any codes contain the handle digits
        const handlesToCheck = ['266', '640'];
        handlesToCheck.forEach(handle => {
            const matchingProducts = finnishProducts.filter(product => 
                product.code && product.code.toString().includes(handle)
            );
            console.log(`\n🔍 Handle "${handle}" matches:`);
            if (matchingProducts.length > 0) {
                matchingProducts.forEach(product => {
                    console.log(`  - Code: ${product.code}, Title: ${product.title}`);
                });
            } else {
                console.log(`  No matches found`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error debugging Finnish codes:', error.message);
    }
}

debugFinnishCodes(); 