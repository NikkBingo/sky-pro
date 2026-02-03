const fs = require('fs');

const PRODUCT_CODE = '10360'; // Change this to check other products

function buildProductHandleMap(lines) {
    const map = {};
    for (const line of lines) {
        if (line.includes(';handle;')) {
            const parts = line.split(';');
            if (parts.length >= 7) {
                const productId = parts[1].replace("'", "");
                const handle = parts[6].replace(/"/g, '');
                map[productId] = handle;
            }
        }
    }
    return map;
}

function extractFullTranslatedContent(productCode) {
    const csv = fs.readFileSync('KH-print_skypro_translated_complete.csv', 'utf8');
    const lines = csv.split('\n');
    const productHandleMap = buildProductHandleMap(lines);
    let found = false;
    for (const line of lines) {
        if (line.includes(';body_html;')) {
            const parts = line.split(';');
            if (parts.length >= 8) {
                const productId = parts[1].replace("'", "");
                const handle = productHandleMap[productId];
                if (handle && handle.startsWith(productCode)) {
                    found = true;
                    const translatedContent = parts[7];
                    console.log(`\n--- FULL TRANSLATED CONTENT for handle ${handle} (product code ${productCode}) ---\n`);
                    console.log(translatedContent);
                    console.log(`\n--- END ---\n`);
                }
            }
        }
    }
    if (!found) {
        console.log(`No body_html row found for product code ${productCode}`);
    }
}

extractFullTranslatedContent(PRODUCT_CODE); 