const fs = require('fs');
const csv = require('csv-parser');

function manualCompleteFix() {
    console.log('🔍 Manual complete fix...\n');
    
    // First, extract the complete size chart from Finnish translations
    return new Promise((resolve, reject) => {
        const results = [];
        
        fs.createReadStream('finnish-translations.csv')
            .pipe(csv({ separator: ';' }))
            .on('data', (data) => {
                results.push(data);
            })
            .on('end', () => {
                console.log(`📋 Parsed ${results.length} rows from Finnish translations`);
                
                // Find the 10360 body_html entry
                const bodyHtml10360 = results.find(row => 
                    row.Identification === "'10360" && row.Field === 'body_html'
                );
                
                if (bodyHtml10360) {
                    console.log('✅ Found 10360 body_html entry');
                    console.log(`📏 Translated content length: ${bodyHtml10360['Translated content'].length}`);
                    
                    // Find the size table
                    const translatedContent = bodyHtml10360['Translated content'];
                    const sizeTableStart = translatedContent.indexOf('<div class="size-table">');
                    
                    if (sizeTableStart !== -1) {
                        const sizeTable = translatedContent.substring(sizeTableStart);
                        console.log(`\n✅ Found complete size table (${sizeTable.length} chars)`);
                        console.log(`📏 Size table ends: ${sizeTable.substring(sizeTable.length - 100)}`);
                        
                        // Now manually update the output CSV
                        manuallyUpdateOutputCSV(sizeTable);
                    } else {
                        console.log('❌ No size table found in translated content');
                    }
                } else {
                    console.log('❌ Could not find 10360 body_html entry');
                }
                
                resolve();
            })
            .on('error', (error) => {
                console.error('❌ Error parsing CSV:', error);
                reject(error);
            });
    });
}

function manuallyUpdateOutputCSV(completeSizeChart) {
    console.log('\n🔍 Manually updating output CSV...');
    
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

manualCompleteFix().catch(console.error); 