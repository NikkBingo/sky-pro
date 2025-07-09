const XMLParser = require('./utils/xml-parser');
require('dotenv').config();

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

  console.log(JSON.stringify(firstProduct, null, 2));
})(); 