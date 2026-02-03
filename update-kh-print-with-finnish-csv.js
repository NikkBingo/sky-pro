const fs = require('fs');

async function updateKHPrintWithFinnishCSV() {
    try {
        console.log('📖 Loading Finnish translations from CSV...');
        
        // Read the Finnish translations CSV
        const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
        const finnishLines = finnishContent.split('\n');
        const finnishHeader = finnishLines[0];
        const finnishDataLines = finnishLines.slice(1);

        // Build Finnish translations map: code -> {title, description, sizetable}
        const finnishTranslationsMap = new Map();
        let currentFinnishLine = '';
        
        for (let i = 0; i < finnishDataLines.length; i++) {
            const line = finnishDataLines[i];
            if (!line.trim()) continue;
            
            // If this line starts with PRODUCT, it's a new row
            if (line.startsWith('PRODUCT;')) {
                // Process the previous complete line
                if (currentFinnishLine) {
                    const parts = currentFinnishLine.split(';');
                    if (parts.length >= 8) {
                        const identification = parts[1];
                        const field = parts[2];
                        const locale = parts[3];
                        const translatedContent = parts[7];
                        
                        if (locale === 'fi') {
                            // Extract the code from identification (remove the quote)
                            const code = identification.replace("'", "");
                            
                            if (!finnishTranslationsMap.has(code)) {
                                finnishTranslationsMap.set(code, {});
                            }
                            
                            const productData = finnishTranslationsMap.get(code);
                            if (field === 'title') {
                                productData.title = translatedContent;
                            } else if (field === 'body_html') {
                                productData.description = translatedContent;
                            }
                        }
                    }
                }
                currentFinnishLine = line;
            } else {
                // This is a continuation of the previous line
                currentFinnishLine += '\n' + line;
            }
        }
        
        // Process the last line
        if (currentFinnishLine) {
            const parts = currentFinnishLine.split(';');
            if (parts.length >= 8) {
                const identification = parts[1];
                const field = parts[2];
                const locale = parts[3];
                const translatedContent = parts[7];
                
                if (locale === 'fi') {
                    const code = identification.replace("'", "");
                    
                    if (!finnishTranslationsMap.has(code)) {
                        finnishTranslationsMap.set(code, {});
                    }
                    
                    const productData = finnishTranslationsMap.get(code);
                    if (field === 'title') {
                        productData.title = translatedContent;
                    } else if (field === 'body_html') {
                        productData.description = translatedContent;
                    }
                }
            }
        }
        
        console.log(`📊 Loaded ${finnishTranslationsMap.size} Finnish product translations`);

        // Read the KH-Print CSV
        const khPrintContent = fs.readFileSync('KH-Print_Oy_translations.csv', 'utf8');
        const lines = khPrintContent.split('\n');
        const header = lines[0];
        const dataLines = lines.slice(1);

        // Build Identification -> handle map
        const idToHandle = new Map();
        let currentLine = '';
        
        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i];
            if (!line.trim()) continue;
            
            if (line.startsWith('PRODUCT;')) {
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
                currentLine += '\n' + line;
            }
        }
        
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
        
        console.log(`📝 Mapped ${idToHandle.size} handles by Identification`);

        // Update rows with Finnish translations
        const updatedLines = [header];
        let updatedCount = 0;
        currentLine = '';
        
        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i];
            if (!line.trim()) continue;
            
            if (line.startsWith('PRODUCT;')) {
                if (currentLine) {
                    const parts = currentLine.split(';');
                    if (parts.length >= 8) {
                        const identification = parts[1];
                        const field = parts[2];
                        const locale = parts[3];
                        const defaultContent = parts[6];
                        
                        if (locale === 'fi' && (field === 'title' || field === 'body_html')) {
                            const handle = idToHandle.get(identification);
                            if (handle) {
                                // Extract base code from handle
                                let baseCode = handle.split('-')[0];
                                if (!/^\d+$/.test(baseCode)) {
                                    const digits = handle.replace(/\D/g, '').substring(0, 5);
                                    if (digits) baseCode = digits;
                                }
                                
                                const finnishProduct = finnishTranslationsMap.get(baseCode);
                                if (finnishProduct) {
                                    let newTranslatedContent = '';
                                    
                                    if (field === 'title' && finnishProduct.title) {
                                        newTranslatedContent = finnishProduct.title;
                                    } else if (field === 'body_html' && finnishProduct.description) {
                                        newTranslatedContent = finnishProduct.description;
                                    }
                                    
                                    if (newTranslatedContent) {
                                        const updatedLine = `${parts[0]};${identification};${field};${locale};${parts[4]};${parts[5]};${defaultContent};${newTranslatedContent}`;
                                        updatedLines.push(updatedLine);
                                        updatedCount++;
                                        console.log(`✅ Updated ${field} for product ${identification} with Finnish content`);
                                    } else {
                                        updatedLines.push(currentLine);
                                    }
                                } else {
                                    updatedLines.push(currentLine);
                                }
                            } else {
                                updatedLines.push(currentLine);
                            }
                        } else {
                            updatedLines.push(currentLine);
                        }
                    } else {
                        updatedLines.push(currentLine);
                    }
                }
                currentLine = line;
            } else {
                currentLine += '\n' + line;
            }
        }
        
        if (currentLine) {
            const parts = currentLine.split(';');
            if (parts.length >= 8) {
                const identification = parts[1];
                const field = parts[2];
                const locale = parts[3];
                const defaultContent = parts[6];
                
                if (locale === 'fi' && (field === 'title' || field === 'body_html')) {
                    const handle = idToHandle.get(identification);
                    if (handle) {
                        let baseCode = handle.split('-')[0];
                        if (!/^\d+$/.test(baseCode)) {
                            const digits = handle.replace(/\D/g, '').substring(0, 5);
                            if (digits) baseCode = digits;
                        }
                        
                        const finnishProduct = finnishTranslationsMap.get(baseCode);
                        if (finnishProduct) {
                            let newTranslatedContent = '';
                            
                            if (field === 'title' && finnishProduct.title) {
                                newTranslatedContent = finnishProduct.title;
                            } else if (field === 'body_html' && finnishProduct.description) {
                                newTranslatedContent = finnishProduct.description;
                            }
                            
                            if (newTranslatedContent) {
                                const updatedLine = `${parts[0]};${identification};${field};${locale};${parts[4]};${parts[5]};${defaultContent};${newTranslatedContent}`;
                                updatedLines.push(updatedLine);
                                updatedCount++;
                                console.log(`✅ Updated ${field} for product ${identification} with Finnish content`);
                            } else {
                                updatedLines.push(currentLine);
                            }
                        } else {
                            updatedLines.push(currentLine);
                        }
                    } else {
                        updatedLines.push(currentLine);
                    }
                } else {
                    updatedLines.push(currentLine);
                }
            } else {
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

updateKHPrintWithFinnishCSV(); 