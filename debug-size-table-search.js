const fs = require('fs');

function debugSizeTableSearch() {
    console.log('🔍 Debugging size table search...\n');
    
    // Read the Finnish translations file
    const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
    const lines = finnishContent.split('\n');
    
    // Find the 10360 body_html row and reconstruct the complete row
    let completeRow = '';
    let found = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes("'10360") && line.includes(';body_html;')) {
            found = true;
            console.log(`📋 Found 10360 body_html starting at line ${i + 1}`);
            completeRow = line;
            
            // Continue reading until we find the next PRODUCT line
            for (let j = i + 1; j < lines.length; j++) {
                const nextLine = lines[j];
                if (nextLine.startsWith('PRODUCT;') && !nextLine.includes("'10360")) {
                    console.log(`📋 Row ends at line ${j + 1}`);
                    break;
                }
                completeRow += '\n' + nextLine;
            }
            
            console.log(`📏 Complete row length: ${completeRow.length} characters`);
            
            // Parse the complete row properly handling quoted cells
            const parts = parseQuotedCSV(completeRow);
            console.log(`📊 Complete row has ${parts.length} parts`);
            
            if (parts.length >= 8) {
                const translatedContent = parts[7];
                console.log(`📏 Translated content length: ${translatedContent.length}`);
                console.log(`📏 First 200 chars: ${translatedContent.substring(0, 200)}`);
                console.log(`📏 Last 200 chars: ${translatedContent.substring(translatedContent.length - 200)}`);
                
                // Try different search patterns
                const patterns = [
                    '<div class="size-table">',
                    '<div class=size-table>',
                    '<div class="size-table"',
                    '<div class=size-table',
                    'size-table'
                ];
                
                for (const pattern of patterns) {
                    const pos = translatedContent.indexOf(pattern);
                    if (pos !== -1) {
                        console.log(`\n✅ Found pattern "${pattern}" at position ${pos}`);
                        const sizeTable = translatedContent.substring(pos);
                        console.log(`📏 Size table length: ${sizeTable.length} characters`);
                        console.log(`📏 Size table starts: ${sizeTable.substring(0, 100)}`);
                        console.log(`📏 Size table ends: ${sizeTable.substring(sizeTable.length - 100)}`);
                        
                        // Update the output CSV with this size table
                        updateOutputCSV(sizeTable);
                        return;
                    }
                }
                
                console.log('❌ No size table found with any pattern');
            }
            break;
        }
    }
    
    if (!found) {
        console.log('❌ Could not find 10360 body_html row');
    }
}

function parseQuotedCSV(row) {
    const parts = [];
    let currentPart = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < row.length) {
        const char = row[i];
        
        if (char === '"') {
            if (inQuotes && i + 1 < row.length && row[i + 1] === '"') {
                // Escaped quote
                currentPart += '"';
                i += 2;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ';' && !inQuotes) {
            // End of field
            parts.push(currentPart);
            currentPart = '';
            i++;
        } else {
            // Regular character
            currentPart += char;
            i++;
        }
    }
    
    // Add the last part
    parts.push(currentPart);
    return parts;
}

function updateOutputCSV(completeSizeChart) {
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

debugSizeTableSearch(); 