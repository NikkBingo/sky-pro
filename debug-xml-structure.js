const XMLParser = require('./utils/xml-parser');

async function debugXMLStructure() {
    try {
        const xmlParser = new XMLParser();
        const finnishFeedUrl = process.env.FINNISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products.xml';
        
        console.log(`📡 Fetching Finnish data from: ${finnishFeedUrl}`);
        
        const xmlData = await xmlParser.fetchAndParseXML(finnishFeedUrl);
        
        console.log('\n📋 XML Data Structure:');
        console.log('Keys at root level:', Object.keys(xmlData));
        
        const mainData = xmlData.mainostekstiilitcom;
        if (mainData) {
            console.log('\nmainostekstiilitcom keys:', Object.keys(mainData));
            
            if (mainData.products) {
                console.log('\nProducts found in mainostekstiilitcom');
                console.log('Products keys:', Object.keys(mainData.products));
                
                if (mainData.products.product) {
                    if (Array.isArray(mainData.products.product)) {
                        console.log(`Number of products: ${mainData.products.product.length}`);
                        if (mainData.products.product.length > 0) {
                            console.log('\nFirst product keys:', Object.keys(mainData.products.product[0]));
                            console.log('First product title:', mainData.products.product[0].title);
                            console.log('First product description:', mainData.products.product[0].description);
                        }
                    } else {
                        console.log('Single product found');
                        console.log('Product keys:', Object.keys(mainData.products.product));
                        console.log('Product title:', mainData.products.product.title);
                        console.log('Product description:', mainData.products.product.description);
                    }
                }
            } else {
                console.log('\nNo products found in mainostekstiilitcom. Available keys:');
                Object.keys(mainData).forEach(key => {
                    console.log(`- ${key}: ${typeof mainData[key]}`);
                    if (Array.isArray(mainData[key])) {
                        console.log(`  (Array with ${mainData[key].length} items)`);
                    }
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Error debugging XML structure:', error.message);
    }
}

debugXMLStructure(); 