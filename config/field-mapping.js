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
    'categories.category.0.name': 'metafields.stanley_stella.product_category',
    'categories.category.1.name': 'metafields.stanley_stella.type',
    'categories.category.2.name': 'metafields.stanley_stella.subtype', // Optional third category
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
    'categories.category.0.name': 'metafields.stanley_stella.product_category',
    'categories.category.1.name': 'metafields.stanley_stella.type',
    'categories.category.2.name': 'metafields.stanley_stella.subtype', // Optional third category
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

// Function to clean product titles and remove UUIDs
function cleanProductTitle(title) {
  if (!title) return '';
  
  // Remove UUID patterns (8-4-4-4-12 format)
  let cleaned = title.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '');
  
  // Remove other UUID-like patterns
  cleaned = cleaned.replace(/[0-9a-f]{32}/gi, '');
  
  // Remove patterns like "76459_5da8ad25-8a1f-48fc-be4a-1a6b6c54ece4"
  cleaned = cleaned.replace(/[0-9]+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '');
  
  // Remove extra spaces and dashes
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/-+/g, '-').trim();
  
  // Remove leading/trailing dashes
  cleaned = cleaned.replace(/^-+|-+$/g, '');
  
  return cleaned || 'Product';
}

// Function to clean image names and remove UUIDs
function cleanImageName(name) {
  if (!name) return '';
  
  // Remove UUID patterns (8-4-4-4-12 format)
  let cleaned = name.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '');
  
  // Remove other UUID-like patterns
  cleaned = cleaned.replace(/[0-9a-f]{32}/gi, '');
  
  // Remove extra spaces and dashes
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/-+/g, '-').trim();
  
  // Remove leading/trailing dashes
  cleaned = cleaned.replace(/^-+|-+$/g, '');
  
  return cleaned || 'Product Image';
}

function cleanImageSrc(src) {
  if (!src) return '';
  
  // Extract the filename from the URL
  const urlParts = src.split('/');
  const filename = urlParts[urlParts.length - 1];
  
  // Remove UUID patterns from filename (8-4-4-4-12 format)
  let cleanedFilename = filename.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '');
  
  // Remove other UUID-like patterns
  cleanedFilename = cleanedFilename.replace(/[0-9a-f]{32}/gi, '');
  
  // Remove underscore followed by UUID (like 76459_13358f99-e7b4-4e14-be77-ab7f8c3fbbbe)
  cleanedFilename = cleanedFilename.replace(/_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '');
  
  // Remove extra dashes, underscores and clean up
  cleanedFilename = cleanedFilename.replace(/[-_]+/g, '-').replace(/^-+|-+$/g, '');
  
  // Reconstruct the URL with cleaned filename
  urlParts[urlParts.length - 1] = cleanedFilename;
  return urlParts.join('/');
}

// Helper function to generate descriptive filenames for better image matching
function generateDescriptiveFilename(productName, colorName) {
  // Clean and format product name
  const cleanProductName = productName
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
    .join(' ');
  
  // Clean and format color name
  const cleanColorName = colorName
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
    .join(' ');
  
  // Create descriptive filename based on the specified pattern
  let filename = '';
  
  if (cleanColorName && cleanColorName.toLowerCase() !== 'product image') {
    // Variant image: "Product Name + Color.jpg" (using + instead of -)
    filename = `${cleanProductName} + ${cleanColorName}.jpg`;
  } else {
    // Main image: "Product Name.jpg"
    filename = `${cleanProductName}.jpg`;
  }
  
  // Ensure filename is URL-safe
  filename = filename.replace(/[^a-zA-Z0-9\s\-\.\+]/g, '');
  
  return filename;
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
  
  // Get all product images to use for all split products
  let allProductImages = [];
  if (xmlData.images?.image) {
    const images = Array.isArray(xmlData.images.image) ? xmlData.images.image : [xmlData.images.image];
    allProductImages = images.map((image, index) => ({
      src: cleanImageSrc(image.src), // Clean file name/URL (remove UUIDs)
      alt: image.caption || image.name || 'Product Image', // Keep original alt text
      position: index + 1
    }));
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
      
      const splitProduct = createShopifyProduct(splitXmlData, true); // Skip image processing for split products
      
      // Only add the split product if it has valid variants
      if (splitProduct.variants && splitProduct.variants.length > 0) {
        // Modify the product for the split
        splitProduct.title = `${splitProduct.title} - ${size}`;
        splitProduct.handle = `${splitProduct.handle}-size-${size.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        
        // DO NOT include images in split products initially - they will be added after import
        splitProduct.images = [];
        console.log(`📸 Split product ${index + 1} (${size}) created without images - will be added after import`);
        
        // Product Grouping metafields will be added after product creation
        // to ensure proper GID references and grouping structure
        
        splitProducts.push(splitProduct);
      }
    }
  });
  
  console.log(`✅ Split into ${splitProducts.length} products by size`);
  return splitProducts;
}

// Function to create Shopify product from XML data
function createShopifyProduct(xmlData, skipImageProcessing = false) {
  // Determine product category using the category mapping system
  const productType = xmlData.categories?.category?.[0]?.name || 'Apparel';
  const categoryId = getProductCategoryId(productType, {
    TypeCode: xmlData.categories?.category?.[1]?.id,
    Category: xmlData.categories?.category?.[0]?.name,
    Type: xmlData.categories?.category?.[0]?.name
  });

  const product = {
    title: capitalizeText(cleanProductTitle(xmlData.title)), // Title
    vendor: xmlData.brand, // Vendor
    body_html: xmlData.description + (xmlData.sizetable ? '\n\n<div class="size-table">\n<h3 style="background-color: #666; color: white; padding: 10px; margin: 0; border-radius: 5px 5px 0 0;">Size Guide</h3>\n<div style="background: linear-gradient(to bottom, #f8f8f8 0%, #f8f8f8 50%, white 50%, white 100%);">' + xmlData.sizetable + '</div>\n</div>' : ''), // Body (HTML) - description + styled sizetable with zebra stripes
    handle: xmlData.code ? xmlData.code.toLowerCase().replace(/[^a-z0-9-]/g, '-') : undefined,
    product_type: xmlData.categories?.category?.[2]?.name || 'Apparel', // Product Category
    template_suffix: 'sky-pro', // Set Product Template to sky-pro
    template: 'sky-pro', // Set Theme Template to sky-pro
    tags: (xmlData.categories?.category?.map(cat => cat.name).join(', ') + ', Sky Pro Importer').trim(),
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
        metafields: [] // Initialize metafields array for this variant
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

  // Remove empty options to avoid Shopify API errors
  product.options = product.options.filter(option => option.values.length > 0);

  // Process images and assign to variants based on color (skip for split products)
  if (!skipImageProcessing && xmlData.images?.image) {
    const images = Array.isArray(xmlData.images.image) ? xmlData.images.image : [xmlData.images.image];
    
    // Create a map of color names to images
    const colorImageMap = {};
    images.forEach((image, index) => {
      // Use the actual image caption for color name
      const colorName = image.caption || image.name || 'Product Image';
      if (colorName) {
        // Generate descriptive filename for better matching
        const productName = capitalizeText(cleanProductTitle(xmlData.title));
        const descriptiveFilename = generateDescriptiveFilename(productName, colorName);
        
        colorImageMap[colorName] = {
          src: cleanImageSrc(image.src), // Clean file name/URL (remove UUIDs)
          alt: colorName, // Use the actual caption as alt text
          filename: descriptiveFilename, // Add descriptive filename
          position: index + 1
        };
      }
    });
    
    // Add images to product
    Object.values(colorImageMap).forEach(image => {
      product.images.push(image);
    });
  }

  // Process metafields from XML data - only create required fields
  const metafields = [];
  
  // Helper function to validate and add metafield
  const addMetafield = (key, value, type) => {
    if (value && value.toString().trim() !== '') {
      metafields.push({
        namespace: 'stanley_stella',
        key: key,
        value: value.toString().trim(),
        type: type
      });
    }
  };
  
  // Only create the specific metafields required
  addMetafield('product_category', xmlData.categories?.category?.[0]?.name, 'single_line_text_field');
  addMetafield('type', xmlData.categories?.category?.[1]?.name, 'single_line_text_field');
  // Add third category if it exists
  if (xmlData.categories?.category?.[2]?.name) {
    addMetafield('subtype', xmlData.categories?.category?.[2]?.name, 'single_line_text_field');
  }
  
  // Add product grouping metafields if this is a split product
  console.log(`🔍 Checking for split product data: splitSize=${xmlData.splitSize}, metaobjectId=${xmlData.productGroupingMetaobjectId}`);
  if (xmlData.splitSize && xmlData.productGroupingMetaobjectId) {
    console.log(`🔗 Adding product grouping metafields for split product: ${xmlData.splitSize}`);
    console.log(`🔗 Metaobject ID: ${xmlData.productGroupingMetaobjectId}`);
    addMetafield('product_grouping_option_1', xmlData.productGroupingMetaobjectId, 'metaobject_reference');
    addMetafield('product_grouping_option_1_value', xmlData.splitSize, 'single_line_text_field');
  } else {
    console.log(`ℹ️ Single product - no grouping metafields needed`);
  }
  
  product.metafields = metafields;

  return product;
}

module.exports = {
  fieldMapping,
  createShopifyProduct,
  splitProductBySize,
  extractCareInstructions,
  extractProductSpecs,
  cleanImageName,
  cleanImageSrc,
  cleanProductTitle,
  generateDescriptiveFilename
}; 