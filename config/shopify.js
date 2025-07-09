const axios = require('axios');
require('dotenv').config();

class ShopifyAPI {
  constructor() {
    this.shopUrl = process.env.SHOPIFY_SHOP_URL;
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    this.apiVersion = process.env.SHOPIFY_API_VERSION || '2024-01';
    this.baseUrl = `https://${this.shopUrl}/admin/api/${this.apiVersion}`;
  }

  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Shopify API Error (${method} ${endpoint}):`, error.response?.status, error.response?.data?.errors || error.message);
      throw error;
    }
  }

  // Product methods
  async createProduct(productData) {
    return this.makeRequest('POST', '/products.json', { product: productData });
  }

  async updateProduct(productId, productData) {
    return this.makeRequest('PUT', `/products/${productId}.json`, { product: productData });
  }

  async getProduct(productId) {
    return this.makeRequest('GET', `/products/${productId}.json`);
  }

  async getProducts(limit = 50) {
    return this.makeRequest('GET', `/products.json?limit=${limit}`);
  }

  // Metafield methods
  async createMetafield(ownerResource, ownerId, metafieldData) {
    return this.makeRequest('POST', `/${ownerResource}/${ownerId}/metafields.json`, { metafield: metafieldData });
  }

  async updateMetafield(metafieldId, metafieldData) {
    return this.makeRequest('PUT', `/metafields/${metafieldId}.json`, { metafield: metafieldData });
  }

  async getMetafields(ownerResource, ownerId) {
    return this.makeRequest('GET', `/${ownerResource}/${ownerId}/metafields.json`);
  }

  // Translation methods - using the correct endpoint
  async createTranslation(translationData) {
    // Try the standard translations endpoint first
    try {
      return this.makeRequest('POST', '/translations.json', { translation: translationData });
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn('⚠️  Standard translations endpoint not available. This might require the Shopify Translate & Adapt app.');
        console.warn('   You may need to install the app or use a different approach for translations.');
        throw new Error('Translations endpoint not available. Please install Shopify Translate & Adapt app.');
      }
      throw error;
    }
  }

  async updateTranslation(translationId, translationData) {
    try {
      return this.makeRequest('PUT', `/translations/${translationId}.json`, { translation: translationData });
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn('⚠️  Standard translations endpoint not available.');
        throw new Error('Translations endpoint not available.');
      }
      throw error;
    }
  }

  async getTranslations(resourceType, resourceId) {
    try {
      return this.makeRequest('GET', `/${resourceType}/${resourceId}/translations.json`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn('⚠️  Standard translations endpoint not available.');
        return { translations: [] };
      }
      throw error;
    }
  }

  // Shop info
  async getShopInfo() {
    return this.makeRequest('GET', '/shop.json');
  }

  // GraphQL method for metaobject operations
  async makeGraphQLRequest(query, variables = {}) {
    try {
      const config = {
        method: 'POST',
        url: `https://${this.shopUrl}/admin/api/graphql.json`,
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        data: {
          query,
          variables
        }
      };

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Shopify GraphQL Error:`, error.response?.status, error.response?.data?.errors || error.message);
      throw error;
    }
  }
}

module.exports = ShopifyAPI; 