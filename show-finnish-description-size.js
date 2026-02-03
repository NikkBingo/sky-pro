const XMLParser = require('./utils/xml-parser');

async function showFinnishDescriptionAndSize(code = '10360') {
    const xmlParser = new XMLParser();
    const finnishFeedUrl = process.env.FINNISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products.xml';
    console.log(`📡 Fetching Finnish data from: ${finnishFeedUrl}`);
    const xmlData = await xmlParser.fetchAndParseXML(finnishFeedUrl);
    const products = xmlData.mainostekstiilitcom.products.product || [];
    const product = products.find(p => p.code && p.code.toString() === code);
    if (!product) {
        console.log(`❌ No product found with code ${code}`);
        return;
    }
    console.log(`\nTitle: ${product.title}`);
    console.log(`\nDescription:\n${product.description}`);
    if (product.sizetable) {
        console.log(`\nSize Table:\n${product.sizetable}`);
    } else {
        console.log('\nNo size table found.');
    }
}

showFinnishDescriptionAndSize(process.argv[2] || '10360'); 