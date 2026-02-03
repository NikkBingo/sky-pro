const fs = require('fs');

function escapeCell(cell) {
    if (!cell) return '';
    // Replace all newlines with <br>
    let out = cell.replace(/\r?\n/g, '<br>');
    // Escape quotes for CSV
    out = out.replace(/"/g, '""');
    return '"' + out + '"';
}

// Robustly parse the CSV into logical rows, handling multiline quoted cells
function robustParseCSVRows(filename) {
    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.split(/\r?\n/);
    const rows = [];
    let currentRow = '';
    let inQuotes = false;
    let quoteCount = 0;
    
    for (let i = 0; i < lines.length; ++i) {
        let line = lines[i];
        
        // Count quotes in this line
        const lineQuoteCount = (line.match(/"/g) || []).length;
        quoteCount += lineQuoteCount;
        
        if (!inQuotes) {
            currentRow = line;
        } else {
            currentRow += '\n' + line;
        }
        
        // Toggle inQuotes for each odd number of quotes
        if (quoteCount % 2 !== 0) {
            inQuotes = !inQuotes;
        }
        
        // If not in quotes, row is complete
        if (!inQuotes) {
            rows.push(currentRow);
            currentRow = '';
            quoteCount = 0;
        }
    }
    if (currentRow) rows.push(currentRow);
    return rows;
}

// Map: productCode -> full body_html cell content
function buildBodyHtmlMap() {
    const rows = robustParseCSVRows('finnish-translations.csv');
    const map = {};
    for (const row of rows) {
        const parts = row.split(';');
        if (parts.length >= 8) {
            const identification = parts[1].replace("'", "");
            const field = parts[2];
            const translatedContent = parts[7];
            if (field === 'body_html') {
                map[identification] = translatedContent;
            }
        }
    }
    return map;
}

function getCompleteSizeChartFromMap(productCode, bodyHtmlMap) {
    const translatedContent = bodyHtmlMap[productCode];
    if (!translatedContent) return null;
    const sizeTableStart = translatedContent.indexOf('<div class="size-table">');
    if (sizeTableStart !== -1) {
        return translatedContent.substring(sizeTableStart);
    }
    return null;
}

function processCSVWithCompleteSizeCharts(input, output) {
    const bodyHtmlMap = buildBodyHtmlMap();
    console.log(`📋 Built map with ${Object.keys(bodyHtmlMap).length} Finnish translations`);
    
    // Debug: Check if 10360 has complete size chart
    const testContent = bodyHtmlMap['10360'];
    if (testContent) {
        const sizeTableStart = testContent.indexOf('<div class="size-table">');
        if (sizeTableStart !== -1) {
            const sizeTable = testContent.substring(sizeTableStart);
            console.log(`✅ Product 10360 has complete size chart (${sizeTable.length} characters)`);
            console.log(`   Ends with: ${sizeTable.substring(sizeTable.length - 50)}`);
        } else {
            console.log(`❌ Product 10360 has no size chart`);
        }
    } else {
        console.log(`❌ Product 10360 not found in Finnish translations`);
    }
    
    const content = fs.readFileSync(input, 'utf8');
    const lines = content.split('\n');
    
    // First pass: build a map of product ID -> handle
    const productHandleMap = {};
    for (const line of lines) {
        if (line.includes(';handle;')) {
            const parts = line.split(';');
            if (parts.length >= 7) {
                const productId = parts[1].replace("'", "");
                const handle = parts[6].replace(/"/g, ''); // Remove quotes
                productHandleMap[productId] = handle;
            }
        }
    }
    
    console.log(`📋 Built product handle map with ${Object.keys(productHandleMap).length} entries`);
    
    const outLines = [];
    // Reconstruct logical rows
    let header = lines[0];
    outLines.push(header);
    let currentRow = '';
    let inRow = false;
    for (let i = 1; i < lines.length; ++i) {
        const line = lines[i];
        if (!line.trim()) continue;
        if (line.startsWith('PRODUCT;')) {
            if (currentRow) {
                outLines.push(processRowWithCompleteSizeChart(currentRow, bodyHtmlMap, productHandleMap));
            }
            currentRow = line;
            inRow = true;
        } else if (inRow) {
            currentRow += '\n' + line;
        }
    }
    if (currentRow) {
        outLines.push(processRowWithCompleteSizeChart(currentRow, bodyHtmlMap, productHandleMap));
    }
    fs.writeFileSync(output, outLines.join('\n'), 'utf8');
    console.log('✅ CSV processed with robust size chart extraction.');
}

function processRowWithCompleteSizeChart(row, bodyHtmlMap, productHandleMap) {
    // Split only top-level semicolons (not inside quotes)
    let parts = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < row.length; ++j) {
        const c = row[j];
        if (c === '"') inQuotes = !inQuotes;
        if (c === ';' && !inQuotes) {
            parts.push(current);
            current = '';
        } else {
            current += c;
        }
    }
    parts.push(current);
    // Fix Default content (6) and Translated content (7)
    if (parts.length >= 8) {
        // If this is a body_html row, ensure complete size chart
        if (parts[2] === 'body_html') {
            const productId = parts[1].replace("'", "");
            const handle = productHandleMap[productId];
            if (handle) {
                const productCode = extractProductCode(handle);
                if (productCode) {
                    console.log(`🔍 Processing product ${productCode} with handle ${handle}`);
                    const completeSizeChart = getCompleteSizeChartFromMap(productCode, bodyHtmlMap);
                    if (completeSizeChart) {
                        console.log(`✅ Found complete size chart for ${productCode} (${completeSizeChart.length} chars)`);
                        const content = parts[7];
                        const sizeTableStart = content.indexOf('<div class="size-table">');
                        if (sizeTableStart !== -1) {
                            const description = content.substring(0, sizeTableStart).trim();
                            const cleanDescription = description.replace(/(<br>)+$/, '');
                            const newContent = cleanDescription + '<br><br>' + completeSizeChart;
                            parts[7] = newContent;
                        }
                    } else {
                        console.log(`❌ No size chart found for product ${productCode}`);
                    }
                } else {
                    console.log(`❌ Could not extract product code from handle ${handle}`);
                }
            } else {
                console.log(`❌ No handle found for product ID ${productId}`);
            }
            parts[6] = escapeCell(parts[6]);
            parts[7] = escapeCell(parts[7]);
        } else {
            parts[6] = escapeCell(parts[6]);
            parts[7] = escapeCell(parts[7]);
        }
    }
    return parts.join(';');
}

function extractProductCode(handle) {
    // Extract the base product code from handle
    const match = handle.match(/^(\d+)/);
    if (match) {
        return match[1];
    }
    return null;
}

processCSVWithCompleteSizeCharts('KH-print_skypro_translated.csv', 'KH-print_skypro_translated_complete.csv'); 