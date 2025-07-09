#!/usr/bin/env node

const ProductImporter = require('./import-products');
const TranslationImporter = require('./import-translations');
require('dotenv').config();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🏪 Sky Pro Shopify Import Tool');
  console.log('================================\n');

  try {
    switch (command) {
      case 'products':
      case 'import':
        console.log('📦 Running product import...\n');
        const productImporter1 = new ProductImporter();
        await productImporter1.importProducts();
        break;

      case 'translations':
      case 'translate':
        console.log('🌍 Running translation import...\n');
        const translationImporter1 = new TranslationImporter();
        await translationImporter1.importTranslations();
        break;

      case 'all':
        console.log('🚀 Running complete import (products + translations)...\n');
        
        // First import products
        console.log('📦 Step 1: Importing products...\n');
        const productImporter2 = new ProductImporter();
        await productImporter2.importProducts();
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        // Then import translations
        console.log('🌍 Step 2: Importing translations...\n');
        const translationImporter2 = new TranslationImporter();
        await translationImporter2.importTranslations();
        
        console.log('\n🎉 Complete import finished!');
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        console.log('❌ Unknown command. Use "help" to see available commands.\n');
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('💥 Import failed:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log('Usage: node index.js <command>');
  console.log('');
  console.log('Commands:');
  console.log('  products, import    Import products from English XML feed to Shopify');
  console.log('  translations, translate  Import Finnish translations to Shopify');
  console.log('  all                 Run both product import and translation import');
  console.log('  help, --help, -h    Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node index.js products');
  console.log('  node index.js translations');
  console.log('  node index.js all');
  console.log('');
  console.log('Environment Variables:');
  console.log('  SHOPIFY_SHOP_URL           Your Shopify shop URL');
  console.log('  SHOPIFY_ACCESS_TOKEN       Your Shopify API access token');
  console.log('  SHOPIFY_API_VERSION        Shopify API version (default: 2024-01)');
  console.log('  ENGLISH_FEED_URL           English XML feed URL');
  console.log('  FINNISH_FEED_URL           Finnish XML feed URL');
  console.log('  MAX_PRODUCTS               Limit number of products to import (for testing)');
  console.log('');
  console.log('Make sure to create a .env file with your Shopify credentials!');
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = { main, showHelp }; 