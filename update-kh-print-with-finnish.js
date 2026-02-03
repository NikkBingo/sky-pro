const XMLParser = require('./utils/xml-parser');
const fs = require('fs');

async function updateKHPrintWithFinnish() {
    try {
        const xmlParser = new XMLParser();
        const finnishFeedUrl = process.env.FINNISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products.xml';
        
        console.log(`📡 Fetching Finnish data from: ${finnishFeedUrl}`);
        
        const xmlData = await xmlParser.fetchAndParseXML(finnishFeedUrl);
        const finnishProducts = xmlData.mainostekstiilitcom.products.product || [];
        
        // Map: first 5 digits of code -> product
        const finnishProductMap = new Map();
        finnishProducts.forEach(product => {
            const code = product.code;
            if (code) {
                // Handle both numeric and alphanumeric codes
                const codeStr = code.toString().toUpperCase();
                // Store by the full code (normalized to uppercase)
                finnishProductMap.set(codeStr, product);
                // Also store by first 5 digits for backward compatibility
                const firstFive = codeStr.substring(0, 5);
                finnishProductMap.set(firstFive, product);
            }
        });
        console.log(`Created map with ${finnishProductMap.size} Finnish products by SKU prefix`);

        // Read the KH-Print CSV (semicolon delimiter)
        const khPrintContent = fs.readFileSync('KH-Print_Oy_translations.csv', 'utf8');
        
        // Split by lines but handle multiline content
        const lines = khPrintContent.split('\n');
        const header = lines[0];
        const dataLines = lines.slice(1);

        // Build Identification -> handle map
        const idToHandle = new Map();
        let currentLine = '';
        
        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i];
            if (!line.trim()) continue;
            
            // If this line starts with PRODUCT, it's a new row
            if (line.startsWith('PRODUCT;')) {
                // Process the previous complete line
                if (currentLine) {
                    const parts = currentLine.split(';');
                    if (parts.length >= 8) {
                        const identification = parts[1];
                        const field = parts[2];
                        const defaultContent = parts[6];
                        if (field === 'handle' && defaultContent) {
                            idToHandle.set(identification, defaultContent);
                        }
                    }
                }
                currentLine = line;
            } else {
                // This is a continuation of the previous line
                currentLine += '\n' + line;
            }
        }
        
        // Process the last line
        if (currentLine) {
            const parts = currentLine.split(';');
            if (parts.length >= 8) {
                const identification = parts[1];
                const field = parts[2];
                const defaultContent = parts[6];
                if (field === 'handle' && defaultContent) {
                    idToHandle.set(identification, defaultContent);
                }
            }
        }
        
        console.log(`Mapped ${idToHandle.size} handles by Identification`);

        // Update rows while preserving original format
        const updatedLines = [header];
        let updatedCount = 0;
        currentLine = '';
        
        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i];
            if (!line.trim()) continue;
            
            // If this line starts with PRODUCT, it's a new row
            if (line.startsWith('PRODUCT;')) {
                // Process the previous complete line
                if (currentLine) {
                    const parts = currentLine.split(';');
                    if (parts.length >= 8) {
                        const identification = parts[1];
                        const field = parts[2];
                        const locale = parts[3];
                        const defaultContent = parts[6];
                        let translatedContent = parts[7];
                        
                        // Debug: show all rows being processed
                        if (field === 'body_html' && locale === 'fi') {
                            console.log(`🔍 Found body_html row for product ${identification} with locale ${locale}`);
                        }
                        
                        // Only update fi rows for title/body_html
                        if (locale === 'fi' && (field === 'title' || field === 'body_html')) {
                            console.log(`🔍 Processing ${field} for product ${identification} with locale ${locale}`);
                            const handle = idToHandle.get(identification);
                            if (handle) {
                                console.log(`📝 Found handle: ${handle} for product ${identification}`);
                                // Extract base code: first 5 digits or before dash
                                let baseCode = handle.split('-')[0];
                                // If baseCode is not all digits, extract first 5 digits
                                if (!/^\d+$/.test(baseCode)) {
                                    const digits = handle.replace(/\D/g, '').substring(0, 5);
                                    if (digits) baseCode = digits;
                                }
                                baseCode = baseCode.toUpperCase();
                                console.log(`📝 Base code extracted: ${baseCode}`);
                                const finnishProduct = finnishProductMap.get(baseCode);
                                if (finnishProduct) {
                                    console.log(`✅ Found Finnish product for code ${baseCode}`);
                                    let newTranslatedContent = '';
                                    if (field === 'title') {
                                        let finnishTitle = finnishProduct.title || '';
                                        finnishTitle = finnishTitle.replace(/<\/?b>/g, '');
                                        finnishTitle = finnishTitle.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                                        newTranslatedContent = finnishTitle;
                                    } else if (field === 'body_html') {
                                        console.log(`🔍 Processing body_html for product ${identification} with Finnish product code ${finnishProduct.code}`);
                                        let finnishDescription = finnishProduct.description || '';
                                        const sizeTable = finnishProduct.sizetable || '';
                                        console.log(`📝 Finnish description length: ${finnishDescription.length}`);
                                        console.log(`📊 Finnish size table length: ${sizeTable.length}`);
                                        if (sizeTable) {
                                            const styledSizeTable = `<div class="size-table">
<h3 style="background-color: #666; color: white; padding: 10px; margin: 0; border-radius: 5px 5px 0 0;">Kokotaulukko</h3>
<div style="background: linear-gradient(to bottom, #f8f8f8 0%, #f8f8f8 50%, white 50%, white 100%);">
${sizeTable}
</div>
</div>`;
                                            finnishDescription = finnishDescription + styledSizeTable;
                                            console.log(`✅ Combined description + size table length: ${finnishDescription.length}`);
                                        }
                                        newTranslatedContent = finnishDescription;
                                    }
                                    
                                    // Always update the Translated content column for both title and body_html
                                    const updatedLine = `${parts[0]};${identification};${field};${locale};${parts[4]};${parts[5]};${defaultContent};${newTranslatedContent}`;
                                    updatedLines.push(updatedLine);
                                    updatedCount++;
                                    console.log(`✅ Updated ${field} for product ${identification} with Finnish content`);
                                } else {
                                    // Write the original line if no Finnish product found
                                    updatedLines.push(currentLine);
                                }
                            } else {
                                // Write the original line if no handle found
                                updatedLines.push(currentLine);
                            }
                        } else {
                            // Write the original line for non-fi rows or non-title/body_html fields
                            updatedLines.push(currentLine);
                        }
                    } else {
                        // Write the original line if it doesn't have enough parts
                        updatedLines.push(currentLine);
                    }
                }
                currentLine = line;
            } else {
                // This is a continuation of the previous line
                currentLine += '\n' + line;
            }
        }
        
        // Process the last line
        if (currentLine) {
            const parts = currentLine.split(';');
            if (parts.length >= 8) {
                const identification = parts[1];
                const field = parts[2];
                const locale = parts[3];
                const defaultContent = parts[6];
                let translatedContent = parts[7];
                
                // Debug: show all rows being processed
                if (field === 'body_html' && locale === 'fi') {
                    console.log(`🔍 Found body_html row for product ${identification} with locale ${locale}`);
                }
                
                // Only update fi rows for title/body_html
                if (locale === 'fi' && (field === 'title' || field === 'body_html')) {
                    console.log(`🔍 Processing ${field} for product ${identification} with locale ${locale}`);
                    const handle = idToHandle.get(identification);
                    if (handle) {
                        console.log(`📝 Found handle: ${handle} for product ${identification}`);
                        // Extract base code: first 5 digits or before dash
                        let baseCode = handle.split('-')[0];
                        // If baseCode is not all digits, extract first 5 digits
                        if (!/^\d+$/.test(baseCode)) {
                            const digits = handle.replace(/\D/g, '').substring(0, 5);
                            if (digits) baseCode = digits;
                        }
                        baseCode = baseCode.toUpperCase();
                        console.log(`📝 Base code extracted: ${baseCode}`);
                        const finnishProduct = finnishProductMap.get(baseCode);
                        if (finnishProduct) {
                            console.log(`✅ Found Finnish product for code ${baseCode}`);
                            let newTranslatedContent = '';
                            if (field === 'title') {
                                let finnishTitle = finnishProduct.title || '';
                                finnishTitle = finnishTitle.replace(/<\/?b>/g, '');
                                finnishTitle = finnishTitle.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                                newTranslatedContent = finnishTitle;
                            } else if (field === 'body_html') {
                                console.log(`🔍 Processing body_html for product ${identification} with Finnish product code ${finnishProduct.code}`);
                                let finnishDescription = finnishProduct.description || '';
                                const sizeTable = finnishProduct.sizetable || '';
                                console.log(`📝 Finnish description length: ${finnishDescription.length}`);
                                console.log(`📊 Finnish size table length: ${sizeTable.length}`);
                                if (sizeTable) {
                                    const styledSizeTable = `<div class="size-table">
<h3 style="background-color: #666; color: white; padding: 10px; margin: 0; border-radius: 5px 5px 0 0;">Kokotaulukko</h3>
<div style="background: linear-gradient(to bottom, #f8f8f8 0%, #f8f8f8 50%, white 50%, white 100%);">
${sizeTable}
</div>
</div>`;
                                    finnishDescription = finnishDescription + styledSizeTable;
                                    console.log(`✅ Combined description + size table length: ${finnishDescription.length}`);
                                }
                                newTranslatedContent = finnishDescription;
                            }
                            
                            // Always update the Translated content column for both title and body_html
                            const updatedLine = `${parts[0]};${identification};${field};${locale};${parts[4]};${parts[5]};${defaultContent};${newTranslatedContent}`;
                            updatedLines.push(updatedLine);
                            updatedCount++;
                            console.log(`✅ Updated ${field} for product ${identification} with Finnish content`);
                        } else {
                            // Write the original line if no Finnish product found
                            updatedLines.push(currentLine);
                        }
                    } else {
                        // Write the original line if no handle found
                        updatedLines.push(currentLine);
                    }
                } else {
                    // Write the original line for non-fi rows or non-title/body_html fields
                    updatedLines.push(currentLine);
                }
            } else {
                // Write the original line if it doesn't have enough parts
                updatedLines.push(currentLine);
            }
        }
        
        fs.writeFileSync('KH-Print_Oy_translations_updated.csv', updatedLines.join('\n'), 'utf8');
        console.log(`✅ Updated KH-Print CSV saved to: KH-Print_Oy_translations_updated.csv`);
        console.log(`📊 Updated ${updatedCount} rows with Finnish translations`);
    } catch (error) {
        console.error('❌ Error updating KH-Print with Finnish translations:', error.message);
    }
}

updateKHPrintWithFinnish(); 