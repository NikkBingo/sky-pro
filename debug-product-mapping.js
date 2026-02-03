const fs = require('fs');

function debugProductMapping() {
    console.log('🔍 Debugging product code mapping...\n');
    
    // Read Finnish translations file
    const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
    const finnishLines = finnishContent.split('\n');
    
    // Read output file
    const outputContent = fs.readFileSync('KH-print_skypro_translated_complete.csv', 'utf8');
    const outputLines = outputContent.split('\n');
    
    // Extract product codes from Finnish translations
    const finnishProductCodes = new Set();
    for (const line of finnishLines) {
        if (line.includes(';body_html;')) {
            const parts = line.split(';');
            if (parts.length >= 2) {
                const productCode = parts[1].replace("'", "");
                finnishProductCodes.add(productCode);
            }
        }
    }
    
    console.log(`📋 Finnish translations product codes: ${Array.from(finnishProductCodes).join(', ')}`);
    
    // Extract product codes from output file
    const outputProductCodes = new Set();
    for (const line of outputLines) {
        if (line.includes(';body_html;')) {
            const parts = line.split(';');
            if (parts.length >= 2) {
                const productCode = parts[1].replace("'", "");
                outputProductCodes.add(productCode);
            }
        }
    }
    
    console.log(`📋 Output file product codes (first 10): ${Array.from(outputProductCodes).slice(0, 10).join(', ')}`);
    
    // Check for any matches
    const matches = Array.from(finnishProductCodes).filter(code => outputProductCodes.has(code));
    console.log(`\n✅ Matching product codes: ${matches.length > 0 ? matches.join(', ') : 'None'}`);
    
    if (matches.length === 0) {
        console.log(`❌ No product codes match between files!`);
        
        // Let's look at the handles in the output file
        console.log(`\n🔍 Checking handles in output file...`);
        const handles = new Set();
        for (const line of outputLines) {
            if (line.includes(';handle;')) {
                const handleMatch = line.match(/handle;fi;;;([^;]+);/);
                if (handleMatch) {
                    handles.add(handleMatch[1]);
                }
            }
        }
        
        console.log(`📋 Handles in output file (first 10): ${Array.from(handles).slice(0, 10).join(', ')}`);
        
        // Try to extract product codes from handles
        const extractedCodes = new Set();
        for (const handle of handles) {
            const match = handle.match(/^(\d+)/);
            if (match) {
                extractedCodes.add(match[1]);
            }
        }
        
        console.log(`📋 Extracted product codes from handles: ${Array.from(extractedCodes).join(', ')}`);
        
        // Check for matches with extracted codes
        const extractedMatches = Array.from(finnishProductCodes).filter(code => extractedCodes.has(code));
        console.log(`✅ Matching extracted codes: ${extractedMatches.length > 0 ? extractedMatches.join(', ') : 'None'}`);
    }
    
    // Let's also check what the current script is actually doing
    console.log(`\n🔍 Testing the current extraction logic...`);
    
    // Test the current extraction logic on a sample
    const sampleLine = outputLines.find(line => line.includes(';body_html;'));
    if (sampleLine) {
        console.log(`📋 Sample line: ${sampleLine.substring(0, 100)}...`);
        
        const handle = sampleLine.match(/handle;fi;;;([^;]+);/)?.[1];
        console.log(`📋 Extracted handle: ${handle}`);
        
        if (handle) {
            const productCode = handle.match(/^(\d+)/)?.[1];
            console.log(`📋 Extracted product code: ${productCode}`);
            
            // Check if this product code exists in Finnish translations
            const exists = finnishProductCodes.has(productCode);
            console.log(`📋 Product code exists in Finnish translations: ${exists}`);
        }
    }
}

debugProductMapping(); 