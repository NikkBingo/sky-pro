const fs = require('fs');

function debugProductMatching() {
    console.log('🔍 Debugging product matching and size chart extraction...\n');
    
    // Read the output file
    const outputContent = fs.readFileSync('KH-print_skypro_translated_complete.csv', 'utf8');
    const lines = outputContent.split('\n');
    
    console.log(`📊 Output file has ${lines.length} lines`);
    
    // Find all body_html entries
    const bodyHtmlLines = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(';body_html;')) {
            bodyHtmlLines.push({ line, lineNumber: i + 1 });
        }
    }
    
    console.log(`📋 Found ${bodyHtmlLines.length} body_html entries`);
    
    // Check each body_html entry
    for (const { line, lineNumber } of bodyHtmlLines) {
        console.log(`\n🔍 Line ${lineNumber}:`);
        
        // Parse the line
        const parts = line.split(';');
        if (parts.length >= 8) {
            const identification = parts[1];
            const field = parts[2];
            const translatedContent = parts[7];
            
            console.log(`   Product ID: ${identification}`);
            console.log(`   Field: ${field}`);
            
            // Check if it has a size table
            const hasSizeTable = translatedContent.includes('<div class="size-table">');
            console.log(`   Has size table: ${hasSizeTable}`);
            
            if (hasSizeTable) {
                const sizeTableStart = translatedContent.indexOf('<div class="size-table">');
                const sizeTable = translatedContent.substring(sizeTableStart);
                
                console.log(`   Size table length: ${sizeTable.length} characters`);
                console.log(`   Size table starts: ${sizeTable.substring(0, 50)}...`);
                console.log(`   Size table ends: ${sizeTable.substring(sizeTable.length - 50)}`);
                
                // Check completeness
                const hasClosingDiv = sizeTable.includes('</div>');
                const hasTable = sizeTable.includes('<table>');
                const hasClosingTable = sizeTable.includes('</table>');
                
                console.log(`   Complete: ${hasClosingDiv && hasTable && hasClosingTable}`);
                
                if (!hasClosingDiv || !hasTable || !hasClosingTable) {
                    console.log(`   ❌ INCOMPLETE SIZE TABLE DETECTED!`);
                }
            }
        }
    }
    
    // Check for the specific product you mentioned (10360)
    console.log(`\n🔍 Looking for product 10360 specifically...`);
    const product10360Lines = bodyHtmlLines.filter(({ line }) => 
        line.includes("'15489746108765") || line.includes("10360")
    );
    
    if (product10360Lines.length > 0) {
        console.log(`✅ Found ${product10360Lines.length} entries for product 10360`);
        for (const { line, lineNumber } of product10360Lines) {
            console.log(`   Line ${lineNumber}: ${line.substring(0, 100)}...`);
        }
    } else {
        console.log(`❌ No entries found for product 10360`);
        
        // Show all product IDs
        console.log(`\n📋 All product IDs found:`);
        const productIds = new Set();
        for (const { line } of bodyHtmlLines) {
            const parts = line.split(';');
            if (parts.length >= 2) {
                productIds.add(parts[1]);
            }
        }
        console.log(`   ${Array.from(productIds).join(', ')}`);
    }
}

debugProductMatching(); 