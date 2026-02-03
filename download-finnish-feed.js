const fs = require('fs');
const https = require('https');
const { DOMParser } = require('xmldom');

function downloadFinnishFeed() {
    console.log('🔍 Downloading Finnish XML feed...\n');
    
    const url = 'https://www.skypro.fi/tuotteet/products.xml';
    
    https.get(url, (res) => {
        console.log(`📡 Status: ${res.statusCode}`);
        console.log(`📡 Headers: ${JSON.stringify(res.headers)}`);
        
        if (res.statusCode !== 200) {
            console.error(`❌ Error: HTTP ${res.statusCode}`);
            return;
        }
        
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log(`✅ Downloaded ${data.length} bytes`);
            
            // Save the raw XML
            fs.writeFileSync('finnish-products.xml', data, 'utf8');
            console.log('💾 Saved as finnish-products.xml');
            
            // Parse and extract size charts
            extractSizeChartsFromXML(data);
        });
        
    }).on('error', (err) => {
        console.error(`❌ Download error: ${err.message}`);
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

function extractSizeChartsFromXML(xmlData) {
    console.log('\n🔍 Extracting size charts from XML...\n');
    
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlData, 'text/xml');
        
        // Find all products
        const products = doc.getElementsByTagName('product');
        console.log(`📦 Found ${products.length} products in XML`);
        
        const sizeCharts = {};
        
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            
            // Get product code from the main <code> element
            const codeElement = product.getElementsByTagName('code')[0];
            if (!codeElement) continue;
            
            const code = codeElement.textContent;
            
            // Only process the specific product codes we need
            if (!['10330', '10360', '10380', '10440'].includes(code)) continue;
            
            console.log(`🔍 Processing product: ${code}`);
            
            // Get size table
            const sizeTableElement = product.getElementsByTagName('sizetable')[0];
            if (!sizeTableElement) {
                console.log(`❌ No size table found for ${code}`);
                continue;
            }
            
            const sizeTableText = sizeTableElement.textContent;
            if (sizeTableText && sizeTableText.trim()) {
                // Decode HTML entities
                const decodedSizeTable = decodeHtmlEntities(sizeTableText);
                
                // Wrap in a div with class for consistency
                const sizeChart = `<div class="size-table">${decodedSizeTable}</div>`;
                
                console.log(`✅ Found size chart for ${code}: ${sizeChart.length} characters`);
                console.log(`📏 Sample: ${sizeChart.substring(0, 100)}...`);
                
                sizeCharts[code] = sizeChart;
            } else {
                console.log(`❌ Empty size table for ${code}`);
            }
        }
        
        console.log(`\n📊 Extracted ${Object.keys(sizeCharts).length} size charts`);
        
        // Save size charts to a JSON file for reference
        fs.writeFileSync('finnish-size-charts.json', JSON.stringify(sizeCharts, null, 2), 'utf8');
        console.log('💾 Saved size charts to finnish-size-charts.json');
        
        // Now embed them into the CSV
        embedSizeChartsIntoCSV(sizeCharts);
        
    } catch (error) {
        console.error(`❌ XML parsing error: ${error.message}`);
    }
}

function embedSizeChartsIntoCSV(sizeCharts) {
    console.log('\n🔍 Embedding size charts into CSV...\n');
    
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
        
        // Check for body_html entries with the correct format
        if (line.includes('body_html;fi;;;')) {
            const parts = line.split(';');
            if (parts.length >= 7) {
                const productId = parts[1].replace("'", "");
                const handle = productHandleMap[productId];
                
                if (handle) {
                    const productCode = extractProductCode(handle);
                    if (productCode && sizeCharts[productCode]) {
                        console.log(`✅ Embedding size chart for handle ${handle} (product ${productCode})`);
                        
                        // Get the current content (it's in the last part)
                        let content = parts[6];
                        
                        // Remove existing size table if present
                        content = content.replace(/<div class="size-table">[\s\S]*?<\/div>/g, '');
                        
                        // Add the complete size chart
                        const newContent = content.trim() + '<br><br>' + sizeCharts[productCode];
                        parts[6] = escapeCSVCell(newContent);
                        
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
    writeUpdatedCSV(outLines, embeddedCount);
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

function writeUpdatedCSV(lines, embeddedCount) {
    console.log(`\n📝 Writing updated CSV with ${embeddedCount} embedded size charts...`);
    
    const outputStream = fs.createWriteStream('KH-print_skypro_with_finnish_size_charts.csv', {
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
        console.log('✅ Updated CSV written successfully.');
        
        // Verify the file was written correctly
        const stats = fs.statSync('KH-print_skypro_with_finnish_size_charts.csv');
        console.log(`📊 File size: ${stats.size} bytes`);
        
        // Check if size charts are present
        const fullContent = fs.readFileSync('KH-print_skypro_with_finnish_size_charts.csv', 'utf8');
        const sizeTableCount = (fullContent.match(/<div class="size-table">/g) || []).length;
        console.log(`📊 Found ${sizeTableCount} size table divs in the output`);
        
        console.log(`\n🎉 Successfully embedded ${embeddedCount} size charts from Finnish XML feed!`);
    });
}

function extractProductCode(handle) {
    // Extract the numeric product code from handles like "10360-size-s" or "10380"
    const match = handle.match(/^(\d+)/);
    return match ? match[1] : null;
}

downloadFinnishFeed(); 