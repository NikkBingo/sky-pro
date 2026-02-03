const fs = require('fs');
const https = require('https');
const { DOMParser } = require('xmldom');

function reconstructCSVSingleLine() {
    console.log('🔍 Reconstructing CSV with proper single-line rows...\n');
    
    // First, extract size charts from XML
    extractSizeChartsFromXML().then(sizeCharts => {
        // Then reconstruct the CSV with proper single-line formatting
        reconstructCSVWithSizeCharts(sizeCharts);
    });
}

function extractSizeChartsFromXML() {
    return new Promise((resolve) => {
        console.log('📥 Reading existing XML file...');
        
        try {
            const xmlData = fs.readFileSync('finnish-products.xml', 'utf8');
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlData, 'text/xml');
            
            const products = doc.getElementsByTagName('product');
            console.log(`📦 Found ${products.length} products in XML`);
            
            const sizeCharts = {};
            
            for (let i = 0; i < products.length; i++) {
                const product = products[i];
                const codeElement = product.getElementsByTagName('code')[0];
                if (!codeElement) continue;
                
                const code = codeElement.textContent;
                if (!['10330', '10360', '10380', '10440'].includes(code)) continue;
                
                console.log(`🔍 Processing product: ${code}`);
                
                const sizeTableElement = product.getElementsByTagName('sizetable')[0];
                if (!sizeTableElement) {
                    console.log(`❌ No size table found for ${code}`);
                    continue;
                }
                
                const sizeTableText = sizeTableElement.textContent;
                if (sizeTableText && sizeTableText.trim()) {
                    const decodedSizeTable = decodeHtmlEntities(sizeTableText);
                    const sizeChart = `<div class="size-table">${decodedSizeTable}</div>`;
                    
                    console.log(`✅ Found size chart for ${code}: ${sizeChart.length} characters`);
                    sizeCharts[code] = sizeChart;
                }
            }
            
            console.log(`📊 Extracted ${Object.keys(sizeCharts).length} size charts`);
            resolve(sizeCharts);
            
        } catch (error) {
            console.error(`❌ XML parsing error: ${error.message}`);
            resolve({});
        }
    });
}

function decodeHtmlEntities(text) {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function reconstructCSVWithSizeCharts(sizeCharts) {
    console.log('\n🔍 Reconstructing CSV with size charts and single-line rows...\n');
    
    // Read the original CSV as raw text
    const csvContent = fs.readFileSync('KH-print_skypro_translated.csv', 'utf8');
    
    // Parse the CSV properly, handling multiline quoted content
    const rows = parseCSVWithMultilineContent(csvContent);
    
    console.log(`📋 Parsed ${rows.length} rows from CSV`);
    
    // Build product handle map
    const productHandleMap = {};
    for (const row of rows) {
        if (row.length >= 7 && row[2] === 'handle') {
            const productId = row[1].replace("'", "");
            const handle = row[6].replace(/"/g, '');
            productHandleMap[productId] = handle;
        }
    }
    
    console.log(`📋 Found ${Object.keys(productHandleMap).length} products in CSV`);
    
    // Process each row and embed size charts
    const outRows = [];
    outRows.push(rows[0]); // Header
    
    let embeddedCount = 0;
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 7) {
            outRows.push(row);
            continue;
        }
        
        // Check for body_html entries
        if (row[2] === 'body_html' && row[3] === 'fi') {
            const productId = row[1].replace("'", "");
            const handle = productHandleMap[productId];
            
            if (handle) {
                const productCode = extractProductCode(handle);
                if (productCode && sizeCharts[productCode]) {
                    console.log(`✅ Embedding size chart for handle ${handle} (product ${productCode})`);
                    
                    // Get the current content and clean it
                    let content = row[6];
                    content = content.replace(/^"+|"+$/g, ''); // Remove surrounding quotes
                    
                    // Remove existing size table if present
                    content = content.replace(/<div class="size-table">[\s\S]*?<\/div>/g, '');
                    
                    // Add the complete size chart
                    const newContent = content.trim() + '<br><br>' + sizeCharts[productCode];
                    
                    // Clean up the content and properly escape for CSV
                    row[6] = cleanCSVContent(newContent);
                    
                    embeddedCount++;
                }
            }
        }
        
        outRows.push(row);
    }
    
    // Write the updated CSV
    writeSingleLineCSV(outRows, embeddedCount);
}

function parseCSVWithMultilineContent(content) {
    const rows = [];
    const lines = content.split('\n');
    
    let currentRow = [];
    let inQuotedField = false;
    let currentField = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (!inQuotedField) {
            // Not in a quoted field, split normally
            const parts = line.split(';');
            if (parts.length >= 7) {
                rows.push(parts);
            }
        } else {
            // In a quoted field, continue building the field
            currentField += '\n' + line;
            
            // Check if the quoted field ends
            if (line.includes('"') && !line.includes('""')) {
                inQuotedField = false;
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            }
        }
    }
    
    return rows;
}

function cleanCSVContent(content) {
    if (!content) return '';
    
    // Replace all newlines with <br> tags to keep content on single line
    let cleaned = content.replace(/\r?\n/g, '<br>');
    
    // Replace any remaining newlines or carriage returns
    cleaned = cleaned.replace(/\r/g, '<br>');
    cleaned = cleaned.replace(/\n/g, '<br>');
    
    // If the content contains quotes or semicolons, wrap in quotes
    if (cleaned.includes('"') || cleaned.includes(';')) {
        // Escape quotes by doubling them
        cleaned = cleaned.replace(/"/g, '""');
        // Wrap in quotes
        cleaned = '"' + cleaned + '"';
    }
    
    return cleaned;
}

function writeSingleLineCSV(rows, embeddedCount) {
    console.log(`\n📝 Writing single-line CSV with ${embeddedCount} embedded size charts...`);
    
    const outputStream = fs.createWriteStream('KH-print_skypro_single_line.csv', {
        encoding: 'utf8',
        flags: 'w'
    });
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Join the row with semicolons and ensure it's a single line
        const line = row.join(';');
        const cleanLine = line.replace(/\r?\n/g, ' ').replace(/\r/g, ' ');
        
        outputStream.write(cleanLine + '\n');
        
        if (i % 100 === 0) {
            console.log(`📝 Written ${i} lines...`);
        }
    }
    
    outputStream.end();
    
    outputStream.on('finish', () => {
        console.log('✅ Single-line CSV written successfully.');
        
        const stats = fs.statSync('KH-print_skypro_single_line.csv');
        console.log(`📊 File size: ${stats.size} bytes`);
        
        // Check if size charts are present
        const fullContent = fs.readFileSync('KH-print_skypro_single_line.csv', 'utf8');
        const sizeTableCount = (fullContent.match(/<div class="size-table">/g) || []).length;
        console.log(`📊 Found ${sizeTableCount} size table divs in the output`);
        
        console.log(`\n🎉 Successfully embedded ${embeddedCount} size charts with single-line formatting!`);
    });
}

function extractProductCode(handle) {
    const match = handle.match(/^(\d+)/);
    return match ? match[1] : null;
}

reconstructCSVSingleLine(); 