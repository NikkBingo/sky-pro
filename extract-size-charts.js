const fs = require('fs');

function extractSizeCharts() {
    console.log('🔍 Extracting complete size charts from Finnish translations...\n');
    
    // Read the Finnish translations file
    const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
    const lines = finnishContent.split('\n');
    
    // Extract size charts for each product
    const sizeCharts = {};
    
    // Find and extract size charts for each product
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes("'10360") && line.includes(';body_html;')) {
            console.log(`📋 Found 10360 body_html at line ${i + 1}`);
            sizeCharts['10360'] = extractSizeChartFromLines(lines, i);
        } else if (line.includes("'10380") && line.includes(';body_html;')) {
            console.log(`📋 Found 10380 body_html at line ${i + 1}`);
            sizeCharts['10380'] = extractSizeChartFromLines(lines, i);
        } else if (line.includes("'10440") && line.includes(';body_html;')) {
            console.log(`📋 Found 10440 body_html at line ${i + 1}`);
            sizeCharts['10440'] = extractSizeChartFromLines(lines, i);
        }
    }
    
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

function extractSizeChartFromLines(lines, startLine) {
    // Find the start of the size table
    let sizeTableStart = -1;
    let currentLine = startLine;
    
    // Look for the size table in the current and next few lines
    for (let i = startLine; i < Math.min(startLine + 10, lines.length); i++) {
        const line = lines[i];
        const sizeTableIndex = line.indexOf('<div class="size-table">');
        if (sizeTableIndex !== -1) {
            sizeTableStart = i;
            break;
        }
    }
    
    if (sizeTableStart === -1) {
        return '';
    }
    
    // Extract the complete size table by reading until the closing </div>
    let sizeTable = '';
    let depth = 0;
    let foundStart = false;
    
    for (let i = sizeTableStart; i < lines.length; i++) {
        const line = lines[i];
        
        if (!foundStart) {
            const startIndex = line.indexOf('<div class="size-table">');
            if (startIndex !== -1) {
                sizeTable = line.substring(startIndex);
                depth = 1;
                foundStart = true;
            }
        } else {
            sizeTable += '\n' + line;
            
            // Count div tags to find the end
            const openDivs = (line.match(/<div/g) || []).length;
            const closeDivs = (line.match(/<\/div>/g) || []).length;
            depth += openDivs - closeDivs;
            
            if (depth === 0) {
                break;
            }
        }
    }
    
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

extractSizeCharts(); 