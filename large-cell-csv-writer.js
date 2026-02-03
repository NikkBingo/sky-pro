const fs = require('fs');

function largeCellCSVWriter() {
    console.log('🔍 Large cell CSV writer with complete size charts...\n');
    
    // Read the Finnish translations file
    const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
    
    // Extract size charts manually by reading specific content
    const sizeCharts = {};
    
    // Extract 10360 size chart
    console.log('📋 Extracting 10360 size chart...');
    const sizeChart10360 = extractSizeChartManual(finnishContent, '10360');
    sizeCharts['10360'] = sizeChart10360;
    
    // Extract 10380 size chart
    console.log('📋 Extracting 10380 size chart...');
    const sizeChart10380 = extractSizeChartManual(finnishContent, '10380');
    sizeCharts['10380'] = sizeChart10380;
    
    // Extract 10440 size chart
    console.log('📋 Extracting 10440 size chart...');
    const sizeChart10440 = extractSizeChartManual(finnishContent, '10440');
    sizeCharts['10440'] = sizeChart10440;
    
    // Log the results
    for (const [productCode, sizeChart] of Object.entries(sizeCharts)) {
        if (sizeChart.length > 0) {
            console.log(`✅ Product ${productCode}: ${sizeChart.length} characters`);
            console.log(`📏 Size chart ends: ${sizeChart.substring(sizeChart.length - 100)}`);
        } else {
            console.log(`❌ Product ${productCode}: No size chart found`);
        }
    }
    
    // Update the output CSV with the complete size charts using a different approach
    updateOutputCSVWithLargeCells(sizeCharts);
}

function extractSizeChartManual(content, productCode) {
    // Find the product's content by searching for the specific pattern
    const searchPattern = `PRODUCT;'${productCode};body_html;fi;;;`;
    const startIndex = content.indexOf(searchPattern);
    
    if (startIndex === -1) {
        return '';
    }
    
    // Find the end of this product's content (next PRODUCT line)
    const nextProductIndex = content.indexOf('PRODUCT;', startIndex + 1);
    const endIndex = nextProductIndex !== -1 ? nextProductIndex : content.length;
    
    // Extract the complete product content
    const productContent = content.substring(startIndex, endIndex);
    
    // Find the size table in the product content
    const sizeTableStart = productContent.indexOf('<div class="size-table">');
    if (sizeTableStart === -1) {
        return '';
    }
    
    // Extract the complete size table by finding the closing </div>
    let depth = 0;
    let endPos = sizeTableStart;
    
    for (let i = sizeTableStart; i < productContent.length; i++) {
        const char = productContent[i];
        
        if (productContent.substring(i, i + 6) === '<div ') {
            depth++;
        } else if (productContent.substring(i, i + 7) === '</div>') {
            depth--;
            if (depth === 0) {
                endPos = i + 7;
                break;
            }
        }
    }
    
    const sizeTable = productContent.substring(sizeTableStart, endPos);
    
    // Convert newlines to <br> for CSV compatibility
    return sizeTable.replace(/\r?\n/g, '<br>');
}

function updateOutputCSVWithLargeCells(sizeCharts) {
    console.log('\n🔍 Updating output CSV with large cell support...');
    
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
                            parts[7] = escapeCellForLargeContent(newContent);
                        }
                    }
                }
                
                parts[6] = escapeCellForLargeContent(parts[6]);
                outLines.push(parts.join(';'));
            } else {
                outLines.push(line);
            }
        } else {
            outLines.push(line);
        }
    }
    
    // Write the updated CSV using a different approach
    writeCSVWithLargeCells(outLines);
}

function escapeCellForLargeContent(cell) {
    if (!cell) return '';
    
    // Replace newlines with <br> for CSV compatibility
    let out = cell.replace(/\r?\n/g, '<br>');
    
    // Escape quotes by doubling them
    out = out.replace(/"/g, '""');
    
    // Wrap in quotes to handle large content
    return '"' + out + '"';
}

function writeCSVWithLargeCells(lines) {
    console.log('📝 Writing CSV with large cell support...');
    
    // Use a different approach: write line by line with proper encoding
    const outputStream = fs.createWriteStream('KH-print_skypro_translated_complete.csv', {
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
        console.log('✅ CSV written with large cell support.');
        
        // Verify the file was written correctly
        const stats = fs.statSync('KH-print_skypro_translated_complete.csv');
        console.log(`📊 File size: ${stats.size} bytes`);
    });
}

function extractProductCode(handle) {
    const match = handle.match(/^(\d+)/);
    return match ? match[1] : null;
}

largeCellCSVWriter(); 