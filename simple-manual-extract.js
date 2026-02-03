const fs = require('fs');

function simpleManualExtract() {
    console.log('🔍 Simple manual extraction of size charts...\n');
    
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
            console.log(`📋 Found 10360 body_html at line ${i + 1}`);
        } else if (in10360Row) {
            currentRow += '\n' + line;
            
            // Check if we've reached the end of the row (next PRODUCT line)
            if (line.startsWith('PRODUCT;') && !line.includes("'10360")) {
                in10360Row = false;
                console.log(`📋 Row ends at line ${i + 1}`);
                
                // Extract the translated content (8th column)
                const parts = currentRow.split(';');
                if (parts.length >= 8) {
                    const translatedContent = parts[7];
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
                }
                break;
            }
        }
    }
    
    if (sizeChart10360.length === 0) {
        console.log('❌ Could not extract size chart for 10360');
    }
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

simpleManualExtract(); 