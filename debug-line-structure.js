const fs = require('fs');

function debugLineStructure() {
    console.log('🔍 Debugging line 87 structure...\n');
    
    // Read the Finnish translations file
    const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
    const lines = finnishContent.split('\n');
    
    // Get line 87 (index 86)
    const line87 = lines[86];
    console.log(`📋 Line 87 (${line87.length} characters):`);
    console.log(`   Raw: ${line87.substring(0, 500)}...`);
    
    // Split by semicolons
    const parts = line87.split(';');
    console.log(`\n📊 Line has ${parts.length} parts:`);
    for (let i = 0; i < parts.length; i++) {
        console.log(`   Part ${i}: "${parts[i].substring(0, 100)}..."`);
    }
    
    // Check if there are quoted cells that might contain semicolons
    console.log(`\n🔍 Checking for quoted cells...`);
    let inQuotes = false;
    let currentPart = '';
    let actualParts = [];
    
    for (let i = 0; i < line87.length; i++) {
        const char = line87[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ';' && !inQuotes) {
            actualParts.push(currentPart);
            currentPart = '';
        } else {
            currentPart += char;
        }
    }
    actualParts.push(currentPart);
    
    console.log(`\n📊 Actual parts (handling quotes): ${actualParts.length}`);
    for (let i = 0; i < actualParts.length; i++) {
        console.log(`   Part ${i}: "${actualParts[i].substring(0, 100)}..."`);
    }
    
    // Try to find the size table in the last part
    if (actualParts.length >= 8) {
        const translatedContent = actualParts[7];
        console.log(`\n📏 Translated content length: ${translatedContent.length}`);
        console.log(`📏 First 200 chars: ${translatedContent.substring(0, 200)}`);
        console.log(`📏 Last 200 chars: ${translatedContent.substring(translatedContent.length - 200)}`);
        
        const sizeTableStart = translatedContent.indexOf('<div class="size-table">');
        if (sizeTableStart !== -1) {
            const sizeTable = translatedContent.substring(sizeTableStart);
            console.log(`\n✅ Found size table at position ${sizeTableStart}`);
            console.log(`📏 Size table length: ${sizeTable.length}`);
            console.log(`📏 Size table ends: ${sizeTable.substring(sizeTable.length - 100)}`);
        } else {
            console.log(`\n❌ No size table found`);
        }
    }
}

debugLineStructure(); 