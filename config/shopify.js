const axios = require('axios');
require('dotenv').config();

class ShopifyAPI {
  constructor() {
    this.shopUrl = process.env.SHOPIFY_SHOP_URL;
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    this.apiVersion = process.env.SHOPIFY_API_VERSION || '2024-01';
    
    if (!this.shopUrl || !this.accessToken) {
      throw new Error('Missing Shopify configuration. Please check your .env file.');
    }
    
    this.baseURL = `https://${this.shopUrl}/admin/api/${this.apiVersion}`;
    this.headers = {
      'X-Shopify-Access-Token': this.accessToken,
      'Content-Type': 'application/json',
    };
  }

  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: this.headers,
        data,
      };

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Shopify API Error (${method} ${endpoint}):`, error.response?.data || error.message);
      throw error;
    }
  }

  async createProduct(productData) {
    return this.makeRequest('POST', '/products.json', { product: productData });
  }

  async updateProduct(productId, productData) {
    return this.makeRequest('PUT', `/products/${productId}.json`, { product: productData });
  }

  async getProductByHandle(handle) {
    return this.makeRequest('GET', `/products.json?handle=${handle}`);
  }

  async createTranslation(resourceType, resourceId, locale, translationData) {
    return this.makeRequest('POST', `/${resourceType}/${resourceId}/translations.json`, {
      translation: {
        locale,
        ...translationData
      }
    });
  }

  async updateTranslation(resourceType, resourceId, locale, translationData) {
    return this.makeRequest('PUT', `/${resourceType}/${resourceId}/translations/${locale}.json`, {
      translation: {
        locale,
        ...translationData
      }
    });
  }

  async getTranslations(resourceType, resourceId) {
    return this.makeRequest('GET', `/${resourceType}/${resourceId}/translations.json`);
  }
}

module.exports = ShopifyAPI; 