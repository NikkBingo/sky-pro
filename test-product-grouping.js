const { createShopifyProduct, splitProductBySize } = require('./config/field-mapping');

// Test with a sample product
const testProduct = {
  title: "Test Product",
  code: "12345",
  brand: "Test Brand",
  description: "Test description",
  variants: {
    variant: [
      { code: "12345-001", color_name: "Red", size: "M", recommended_retail_price: "10.00", recommended_retail_price_brutto: "12.00", free_stock: "10", available: "1" },
      { code: "12345-002", color_name: "Blue", size: "L", recommended_retail_price: "10.00", recommended_retail_price_brutto: "12.00", free_stock: "5", available: "1" },
      { code: "12345-003", color_name: "Green", size: "XL", recommended_retail_price: "10.00", recommended_retail_price_brutto: "12.00", free_stock: "3", available: "1" }
    ]
  },
  categories: {
    category: [
      { name: "T-shirts", id: "1" },
      { name: "Apparel", id: "2" }
    ]
  }
};

console.log('🔍 Testing Product Grouping metafields...\n');

// Test regular product (no splitting)
console.log('📦 Regular Product (no splitting):');
const regularProduct = createShopifyProduct(testProduct);
console.log('Metafields:', regularProduct.metafields.filter(mf => mf.namespace.includes('product_grouping')));

// Test split product (with many variants to trigger splitting)
const testProductWithManyVariants = {
  ...testProduct,
  variants: {
    variant: Array.from({ length: 150 }, (_, i) => ({
      code: `12345-${String(i + 1).padStart(3, '0')}`,
      color_name: `Color${i % 10}`,
      size: `Size${i % 20}`,
      recommended_retail_price: "10.00",
      recommended_retail_price_brutto: "12.00",
      free_stock: "10",
      available: "1"
    }))
  }
};

console.log('\n📦 Split Products:');
const splitProducts = splitProductBySize(testProductWithManyVariants);
splitProducts.forEach((product, index) => {
  console.log(`\nProduct ${index + 1}: ${product.title}`);
  const groupingMetafields = product.metafields.filter(mf => mf.namespace.includes('product_grouping'));
  console.log('Product Grouping metafields:');
  groupingMetafields.forEach(mf => {
    console.log(`  ${mf.namespace}.${mf.key}: ${mf.value} (${mf.type})`);
  });
});

console.log('\n✅ Test completed!'); 