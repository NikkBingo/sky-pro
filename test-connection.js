require('dotenv').config();
const axios = require('axios');

async function testShopifyConnection() {
  const shopUrl = process.env.SHOPIFY_SHOP_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  
  console.log('=== Shopify API Connection Test ===');
  console.log('Shop URL:', shopUrl);
  console.log('Access Token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'NOT SET');
  console.log('');

  if (!shopUrl || !accessToken) {
    console.error('❌ Missing required environment variables');
    return;
  }

  // Test 1: Basic shop info
  try {
    console.log('1. Testing basic shop info...');
    const shopResponse = await axios.get(`https://${shopUrl}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Shop info retrieved successfully');
    console.log('   Shop name:', shopResponse.data.shop.name);
    console.log('   Shop domain:', shopResponse.data.shop.domain);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to get shop info');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.errors || error.message);
    console.log('');
  }

  // Test 2: Products endpoint
  try {
    console.log('2. Testing products endpoint...');
    const productsResponse = await axios.get(`https://${shopUrl}/admin/api/2024-01/products.json?limit=1`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Products endpoint accessible');
    console.log('   Product count:', productsResponse.data.products.length);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to access products endpoint');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.errors || error.message);
    console.log('');
  }

  // Test 3: Metafields endpoint
  try {
    console.log('3. Testing metafields endpoint...');
    const metafieldsResponse = await axios.get(`https://${shopUrl}/admin/api/2024-01/metafields.json?limit=1`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Metafields endpoint accessible');
    console.log('   Metafield count:', metafieldsResponse.data.metafields.length);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to access metafields endpoint');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.errors || error.message);
    console.log('');
  }

  // Test 4: Translations endpoint
  try {
    console.log('4. Testing translations endpoint...');
    const translationsResponse = await axios.get(`https://${shopUrl}/admin/api/2024-01/translations.json?limit=1`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Translations endpoint accessible');
    console.log('   Translation count:', translationsResponse.data.translations.length);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to access translations endpoint');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.errors || error.message);
    console.log('');
  }

  // Test 5: App info (if available)
  try {
    console.log('5. Testing app info...');
    const appResponse = await axios.get(`https://${shopUrl}/admin/api/2024-01/app.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ App info accessible');
    console.log('   App name:', appResponse.data.app.title);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to access app info (this is normal for custom apps)');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.errors || error.message);
    console.log('');
  }

  console.log('=== Test Complete ===');
}

testShopifyConnection().catch(console.error); 