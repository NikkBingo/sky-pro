const XMLParser = require('./utils/xml-parser');

async function debugFinnishMapping() {
    try {
        const xmlParser = new XMLParser();
        const finnishFeedUrl = process.env.FINNISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products.xml';
        
        console.log(`📡 Fetching Finnish data from: ${finnishFeedUrl}`);
        
        const xmlData = await xmlParser.fetchAndParseXML(finnishFeedUrl);
        const finnishProducts = xmlData.mainostekstiilitcom.products.product || [];
        
        // Test the mapping logic
        const testHandle = '10330';
        console.log(`\n🔍 Testing mapping for handle: ${testHandle}`);
        
        // Extract base code: first 5 digits or before dash
        let baseCode = testHandle.split('-')[0];
        // If baseCode is not all digits, extract first 5 digits
        if (!/^\d+$/.test(baseCode)) {
            const digits = testHandle.replace(/\D/g, '').substring(0, 5);
            if (digits) baseCode = digits;
        }
        baseCode = baseCode.toUpperCase();
        console.log(`📝 Base code extracted: ${baseCode}`);
        
        // Find Finnish product
        const finnishProduct = finnishProducts.find(p => p.code && p.code.toString().toUpperCase() === baseCode);
        
        if (finnishProduct) {
            console.log(`✅ Found Finnish product with code: ${finnishProduct.code}`);
            console.log(`📝 Title: ${finnishProduct.title}`);
            console.log(`📝 Description length: ${finnishProduct.description ? finnishProduct.description.length : 0} characters`);
            console.log(`📝 Size table length: ${finnishProduct.sizetable ? finnishProduct.sizetable.length : 0} characters`);
            
            if (finnishProduct.description) {
                console.log(`\n📄 Description preview: ${finnishProduct.description.substring(0, 200)}...`);
            }
            
            if (finnishProduct.sizetable) {
                console.log(`\n📊 Size table preview: ${finnishProduct.sizetable.substring(0, 200)}...`);
            }
        } else {
            console.log(`❌ No Finnish product found for code: ${baseCode}`);
            console.log(`🔍 Available codes (first 10): ${finnishProducts.slice(0, 10).map(p => p.code).join(', ')}`);
        }
        
    } catch (error) {
        console.error('❌ Error debugging Finnish mapping:', error.message);
    }
}

debugFinnishMapping(); 