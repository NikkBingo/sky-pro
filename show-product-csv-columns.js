const XMLParser = require('./utils/xml-parser');
require('dotenv').config();

// Function to flatten nested objects with proper handling of arrays
function flattenObjectProperly(obj, prefix = '') {
  const flattened = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // For nested objects, flatten them
        Object.assign(flattened, flattenObjectProperly(obj[key], newKey));
      } else if (Array.isArray(obj[key])) {
        // For arrays, create separate entries for each item with index
        obj[key].forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            // Flatten each object in the array
            Object.assign(flattened, flattenObjectProperly(item, `${newKey}.${index}`));
          } else {
            flattened[`${newKey}.${index}`] = item;
          }
        });
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }
  
  return flattened;
}

// Function to convert to 2-column CSV format
function objectToTwoColumnCSV(obj) {
  const rows = [];
  
  // Add header
  rows.push('Field Name,Value');
  
  // Add each field-value pair
  Object.keys(obj).forEach(field => {
    const value = obj[field];
    // Escape quotes and wrap in quotes if contains comma or newline
    const escapedValue = String(value).replace(/"/g, '""');
    const finalValue = escapedValue.includes(',') || escapedValue.includes('\n') ? `"${escapedValue}"` : escapedValue;
    
    rows.push(`${field},${finalValue}`);
  });
  
  return rows.join('\n');
}

(async () => {
  const parser = new XMLParser();
  const feedUrl = process.env.ENGLISH_FEED_URL || 'https://www.skypro.fi/tuotteet/products-en.xml';
  const xmlData = await parser.fetchAndParseXML(feedUrl);

  if (!xmlData.mainostekstiilitcom || !xmlData.mainostekstiilitcom.products) {
    console.error('Invalid XML structure: missing products data');
    process.exit(1);
  }

  const products = xmlData.mainostekstiilitcom.products.product;
  const firstProduct = Array.isArray(products) ? products[0] : products;

  // Flatten the product object properly
  const flattenedProduct = flattenObjectProperly(firstProduct);
  
  // Convert to 2-column CSV
  const csv = objectToTwoColumnCSV(flattenedProduct);
  
  console.log('Two-column format of the first product:');
  console.log('======================================');
  console.log(csv);
  
  // Also save to file for easier viewing
  const fs = require('fs');
  fs.writeFileSync('product-sample-columns.csv', csv);
  console.log('\nTwo-column CSV saved to product-sample-columns.csv');
  
  // Show a summary of the field types
  console.log('\nField summary:');
  console.log('==============');
  const fieldTypes = {};
  Object.keys(flattenedProduct).forEach(field => {
    const category = field.split('.')[0];
    if (!fieldTypes[category]) fieldTypes[category] = [];
    fieldTypes[category].push(field);
  });
  
  Object.keys(fieldTypes).forEach(category => {
    console.log(`\n${category} fields (${fieldTypes[category].length}):`);
    fieldTypes[category].slice(0, 5).forEach(field => console.log(`  ${field}`));
    if (fieldTypes[category].length > 5) {
      console.log(`  ... and ${fieldTypes[category].length - 5} more`);
    }
  });
})(); 