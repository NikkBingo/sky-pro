const ProductImporter = require('./import-products.js');

async function checkVariantImages() {
  const importer = new ProductImporter();
  
  try {
    console.log('🔍 Checking variant image assignments for existing products...');
    
    // Get all products
    const response = await importer.shopifyAPI.makeRequest('GET', '/products.json?limit=50');
    const products = response.products || [];
    
    console.log(`📦 Found ${products.length} products to check`);
    
    let totalVariants = 0;
    let totalAssigned = 0;
    let productsWithIssues = [];
    
    for (const product of products) {
      console.log(`\n🔍 Checking product: "${product.title}" (ID: ${product.id})`);
      
      const variants = product.variants || [];
      let assignedCount = 0;
      let unassignedVariants = [];
      
      variants.forEach((variant, index) => {
        const hasImage = variant.image_id && variant.image_id > 0;
        const status = hasImage ? '✅' : '❌';
        
        console.log(`  ${index + 1}. ${status} "${variant.title}" ${hasImage ? `(Image ID: ${variant.image_id})` : '(no image)'}`);
        
        if (hasImage) {
          assignedCount++;
        } else {
          unassignedVariants.push(variant.title);
        }
      });
      
      totalVariants += variants.length;
      totalAssigned += assignedCount;
      
      const assignmentRate = ((assignedCount / variants.length) * 100).toFixed(1);
      console.log(`  📊 Assignment rate: ${assignmentRate}% (${assignedCount}/${variants.length})`);
      
      if (assignedCount < variants.length) {
        productsWithIssues.push({
          id: product.id,
          title: product.title,
          assigned: assignedCount,
          total: variants.length,
          unassigned: unassignedVariants
        });
      }
    }
    
    console.log(`\n📊 OVERALL SUMMARY:`);
    console.log(`  📦 Total products checked: ${products.length}`);
    console.log(`  📦 Total variants: ${totalVariants}`);
    console.log(`  ✅ Variants with images: ${totalAssigned}`);
    console.log(`  ❌ Variants without images: ${totalVariants - totalAssigned}`);
    console.log(`  📊 Overall assignment rate: ${((totalAssigned / totalVariants) * 100).toFixed(1)}%`);
    
    if (productsWithIssues.length > 0) {
      console.log(`\n⚠️ PRODUCTS WITH INCOMPLETE IMAGE ASSIGNMENTS:`);
      productsWithIssues.forEach(product => {
        console.log(`  📦 "${product.title}" (ID: ${product.id})`);
        console.log(`     📊 ${product.assigned}/${product.total} variants have images`);
        console.log(`     ❌ Missing images for: ${product.unassigned.join(', ')}`);
      });
      
      console.log(`\n💡 To fix incomplete assignments, you can run:`);
      console.log(`   node import-products.js --fix-variant-images`);
    } else {
      console.log(`\n✅ All products have complete variant image assignments!`);
    }
    
  } catch (error) {
    console.error('❌ Error checking variant images:', error.message);
  }
}

// Run the check if this file is executed directly
if (require.main === module) {
  checkVariantImages()
    .then(() => {
      console.log('\n✅ Check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Check failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkVariantImages }; 