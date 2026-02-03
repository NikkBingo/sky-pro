const fs = require('fs');

function directManualExtract() {
    console.log('🔍 Direct manual extraction from Finnish translations...\n');
    
    // Read the Finnish translations file
    const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
    const lines = finnishContent.split('\n');
    
    // Find the 10360 body_html row and manually reconstruct the complete content
    let sizeChart10360 = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes("'10360") && line.includes(';body_html;')) {
            console.log(`📋 Found 10360 body_html at line ${i + 1}`);
            
            // Manually reconstruct the complete row by reading until the next PRODUCT line
            let completeRow = line;
            let j = i + 1;
            
            while (j < lines.length) {
                const nextLine = lines[j];
                if (nextLine.startsWith('PRODUCT;') && !nextLine.includes("'10360")) {
                    console.log(`📋 Row ends at line ${j + 1}`);
                    break;
                }
                completeRow += '\n' + nextLine;
                j++;
            }
            
            console.log(`📏 Complete row length: ${completeRow.length} characters`);
            
            // Now manually parse the complete row to extract the translated content
            const translatedContent = extractTranslatedContent(completeRow);
            console.log(`📏 Translated content length: ${translatedContent.length}`);
            
            const sizeTableStart = translatedContent.indexOf('<div class="size-table">');
            if (sizeTableStart !== -1) {
                sizeChart10360 = translatedContent.substring(sizeTableStart);
                console.log(`✅ Found complete size chart (${sizeChart10360.length} chars)`);
                console.log(`📏 Size chart ends: ${sizeChart10360.substring(sizeChart10360.length - 100)}`);
                
                // Update the output CSV with the complete size chart
                updateOutputCSVWithSizeChart(sizeChart10360);
            } else {
                console.log('❌ No size table found in translated content');
            }
            break;
        }
    }
    
    if (sizeChart10360.length === 0) {
        console.log('❌ Could not extract size chart for 10360');
    }
}

function extractTranslatedContent(completeRow) {
    // Manually parse the CSV row to extract the 8th column (Translated content)
    let inQuotes = false;
    let currentColumn = '';
    let columnIndex = 0;
    let translatedContent = '';
    
    for (let i = 0; i < completeRow.length; i++) {
        const char = completeRow[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ';' && !inQuotes) {
            // End of column
            if (columnIndex === 7) { // 8th column (0-indexed)
                translatedContent = currentColumn;
                break;
            }
            columnIndex++;
            currentColumn = '';
        } else {
            currentColumn += char;
        }
    }
    
    // If we haven't found the 8th column yet, it's the last one
    if (columnIndex === 7) {
        translatedContent = currentColumn;
    }
    
    return translatedContent;
}

function updateOutputCSVWithSizeChart(completeSizeChart) {
    console.log('\n🔍 Updating output CSV with complete size chart...');
    
    // Read the output CSV as raw text
    const outputContent = fs.readFileSync('KH-print_skypro_translated_complete.csv', 'utf8');
    const lines = outputContent.split('\n');
    
    // Build product handle map
    const productHandleMap = {};
    for (const line of lines) {
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
    outLines.push(lines[0]); // Header
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
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
                        const newContent = cleanDescription + '<br><br>' + completeSizeChart;
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

directManualExtract(); 