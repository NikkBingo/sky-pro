const fs = require('fs');

function checkActualContent() {
    console.log('🔍 Checking actual content around position 584...\n');
    
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
                
                // Check around position 584
                const startPos = Math.max(0, 584 - 50);
                const endPos = Math.min(translatedContent.length, 584 + 200);
                console.log(`📏 Content around position 584 (${startPos}-${endPos}):`);
                console.log(translatedContent.substring(startPos, endPos));
                
                // Look for the complete size table
                const sizeTableStart = translatedContent.indexOf('<div class=size-table>');
                if (sizeTableStart !== -1) {
                    console.log(`\n✅ Found size table at position ${sizeTableStart}`);
                    
                    // Look for the end of the size table
                    const sizeTableEnd = translatedContent.indexOf('</div>', sizeTableStart);
                    if (sizeTableEnd !== -1) {
                        // Find the closing </div> that matches the opening <div class=size-table>
                        let depth = 0;
                        let endPos = sizeTableStart;
                        for (let i = sizeTableStart; i < translatedContent.length; i++) {
                            if (translatedContent.substring(i, i + 6) === '<div ') {
                                depth++;
                            } else if (translatedContent.substring(i, i + 7) === '</div>') {
                                depth--;
                                if (depth === 0) {
                                    endPos = i + 7;
                                    break;
                                }
                            }
                        }
                        
                        const completeSizeTable = translatedContent.substring(sizeTableStart, endPos);
                        console.log(`📏 Complete size table length: ${completeSizeTable.length} characters`);
                        console.log(`📏 Size table ends: ${completeSizeTable.substring(completeSizeTable.length - 100)}`);
                        
                        // Update the output CSV with this size table
                        updateOutputCSV(completeSizeTable);
                    } else {
                        console.log('❌ Could not find end of size table');
                    }
                } else {
                    console.log('❌ No size table found');
                }
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

checkActualContent(); 