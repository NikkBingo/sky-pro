const XMLParser = require('./utils/xml-parser');
const fs = require('fs');

async function createFinnishTranslationsCSV() {
    try {
        const xmlParser = new XMLParser();
        const finnishFeedUrl = process.env.FINNISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products.xml';
        
        console.log(`📡 Fetching Finnish data from: ${finnishFeedUrl}`);
        
        const xmlData = await xmlParser.fetchAndParseXML(finnishFeedUrl);
        const products = xmlData.mainostekstiilitcom.products.product || [];
        
        console.log(`Found ${products.length} products in Finnish feed`);
        
        const csvRows = [];
        const csvHeader = 'Type;Identification;Field;Locale;Market;Status;Default content;Translated content\n';
        
        products.forEach(product => {
            const code = product.code || '';
            const title = product.title || '';
            const description = product.description || '';
            const sizeTable = product.sizetable || '';
            
            if (code && title && description) {
                // Process title: remove bold tags and capitalize
                let processedTitle = title;
                if (processedTitle) {
                    // Remove <b> and </b> tags
                    processedTitle = processedTitle.replace(/<\/?b>/g, '');
                    // Capitalize first letter of each word
                    processedTitle = processedTitle.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                }
                
                // Process description and embed size table
                let processedDescription = description;
                if (sizeTable) {
                    // Create the styled size table div
                    const styledSizeTable = `<div class="size-table">
<h3 style="background-color: #666; color: white; padding: 10px; margin: 0; border-radius: 5px 5px 0 0;">Kokotaulukko</h3>
<div style="background: linear-gradient(to bottom, #f8f8f8 0%, #f8f8f8 50%, white 50%, white 100%);">
${sizeTable}
</div>
</div>`;
                    
                    // Add size table to description
                    processedDescription = processedDescription + '\n\n' + styledSizeTable;
                }
                
                // Create title row
                csvRows.push(`PRODUCT;'${code};title;fi;;;${title};${processedTitle}`);
                
                // Create body_html row
                csvRows.push(`PRODUCT;'${code};body_html;fi;;;"${description}";"${processedDescription}"`);
            }
        });
        
        const csvContent = csvHeader + csvRows.join('\n');
        
        // Write to new file
        const outputFile = 'finnish-translations.csv';
        fs.writeFileSync(outputFile, csvContent, 'utf8');
        
        console.log(`✅ Finnish translations saved to: ${outputFile}`);
        console.log(`📊 Generated ${csvRows.length} rows (${csvRows.length / 2} products)`);
        
        // Show first few entries
        console.log('\n📋 First 3 products:');
        const firstProducts = products.slice(0, 3);
        firstProducts.forEach((product, index) => {
            const code = product.code || '';
            const title = product.title || '';
            console.log(`\n${index + 1}. Code: ${code}`);
            console.log(`   Title: ${title}`);
            console.log(`   Description length: ${(product.description || '').length} chars`);
            console.log(`   Size table: ${product.sizetable ? 'Yes' : 'No'}`);
        });
        
    } catch (error) {
        console.error('❌ Error creating Finnish translations CSV:', error.message);
    }
}

createFinnishTranslationsCSV(); 