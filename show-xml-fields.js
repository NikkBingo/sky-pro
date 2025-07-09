const axios = require('axios');
const xml2js = require('xml2js');

async function getFields(obj, prefix = '', fields = new Set()) {
  if (typeof obj !== 'object' || obj === null) return fields;
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    fields.add(path);
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      getFields(obj[key], path, fields);
    }
  }
  return fields;
}

async function main() {
  const url = process.argv[2] || 'https://www.skypro.fi/tuotteet/products-en.xml';
  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
  try {
    const response = await axios.get(url);
    const result = await parser.parseStringPromise(response.data);
    const products = result.mainostekstiilitcom.products.product;
    const productArray = Array.isArray(products) ? products : [products];
    const allFields = new Set();
    for (const product of productArray) {
      getFields(product, '', allFields);
    }
    const sortedFields = Array.from(allFields).sort();
    // Print as a JSON array for easy copy-paste
    console.log(JSON.stringify(sortedFields, null, 2));
  } catch (error) {
    console.error('Failed to fetch or parse XML:', error.message);
  }
}

main(); 