const fs = require('fs');
const csv = require('csv-parser');

function verifyCompleteContent() {
    console.log('🔍 Verifying complete content using proper CSV parsing...\n');
    
    return new Promise((resolve, reject) => {
        const results = [];
        
        fs.createReadStream('KH-print_skypro_translated_complete.csv')
            .pipe(csv({ separator: ';' }))
            .on('data', (data) => {
                results.push(data);
            })
            .on('end', () => {
                console.log(`📋 Parsed ${results.length} rows from output CSV`);
                
                // Find all 10360 body_html entries
                const bodyHtmlEntries = results.filter(row => 
                    row.Identification === "'15489746108765" && row.Field === 'body_html'
                );
                
                console.log(`📋 Found ${bodyHtmlEntries.length} body_html entries for 10360`);
                
                for (let i = 0; i < bodyHtmlEntries.length; i++) {
                    const entry = bodyHtmlEntries[i];
                    console.log(`\n--- Entry ${i + 1} ---`);
                    console.log(`📏 Translated content length: ${entry['Translated content'].length}`);
                    console.log(`📏 First 200 chars: ${entry['Translated content'].substring(0, 200)}`);
                    console.log(`📏 Last 200 chars: ${entry['Translated content'].substring(entry['Translated content'].length - 200)}`);
                    
                    // Check for size table
                    const sizeTableStart = entry['Translated content'].indexOf('<div class="size-table">');
                    if (sizeTableStart !== -1) {
                        const sizeTable = entry['Translated content'].substring(sizeTableStart);
                        console.log(`✅ Found size table (${sizeTable.length} chars)`);
                        console.log(`📏 Size table ends: ${sizeTable.substring(sizeTable.length - 100)}`);
                    } else {
                        console.log('❌ No size table found');
                    }
                }
                
                resolve();
            })
            .on('error', (error) => {
                console.error('❌ Error parsing CSV:', error);
                reject(error);
            });
    });
}

verifyCompleteContent().catch(console.error); 