const fs = require('fs');

function checkFinnishTranslations() {
    console.log('🔍 Checking Finnish translations CSV structure...\n');
    
    const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
    const lines = finnishContent.split('\n');
    
    // Find all body_html entries for product 10360
    console.log('📋 Looking for product 10360 in Finnish translations:');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(';body_html;') && line.includes("'10360")) {
            found = true;
            console.log(`\nLine ${i + 1}:`);
            console.log(`   Raw: ${line.substring(0, 200)}...`);
            
            const parts = line.split(';');
            if (parts.length >= 8) {
                const translatedContent = parts[7];
                console.log(`\n   Translated content length: ${translatedContent.length} characters`);
                console.log(`   Has size table: ${translatedContent.includes('<div class="size-table">')}`);
                
                if (translatedContent.includes('<div class="size-table">')) {
                    const sizeTableStart = translatedContent.indexOf('<div class="size-table">');
                    const sizeTable = translatedContent.substring(sizeTableStart);
                    console.log(`   Size table length: ${sizeTable.length} characters`);
                    console.log(`   Size table ends with: ${sizeTable.substring(sizeTable.length - 50)}`);
                }
            }
        }
    }
    
    if (!found) {
        console.log('❌ No body_html entry found for product 10360');
        
        // Show all product codes in Finnish translations
        console.log('\n📋 All product codes in Finnish translations:');
        const productCodes = new Set();
        for (const line of lines) {
            if (line.includes(';body_html;')) {
                const parts = line.split(';');
                if (parts.length >= 2) {
                    const productCode = parts[1].replace("'", "");
                    productCodes.add(productCode);
                }
            }
        }
        console.log(`   ${Array.from(productCodes).join(', ')}`);
    }
    
    // Also check if there are any size tables at all
    console.log('\n🔍 Checking for any size tables in Finnish translations:');
    let sizeTableCount = 0;
    for (const line of lines) {
        if (line.includes(';body_html;') && line.includes('<div class="size-table">')) {
            sizeTableCount++;
            const parts = line.split(';');
            if (parts.length >= 2) {
                const productCode = parts[1].replace("'", "");
                console.log(`   Product ${productCode} has size table`);
            }
        }
    }
    console.log(`   Total products with size tables: ${sizeTableCount}`);
}

checkFinnishTranslations(); 