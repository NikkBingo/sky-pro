const fs = require('fs');

function completeSizeExtract() {
    console.log('🔍 Complete size chart extraction...\n');
    
    // Read the Finnish translations file
    const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
    
    // Extract size charts by finding the specific content
    const sizeCharts = {};
    
    // Product 10360 size chart
    console.log('📋 Extracting 10360 size chart...');
    const sizeChart10360 = extractSizeChartFromContent(finnishContent, '10360');
    sizeCharts['10360'] = sizeChart10360;
    
    // Product 10380 size chart
    console.log('📋 Extracting 10380 size chart...');
    const sizeChart10380 = extractSizeChartFromContent(finnishContent, '10380');
    sizeCharts['10380'] = sizeChart10380;
    
    // Product 10440 size chart
    console.log('📋 Extracting 10440 size chart...');
    const sizeChart10440 = extractSizeChartFromContent(finnishContent, '10440');
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
    
    // Update the output CSV with the complete size charts
    updateOutputCSVWithSizeCharts(sizeCharts);
}

function extractSizeChartFromContent(content, productCode) {
    // Find the product's body_html content
    const pattern = new RegExp(`PRODUCT;'${productCode};body_html[^"]*"[^"]*"([^"]*<div class="size-table">[^"]*)`, 's');
    const match = content.match(pattern);
    
    if (!match) {
        return '';
    }
    
    const fullContent = match[1];
    const sizeTableStart = fullContent.indexOf('<div class="size-table">');
    
    if (sizeTableStart === -1) {
        return '';
    }
    
    // Extract the complete size table
    const sizeTable = fullContent.substring(sizeTableStart);
    
    // Convert newlines to <br> for CSV compatibility
    return sizeTable.replace(/\r?\n/g, '<br>');
}

function updateOutputCSVWithSizeCharts(sizeCharts) {
    console.log('\n🔍 Updating output CSV with complete size charts...');
    
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
                            parts[7] = escapeCell(newContent);
                        }
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
    console.log('✅ CSV updated with complete size charts.');
}

function extractProductCode(handle) {
    const match = handle.match(/^(\d+)/);
    return match ? match[1] : null;
}

function escapeCell(cell) {
    if (!cell) return '';
    let out = cell.replace(/\r?\n/g, '<br>');
    out = out.replace(/"/g, '""');
    return '"' + out + '"';
}

completeSizeExtract(); 