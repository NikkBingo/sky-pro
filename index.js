#!/usr/bin/env node

const ProductImporter = require('./import-products');
const TranslationImporter = require('./import-translations');
const readline = require('readline');
require('dotenv').config();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🏪 Sky Pro Shopify Import Tool');
  console.log('================================\n');

  // If no command provided, show interactive menu
  if (!command) {
    await showInteractiveMenu();
    return;
  }

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

async function showInteractiveMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  try {
    console.log('📋 Interactive Mode');
    console.log('==================\n');
    console.log('Please select an operation:\n');
    console.log('  1. Import Products');
    console.log('  2. Import Translations');
    console.log('  3. Import All (Products + Translations)');
    console.log('  4. Update Size Charts (Exclude Stanley/Stella)');
    console.log('  5. Update Size Charts (Fast)');
    console.log('  6. Update Size Charts (Conservative)');
    console.log('  7. Show Help');
    console.log('  8. Exit\n');

    const answer = await question('Enter your choice (1-8): ');

    console.log(''); // Add blank line

    switch (answer.trim()) {
      case '1':
        console.log('📦 Running product import...\n');
        const productImporter1 = new ProductImporter();
        await productImporter1.importProducts();
        break;

      case '2':
        console.log('🌍 Running translation import...\n');
        const translationImporter1 = new TranslationImporter();
        await translationImporter1.importTranslations();
        break;

      case '3':
        console.log('🚀 Running complete import (products + translations)...\n');
        console.log('📦 Step 1: Importing products...\n');
        const productImporter2 = new ProductImporter();
        await productImporter2.importProducts();
        console.log('\n' + '='.repeat(50) + '\n');
        console.log('🌍 Step 2: Importing translations...\n');
        const translationImporter2 = new TranslationImporter();
        await translationImporter2.importTranslations();
        console.log('\n🎉 Complete import finished!');
        break;

      case '4':
        console.log('📏 Running size chart update (excluding Stanley/Stella)...\n');
        const SizeChartUpdaterExcludeStanley = require('./update-sizecharts-exclude-stanley');
        const updater1 = new SizeChartUpdaterExcludeStanley();
        await updater1.run();
        break;

      case '5':
        console.log('⚡ Running fast size chart update (excluding Stanley/Stella)...\n');
        const FastSizeChartUpdaterExcludeStanley = require('./update-sizecharts-exclude-stanley-fast');
        const updater2 = new FastSizeChartUpdaterExcludeStanley();
        await updater2.run();
        break;

      case '6':
        console.log('🐢 Running conservative size chart update...\n');
        const ConservativeSizeChartUpdater = require('./update-sizecharts-conservative');
        const updater3 = new ConservativeSizeChartUpdater();
        await updater3.run();
        break;

      case '7':
        showHelp();
        break;

      case '8':
        console.log('👋 Goodbye!');
        rl.close();
        process.exit(0);
        return;

      default:
        console.log('❌ Invalid choice. Please enter a number between 1-8.\n');
        rl.close();
        await showInteractiveMenu();
        return;
    }

    // Ask if user wants to run another operation
    console.log('\n' + '='.repeat(50) + '\n');
    const continueAnswer = await question('Would you like to run another operation? (y/n): ');
    
    if (continueAnswer.trim().toLowerCase() === 'y' || continueAnswer.trim().toLowerCase() === 'yes') {
      console.log('');
      rl.close();
      await showInteractiveMenu();
    } else {
      console.log('\n👋 Goodbye!');
      rl.close();
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
    rl.close();
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