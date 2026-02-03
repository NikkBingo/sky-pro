const fs = require('fs');

function manualSizeChartFix() {
    console.log('🔍 Manually extracting complete size charts...\n');
    
    // Read the Finnish translations file and extract complete size charts
    const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
    
    // Find the complete size chart for product 10360
    const sizeChart10360 = extractCompleteSizeChart(finnishContent, '10360');
    const sizeChart10380 = extractCompleteSizeChart(finnishContent, '10380');
    const sizeChart10440 = extractCompleteSizeChart(finnishContent, '10440');
    
    console.log(`📏 Size chart 10360 length: ${sizeChart10360.length} characters`);
    console.log(`📏 Size chart 10380 length: ${sizeChart10380.length} characters`);
    console.log(`📏 Size chart 10440 length: ${sizeChart10440.length} characters`);
    
    // Read the output CSV
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
                    if (productCode) {
                        let completeSizeChart = null;
                        
                        // Get the appropriate size chart
                        if (productCode === '10360') {
                            completeSizeChart = sizeChart10360;
                        } else if (productCode === '10380') {
                            completeSizeChart = sizeChart10380;
                        } else if (productCode === '10440') {
                            completeSizeChart = sizeChart10440;
                        }
                        
                        if (completeSizeChart) {
                            console.log(`✅ Embedding complete size chart for product ${productCode}`);
                            const content = parts[7];
                            const sizeTableStart = content.indexOf('<div class="size-table">');
                            if (sizeTableStart !== -1) {
                                const description = content.substring(0, sizeTableStart).trim();
                                const cleanDescription = description.replace(/(<br>)+$/, '');
                                const newContent = cleanDescription + '<br><br>' + completeSizeChart;
                                parts[7] = escapeCell(newContent);
                            }
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

function extractCompleteSizeChart(content, productCode) {
    // Find the product in the Finnish translations
    const pattern = new RegExp(`PRODUCT;'${productCode};body_html[^"]*"[^"]*"([^"]*<div class="size-table">[^"]*)`, 's');
    const match = content.match(pattern);
    
    if (match) {
        const sizeChart = match[1];
        // Convert newlines to <br> for CSV compatibility
        return sizeChart.replace(/\r?\n/g, '<br>');
    }
    
    return '';
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

manualSizeChartFix(); 