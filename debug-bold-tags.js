const XMLParser = require('./utils/xml-parser');

async function debugBoldTags() {
    try {
        const xmlParser = new XMLParser();
        const finnishFeedUrl = process.env.FINNISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products.xml';
        
        console.log(`📡 Fetching Finnish data from: ${finnishFeedUrl}`);
        
        const xmlData = await xmlParser.fetchAndParseXML(finnishFeedUrl);
        const products = xmlData.mainostekstiilitcom.products.product || [];
        
        console.log('\n📋 First 5 titles with all possible formatting:');
        products.slice(0, 5).forEach((product, index) => {
            const title = product.title || '';
            console.log(`\n${index + 1}. Original title: "${title}"`);
            
            // Check for various HTML tags
            const hasBold = title.includes('<b>') || title.includes('</b>') || title.includes('<strong>') || title.includes('</strong>');
            const hasItalic = title.includes('<i>') || title.includes('</i>') || title.includes('<em>') || title.includes('</em>');
            const hasUnderline = title.includes('<u>') || title.includes('</u>');
            const hasSpan = title.includes('<span') || title.includes('</span>');
            const hasDiv = title.includes('<div') || title.includes('</div>');
            
            console.log(`   Contains bold tags: ${hasBold}`);
            console.log(`   Contains italic tags: ${hasItalic}`);
            console.log(`   Contains underline tags: ${hasUnderline}`);
            console.log(`   Contains span tags: ${hasSpan}`);
            console.log(`   Contains div tags: ${hasDiv}`);
            
            // Remove all possible HTML tags
            const cleanTitle = title.replace(/<[^>]*>/g, '');
            console.log(`   After removing all HTML tags: "${cleanTitle}"`);
        });
        
        // Also check the raw XML structure
        console.log('\n🔍 Raw XML structure for first product:');
        const firstProduct = products[0];
        console.log('Product keys:', Object.keys(firstProduct));
        console.log('Title field type:', typeof firstProduct.title);
        console.log('Title field value:', JSON.stringify(firstProduct.title));
        
    } catch (error) {
        console.error('❌ Error debugging bold tags:', error.message);
    }
}

debugBoldTags(); 