const fs = require('fs');

function checkCSVLimits() {
    console.log('🔍 Checking CSV character limits and encoding...\n');
    
    // Check the Finnish translations file
    const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
    const lines = finnishContent.split('\n');
    
    let maxLength = 0;
    let longestLine = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length > maxLength) {
            maxLength = line.length;
            longestLine = line;
        }
    }
    
    console.log(`📊 Finnish translations file analysis:`);
    console.log(`   Total lines: ${lines.length}`);
    console.log(`   Maximum line length: ${maxLength} characters`);
    console.log(`   File size: ${finnishContent.length} characters`);
    
    // Check the output file
    const outputContent = fs.readFileSync('KH-print_skypro_translated_complete.csv', 'utf8');
    const outputLines = outputContent.split('\n');
    
    let outputMaxLength = 0;
    let outputLongestLine = '';
    
    for (let i = 0; i < outputLines.length; i++) {
        const line = outputLines[i];
        if (line.length > outputMaxLength) {
            outputMaxLength = line.length;
            outputLongestLine = line;
        }
    }
    
    console.log(`\n📊 Output file analysis:`);
    console.log(`   Total lines: ${outputLines.length}`);
    console.log(`   Maximum line length: ${outputMaxLength} characters`);
    console.log(`   File size: ${outputContent.length} characters`);
    
    // Check for truncation
    console.log(`\n🔍 Checking for truncation patterns:`);
    
    // Look for incomplete size charts
    const truncatedPatterns = outputContent.match(/<div class="size-table">[^<]*<h3 style="background-color: #666/g);
    if (truncatedPatterns) {
        console.log(`   Found ${truncatedPatterns.length} potentially truncated size charts`);
    }
    
    // Check if any lines end with incomplete HTML
    const incompleteHTML = outputContent.match(/[^>]*$/g);
    const incompleteCount = incompleteHTML.filter(line => 
        line.includes('<div') || line.includes('<h3') || line.includes('<table')
    ).length;
    
    console.log(`   Lines ending with incomplete HTML: ${incompleteCount}`);
    
    // Check encoding
    console.log(`\n🔍 Encoding analysis:`);
    const buffer = fs.readFileSync('KH-print_skypro_translated_complete.csv');
    console.log(`   File encoding: ${buffer.toString('utf8').length === buffer.length ? 'UTF-8' : 'Other'}`);
    
    // Check for any null bytes or encoding issues
    const nullBytes = buffer.filter(byte => byte === 0).length;
    console.log(`   Null bytes found: ${nullBytes}`);
    
    // Check if there are any character restrictions
    console.log(`\n🔍 Character analysis:`);
    const specialChars = outputContent.match(/[^\x00-\x7F]/g);
    if (specialChars) {
        console.log(`   Non-ASCII characters found: ${specialChars.length}`);
        const uniqueChars = [...new Set(specialChars)];
        console.log(`   Unique non-ASCII characters: ${uniqueChars.length}`);
    }
    
    // Check for any potential CSV field length limits
    console.log(`\n🔍 CSV field analysis:`);
    const fields = outputContent.split(';');
    let maxFieldLength = 0;
    for (const field of fields) {
        if (field.length > maxFieldLength) {
            maxFieldLength = field.length;
        }
    }
    console.log(`   Maximum field length: ${maxFieldLength} characters`);
    
    // Check if any common limits are being hit
    const limits = [1024, 2048, 4096, 8192, 16384, 32768, 65536];
    for (const limit of limits) {
        if (maxFieldLength > limit) {
            console.log(`   ⚠️  Field length exceeds ${limit} characters`);
        }
    }
}

checkCSVLimits(); 