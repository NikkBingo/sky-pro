const fs = require('fs');

function simpleSizeChartExtract() {
    console.log('🔍 Manually extracting size charts from Finnish translations...\n');
    
    // Read the Finnish translations file
    const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
    const lines = finnishContent.split('\n');
    
    // Find the 10360 body_html row and extract the complete content
    let sizeChart10360 = '';
    let in10360Row = false;
    let currentRow = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes("'10360") && line.includes(';body_html;')) {
            in10360Row = true;
            currentRow = line;
        } else if (in10360Row) {
            currentRow += '\n' + line;
            
            // Check if we've reached the end of the row (next PRODUCT line)
            if (line.startsWith('PRODUCT;') && !line.includes("'10360")) {
                in10360Row = false;
                
                // Extract the translated content (8th column)
                const parts = currentRow.split(';');
                if (parts.length >= 8) {
                    const translatedContent = parts[7];
                    const sizeTableStart = translatedContent.indexOf('<div class="size-table">');
                    if (sizeTableStart !== -1) {
                        sizeChart10360 = translatedContent.substring(sizeTableStart);
                        console.log(`✅ Found complete size chart for 10360 (${sizeChart10360.length} chars)`);
                        console.log(`   Ends with: ${sizeChart10360.substring(sizeChart10360.length - 50)}`);
                    }
                }
                break;
            }
        }
    }
    
    if (sizeChart10360.length === 0) {
        console.log('❌ Could not extract size chart for 10360');
        return;
    }
    
    // Now update the output CSV with the complete size chart
    console.log('\n🔍 Updating output CSV with complete size chart...');
    
    const outputContent = fs.readFileSync('KH-print_skypro_translated_complete.csv', 'utf8');
    const outputLines = outputContent.split('\n');
    
    // Build product handle map
    const productHandleMap = {};
    for (const line of outputLines) {
        if (line.includes(';handle;')) {
            const parts = line.split(';');
            if (parts.length >= 7) {
                const productId = parts[1].replace("'", "");
                const handle = parts[6].replace(/"/g, '');
                productHandleMap[productId] = handle;
            }
        }
    }
    
    // Process each line and embed complete size charts
    const outLines = [];
    outLines.push(outputLines[0]); // Header
    
    for (let i = 1; i < outputLines.length; i++) {
        const line = outputLines[i];
        if (!line.trim()) continue;
        
        if (line.includes(';body_html;')) {
            const parts = line.split(';');
            if (parts.length >= 8) {
                const productId = parts[1].replace("'", "");
                const handle = productHandleMap[productId];
                
                if (handle && handle.startsWith('10360')) {
                    console.log(`✅ Embedding complete size chart for handle ${handle}`);
                    const content = parts[7];
                    const sizeTableStart = content.indexOf('<div class="size-table">');
                    if (sizeTableStart !== -1) {
                        const description = content.substring(0, sizeTableStart).trim();
                        const cleanDescription = description.replace(/(<br>)+$/, '');
                        const newContent = cleanDescription + '<br><br>' + sizeChart10360;
                        parts[7] = escapeCell(newContent);
                    }
                }
                
                parts[6] = escapeCell(parts[6]);
                outLines.push(parts.join(';'));
            } else {
                outLines.push(line);
            }
        } else {
            outLines.push(line);
        }
    }
    
    // Write the updated CSV
    fs.writeFileSync('KH-print_skypro_translated_complete.csv', outLines.join('\n'), 'utf8');
    console.log('✅ CSV updated with complete size chart for 10360.');
}

function escapeCell(cell) {
    if (!cell) return '';
    let out = cell.replace(/\r?\n/g, '<br>');
    out = out.replace(/"/g, '""');
    return '"' + out + '"';
}

simpleSizeChartExtract(); 