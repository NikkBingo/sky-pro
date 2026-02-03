const fs = require('fs');

async function fixCSVMultiline() {
    try {
        console.log('🔧 Fixing CSV multiline structure...');
        
        // Read the entire file
        const csvContent = fs.readFileSync('KH-print_skypro_translated.csv', 'utf8');
        
        // Parse the CSV properly by handling multiline content
        const rows = [];
        const lines = csvContent.split('\n');
        let currentRow = '';
        let inQuotedField = false;
        let quoteCount = 0;
        
        for (const line of lines) {
            if (line.startsWith('PRODUCT;') || line.startsWith('Type;')) {
                // Process the previous row if it exists
                if (currentRow) {
                    rows.push(currentRow);
                }
                currentRow = line;
                quoteCount = 0;
            } else if (line.trim()) {
                // Count quotes in this line
                const quotesInLine = (line.match(/"/g) || []).length;
                quoteCount += quotesInLine;
                
                if (quoteCount % 2 === 1) {
                    // This line continues a quoted field
                    currentRow += '\n' + line;
                } else {
                    // This is a new row
                    if (currentRow) {
                        rows.push(currentRow);
                    }
                    currentRow = line;
                }
            }
        }
        
        // Add the last row
        if (currentRow) {
            rows.push(currentRow);
        }
        
        // Write the fixed CSV
        fs.writeFileSync('KH-print_skypro_translated_fixed.csv', rows.join('\n'), 'utf8');
        console.log('✅ Fixed CSV structure saved to: KH-print_skypro_translated_fixed.csv');
        
        // Copy to the main file
        fs.copyFileSync('KH-print_skypro_translated_fixed.csv', 'KH-print_skypro_translated.csv');
        console.log('✅ Updated main file with fixed structure');
        
    } catch (error) {
        console.error('❌ Error fixing CSV structure:', error.message);
    }
}

fixCSVMultiline(); 