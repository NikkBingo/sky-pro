const fs = require('fs');

function testCSVWriting() {
    console.log('🔍 Testing CSV writing with complete size chart...\n');
    
    // Get the complete size chart from Finnish translations using robust parsing
    const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
    const lines = finnishContent.split(/\r?\n/);
    
    // Robust parsing to handle multiline cells
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
    
    let completeSizeChart = '';
    for (const row of rows) {
        if (row.includes("'10360") && row.includes(';body_html;')) {
            const parts = row.split(';');
            if (parts.length >= 8) {
                const translatedContent = parts[7];
                const sizeTableStart = translatedContent.indexOf('<div class="size-table">');
                if (sizeTableStart !== -1) {
                    completeSizeChart = translatedContent.substring(sizeTableStart);
                    break;
                }
            }
        }
    }
    
    console.log(`📏 Complete size chart length: ${completeSizeChart.length} characters`);
    console.log(`📏 Size chart starts: ${completeSizeChart.substring(0, 100)}`);
    console.log(`📏 Size chart ends: ${completeSizeChart.substring(completeSizeChart.length - 100)}`);
    
    // Test the escapeCell function
    function escapeCell(cell) {
        if (!cell) return '';
        // Replace all newlines with <br>
        let out = cell.replace(/\r?\n/g, '<br>');
        // Escape quotes for CSV
        out = out.replace(/"/g, '""');
        return '"' + out + '"';
    }
    
    const escapedSizeChart = escapeCell(completeSizeChart);
    console.log(`\n📏 Escaped size chart length: ${escapedSizeChart.length} characters`);
    console.log(`📏 Escaped size chart ends: ${escapedSizeChart.substring(escapedSizeChart.length - 100)}`);
    
    // Write a test CSV
    const testCSV = `Type;Identification;Field;Locale;Market;Status;Default content;Translated content
PRODUCT;'10360;body_html;fi;;;"Test content";${escapedSizeChart}`;
    
    fs.writeFileSync('test-csv-writing.csv', testCSV, 'utf8');
    console.log('\n✅ Test CSV written to test-csv-writing.csv');
    
    // Read it back and check
    const readBack = fs.readFileSync('test-csv-writing.csv', 'utf8');
    console.log(`\n📏 Read back CSV length: ${readBack.length} characters`);
    console.log(`📏 Read back CSV ends: ${readBack.substring(readBack.length - 100)}`);
    
    // Check if the size chart is complete in the read back file
    const sizeTableStart = readBack.indexOf('<div class="size-table">');
    if (sizeTableStart !== -1) {
        const sizeTable = readBack.substring(sizeTableStart);
        console.log(`\n📏 Size table in read back file length: ${sizeTable.length} characters`);
        console.log(`📏 Size table in read back file ends: ${sizeTable.substring(sizeTable.length - 100)}`);
    }
}

testCSVWriting(); 