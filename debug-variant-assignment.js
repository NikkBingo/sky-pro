const ProductImporter = require('./import-products.js');

async function debugVariantAssignment() {
  const importer = new ProductImporter();
  
  try {
    console.log('🔍 Debugging variant image assignment issues...');
    
    // Get all products
    const response = await importer.shopifyAPI.makeRequest('GET', '/products.json?limit=50');
    const products = response.products || [];
    
    // Focus on products that might have the Orange to Royal Blue issue
    const targetProducts = products.filter(product => 
      product.title.includes('Changer') || 
      product.title.includes('Crafter') || 
      product.title.includes('Commuter')
    );
    
    console.log(`🎯 Found ${targetProducts.length} target products to investigate`);
    
    for (const product of targetProducts) {
      console.log(`\n🔍 Investigating product: "${product.title}" (ID: ${product.id})`);
      
      // Get detailed variant information
      const productGid = `gid://shopify/Product/${product.id}`;
      const productQuery = `
        query getProductWithVariants($id: ID!) {
          product(id: $id) {
            id
            title
            variants(first: 50) {
              edges {
                node {
                  id
                  title
                  image {
                    id
                    url
                  }
                }
              }
            }
            images(first: 50) {
              edges {
                node {
                  id
                  url
                  altText
                }
              }
            }
          }
        }
      `;
      
      const productResponse = await importer.shopifyAPI.makeGraphQLRequest(productQuery, { id: productGid });
      
      if (!productResponse.data?.product) {
        console.log(`⚠️ Product ${product.id} not found`);
        continue;
      }
      
      const productData = productResponse.data.product;
      const variants = productData.variants.edges.map(edge => edge.node);
      const images = productData.images.edges.map(edge => edge.node);
      
      console.log(`📦 Product has ${variants.length} variants and ${images.length} images`);
      
      // Check for variants with Orange, Royal Blue, and surrounding colors
      const orangeVariants = variants.filter(v => v.title.toLowerCase().includes('orange'));
      const royalBlueVariants = variants.filter(v => v.title.toLowerCase().includes('royal blue'));
      const brightOrangeVariants = variants.filter(v => v.title.toLowerCase().includes('bright orange'));
      
      console.log(`🍊 Orange variants: ${orangeVariants.length}`);
      console.log(`🔵 Royal Blue variants: ${royalBlueVariants.length}`);
      console.log(`🟠 Bright Orange variants: ${brightOrangeVariants.length}`);
      
      // Check image assignments for these specific variants
      const checkVariants = [...orangeVariants, ...royalBlueVariants, ...brightOrangeVariants];
      
      if (checkVariants.length > 0) {
        console.log(`\n🔍 Checking specific variants:`);
        checkVariants.forEach(variant => {
          const hasImage = variant.image && variant.image.id;
          const status = hasImage ? '✅' : '❌';
          const imageInfo = hasImage ? `(Image ID: ${variant.image.id})` : '(no image)';
          
          console.log(`  ${status} "${variant.title}" ${imageInfo}`);
        });
      }
      
      // Check available images and their alt text
      console.log(`\n📸 Available images:`);
      images.forEach((img, index) => {
        console.log(`  ${index + 1}. Alt: "${img.altText || 'no alt'}" | ID: ${img.id}`);
      });
      
      // Check for variants without images
      const unassignedVariants = variants.filter(v => !v.image || !v.image.id);
      
      if (unassignedVariants.length > 0) {
        console.log(`\n❌ Variants without images (${unassignedVariants.length}):`);
        unassignedVariants.forEach(variant => {
          console.log(`  - "${variant.title}"`);
        });
        
        // Try to understand why these variants don't have images
        console.log(`\n🔍 Analyzing unassigned variants:`);
        for (const variant of unassignedVariants.slice(0, 5)) { // Check first 5
          const variantTitle = variant.title || '';
          let colorOption = '';
          
          if (variantTitle.includes(' - ')) {
            colorOption = variantTitle.split(' - ')[0];
          } else if (variantTitle.includes('/')) {
            colorOption = variantTitle.split('/')[0];
          } else if (variantTitle.includes(' ')) {
            const words = variantTitle.split(' ');
            colorOption = words[0];
          } else {
            colorOption = variantTitle;
          }
          
          if (!colorOption || colorOption.trim() === '') {
            colorOption = 'default';
          }
          
          const colorKey = colorOption.toLowerCase().trim();
          console.log(`  🎨 Variant: "${variantTitle}" -> Color: "${colorKey}"`);
          
          // Check if any image alt text matches this color
          const matchingImages = images.filter(img => {
            const imgAlt = (img.altText || '').toLowerCase().trim();
            return imgAlt === colorKey || 
                   imgAlt.includes(colorKey) || 
                   colorKey.includes(imgAlt);
          });
          
          if (matchingImages.length > 0) {
            console.log(`    ✅ Found ${matchingImages.length} matching images`);
            matchingImages.forEach(img => {
              console.log(`      - "${img.altText || 'no alt'}" (ID: ${img.id})`);
            });
          } else {
            console.log(`    ❌ No matching images found`);
            console.log(`    📸 Available alt texts: ${images.map(img => `"${img.altText || 'no alt'}"`).join(', ')}`);
          }
        }
      }
      
      // Add delay between products
      await importer.sleep(1000);
    }
    
  } catch (error) {
    console.error('❌ Error debugging variant assignments:', error.message);
  }
}

// Run the debug if this file is executed directly
if (require.main === module) {
  debugVariantAssignment()
    .then(() => {
      console.log('\n✅ Debug completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Debug failed:', error.message);
      process.exit(1);
    });
}

module.exports = { debugVariantAssignment }; 