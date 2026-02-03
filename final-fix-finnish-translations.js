const fs = require('fs');

async function finalFixFinnishTranslations() {
    try {
        console.log('📖 Loading Finnish translations...');
        
        // Read the Finnish translations file
        const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
        const lines = finnishContent.split('\n');
        
        // Build Finnish translations map
        const finnishTranslationsMap = new Map();
        let currentRow = '';
        
        for (const line of lines) {
            if (line.startsWith('PRODUCT;')) {
                if (currentRow) {
                    processFinnishRow(currentRow, finnishTranslationsMap);
                }
                currentRow = line;
            } else if (line.trim()) {
                currentRow += '\n' + line;
            }
        }
        
        if (currentRow) {
            processFinnishRow(currentRow, finnishTranslationsMap);
        }
        
        console.log(`📊 Loaded ${finnishTranslationsMap.size} Finnish translations`);

        // Read the original KH-Print CSV
        const khPrintContent = fs.readFileSync('KH-Print_Oy_translations.csv', 'utf8');
        const khPrintLines = khPrintContent.split('\n');
        const header = khPrintLines[0];
        const dataLines = khPrintLines.slice(1);

        // Build handle mapping
        const idToHandle = new Map();
        let currentKhPrintRow = '';
        
        for (const line of dataLines) {
            if (line.startsWith('PRODUCT;')) {
                if (currentKhPrintRow) {
                    processKhPrintRow(currentKhPrintRow, idToHandle);
                }
                currentKhPrintRow = line;
            } else if (line.trim()) {
                currentKhPrintRow += '\n' + line;
            }
        }
        
        if (currentKhPrintRow) {
            processKhPrintRow(currentKhPrintRow, idToHandle);
        }

        // Update the CSV with Finnish translations
        const updatedLines = [header];
        let updatedCount = 0;
        currentKhPrintRow = '';
        
        for (const line of dataLines) {
            if (line.startsWith('PRODUCT;')) {
                if (currentKhPrintRow) {
                    const result = updateKhPrintRow(currentKhPrintRow, idToHandle, finnishTranslationsMap);
                    updatedLines.push(result.line);
                    if (result.updated) updatedCount++;
                }
                currentKhPrintRow = line;
            } else if (line.trim()) {
                currentKhPrintRow += '\n' + line;
            }
        }
        
        if (currentKhPrintRow) {
            const result = updateKhPrintRow(currentKhPrintRow, idToHandle, finnishTranslationsMap);
            updatedLines.push(result.line);
            if (result.updated) updatedCount++;
        }
        
        // Write the updated CSV
        fs.writeFileSync('KH-print_skypro_translated.csv', updatedLines.join('\n'), 'utf8');
        console.log(`✅ Updated CSV with ${updatedCount} Finnish translations`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

function processFinnishRow(row, finnishTranslationsMap) {
    const parts = row.split(';');
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

function processKhPrintRow(row, idToHandle) {
    const parts = row.split(';');
    if (parts.length >= 8) {
        const identification = parts[1];
        const field = parts[2];
        const defaultContent = parts[6];
        if (field === 'handle' && defaultContent) {
            idToHandle.set(identification, defaultContent);
        }
    }
}

function updateKhPrintRow(row, idToHandle, finnishTranslationsMap) {
    const parts = row.split(';');
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
                        // Properly escape the content for CSV
                        const escapedContent = newTranslatedContent.replace(/"/g, '""');
                        const updatedLine = `${parts[0]};${identification};${field};${locale};${parts[4]};${parts[5]};${defaultContent};"${escapedContent}"`;
                        console.log(`✅ Updated ${field} for product ${identification}`);
                        return { line: updatedLine, updated: true };
                    }
                }
            }
        }
    }
    return { line: row, updated: false };
}

finalFixFinnishTranslations(); 