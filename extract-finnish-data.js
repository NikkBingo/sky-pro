const XMLParser = require('./utils/xml-parser');
const fs = require('fs');

async function extractFinnishData() {
    try {
        const xmlParser = new XMLParser();
        const finnishFeedUrl = process.env.FINNISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products.xml';
        
        console.log(`📡 Fetching Finnish data from: ${finnishFeedUrl}`);
        
        const xmlData = await xmlParser.fetchAndParseXML(finnishFeedUrl);
        const products = xmlData.mainostekstiilitcom.products.product || [];
        
        console.log(`Found ${products.length} products in Finnish feed`);
        
        const extractedData = [];
        
        products.forEach(product => {
            let title = product.title || '';
            const description = product.description || '';
            const sizeTable = product.sizetable || '';
            
            // Process title: remove bold tags and capitalize
            if (title) {
                // Remove <b> and </b> tags
                title = title.replace(/<\/?b>/g, '');
                // Capitalize first letter of each word
                title = title.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
            }
            
            if (title && description) {
                extractedData.push({
                    title: title,
                    'Translated content': description,
                    size_table: sizeTable
                });
            }
        });
        
        console.log(`Extracted ${extractedData.length} products with title, description, and size table`);
        
        // Convert to CSV
        const csvHeader = 'title,Translated content,size_table\n';
        const csvRows = extractedData.map(row => {
            const escapedTitle = `"${row.title.replace(/"/g, '""')}"`;
            const escapedDescription = `"${row['Translated content'].replace(/"/g, '""')}"`;
            const escapedSizeTable = `"${row.size_table.replace(/"/g, '""')}"`;
            return `${escapedTitle},${escapedDescription},${escapedSizeTable}`;
        }).join('\n');
        
        const csvContent = csvHeader + csvRows;
        
        // Write to new file
        const outputFile = 'finnish-data-from-xml.csv';
        fs.writeFileSync(outputFile, csvContent, 'utf8');
        
        console.log(`✅ Data saved to: ${outputFile}`);
        
        // Show first few entries
        console.log('\n📋 First 3 entries:');
        extractedData.slice(0, 3).forEach((item, index) => {
            console.log(`\n${index + 1}. Title: ${item.title}`);
            console.log(`   Description: ${item['Translated content'].substring(0, 100)}...`);
            console.log(`   Size table: ${item.size_table.substring(0, 100)}...`);
        });
        
        // Show some statistics
        console.log('\n📊 Statistics:');
        console.log(`- Total products in feed: ${products.length}`);
        console.log(`- Products with title, description, and size table: ${extractedData.length}`);
        console.log(`- Products missing data: ${products.length - extractedData.length}`);
        
    } catch (error) {
        console.error('❌ Error extracting Finnish data:', error.message);
    }
}

extractFinnishData(); 