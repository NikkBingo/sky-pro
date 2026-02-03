const TranslationUpdater = require('./update-translations');

async function testTranslationUpdate() {
  console.log('🧪 Testing translation update functionality...');
  
  const updater = new TranslationUpdater();
  
  try {
    // Test with dry run and limited products
    await updater.updateTranslations({
      dryRun: true,
      limit: 5,
      categories: ['Shopping Bags']
    });
    
    console.log('✅ Translation update test completed successfully!');
  } catch (error) {
    console.error('❌ Translation update test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testTranslationUpdate(); 