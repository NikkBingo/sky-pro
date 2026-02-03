const fs = require('fs');

async function fixCSVStructure() {
    try {
        console.log('🔧 Fixing CSV structure...');
        
        // Read the current CSV file
        const csvContent = fs.readFileSync('KH-print_skypro_translated.csv', 'utf8');
        const lines = csvContent.split('\n');
        
        // Process the CSV properly by handling multiline content
        const fixedLines = [];
        let currentRow = '';
        let inQuotedField = false;
        let quoteCount = 0;
        
        for (const line of lines) {
            if (line.startsWith('PRODUCT;')) {
                // Process the previous row if it exists
                if (currentRow) {
                    fixedLines.push(currentRow);
                }
                currentRow = line;
                inQuotedField = false;
                quoteCount = 0;
            } else if (line.trim()) {
                // Check if this line continues a quoted field
                const quotesInLine = (line.match(/"/g) || []).length;
                quoteCount += quotesInLine;
                
                if (quoteCount % 2 === 1) {
                    // This line continues a quoted field
                    currentRow += '\n' + line;
                } else {
                    // This is a new row
                    if (currentRow) {
                        fixedLines.push(currentRow);
                    }
                    currentRow = line;
                }
            }
        }
        
        // Add the last row
        if (currentRow) {
            fixedLines.push(currentRow);
        }
        
        // Write the fixed CSV
        fs.writeFileSync('KH-print_skypro_translated_fixed.csv', fixedLines.join('\n'), 'utf8');
        console.log('✅ Fixed CSV structure saved to: KH-print_skypro_translated_fixed.csv');
        
        // Copy to the main file
        fs.copyFileSync('KH-print_skypro_translated_fixed.csv', 'KH-print_skypro_translated.csv');
        console.log('✅ Updated main file with fixed structure');
        
    } catch (error) {
        console.error('❌ Error fixing CSV structure:', error.message);
    }
}

fixCSVStructure(); 