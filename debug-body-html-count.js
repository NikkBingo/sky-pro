const fs = require('fs');

function debugBodyHtmlCount() {
    try {
        // Read the KH-Print CSV
        const khPrintContent = fs.readFileSync('KH-Print_Oy_translations_updated.csv', 'utf8');
        const lines = khPrintContent.split('\n');
        const dataLines = lines.slice(1);

        let bodyHtmlCount = 0;
        let bodyHtmlWithFi = 0;
        let bodyHtmlWithEmptyTranslated = 0;
        
        dataLines.forEach((line, index) => {
            if (!line.trim()) return;
            
            // Parse CSV with quoted fields properly
            const parts = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ';' && !inQuotes) {
                    parts.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            parts.push(current);
            
            if (parts.length < 8) return;
            
            const identification = parts[1];
            const field = parts[2];
            const locale = parts[3];
            const translatedContent = parts[7];
            
            if (field === 'body_html') {
                bodyHtmlCount++;
                if (locale === 'fi') {
                    bodyHtmlWithFi++;
                    if (!translatedContent || translatedContent.trim() === '') {
                        bodyHtmlWithEmptyTranslated++;
                        console.log(`Empty body_html: ${identification} (line ${index + 2})`);
                    }
                }
            }
        });
        
        console.log(`\n📊 Body HTML Statistics:`);
        console.log(`- Total body_html rows: ${bodyHtmlCount}`);
        console.log(`- Body_html rows with fi locale: ${bodyHtmlWithFi}`);
        console.log(`- Body_html rows with empty translated content: ${bodyHtmlWithEmptyTranslated}`);
        
    } catch (error) {
        console.error('❌ Error debugging body_html count:', error.message);
    }
}

debugBodyHtmlCount(); 