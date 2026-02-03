const fs = require('fs');

function debugCSVStructure() {
    console.log('🔍 Debugging CSV structure...\n');
    
    // Read the output file
    const outputContent = fs.readFileSync('KH-print_skypro_translated_complete.csv', 'utf8');
    const lines = outputContent.split('\n');
    
    // Find a few sample lines to understand the structure
    console.log('📋 Sample lines from the CSV:');
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        if (line.includes(';handle;')) {
            console.log(`\nLine ${i + 1}:`);
            console.log(`   Raw: ${line}`);
            
            // Try different regex patterns
            const patterns = [
                /handle;fi;;;"([^"]+)";/,
                /handle;fi;;;([^;]+);/,
                /handle;fi;;;([^;]+)/,
                /handle;fi;;;"([^"]+)"/,
                /handle;fi;;;([^;]+)/
            ];
            
            for (let j = 0; j < patterns.length; j++) {
                const match = line.match(patterns[j]);
                if (match) {
                    console.log(`   Pattern ${j + 1} match: ${match[1]}`);
                } else {
                    console.log(`   Pattern ${j + 1}: no match`);
                }
            }
        }
    }
    
    // Also check the original input file
    console.log('\n🔍 Checking original input file structure...');
    const inputContent = fs.readFileSync('KH-print_skypro_translated.csv', 'utf8');
    const inputLines = inputContent.split('\n');
    
    for (let i = 0; i < Math.min(10, inputLines.length); i++) {
        const line = inputLines[i];
        if (line.includes(';handle;')) {
            console.log(`\nInput Line ${i + 1}:`);
            console.log(`   Raw: ${line}`);
            
            // Try different regex patterns
            const patterns = [
                /handle;fi;;;"([^"]+)";/,
                /handle;fi;;;([^;]+);/,
                /handle;fi;;;([^;]+)/,
                /handle;fi;;;"([^"]+)"/,
                /handle;fi;;;([^;]+)/
            ];
            
            for (let j = 0; j < patterns.length; j++) {
                const match = line.match(patterns[j]);
                if (match) {
                    console.log(`   Pattern ${j + 1} match: ${match[1]}`);
                } else {
                    console.log(`   Pattern ${j + 1}: no match`);
                }
            }
        }
    }
}

debugCSVStructure(); 