const fs = require('fs');

function escapeCell(cell) {
    if (!cell) return '';
    // Replace all newlines with <br>
    let out = cell.replace(/\r?\n/g, '<br>');
    // Escape quotes for CSV
    out = out.replace(/"/g, '""');
    return '"' + out + '"';
}

function moveSizeChartAfterDescription(content) {
    if (!content) return '';
    
    // Look for the size table div start with various patterns
    const sizeTablePatterns = [
        /<div[^>]*class=["']?size-table["']?[^>]*>/i,
        /<div[^>]*size-table[^>]*>/i
    ];
    
    let sizeTableStart = -1;
    for (const pattern of sizeTablePatterns) {
        const match = content.match(pattern);
        if (match) {
            sizeTableStart = content.indexOf(match[0]);
            break;
        }
    }
    
    if (sizeTableStart === -1) {
        return content; // No size chart found
    }
    
    // Extract everything from the size table start to the end
    const description = content.substring(0, sizeTableStart).trim();
    const sizeChart = content.substring(sizeTableStart).trim();
    
    // Remove any trailing <br> from description
    const cleanDescription = description.replace(/(<br>)+$/, '');
    
    // Add the size chart after the description, separated by <br><br>
    return cleanDescription + '<br><br>' + sizeChart;
}

function processCSVSingleLine(input, output) {
    const content = fs.readFileSync(input, 'utf8');
    const lines = content.split(/\r?\n/);
    const outLines = [];
    // Reconstruct logical rows
    let header = lines[0];
    outLines.push(header);
    let currentRow = '';
    let inRow = false;
    for (let i = 1; i < lines.length; ++i) {
        const line = lines[i];
        if (!line.trim()) continue;
        if (line.startsWith('PRODUCT;')) {
            if (currentRow) {
                outLines.push(processRow(currentRow));
            }
            currentRow = line;
            inRow = true;
        } else if (inRow) {
            currentRow += '\n' + line;
        }
    }
    if (currentRow) {
        outLines.push(processRow(currentRow));
    }
    fs.writeFileSync(output, outLines.join('\n'), 'utf8');
    console.log('✅ All rows are now single line with <br> for newlines, and complete size chart is after description.');
}

function processRow(row) {
    // Split only top-level semicolons (not inside quotes)
    let parts = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < row.length; ++j) {
        const c = row[j];
        if (c === '"') inQuotes = !inQuotes;
        if (c === ';' && !inQuotes) {
            parts.push(current);
            current = '';
        } else {
            current += c;
        }
    }
    parts.push(current);
    // Fix Default content (6) and Translated content (7)
    if (parts.length >= 8) {
        // If this is a body_html row, move size chart after description in both columns
        if (parts[2] === 'body_html') {
            parts[6] = escapeCell(moveSizeChartAfterDescription(parts[6]));
            parts[7] = escapeCell(moveSizeChartAfterDescription(parts[7]));
        } else {
            parts[6] = escapeCell(parts[6]);
            parts[7] = escapeCell(parts[7]);
        }
    }
    return parts.join(';');
}

processCSVSingleLine('KH-print_skypro_translated.csv', 'KH-print_skypro_translated_singleline.csv'); 