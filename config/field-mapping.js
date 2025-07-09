// Field mapping configuration for XML feed to Shopify
// Maps XML feed fields to Shopify product fields and metafields

// Import category mappings
const { 
  getProductCategoryId, 
  mapAgeGroupToTaxonomyValue,
  mapTargetGenderToTaxonomyValue,
  mapSleeveLengthTypeToTaxonomyValue,
  mapCareInstructionsToTaxonomyValue,
  mapColorToTaxonomyValue,
  mapFabricToTaxonomyValue,
  mapNecklineToTaxonomyValue,
  mapSizeToTaxonomyValue,
  mapClothingFeaturesToTaxonomyValue,
  mapPatternToTaxonomyValue
} = require('../categoryMappings');

const fieldMapping = {
  // Basic product fields (direct mapping to Shopify product fields)
  basic: {
    'title': 'title',
    'brand': 'vendor',
    'description': 'body_html',
    'code': 'handle', // Use as handle or SKU
    'brandID': 'metafields.stanley_stella.brand_id',
    'package': 'metafields.stanley_stella.piecesperbox',
    'box': 'metafields.stanley_stella.piecesperbox',
    'salesunit': 'metafields.stanley_stella.piecesperpolybag',
    'sizetable': 'metafields.stanley_stella.sizetable'
  },

  // Categories and types mapping
  categories: {
    'categories.category.0.name': 'product_category',
    'categories.category.1.name': 'metafields.stanley_stella.category',
    'categories.category.0.id': 'metafields.stanley_stella.categorycode',
    'types.type.name': 'type',
    'types.type.id': 'metafields.stanley_stella.typecode'
  },

  // Images mapping
  images: {
    'images.image.0.src': 'images.0.src',
    'images.image.0.alt': 'images.0.alt',
    'images.image.0.position': 'images.0.position',
    'images.image.1.src': 'images.1.src',
    'images.image.1.alt': 'images.1.alt',
    'images.image.1.position': 'images.1.position',
    // Add more image mappings as needed
  },

  // Variant mappings (for creating product variants)
  variants: {
    // Variant basic info
    'variants.variant.0.code': 'variants.0.sku',
    'variants.variant.0.recommended_retail_price': 'variants.0.price',
    'variants.variant.0.recommended_retail_price_brutto': 'variants.0.compare_at_price',
    'variants.variant.0.wholesale_price': 'variants.0.cost_per_item',
    
    // Variant options (color, size)
    'variants.variant.0.color_name': 'variants.0.option1', // Color
    'variants.variant.0.size': 'variants.0.option2', // Size
    'variants.variant.0.hexcolors.hexcolor': 'variants.0.metafields.stanley_stella.color_hex',
    
    // Inventory
    'variants.variant.0.free_stock': 'variants.0.inventory_quantity',
    'variants.variant.0.available': 'variants.0.inventory_policy',
    'variants.variant.0.incoming': 'variants.0.metafields.stanley_stella.incoming_stock',
    'variants.variant.0.mfstock': 'variants.0.metafields.stanley_stella.mf_stock',
    
    // Other variant fields
    'variants.variant.0.currency': 'variants.0.metafields.stanley_stella.currency',
    'variants.variant.0.vat': 'variants.0.metafields.stanley_stella.vat',
    'variants.variant.0.discount': 'variants.0.metafields.stanley_stella.discount',
    'variants.variant.0.outlet_discount_percent': 'variants.0.metafields.stanley_stella.outlet_discount'
  },

  // Metafields mapping (Stanley/Stella specific)
  metafields: {
    // Product lifecycle and status
    'modified': 'metafields.stanley_stella.last_updated',
    'leaving': 'metafields.stanley_stella.productlifecycle',
    
    // Product details
    'description': 'metafields.stanley_stella.longdescription',
    'sizetable': 'metafields.stanley_stella.sizetable',
    
    // Care instructions (map to existing metafields)
    'description': 'metafields.stanley_stella.washing', // Extract washing instructions
    'description': 'metafields.stanley_stella.bleaching', // Extract bleaching info
    'description': 'metafields.stanley_stella.ironing', // Extract ironing info
    'description': 'metafields.stanley_stella.drying', // Extract drying info
    'description': 'metafields.stanley_stella.cleaning', // Extract cleaning info
    
    // Product specifications
    'description': 'metafields.stanley_stella.fit', // Extract fit info
    'description': 'metafields.stanley_stella.gauge', // Extract gauge info
    'description': 'metafields.stanley_stella.neckline', // Extract neckline info
    'description': 'metafields.stanley_stella.sleeve', // Extract sleeve info
    
    // Product categorization
    'brand': 'metafields.stanley_stella.brand',
    'categories.category.0.name': 'metafields.stanley_stella.category',
    'categories.category.0.id': 'metafields.stanley_stella.categorycode',
    'types.type.name': 'metafields.stanley_stella.type',
    'types.type.id': 'metafields.stanley_stella.typecode',
    
    // Product codes
    'code': 'metafields.stanley_stella.stylecode',
    'id': 'metafields.stanley_stella.product_id',
    
    // Additional info
    'package': 'metafields.stanley_stella.piecesperbox',
    'box': 'metafields.stanley_stella.piecesperbox',
    'salesunit': 'metafields.stanley_stella.piecesperpolybag',
    
    // Language and localization
    'description': 'metafields.stanley_stella.languagecode', // Extract language info
    
    // Product notes
    'description': 'metafields.stanley_stella.shortnote', // Extract short notes
    'description': 'metafields.stanley_stella.longnote', // Extract long notes
    'description': 'metafields.stanley_stella.stylenotice', // Extract style notices
    
    // Product status
    'modified': 'metafields.stanley_stella.stylepublished',
    'description': 'metafields.stanley_stella.stylesegment', // Extract style segment
    
    // Product grouping
    'categories.category.1.name': 'metafields.stanley_stella.product_grouping_option_1',
    'categories.category.1.id': 'metafields.stanley_stella.product_grouping_option_1_value'
  },

  // SEO and marketing fields
  seo: {
    'title': 'seo_title',
    'description': 'seo_description',
    'brand': 'google_shopping_brand',
    'categories.category.0.name': 'google_shopping_category'
  },

  // Google Shopping fields
  googleShopping: {
    'brand': 'google_shopping_brand',
    'categories.category.0.name': 'google_shopping_category',
    'description': 'google_shopping_description',
    'code': 'google_shopping_mpn'
  }
};

// Helper function to extract care instructions from description
function extractCareInstructions(description) {
  const careInfo = {
    washing: '',
    bleaching: '',
    ironing: '',
    drying: '',
    cleaning: ''
  };
  
  if (description) {
    // Extract washing instructions
    const washingMatch = description.match(/washing[:\s]+([^•\n]+)/i);
    if (washingMatch) careInfo.washing = washingMatch[1].trim();
    
    // Extract bleaching instructions
    const bleachingMatch = description.match(/bleach[:\s]+([^•\n]+)/i);
    if (bleachingMatch) careInfo.bleaching = bleachingMatch[1].trim();
    
    // Extract ironing instructions
    const ironingMatch = description.match(/iron[:\s]+([^•\n]+)/i);
    if (ironingMatch) careInfo.ironing = ironingMatch[1].trim();
    
    // Extract drying instructions
    const dryingMatch = description.match(/dry[:\s]+([^•\n]+)/i);
    if (dryingMatch) careInfo.drying = dryingMatch[1].trim();
    
    // Extract cleaning instructions
    const cleaningMatch = description.match(/clean[:\s]+([^•\n]+)/i);
    if (cleaningMatch) careInfo.cleaning = cleaningMatch[1].trim();
  }
  
  return careInfo;
}

// Helper function to extract product specifications
function extractProductSpecs(description) {
  const specs = {
    fit: '',
    gauge: '',
    neckline: '',
    sleeve: ''
  };
  
  if (description) {
    // Extract fit information
    const fitMatch = description.match(/fit[:\s]+([^•\n]+)/i);
    if (fitMatch) specs.fit = fitMatch[1].trim();
    
    // Extract gauge information
    const gaugeMatch = description.match(/gauge[:\s]+([^•\n]+)/i);
    if (gaugeMatch) specs.gauge = gaugeMatch[1].trim();
    
    // Extract neckline information
    const necklineMatch = description.match(/neckline[:\s]+([^•\n]+)/i);
    if (necklineMatch) specs.neckline = necklineMatch[1].trim();
    
    // Extract sleeve information
    const sleeveMatch = description.match(/sleeve[:\s]+([^•\n]+)/i);
    if (sleeveMatch) specs.sleeve = sleeveMatch[1].trim();
  }
  
  return specs;
}

// Helper function to properly capitalize text
function capitalizeText(text) {
  if (!text) return '';
  
  return text.toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Function to split products with over 100 variants by size
function splitProductBySize(xmlData) {
  const variants = xmlData.variants?.variant ? 
    (Array.isArray(xmlData.variants.variant) ? xmlData.variants.variant : [xmlData.variants.variant]) : [];
  
  if (variants.length <= 100) {
    // No splitting needed, return single product
    return [createShopifyProduct(xmlData)];
  }
  
  console.log(`📦 Product ${xmlData.title} has ${variants.length} variants - splitting by size`);
  
  // Group variants by size, filtering out empty sizes
  const variantsBySize = {};
  variants.forEach(variant => {
    const size = variant.size;
    // Only include variants with valid size values
    if (size && size.trim() !== '') {
      if (!variantsBySize[size]) {
        variantsBySize[size] = [];
      }
      variantsBySize[size].push(variant);
    }
  });
  
  const splitProducts = [];
  const sizes = Object.keys(variantsBySize).sort((a, b) => {
    // Custom sorting function to order sizes from smallest to largest
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL'];
    const aIndex = sizeOrder.indexOf(a.toUpperCase());
    const bIndex = sizeOrder.indexOf(b.toUpperCase());
    
    // If both sizes are in the predefined order, sort by that
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one is in the predefined order, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // If neither is in the predefined order, sort alphabetically
    return a.localeCompare(b);
  });
  
  // Only create split products if we have valid sizes
  if (sizes.length === 0) {
    console.log(`⚠️ No valid sizes found for ${xmlData.title}, creating single product`);
    return [createShopifyProduct(xmlData)];
  }
  
  sizes.forEach((size, index) => {
    // Only create product if we have variants for this size
    if (variantsBySize[size].length > 0) {
      // Create a copy of the XML data with only variants for this size
      const splitXmlData = {
        ...xmlData,
        variants: {
          variant: variantsBySize[size]
        },
        // Add size-specific information
        splitSize: size,
        splitIndex: index,
        totalSplits: sizes.length,
        originalTitle: xmlData.title
      };
      
      const splitProduct = createShopifyProduct(splitXmlData);
      
      // Only add the split product if it has valid variants
      if (splitProduct.variants && splitProduct.variants.length > 0) {
        // Modify the product for the split
        splitProduct.title = `${splitProduct.title} - ${size}`;
        splitProduct.handle = `${splitProduct.handle}-size-${size.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        
        // Add Product Grouping metafields
        splitProduct.metafields.push({
          namespace: 'product_grouping',
          key: 'option_1',
          value: xmlData.title, // Original product name as group identifier
          type: 'single_line_text_field'
        });
        
        splitProduct.metafields.push({
          namespace: 'product_grouping',
          key: 'option_1_value',
          value: size, // Size as the grouping value
          type: 'single_line_text_field'
        });
        
        splitProducts.push(splitProduct);
      }
    }
  });
  
  console.log(`✅ Split into ${splitProducts.length} products by size`);
  return splitProducts;
}

// Function to create Shopify product from XML data
function createShopifyProduct(xmlData) {
  // Determine product category using the category mapping system
  const productType = xmlData.categories?.category?.[0]?.name || 'Apparel';
  const categoryId = getProductCategoryId(productType, {
    TypeCode: xmlData.categories?.category?.[1]?.id,
    Category: xmlData.categories?.category?.[0]?.name,
    Type: xmlData.categories?.category?.[0]?.name
  });

  const product = {
    title: capitalizeText(xmlData.title), // Capitalize the product title
    vendor: xmlData.brand,
    body_html: xmlData.description,
    handle: xmlData.code ? xmlData.code.toLowerCase().replace(/[^a-z0-9-]/g, '-') : undefined,
    product_type: productType,
    tags: (xmlData.categories?.category?.map(cat => cat.name).join(', ') + ', Sky Pro Importer').trim(), // Added Sky Pro Importer tag
    status: 'draft', // Set as draft for review before publishing
    variants: [],
    options: [
      { name: 'Color', values: [] },
      { name: 'Size', values: [] }
    ],
    images: [],
    metafields: []
  };

  // Add category ID if found
  if (categoryId) {
    product.category_id = categoryId;
  }

  // Process variants
  if (xmlData.variants?.variant) {
    const variants = Array.isArray(xmlData.variants.variant) ? xmlData.variants.variant : [xmlData.variants.variant];
    
    variants.forEach((variant, index) => {
      const shopifyVariant = {
        sku: variant.code,
        price: variant.recommended_retail_price,
        compare_at_price: variant.recommended_retail_price_brutto,
        inventory_quantity: parseInt(variant.free_stock) || 0,
        inventory_policy: variant.available === '0' ? 'deny' : 'continue',
        option1: variant.color_name, // Color
        option2: variant.size, // Size
        // Variant metafields removed to avoid repetition - not essential for import
        // metafields: [
        //   {
        //     namespace: 'stanley_stella',
        //     key: 'color_hex',
        //     value: variant.hexcolors?.hexcolor || '',
        //     type: 'single_line_text_field'
        //   },
        //   {
        //     namespace: 'stanley_stella',
        //     key: 'incoming_stock',
        //     value: variant.incoming || '0',
        //     type: 'number_integer'
        //   },
        //   {
        //     namespace: 'stanley_stella',
        //     key: 'mf_stock',
        //     value: variant.mfstock || '0',
        //     type: 'number_integer'
        //   }
        // ]
      };
      
      product.variants.push(shopifyVariant);
      
      // Add unique options
      if (variant.color_name && !product.options[0].values.includes(variant.color_name)) {
        product.options[0].values.push(variant.color_name);
      }
      if (variant.size && !product.options[1].values.includes(variant.size)) {
        product.options[1].values.push(variant.size);
      }
    });
  }

  // Process images and assign to variants based on color
  if (xmlData.images?.image) {
    const images = Array.isArray(xmlData.images.image) ? xmlData.images.image : [xmlData.images.image];
    
    // Create a map of color names to images
    const colorImageMap = {};
    images.forEach((image, index) => {
      const colorName = image.caption || image.name;
      if (colorName) {
        colorImageMap[colorName] = {
          src: image.src,
          alt: colorName,
          position: index + 1
        };
      }
    });
    
    // Add images to product
    Object.values(colorImageMap).forEach(image => {
      product.images.push(image);
    });
    
    // Note: Image assignment to variants will be handled after product creation
    // when we have the actual Shopify image IDs
  }

  // Process metafields
  const careInstructions = extractCareInstructions(xmlData.description);
  const productSpecs = extractProductSpecs(xmlData.description);
  
  // Add product metafields
  const productMetafields = [
    { namespace: 'stanley_stella', key: 'brand_id', value: xmlData.brandID || '', type: 'single_line_text_field' },
    { namespace: 'stanley_stella', key: 'piecesperbox', value: xmlData.package || '', type: 'number_integer' },
    { namespace: 'stanley_stella', key: 'piecesperpolybag', value: xmlData.salesunit || '', type: 'number_integer' },
    { namespace: 'stanley_stella', key: 'category', value: xmlData.categories?.category?.[0]?.name || '', type: 'single_line_text_field' },
    { namespace: 'stanley_stella', key: 'categorycode', value: xmlData.categories?.category?.[0]?.id || '', type: 'single_line_text_field' },
    { namespace: 'stanley_stella', key: 'type', value: xmlData.categories?.category?.[1]?.name || '', type: 'single_line_text_field' },
    { namespace: 'stanley_stella', key: 'typecode', value: xmlData.categories?.category?.[1]?.id || '', type: 'single_line_text_field' },
    { namespace: 'stanley_stella', key: 'stylecode', value: xmlData.code || '', type: 'single_line_text_field' },
    { namespace: 'stanley_stella', key: 'longdescription', value: xmlData.description || '', type: 'multi_line_text_field' },
    { namespace: 'stanley_stella', key: 'sizetable', value: xmlData.sizetable || '', type: 'multi_line_text_field' }
  ];

  // Add taxonomy metafields using the mapping functions
  if (categoryId) {
    productMetafields.push({ 
      namespace: 'taxonomy', 
      key: 'product_category', 
      value: categoryId, 
      type: 'single_line_text_field' 
    });
  }

  // Only add care instruction metafields if they have values
  if (careInstructions.washing) {
    productMetafields.push({ namespace: 'stanley_stella', key: 'washing', value: careInstructions.washing, type: 'single_line_text_field' });
  }
  if (careInstructions.bleaching) {
    productMetafields.push({ namespace: 'stanley_stella', key: 'bleaching', value: careInstructions.bleaching, type: 'single_line_text_field' });
  }
  if (careInstructions.ironing) {
    productMetafields.push({ namespace: 'stanley_stella', key: 'ironing', value: careInstructions.ironing, type: 'single_line_text_field' });
  }
  if (careInstructions.drying) {
    productMetafields.push({ namespace: 'stanley_stella', key: 'drying', value: careInstructions.drying, type: 'single_line_text_field' });
  }
  if (careInstructions.cleaning) {
    productMetafields.push({ namespace: 'stanley_stella', key: 'cleaning', value: careInstructions.cleaning, type: 'single_line_text_field' });
  }

  // Only add product spec metafields if they have values
  if (productSpecs.fit) {
    productMetafields.push({ namespace: 'stanley_stella', key: 'fit', value: productSpecs.fit, type: 'number_integer' });
  }
  if (productSpecs.gauge) {
    // Try to convert gauge to a number, if it's a numeric value
    const gaugeValue = parseInt(productSpecs.gauge);
    if (!isNaN(gaugeValue)) {
      productMetafields.push({ namespace: 'stanley_stella', key: 'gauge', value: gaugeValue, type: 'number_integer' });
    } else {
      // If it's not a number, skip it to avoid type errors
      console.warn(`Skipping gauge metafield - value "${productSpecs.gauge}" is not a valid number`);
    }
  }
  if (productSpecs.neckline) {
    productMetafields.push({ namespace: 'stanley_stella', key: 'neckline', value: productSpecs.neckline, type: 'single_line_text_field' });
  }
  if (productSpecs.sleeve) {
    productMetafields.push({ namespace: 'stanley_stella', key: 'sleeve', value: productSpecs.sleeve, type: 'single_line_text_field' });
  }

  // Add taxonomy attribute metafields using mapping functions
  // Map color taxonomy
  if (xmlData.variants?.variant) {
    const variants = Array.isArray(xmlData.variants.variant) ? xmlData.variants.variant : [xmlData.variants.variant];
    const colors = [...new Set(variants.map(v => v.color_name).filter(Boolean))];
    
    if (colors.length > 0) {
      const colorTaxonomyValues = colors.map(color => mapColorToTaxonomyValue(color)).filter(Boolean);
      if (colorTaxonomyValues.length > 0) {
        productMetafields.push({
          namespace: 'taxonomy',
          key: 'color_taxonomy',
          value: JSON.stringify(colorTaxonomyValues),
          type: 'json'
        });
      }
    }
  }

  // Map fabric taxonomy if available
  if (productSpecs.fit) {
    const fabricTaxonomyValue = mapFabricToTaxonomyValue(productSpecs.fit);
    if (fabricTaxonomyValue) {
      productMetafields.push({
        namespace: 'taxonomy',
        key: 'fabric_taxonomy',
        value: fabricTaxonomyValue,
        type: 'single_line_text_field'
      });
    }
  }

  // Filter out empty metafields to avoid errors
  product.metafields = productMetafields.filter(metafield => 
    metafield.value !== null && metafield.value !== undefined && metafield.value !== ''
  );

  return product;
}

module.exports = {
  fieldMapping,
  createShopifyProduct,
  splitProductBySize,
  extractCareInstructions,
  extractProductSpecs
}; 