const XMLParser = require('./utils/xml-parser');
require('dotenv').config();

// Function to flatten nested objects
function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else if (Array.isArray(obj[key])) {
        // Handle arrays by joining with semicolon
        flattened[newKey] = obj[key].join('; ');
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

  // Flatten the product object
  const flattenedProduct = flattenObject(firstProduct);
  
  // Convert to CSV
  const csv = objectToCSV(flattenedProduct);
  
  console.log('CSV format of the first product:');
  console.log('================================');
  console.log(csv);
  
  // Also save to file for easier viewing
  const fs = require('fs');
  fs.writeFileSync('product-sample.csv', csv);
  console.log('\nCSV saved to product-sample.csv');
})(); 