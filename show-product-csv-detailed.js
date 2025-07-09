const XMLParser = require('./utils/xml-parser');
require('dotenv').config();

// Function to flatten nested objects with better handling
function flattenObjectDetailed(obj, prefix = '') {
  const flattened = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // For nested objects, flatten them
        Object.assign(flattened, flattenObjectDetailed(obj[key], newKey));
      } else if (Array.isArray(obj[key])) {
        // For arrays, create separate entries for each item
        obj[key].forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            Object.assign(flattened, flattenObjectDetailed(item, `${newKey}.${index}`));
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

// Function to convert to CSV
function objectToCSV(obj) {
  const headers = Object.keys(obj);
  const values = headers.map(header => {
    const value = obj[header];
    // Escape quotes and wrap in quotes if contains comma or newline
    const escaped = String(value).replace(/"/g, '""');
    return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped;
  });
  
  return [headers.join(','), values.join(',')].join('\n');
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

  // Flatten the product object with detailed handling
  const flattenedProduct = flattenObjectDetailed(firstProduct);
  
  // Convert to CSV
  const csv = objectToCSV(flattenedProduct);
  
  console.log('Detailed CSV format of the first product:');
  console.log('=========================================');
  console.log(csv);
  
  // Also save to file for easier viewing
  const fs = require('fs');
  fs.writeFileSync('product-sample-detailed.csv', csv);
  console.log('\nDetailed CSV saved to product-sample-detailed.csv');
  
  // Also show the field names for reference
  console.log('\nAll available fields:');
  console.log('=====================');
  Object.keys(flattenedProduct).forEach(field => {
    console.log(field);
  });
})(); 