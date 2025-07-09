#!/usr/bin/env node

const { program } = require('commander');
const ProductImporter = require('./import-products');
// TODO: Enable translation import when Shopify Translate & Adapt app is installed
// const TranslationImporter = require('./import-translations');

program
  .name('sky-pro-import')
  .description('Import products from XML feeds to Shopify')
  .version('1.0.0');

program
  .command('products')
  .description('Import products from English XML feed')
  .option('-d, --dry-run', 'Show what would be imported without making changes')
  .option('-l, --limit <number>', 'Limit number of products to import', '10')
  .action(async (options) => {
    try {
      console.log('🚀 Starting product import...');
      
      // Set environment variable for limit if provided
      if (options.limit) {
        process.env.MAX_PRODUCTS = options.limit;
      }
      
      const importer = new ProductImporter();
      await importer.importProducts(options);
      console.log('✅ Product import completed!');
    } catch (error) {
      console.error('❌ Import failed:', error.message);
      process.exit(1);
    }
  });

// TODO: Enable translation import when Shopify Translate & Adapt app is installed
/*
program
  .command('translations')
  .description('Import Finnish translations from XML feed')
  .option('-d, --dry-run', 'Show what would be imported without making changes')
  .option('-l, --limit <number>', 'Limit number of translations to import', '10')
  .action(async (options) => {
    try {
      console.log('🚀 Starting translation import...');
      console.log('⚠️  Note: This requires the Shopify Translate & Adapt app to be installed');
      const importer = new TranslationImporter();
      await importer.importTranslations(options);
      console.log('✅ Translation import completed!');
    } catch (error) {
      console.error('❌ Import failed:', error.message);
      process.exit(1);
    }
  });
*/

program.parse(); 