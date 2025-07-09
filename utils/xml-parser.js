const axios = require('axios');
const xml2js = require('xml2js');
const { createMetafields, createVariantOptions, createVariants } = require('../config/field-mapping');

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
      // Add raw XML data for field mapping
      raw: productXml
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

    // Use the new field mapping to create variants and options
    const variants = createVariants(product.raw);
    const options = createVariantOptions(product.raw);
    const metafields = createMetafields(product.raw);

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
      metafields: metafields,
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
}

module.exports = XMLParser; 