const fs = require('fs');

function directSizeChartExtract() {
    console.log('🔍 Directly extracting complete size charts...\n');
    
    // Read the Finnish translations file
    const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
    
    // Find the 10360 body_html row
    const lines = finnishContent.split('\n');
    let sizeChart10360 = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("'10360") && line.includes(';body_html;')) {
            console.log(`📋 Found 10360 body_html at line ${i + 1}`);
            
            // Split the line by semicolons
            const parts = line.split(';');
            console.log(`📊 Line has ${parts.length} parts`);
            
            if (parts.length >= 8) {
                const translatedContent = parts[7];
                console.log(`📏 Translated content length: ${translatedContent.length}`);
                console.log(`📏 First 200 chars: ${translatedContent.substring(0, 200)}`);
                console.log(`📏 Last 200 chars: ${translatedContent.substring(translatedContent.length - 200)}`);
                
                // Find the size table
                const sizeTableStart = translatedContent.indexOf('<div class="size-table">');
                if (sizeTableStart !== -1) {
                    sizeChart10360 = translatedContent.substring(sizeTableStart);
                    console.log(`✅ Found complete size chart (${sizeChart10360.length} chars)`);
                    console.log(`📏 Size chart ends: ${sizeChart10360.substring(sizeChart10360.length - 100)}`);
                } else {
                    console.log('❌ No size table found in translated content');
                }
            }
            break;
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

directSizeChartExtract(); 