const fs = require('fs');
const https = require('https');
const { DOMParser } = require('xmldom');

function manualCleanTable() {
    console.log('🔍 Manually creating clean table structure...\n');
    
    // First, extract size charts from XML
    extractSizeChartsFromXML().then(sizeCharts => {
        // Then create clean table structure manually
        createCleanTableStructure(sizeCharts);
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
                    const cleanSizeTable = createCleanTableHTML(decodedSizeTable, code);
                    const sizeChart = `<div class="size-table">${cleanSizeTable}</div>`;
                    
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

function createCleanTableHTML(html, productCode) {
    if (!html) return '';
    
    // Extract table data from the HTML
    const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/);
    if (!tableMatch) return html;
    
    const tableContent = tableMatch[1];
    
    // Extract rows
    const rowMatches = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
    if (!rowMatches) return html;
    
    // Build clean table HTML
    let cleanTable = '<table>';
    
    for (const rowMatch of rowMatches) {
        const rowContent = rowMatch.replace(/<tr[^>]*>/, '').replace(/<\/tr>/, '');
        
        // Extract cells
        const cellMatches = rowContent.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
        if (!cellMatches) continue;
        
        cleanTable += '<tr>';
        for (const cellMatch of cellMatches) {
            const cellContent = cellMatch.replace(/<td[^>]*>/, '').replace(/<\/td>/, '');
            cleanTable += `<td>${cellContent}</td>`;
        }
        cleanTable += '</tr>';
    }
    
    cleanTable += '</table>';
    
    // Add footnotes if they exist
    const footnoteMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/g);
    if (footnoteMatches) {
        for (const footnoteMatch of footnoteMatches) {
            const footnoteContent = footnoteMatch.replace(/<p[^>]*>/, '').replace(/<\/p>/, '');
            cleanTable += `<p>${footnoteContent}</p>`;
        }
    }
    
    return cleanTable;
}

function createCleanTableStructure(sizeCharts) {
    console.log('\n🔍 Creating clean table structure...\n');
    
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
    
    // Process each row and fix content columns
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
                    console.log(`✅ Creating clean table for handle ${handle} (product ${productCode})`);
                    
                    // Create the complete English description
                    const completeEnglishDescription = createEnglishDescription(productCode);
                    
                    // Create the Finnish description with embedded size chart
                    const finnishDescription = createFinnishDescription(productCode);
                    const finnishContent = finnishDescription + '<br><br>' + sizeCharts[productCode];
                    
                    // Update both columns
                    row[6] = cleanCSVContent(completeEnglishDescription); // Default content
                    row[7] = cleanCSVContent(finnishContent); // Translated content
                    
                    embeddedCount++;
                }
            }
        }
        
        outRows.push(row);
    }
    
    // Write the updated CSV
    writeManualCleanCSV(outRows, embeddedCount);
}

function createEnglishDescription(productCode) {
    const descriptions = {
        '10330': '• Material: 100% cotton<br><br>*Ash 99% cotton,1% polyester<br>*Heather Grey 97% cotton, 3% polyester<br>• Weight: White - 160gm/m², Colour - 165gm/m²<br>• Cotton/Lycra® rib crew neck with taped neckline<br>• Now produced using Belcoro® yarn for a softer feel and cleaner printing process<br>• Fine knit gauge for enhanced printability<br>Size: 92 - 164cm<br>(92 and 98 cm sizes available in White, Sunflower, Royal Blue, Sky Blue, Navy Blue, Red, Light Pink)',
        '10360': '• Material: 100% cotton<br><br>*Ash 99% cotton,1% polyester<br>*Heather Grey 97% cotton, 3% polyester<br>• Weight: White - 160gm/m², Colour - 165gm/m²<br>• Cotton/Lycra® rib crew neck with taped neckline<br>• Now produced using Belcoro® yarn for a softer feel and cleaner printing process<br>• Fine knit gauge for enhanced printability<br>Size: S - 5XL',
        '10380': '• Material: 100% cotton<br><br>*Ash 99% cotton,1% polyester<br>*Heather Grey 97% cotton, 3% polyester<br>• Weight: White - 160gm/m², Colour - 165gm/m²<br>• Long sleeve Cotton/Lycra® rib crew neck with taped neckline<br>• Now produced using Belcoro® yarn for a softer feel and cleaner printing process<br>• Fine knit gauge for enhanced printability<br>Size: S - 5XL',
        '10440': '• Material: 100% cotton<br><br>*Ash 99% cotton,1% polyester<br>*Heather Grey 97% cotton, 3% polyester<br>• Weight: White - 180gm/m², Colour - 185gm/m²<br>• Premium Cotton/Lycra® rib crew neck with taped neckline<br>• Now produced using Belcoro® yarn for a softer feel and cleaner printing process<br>• Fine knit gauge for enhanced printability<br>Size: S - 5XL'
    };
    
    return descriptions[productCode] || 'English description';
}

function createFinnishDescription(productCode) {
    const descriptions = {
        '10330': 'Lasten Valueweight T-paita on Euroopan myydyin puuvillainen T-paita, joka tarjoaa parhaan hinta-laatusuhteen. Valueweight on erityisesti painajien suosikki.<br><br>• 100 % puuvillaa<br>• Paino: 160 g/m²<br>• Puuvilla-Lycra®-resorikaulus vahvistetulla niskasaumalla<br>• Koot on tarkastettu metallipaljastimen avulla Euroopan lastenvaatteiden lainsäädännön mukaisesti<br>• Valmistusmaa Marokko<br>• Tullikoodi 61091000',
        '10360': 'Valueweight T-paita on Euroopan myydyin puuvillainen T-paita, joka tarjoaa parhaan hinta-laatusuhteen. Valueweight on erityisesti painajien suosikki.<br><br>• 100 % puuvillaa<br>• Heather Grey: 97 % puuvillaa, 3 % polyesteriä<br>• Paino: White 160 g/m², värilliset 165 g/m²<br>• Puuvilla-Lycra®-resorikaulus vahvistetulla niskasaumalla<br>• Koot on tarkastettu metallipaljastimen avulla Euroopan lastenvaatteiden lainsäädännön mukaisesti<br>• Valmistusmaa Marokko<br>• Tullikoodi 61091000',
        '10380': 'PitkäHihainen Valueweight T-paita on Euroopan myydyin puuvillainen T-paita, joka tarjoaa parhaan hinta-laatusuhteen. Valueweight on erityisesti painajien suosikki.<br><br>• 100 % puuvillaa<br>• Heather Grey: 97 % puuvillaa, 3 % polyesteriä<br>• Paino: White 160 g/m², värilliset 165 g/m²<br>• PitkäHihainen puuvilla-Lycra®-resorikaulus vahvistetulla niskasaumalla<br>• Koot on tarkastettu metallipaljastimen avulla Euroopan lastenvaatteiden lainsäädännön mukaisesti<br>• Valmistusmaa Marokko<br>• Tullikoodi 61091000',
        '10440': 'Super Premium T-paita on korkealaatuinen puuvillainen T-paita, joka tarjoaa erinomaista mukavuutta ja kestävyyttä.<br><br>• 100 % puuvillaa<br>• Paino: 180 g/m²<br>• Premium puuvilla-Lycra®-resorikaulus vahvistetulla niskasaumalla<br>• Koot on tarkastettu metallipaljastimen avulla Euroopan lastenvaatteiden lainsäädännön mukaisesti<br>• Valmistusmaa Marokko<br>• Tullikoodi 61091000'
    };
    
    return descriptions[productCode] || 'Suomenkielinen kuvaus';
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

function writeManualCleanCSV(rows, embeddedCount) {
    console.log(`\n📝 Writing manual clean CSV with ${embeddedCount} embedded size charts...`);
    
    const outputStream = fs.createWriteStream('KH-print_skypro_manual_clean.csv', {
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
        console.log('✅ Manual clean CSV written successfully.');
        
        const stats = fs.statSync('KH-print_skypro_manual_clean.csv');
        console.log(`📊 File size: ${stats.size} bytes`);
        
        // Check if size charts are present
        const fullContent = fs.readFileSync('KH-print_skypro_manual_clean.csv', 'utf8');
        const sizeTableCount = (fullContent.match(/<div class="size-table">/g) || []).length;
        console.log(`📊 Found ${sizeTableCount} size table divs in the output`);
        
        console.log(`\n🎉 Successfully created manual clean CSV!`);
    });
}

function extractProductCode(handle) {
    const match = handle.match(/^(\d+)/);
    return match ? match[1] : null;
}

manualCleanTable(); 