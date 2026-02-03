const fs = require('fs');

async function updateKHPrintWithFinnishFixed() {
    try {
        console.log('📖 Loading Finnish translations from CSV...');
        
        // Read the entire Finnish translations file
        const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
        
        // Build Finnish translations map: code -> {title, description}
        const finnishTranslationsMap = new Map();
        
        // Split by lines and process each complete row
        const lines = finnishContent.split('\n');
        let currentRow = '';
        
        for (const line of lines) {
            if (line.startsWith('PRODUCT;')) {
                // Process the previous row if it exists
                if (currentRow) {
                    processFinnishRow(currentRow, finnishTranslationsMap);
                }
                currentRow = line;
            } else if (line.trim()) {
                // Continue the current row
                currentRow += '\n' + line;
            }
        }
        
        // Process the last row
        if (currentRow) {
            processFinnishRow(currentRow, finnishTranslationsMap);
        }
        
        console.log(`📊 Loaded ${finnishTranslationsMap.size} Finnish product translations`);

        // Read the KH-Print CSV
        const khPrintContent = fs.readFileSync('KH-Print_Oy_translations.csv', 'utf8');
        const khPrintLines = khPrintContent.split('\n');
        const header = khPrintLines[0];
        const dataLines = khPrintLines.slice(1);

        // Build Identification -> handle map
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
        
        console.log(`📝 Mapped ${idToHandle.size} handles by Identification`);

        // Update rows with Finnish translations
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
        
        fs.writeFileSync('KH-Print_Oy_translations_updated.csv', updatedLines.join('\n'), 'utf8');
        console.log(`✅ Updated KH-Print CSV saved to: KH-Print_Oy_translations_updated.csv`);
        console.log(`📊 Updated ${updatedCount} rows with Finnish translations`);
    } catch (error) {
        console.error('❌ Error updating KH-Print with Finnish translations:', error.message);
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
                        // Escape the content to handle multiline content properly
                        const escapedContent = newTranslatedContent.replace(/"/g, '""');
                        const updatedLine = `${parts[0]};${identification};${field};${locale};${parts[4]};${parts[5]};${defaultContent};"${escapedContent}"`;
                        console.log(`✅ Updated ${field} for product ${identification} with Finnish content`);
                        return { line: updatedLine, updated: true };
                    }
                }
            }
        }
    }
    return { line: row, updated: false };
}

updateKHPrintWithFinnishFixed(); 