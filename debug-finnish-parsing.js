const fs = require('fs');

function debugFinnishParsing() {
    console.log('🔍 Debugging Finnish translations parsing...\n');
    
    // Read the Finnish translations file
    const content = fs.readFileSync('finnish-translations.csv', 'utf8');
    const lines = content.split(/\r?\n/);
    
    // Find the 10360 body_html row
    let found = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("'10360") && line.includes(';body_html;')) {
            found = true;
            console.log(`📋 Found 10360 body_html at line ${i + 1}:`);
            console.log(`   Raw line: ${line.substring(0, 200)}...`);
            
            // Try to parse it manually
            const parts = line.split(';');
            if (parts.length >= 8) {
                const translatedContent = parts[7];
                console.log(`\n   Translated content length: ${translatedContent.length}`);
                console.log(`   First 200 chars: ${translatedContent.substring(0, 200)}`);
                console.log(`   Last 200 chars: ${translatedContent.substring(translatedContent.length - 200)}`);
                
                // Check for size table
                const sizeTableStart = translatedContent.indexOf('<div class="size-table">');
                if (sizeTableStart !== -1) {
                    const sizeTable = translatedContent.substring(sizeTableStart);
                    console.log(`\n   Size table found at position ${sizeTableStart}`);
                    console.log(`   Size table length: ${sizeTable.length}`);
                    console.log(`   Size table starts: ${sizeTable.substring(0, 100)}`);
                    console.log(`   Size table ends: ${sizeTable.substring(sizeTable.length - 100)}`);
                } else {
                    console.log(`\n   ❌ No size table found in translated content`);
                }
            }
            break;
        }
    }
    
    if (!found) {
        console.log('❌ Could not find 10360 body_html row');
    }
    
    // Test the robust parsing function
    console.log('\n🔍 Testing robust parsing function:');
    const rows = robustParseCSVRows('finnish-translations.csv');
    console.log(`   Parsed ${rows.length} logical rows`);
    
    // Find 10360 in the parsed rows
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.includes("'10360") && row.includes(';body_html;')) {
            console.log(`\n📋 Found 10360 in parsed row ${i + 1}:`);
            const parts = row.split(';');
            if (parts.length >= 8) {
                const translatedContent = parts[7];
                console.log(`   Translated content length: ${translatedContent.length}`);
                console.log(`   First 200 chars: ${translatedContent.substring(0, 200)}`);
                console.log(`   Last 200 chars: ${translatedContent.substring(translatedContent.length - 200)}`);
                
                const sizeTableStart = translatedContent.indexOf('<div class="size-table">');
                if (sizeTableStart !== -1) {
                    const sizeTable = translatedContent.substring(sizeTableStart);
                    console.log(`   Size table length: ${sizeTable.length}`);
                    console.log(`   Size table ends: ${sizeTable.substring(sizeTable.length - 100)}`);
                }
            }
            break;
        }
    }
}

// Robustly parse the CSV into logical rows, handling multiline quoted cells
function robustParseCSVRows(filename) {
    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.split(/\r?\n/);
    const rows = [];
    let currentRow = '';
    let inQuotes = false;
    for (let i = 0; i < lines.length; ++i) {
        let line = lines[i];
        // Count quotes to see if we are inside a quoted cell
        let quoteCount = (line.match(/"/g) || []).length;
        if (!inQuotes) {
            currentRow = line;
        } else {
            currentRow += '\n' + line;
        }
        // Toggle inQuotes for each odd number of quotes
        if (quoteCount % 2 !== 0) {
            inQuotes = !inQuotes;
        }
        // If not in quotes, row is complete
        if (!inQuotes) {
            rows.push(currentRow);
            currentRow = '';
        }
    }
    if (currentRow) rows.push(currentRow);
    return rows;
}

debugFinnishParsing(); 