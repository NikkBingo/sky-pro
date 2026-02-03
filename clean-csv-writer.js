const fs = require('fs');
const https = require('https');
const { DOMParser } = require('xmldom');

function cleanCSVWriter() {
    console.log('🔍 Creating clean CSV with Finnish size charts...\n');
    
    // First, extract size charts from XML
    extractSizeChartsFromXML().then(sizeCharts => {
        // Then embed them into CSV with clean formatting
        embedSizeChartsIntoCSV(sizeCharts);
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

function embedSizeChartsIntoCSV(sizeCharts) {
    console.log('\n🔍 Embedding size charts into CSV with clean formatting...\n');
    
    // Read the original CSV
    const csvContent = fs.readFileSync('KH-print_skypro_translated.csv', 'utf8');
    const lines = csvContent.split('\n');
    
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
    
    console.log(`📋 Found ${Object.keys(productHandleMap).length} products in CSV`);
    
    // Process each line and embed size charts
    const outLines = [];
    outLines.push(lines[0]); // Header
    
    let embeddedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        // Check for body_html entries
        if (line.includes('body_html;fi;;;')) {
            const parts = line.split(';');
            if (parts.length >= 7) {
                const productId = parts[1].replace("'", "");
                const handle = productHandleMap[productId];
                
                if (handle) {
                    const productCode = extractProductCode(handle);
                    if (productCode && sizeCharts[productCode]) {
                        console.log(`✅ Embedding size chart for handle ${handle} (product ${productCode})`);
                        
                        // Get the current content and clean it
                        let content = parts[6];
                        content = content.replace(/^"+|"+$/g, ''); // Remove surrounding quotes
                        
                        // Remove existing size table if present
                        content = content.replace(/<div class="size-table">[\s\S]*?<\/div>/g, '');
                        
                        // Add the complete size chart
                        const newContent = content.trim() + '<br><br>' + sizeCharts[productCode];
                        
                        // Clean up the content and properly escape for CSV
                        parts[6] = cleanCSVContent(newContent);
                        
                        embeddedCount++;
                    }
                }
                
                outLines.push(parts.join(';'));
            } else {
                outLines.push(line);
            }
        } else {
            outLines.push(line);
        }
    }
    
    // Write the updated CSV
    writeCleanCSV(outLines, embeddedCount);
}

function cleanCSVContent(content) {
    if (!content) return '';
    
    // Replace newlines with <br> for CSV compatibility
    let cleaned = content.replace(/\r?\n/g, '<br>');
    
    // If the content contains quotes or semicolons, wrap in quotes
    if (cleaned.includes('"') || cleaned.includes(';')) {
        // Escape quotes by doubling them
        cleaned = cleaned.replace(/"/g, '""');
        // Wrap in quotes
        cleaned = '"' + cleaned + '"';
    }
    
    return cleaned;
}

function writeCleanCSV(lines, embeddedCount) {
    console.log(`\n📝 Writing clean CSV with ${embeddedCount} embedded size charts...`);
    
    const outputStream = fs.createWriteStream('KH-print_skypro_clean.csv', {
        encoding: 'utf8',
        flags: 'w'
    });
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        outputStream.write(line + '\n');
        
        if (i % 100 === 0) {
            console.log(`📝 Written ${i} lines...`);
        }
    }
    
    outputStream.end();
    
    outputStream.on('finish', () => {
        console.log('✅ Clean CSV written successfully.');
        
        const stats = fs.statSync('KH-print_skypro_clean.csv');
        console.log(`📊 File size: ${stats.size} bytes`);
        
        // Check if size charts are present
        const fullContent = fs.readFileSync('KH-print_skypro_clean.csv', 'utf8');
        const sizeTableCount = (fullContent.match(/<div class="size-table">/g) || []).length;
        console.log(`📊 Found ${sizeTableCount} size table divs in the output`);
        
        console.log(`\n🎉 Successfully embedded ${embeddedCount} size charts with clean formatting!`);
    });
}

function extractProductCode(handle) {
    const match = handle.match(/^(\d+)/);
    return match ? match[1] : null;
}

cleanCSVWriter(); 