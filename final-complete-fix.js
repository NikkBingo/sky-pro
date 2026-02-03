const fs = require('fs');
const csv = require('csv-parser');

function finalCompleteFix() {
    console.log('🔍 Final fix using proper CSV parsing...\n');
    
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
                        
                        // Now update the output CSV with the complete size chart
                        updateOutputCSVWithCompleteSizeChart(sizeTable);
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

function updateOutputCSVWithCompleteSizeChart(completeSizeChart) {
    console.log('\n🔍 Updating output CSV with complete size chart...');
    
    // Read the output CSV using the same proper parsing
    return new Promise((resolve, reject) => {
        const outputResults = [];
        
        fs.createReadStream('KH-print_skypro_translated_complete.csv')
            .pipe(csv({ separator: ';' }))
            .on('data', (data) => {
                outputResults.push(data);
            })
            .on('end', () => {
                console.log(`📋 Parsed ${outputResults.length} rows from output CSV`);
                
                // Build product handle map
                const productHandleMap = {};
                for (const row of outputResults) {
                    if (row.Field === 'handle') {
                        const productId = row.Identification.replace("'", "");
                        const handle = row['Default content'].replace(/"/g, '');
                        productHandleMap[productId] = handle;
                    }
                }
                
                // Process each row and embed complete size charts
                const updatedRows = [];
                
                for (const row of outputResults) {
                    if (row.Field === 'body_html') {
                        const productId = row.Identification.replace("'", "");
                        const handle = productHandleMap[productId];
                        
                        if (handle && handle.startsWith('10360')) {
                            console.log(`✅ Embedding complete size chart for handle ${handle}`);
                            
                            // Replace the existing size chart with the complete one
                            const content = row['Translated content'];
                            const sizeTableStart = content.indexOf('<div class="size-table">');
                            
                            if (sizeTableStart !== -1) {
                                const description = content.substring(0, sizeTableStart).trim();
                                const cleanDescription = description.replace(/(<br>)+$/, '');
                                const newContent = cleanDescription + '<br><br>' + completeSizeChart;
                                row['Translated content'] = newContent;
                            }
                        }
                    }
                    updatedRows.push(row);
                }
                
                // Write the updated CSV
                writeUpdatedCSV(updatedRows);
                resolve();
            })
            .on('error', (error) => {
                console.error('❌ Error parsing output CSV:', error);
                reject(error);
            });
    });
}

function writeUpdatedCSV(rows) {
    console.log('📝 Writing updated CSV...');
    
    // Create CSV header
    const headers = ['Type', 'Identification', 'Field', 'Locale', 'Market', 'Status', 'Default content', 'Translated content'];
    
    // Convert rows back to CSV format
    const csvLines = [headers.join(';')];
    
    for (const row of rows) {
        const line = [
            row.Type || '',
            row.Identification || '',
            row.Field || '',
            row.Locale || '',
            row.Market || '',
            row.Status || '',
            escapeCell(row['Default content'] || ''),
            escapeCell(row['Translated content'] || '')
        ].join(';');
        csvLines.push(line);
    }
    
    fs.writeFileSync('KH-print_skypro_translated_complete.csv', csvLines.join('\n'), 'utf8');
    console.log('✅ CSV updated with complete size chart for 10360.');
}

function escapeCell(cell) {
    if (!cell) return '';
    let out = cell.replace(/\r?\n/g, '<br>');
    out = out.replace(/"/g, '""');
    return '"' + out + '"';
}

finalCompleteFix().catch(console.error); 