const fs = require('fs');

// Read the Finnish translations file
const finnishContent = fs.readFileSync('finnish-translations.csv', 'utf8');
const lines = finnishContent.split('\n');

// Build Finnish translations map
const finnishTranslationsMap = new Map();
let currentRow = '';

for (const line of lines) {
    if (line.startsWith('PRODUCT;')) {
        if (currentRow) {
            const parts = currentRow.split(';');
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
        currentRow = line;
    } else if (line.trim()) {
        currentRow += '\n' + line;
    }
}

// Process the last row
if (currentRow) {
    const parts = currentRow.split(';');
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

// Test the loading
console.log('Loaded Finnish translations:');
console.log(`Total products: ${finnishTranslationsMap.size}`);

// Check product 877
const product877 = finnishTranslationsMap.get('877');
if (product877) {
    console.log('\nProduct 877:');
    console.log('Title:', product877.title);
    console.log('Description length:', product877.description ? product877.description.length : 0);
    console.log('Description preview:', product877.description ? product877.description.substring(0, 100) + '...' : 'No description');
} else {
    console.log('Product 877 not found');
} 