const fs = require('fs');
const csv = require('csv-parser');

function freshCSVWriter() {
    console.log('🔍 Fresh CSV writer starting from original file...\n');
    
    // Extract size charts using csv-parser
    const sizeCharts = {};
    
    // Extract 10360 size chart
    console.log('📋 Extracting 10360 size chart...');
    extractSizeChartWithCSVParser('10360').then(sizeChart => {
        sizeCharts['10360'] = sizeChart;
        
        // Extract 10380 size chart
        console.log('📋 Extracting 10380 size chart...');
        return extractSizeChartWithCSVParser('10380');
    }).then(sizeChart => {
        sizeCharts['10380'] = sizeChart;
        
        // Extract 10440 size chart
        console.log('📋 Extracting 10440 size chart...');
        return extractSizeChartWithCSVParser('10440');
    }).then(sizeChart => {
        sizeCharts['10440'] = sizeChart;
        
        // Log the results
        for (const [productCode, sizeChart] of Object.entries(sizeCharts)) {
            if (sizeChart.length > 0) {
                console.log(`✅ Product ${productCode}: ${sizeChart.length} characters`);
                console.log(`📏 Size chart ends: ${sizeChart.substring(sizeChart.length - 100)}`);
            } else {
                console.log(`❌ Product ${productCode}: No size chart found`);
            }
        }
        
        // Update the original CSV with the complete size charts
        updateOriginalCSVWithSizeCharts(sizeCharts);
    }).catch(error => {
        console.error('❌ Error:', error);
    });
}

function extractSizeChartWithCSVParser(productCode) {
    return new Promise((resolve, reject) => {
        const results = [];
        
        fs.createReadStream('finnish-translations.csv')
            .pipe(csv({ separator: ';' }))
            .on('data', (data) => {
                // Look for the specific product and field
                if (data.Type === 'PRODUCT' && 
                    data.Identification === `'${productCode}` && 
                    data.Field === 'body_html') {
                    results.push(data);
                }
            })
            .on('end', () => {
                if (results.length > 0) {
                    const translatedContent = results[0]['Translated content'];
                    const sizeTableStart = translatedContent.indexOf('<div class="size-table">');
                    
                    if (sizeTableStart !== -1) {
                        const sizeTable = translatedContent.substring(sizeTableStart);
                        // Convert newlines to <br> for CSV compatibility
                        const sizeChart = sizeTable.replace(/\r?\n/g, '<br>');
                        resolve(sizeChart);
                    } else {
                        resolve('');
                    }
                } else {
                    resolve('');
                }
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

function updateOriginalCSVWithSizeCharts(sizeCharts) {
    console.log('\n🔍 Updating original CSV with complete size charts...');
    
    // Read the original CSV as raw text
    const outputContent = fs.readFileSync('KH-print_skypro_translated.csv', 'utf8');
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
                
                if (handle) {
                    const productCode = extractProductCode(handle);
                    if (productCode && sizeCharts[productCode]) {
                        console.log(`✅ Embedding complete size chart for handle ${handle} (product ${productCode})`);
                        const content = parts[7];
                        const sizeTableStart = content.indexOf('<div class="size-table">');
                        if (sizeTableStart !== -1) {
                            const description = content.substring(0, sizeTableStart).trim();
                            const cleanDescription = description.replace(/(<br>)+$/, '');
                            const newContent = cleanDescription + '<br><br>' + sizeCharts[productCode];
                            parts[7] = escapeCSVCell(newContent);
                        }
                    }
                }
                
                parts[6] = escapeCSVCell(parts[6]);
                outLines.push(parts.join(';'));
            } else {
                outLines.push(line);
            }
        } else {
            outLines.push(line);
        }
    }
    
    // Write the updated CSV using simple approach
    writeFreshCSV(outLines);
}

function escapeCSVCell(cell) {
    if (!cell) return '';
    
    // Replace newlines with <br> for CSV compatibility
    let out = cell.replace(/\r?\n/g, '<br>');
    
    // If the cell contains quotes, semicolons, or newlines, wrap in quotes
    if (out.includes('"') || out.includes(';') || out.includes('\n') || out.includes('\r')) {
        // Escape quotes by doubling them
        out = out.replace(/"/g, '""');
        // Wrap in quotes
        out = '"' + out + '"';
    }
    
    return out;
}

function writeFreshCSV(lines) {
    console.log('📝 Writing fresh CSV with proper formatting...');
    
    // Use a simple approach: write line by line
    const outputStream = fs.createWriteStream('KH-print_skypro_translated_fresh.csv', {
        encoding: 'utf8',
        flags: 'w'
    });
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        outputStream.write(line + '\n');
        
        // Log progress for large files
        if (i % 100 === 0) {
            console.log(`📝 Written ${i} lines...`);
        }
    }
    
    outputStream.end();
    
    // Wait for the stream to finish
    outputStream.on('finish', () => {
        console.log('✅ Fresh CSV written with proper formatting.');
        
        // Verify the file was written correctly
        const stats = fs.statSync('KH-print_skypro_translated_fresh.csv');
        console.log(`📊 File size: ${stats.size} bytes`);
        
        // Check a sample of the output
        const sampleContent = fs.readFileSync('KH-print_skypro_translated_fresh.csv', 'utf8');
        const sampleLines = sampleContent.split('\n').slice(0, 5);
        console.log('📋 Sample output:');
        sampleLines.forEach((line, index) => {
            if (line.trim()) {
                console.log(`Line ${index + 1}: ${line.substring(0, 100)}...`);
            }
        });
        
        // Check if size charts are present
        const fullContent = fs.readFileSync('KH-print_skypro_translated_fresh.csv', 'utf8');
        const sizeTableCount = (fullContent.match(/<div class="size-table">/g) || []).length;
        console.log(`📊 Found ${sizeTableCount} size table divs in the output`);
    });
}

function extractProductCode(handle) {
    const match = handle.match(/^(\d+)/);
    return match ? match[1] : null;
}

freshCSVWriter(); 