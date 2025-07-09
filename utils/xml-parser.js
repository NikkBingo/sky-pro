const axios = require('axios');
const xml2js = require('xml2js');

class XMLParser {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
    });
  }

  async fetchAndParseXML(url) {
    try {
      console.log(`Fetching XML from: ${url}`);
      const response = await axios.get(url);
      const result = await this.parser.parseStringPromise(response.data);
      return result;
    } catch (error) {
      console.error(`Error fetching XML from ${url}:`, error.message);
      throw error;
    }
  }

  parseProduct(productXml) {
    const product = {
      id: productXml.id,
      code: productXml.code,
      title: productXml.title,
      brand: productXml.brand,
      description: productXml.description,
      sizeTable: productXml.sizetable,
      categories: this.parseCategories(productXml.categories),
      types: this.parseTypes(productXml.types),
      images: this.parseImages(productXml.images),
      variants: this.parseVariants(productXml.variants),
      documents: this.parseDocuments(productXml.documents),
    };

    return product;
  }

  parseCategories(categoriesXml) {
    if (!categoriesXml || !categoriesXml.category) return [];
    
    const categories = Array.isArray(categoriesXml.category) 
      ? categoriesXml.category 
      : [categoriesXml.category];
    
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
    }));
  }

  parseTypes(typesXml) {
    if (!typesXml || !typesXml.type) return [];
    
    const types = Array.isArray(typesXml.type) 
      ? typesXml.type 
      : [typesXml.type];
    
    return types.map(type => ({
      id: type.id,
      name: type.name,
    }));
  }

  parseImages(imagesXml) {
    if (!imagesXml || !imagesXml.image) return [];
    
    const images = Array.isArray(imagesXml.image) 
      ? imagesXml.image 
      : [imagesXml.image];
    
    return images.map(img => ({
      id: img.id,
      src: img.src,
      lowresSrc: img.lowres_src,
      name: img.name,
      caption: img.caption,
      categoryId: img.image_category_id,
      categoryName: img.image_category_name,
    }));
  }

  parseVariants(variantsXml) {
    if (!variantsXml || !variantsXml.variant) return [];
    
    const variants = Array.isArray(variantsXml.variant) 
      ? variantsXml.variant 
      : [variantsXml.variant];
    
    return variants.map(variant => ({
      code: variant.code,
      price: parseFloat(variant.recommended_retail_price) || 0,
      priceBrutto: parseFloat(variant.recommended_retail_price_brutto) || 0,
      wholesalePrice: parseFloat(variant.wholesale_price) || 0,
      discount: parseFloat(variant.discount) || 0,
      vat: parseFloat(variant.vat) || 0,
      currency: variant.currency,
      color: variant.color,
      colorName: variant.color_name,
      hexColors: this.parseHexColors(variant.hexcolors),
      size: variant.size,
      available: variant.available,
      freeStock: parseInt(variant.free_stock) || 0,
      incoming: parseInt(variant.incoming) || 0,
      mfstock: parseInt(variant.mfstock) || 0,
      outletDiscountPercent: parseInt(variant.outlet_discount_percent) || 0,
      leaving: parseInt(variant.leaving) || 0,
    }));
  }

  parseHexColors(hexColorsXml) {
    if (!hexColorsXml || !hexColorsXml.hexcolor) return [];
    
    const hexColors = Array.isArray(hexColorsXml.hexcolor) 
      ? hexColorsXml.hexcolor 
      : [hexColorsXml.hexcolor];
    
    return hexColors;
  }

  parseDocuments(documentsXml) {
    if (!documentsXml || !documentsXml.document) return [];
    
    const documents = Array.isArray(documentsXml.document) 
      ? documentsXml.document 
      : [documentsXml.document];
    
    return documents.map(doc => ({
      src: doc.src,
      mimetype: doc.mimetype,
    }));
  }

  convertToShopifyProduct(product, isEnglish = true) {
    // Create a URL-friendly handle from the title
    const handle = product.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Convert variants to Shopify format
    const variants = product.variants.map(variant => ({
      option1: variant.colorName || variant.color, // Color
      option2: variant.size || null, // Size
      option3: null, // Additional option if needed
      price: variant.price.toString(),
      sku: variant.code,
      inventory_quantity: variant.freeStock,
      inventory_management: 'shopify',
      inventory_policy: 'deny',
      weight: 0.5, // Default weight, adjust as needed
      weight_unit: 'kg',
      requires_shipping: true,
      taxable: true,
    }));

    // Get unique options
    const colors = [...new Set(product.variants.map(v => v.colorName || v.color))];
    const sizes = [...new Set(product.variants.map(v => v.size).filter(Boolean))];

    // Create options array
    const options = [];
    if (colors.length > 0) {
      options.push({
        name: 'Color',
        values: colors,
      });
    }
    if (sizes.length > 0) {
      options.push({
        name: 'Size',
        values: sizes,
      });
    }

    // Process images
    const images = product.images.map(img => ({
      src: img.src,
      alt: img.caption || product.title,
      position: 1, // You might want to implement proper positioning
    }));

    // Create tags from categories and types
    const tags = [
      ...product.categories.map(cat => cat.name),
      ...product.types.map(type => type.name),
      product.brand,
    ].filter(Boolean).join(', ');

    return {
      title: product.title,
      body_html: this.formatDescription(product.description),
      vendor: product.brand,
      product_type: product.types[0]?.name || 'Apparel',
      tags: tags,
      handle: handle,
      status: 'active',
      variants: variants,
      options: options,
      images: images,
      metafields: this.createMetafields(product),
    };
  }

  formatDescription(description) {
    if (!description) return '';
    
    // Convert plain text to HTML
    return description
      .replace(/\n/g, '<br>')
      .replace(/\•/g, '•')
      .replace(/\*/g, '•');
  }

  createMetafields(product) {
    const metafields = [];

    // Product code
    if (product.code) {
      metafields.push({
        namespace: 'custom',
        key: 'product_code',
        value: product.code,
        type: 'single_line_text_field',
      });
    }

    // Size table
    if (product.sizeTable) {
      metafields.push({
        namespace: 'custom',
        key: 'size_table',
        value: product.sizeTable,
        type: 'multi_line_text_field',
      });
    }

    // Package info
    if (product.package) {
      metafields.push({
        namespace: 'custom',
        key: 'package_size',
        value: product.package.toString(),
        type: 'single_line_text_field',
      });
    }

    return metafields;
  }
}

module.exports = XMLParser; 