const fs = require('fs');

function verifySizeChartExtraction() {
    console.log('🔍 Verifying size chart extraction...\n');
    
    // Read the Finnish translations file
    const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
    const lines = finnishContent.split('\n');
    
    // Find a specific product to check
    const productCode = '10360'; // Valueweight T
    let foundProduct = null;
    
    for (const line of lines) {
        if (line.includes(`'${productCode};body_html`)) {
            foundProduct = line;
            break;
        }
    }
    
    if (foundProduct) {
        console.log(`📋 Found product ${productCode} in Finnish translations:`);
        
        // Parse the line to get the translated content
        const parts = foundProduct.split(';');
        if (parts.length >= 8) {
            const translatedContent = parts[7];
            
            // Find the size table
            const sizeTableStart = translatedContent.indexOf('<div class="size-table">');
            if (sizeTableStart !== -1) {
                const sizeTable = translatedContent.substring(sizeTableStart);
                console.log(`\n📏 Size table found, length: ${sizeTable.length} characters`);
                console.log(`📏 Size table starts with: ${sizeTable.substring(0, 100)}...`);
                console.log(`📏 Size table ends with: ${sizeTable.substring(sizeTable.length - 100)}`);
                
                // Check if it's complete
                const hasClosingDiv = sizeTable.includes('</div>');
                const hasTable = sizeTable.includes('<table>');
                const hasClosingTable = sizeTable.includes('</table>');
                
                console.log(`\n✅ Completeness check:`);
                console.log(`   Has opening div: ${sizeTable.includes('<div class="size-table">')}`);
                console.log(`   Has closing div: ${hasClosingDiv}`);
                console.log(`   Has table: ${hasTable}`);
                console.log(`   Has closing table: ${hasClosingTable}`);
                
                if (hasClosingDiv && hasTable && hasClosingTable) {
                    console.log(`   ✅ Size table appears to be complete`);
                } else {
                    console.log(`   ❌ Size table appears to be incomplete`);
                }
            } else {
                console.log(`❌ No size table found in Finnish translations`);
            }
        }
    }
    
    // Now check the output file
    console.log(`\n🔍 Checking output file for product ${productCode}...`);
    const outputContent = fs.readFileSync('KH-print_skypro_translated_complete.csv', 'utf8');
    const outputLines = outputContent.split('\n');
    
    for (const line of outputLines) {
        if (line.includes(`'${productCode};body_html`)) {
            console.log(`📋 Found product ${productCode} in output file:`);
            
            // Parse the line
            const parts = line.split(';');
            if (parts.length >= 8) {
                const translatedContent = parts[7];
                
                // Find the size table
                const sizeTableStart = translatedContent.indexOf('<div class="size-table">');
                if (sizeTableStart !== -1) {
                    const sizeTable = translatedContent.substring(sizeTableStart);
                    console.log(`\n📏 Size table in output, length: ${sizeTable.length} characters`);
                    console.log(`📏 Size table starts with: ${sizeTable.substring(0, 100)}...`);
                    console.log(`📏 Size table ends with: ${sizeTable.substring(sizeTable.length - 100)}`);
                    
                    // Check if it's complete
                    const hasClosingDiv = sizeTable.includes('</div>');
                    const hasTable = sizeTable.includes('<table>');
                    const hasClosingTable = sizeTable.includes('</table>');
                    
                    console.log(`\n✅ Output completeness check:`);
                    console.log(`   Has opening div: ${sizeTable.includes('<div class="size-table">')}`);
                    console.log(`   Has closing div: ${hasClosingDiv}`);
                    console.log(`   Has table: ${hasTable}`);
                    console.log(`   Has closing table: ${hasClosingTable}`);
                    
                    if (hasClosingDiv && hasTable && hasClosingTable) {
                        console.log(`   ✅ Output size table appears to be complete`);
                    } else {
                        console.log(`   ❌ Output size table appears to be incomplete`);
                    }
                } else {
                    console.log(`❌ No size table found in output file`);
                }
            }
            break;
        }
    }
    
    // Check for any truncation patterns in the output
    console.log(`\n🔍 Checking for truncation patterns in output...`);
    const truncatedMatches = outputContent.match(/<div class="size-table">[^<]*<h3 style="background-color: #666[^"]*"[^>]*$/gm);
    if (truncatedMatches) {
        console.log(`❌ Found ${truncatedMatches.length} potentially truncated size charts:`);
        truncatedMatches.forEach((match, index) => {
            console.log(`   ${index + 1}. ${match.substring(0, 100)}...`);
        });
    } else {
        console.log(`✅ No obvious truncation patterns found`);
    }
}

verifySizeChartExtraction(); 