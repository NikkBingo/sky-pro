import { Page, Layout, Card, BlockStack, InlineStack, Button, Banner, Text, DataTable, TextField, Select, Spinner, Modal } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { useLoaderData, useActionData, useSubmit, useNavigation } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server.js";
import { getCredentialsWithFallback } from "../utils/credentials.server.js";
import { getProductCategoryId } from "../config/categoryMappings";
import { 
  getCachedProducts, 
  setCachedProducts, 
  clearProductCache, 
  getCacheInfo,
  cleanupExpiredCache 
} from "../utils/product-cache.server.js";


// Helper function to log with level control
function log(level, message, data = null) {
  // Only log in development or when explicitly enabled
  if (process.env.NODE_ENV === 'development' || process.env.ENABLE_LOGGING === 'true') {
    if (level === 'error') {
      console.error(message, data);
    } else if (level === 'warn') {
      console.warn(message, data);
    } else {
      console.log(message, data);
    }
  }
}

// Helper function to truncate large data for logging
function truncateForLog(data, maxLength = 200) {
  if (typeof data === 'string' && data.length > maxLength) {
    return data.substring(0, maxLength) + '...';
  }
  return data;
}

// Helper function to mask sensitive data in logs
function maskSensitiveData(str) {
  if (typeof str !== 'string') return String(str);
  
  // Mask passwords, API keys, tokens, etc.
  return str
    .replace(/"password"\s*:\s*"[^"]*"/g, '"password": "***MASKED***"')
    .replace(/"api_key"\s*:\s*"[^"]*"/g, '"api_key": "***MASKED***"')
    .replace(/"token"\s*:\s*"[^"]*"/g, '"token": "***MASKED***"')
    .replace(/"secret"\s*:\s*"[^"]*"/g, '"secret": "***MASKED***"')
    .replace(/"key"\s*:\s*"[^"]*"/g, '"key": "***MASKED***"')
    .replace(/"access_token"\s*:\s*"[^"]*"/g, '"access_token": "***MASKED***"')
    .replace(/"refresh_token"\s*:\s*"[^"]*"/g, '"refresh_token": "***MASKED***"')
    .replace(/"client_secret"\s*:\s*"[^"]*"/g, '"client_secret": "***MASKED***"')
    .replace(/"private_key"\s*:\s*"[^"]*"/g, '"private_key": "***MASKED***"')
    .replace(/"session_token"\s*:\s*"[^"]*"/g, '"session_token": "***MASKED***"');
}

// --------------------------------------------------------------
//  loader – verifies app installation and exposes the shop name
// --------------------------------------------------------------
export const loader = async ({ request }) => {
  console.log('🚀 Loader function called!');
  const { admin, session } = await authenticate.admin(request);
  
  try {
    // Get Stanley/Stella credentials
    const credentials = await getCredentialsWithFallback(session.shop);
    
    log('info', '🔍 Loader started, checking credentials...');
    log('info', 'Shop:', session.shop);
    log('info', 'Credentials found:', !!credentials);
    
    if (!credentials) {
      log('warn', '❌ No credentials found');
      return json({ 
        shop: session.shop,
        publishedProducts: [],
        error: 'Stanley/Stella credentials not found. Please set them up first.'
      });
    }

    log('info', '✅ Credentials found, User:', credentials.user);
    log('info', '✅ STST_HOSTNAME env var:', process.env.STST_HOSTNAME);
    log('info', '✅ STST_DB_NAME env var:', process.env.STST_DB_NAME);

    // Check for cached products first
    log('info', '🔍 Checking for cached products...');
    const cachedData = await getCachedProducts(session.shop);
    
    if (cachedData) {
      log('info', `📦 Found cached products: ${cachedData.totalCount} products (cached ${cachedData.ageMinutes || 0} minutes ago)`);
      
      // Check if setup is complete (metaobjects and metafield definitions exist)
      let setupComplete = false;
      try {
        log('info', '🔍 Checking if setup is complete...');
        
        // Check for Product Grouping metaobject definition
        const metaobjectDefRes = await admin.graphql(`
          query {
            metaobjectDefinitions(first: 50) {
              edges {
                node {
                  id
                  type
                  name
                }
              }
            }
          }
        `);
        
        const metaobjectDefJson = await metaobjectDefRes.json();
        const metaobjectDefs = metaobjectDefJson.data?.metaobjectDefinitions?.edges || [];
        const hasProductGroupingMetaobject = metaobjectDefs.some(edge => 
          edge.node.type === "product_grouping_option_1_entries"
        );
        
        // Check for Product Grouping metafield definitions
        const metafieldDefRes = await admin.graphql(`
          query {
            metafieldDefinitions(first: 50, namespace: "stanley_stella", ownerType: PRODUCT) {
              edges {
                node {
                  id
                  key
                  type {
                    name
                  }
                }
              }
            }
          }
        `);
        
        const metafieldDefJson = await metafieldDefRes.json();
        const metafieldDefs = metafieldDefJson.data?.metafieldDefinitions?.edges || [];
        const hasProductGroupingMetafield = metafieldDefs.some(edge => 
          edge.node.key === "product_grouping_option_1" && edge.node.type.name === "metaobject_reference"
        );
        const hasProductGroupingValueMetafield = metafieldDefs.some(edge => 
          edge.node.key === "product_grouping_option_1_value"
        );
        
        setupComplete = hasProductGroupingMetaobject && hasProductGroupingMetafield && hasProductGroupingValueMetafield;
        
        log('info', `🔍 Setup check results:`);
        log('info', `  - Product Grouping metaobject: ${hasProductGroupingMetaobject}`);
        log('info', `  - Product Grouping metafield: ${hasProductGroupingMetafield}`);
        log('info', `  - Product Grouping value metafield: ${hasProductGroupingValueMetafield}`);
        log('info', `  - Setup complete: ${setupComplete}`);
        
      } catch (setupCheckError) {
        log('warn', '⚠️ Error checking setup status:', setupCheckError);
        // Default to showing the banner if we can't check
        setupComplete = false;
      }
      
      return json({
        shop: session.shop,
        publishedProducts: cachedData.products,
        totalCount: cachedData.totalCount,
        credentialsFound: true,
        cached: true,
        cachedAt: cachedData.cachedAt,
        expiresAt: cachedData.expiresAt,
        setupComplete: setupComplete
      });
    }

    // Clean up expired cache entries
    await cleanupExpiredCache();
    
    // Check if setup is complete (metaobjects and metafield definitions exist)
    let setupComplete = false;
    try {
      log('info', '🔍 Checking if setup is complete...');
      
      // Check for Product Grouping metaobject definition
      const metaobjectDefRes = await admin.graphql(`
        query {
          metaobjectDefinitions(first: 50) {
            edges {
              node {
                id
                type
                name
              }
            }
          }
        }
      `);
      
      const metaobjectDefJson = await metaobjectDefRes.json();
      const metaobjectDefs = metaobjectDefJson.data?.metaobjectDefinitions?.edges || [];
      const hasProductGroupingMetaobject = metaobjectDefs.some(edge => 
        edge.node.type === "product_grouping_option_1_entries"
      );
      
      // Check for Product Grouping metafield definitions
      const metafieldDefRes = await admin.graphql(`
        query {
          metafieldDefinitions(first: 50, namespace: "stanley_stella", ownerType: PRODUCT) {
            edges {
              node {
                id
                key
                type {
                  name
                }
              }
            }
          }
        }
      `);
      
      const metafieldDefJson = await metafieldDefRes.json();
      const metafieldDefs = metafieldDefJson.data?.metafieldDefinitions?.edges || [];
      const hasProductGroupingMetafield = metafieldDefs.some(edge => 
        edge.node.key === "product_grouping_option_1" && edge.node.type.name === "metaobject_reference"
      );
      const hasProductGroupingValueMetafield = metafieldDefs.some(edge => 
        edge.node.key === "product_grouping_option_1_value"
      );
      
      setupComplete = hasProductGroupingMetaobject && hasProductGroupingMetafield && hasProductGroupingValueMetafield;
      
      log('info', `🔍 Setup check results:`);
      log('info', `  - Product Grouping metaobject: ${hasProductGroupingMetaobject}`);
      log('info', `  - Product Grouping metafield: ${hasProductGroupingMetafield}`);
      log('info', `  - Product Grouping value metafield: ${hasProductGroupingValueMetafield}`);
      log('info', `  - Setup complete: ${setupComplete}`);
      
    } catch (setupCheckError) {
      log('warn', '⚠️ Error checking setup status:', setupCheckError);
      // Default to showing the banner if we can't check
      setupComplete = false;
    }
    
    // No cached data available - return basic info
    const result = {
      shop: session.shop,
      publishedProducts: [],
      totalCount: 0,
      credentialsFound: true,
      cached: false,
      setupComplete: setupComplete
    };
    
    log('info', '📤 No cached products found, returning basic info');

    return json(result);
    
  } catch (error) {
    log('error', '❌ Error in loader:', error);
    console.error('❌ Loader error:', error);
    return json({ 
      shop: session.shop,
      publishedProducts: [],
      error: `Failed to initialize: ${error.message}`
    });
  }
};

// --------------------------------------------------------------
//  action – handles Stanley/Stella product import and product fetching
// --------------------------------------------------------------
export const action = async ({ request }) => {
  try {
    const formData = await request.formData();
    const actionType = formData.get("actionType");
    
    log('info', '🚀 Action called with actionType:', actionType);
    
    // Handle different action types
    if (actionType === "fetchProducts") {
      log('info', '📥 Handling fetchProducts action');
      return await handleFetchProducts(request, formData);
    } else if (actionType === "importProducts") {
      log('info', '📥 Handling importProducts action');
      const styleCodes = formData.get("styleCodes");
      const languageCode = formData.get("languageCode");
      const delay = formData.get("delay");
      
      log('info', '📋 Import parameters:', {
        styleCodes: styleCodes,
        languageCode: languageCode,
        delay: delay
      });
      
      return await handleImportProducts(request, formData);
    } else if (actionType === "debugFields") {
      log('info', '🔍 Handling debugFields action');
      return await handleDebugFields(request, formData);
    } else if (actionType === "clearCache") {
      log('info', '🗑️ Handling clearCache action');
      return await handleClearCache(request, formData);
    } else if (actionType === "getCacheInfo") {
      log('info', 'ℹ️ Handling getCacheInfo action');
      return await handleGetCacheInfo(request, formData);
    } else if (actionType === "checkSetupStatus") {
      log('info', '🔍 Handling checkSetupStatus action');
      return await handleCheckSetupStatus(request, formData);
    } else if (actionType === "fixProductGrouping") {
      log('info', '🔧 Handling fixProductGrouping action');
      return await handleFixProductGrouping(request, formData);
    } else {
      log('error', '❌ Invalid action type:', actionType);
      return json({ error: "Invalid action type" }, { status: 400 });
    }
  } catch (error) {
    log('error', '❌ Error in action:', error);
    return json({ error: "Error processing request: " + error.message }, { status: 500 });
  }
};

// Handle fetching products from Stanley/Stella API
async function handleFetchProducts(request, formData) {
  const { admin, session } = await authenticate.admin(request);
  const credentials = await getCredentialsWithFallback(session.shop);
  
  if (!credentials) {
    return json({ error: "Stanley/Stella credentials not found. Please set them up first." }, { status: 400 });
  }

  try {
    // Check if this is a force refresh request
    const forceRefresh = formData.get("forceRefresh") === "true";
    
    // Check for cached products first (unless force refresh)
    if (!forceRefresh) {
      log('info', '🔍 Checking for cached products before API call...');
      const cachedData = await getCachedProducts(session.shop);
      
      if (cachedData) {
        log('info', `📦 Returning cached products: ${cachedData.totalCount} products`);
        return json({
          publishedProducts: cachedData.products,
          totalCount: cachedData.totalCount,
          success: true,
          cached: true,
          cachedAt: cachedData.cachedAt,
          expiresAt: cachedData.expiresAt
        });
      }
    } else {
      log('info', '🔄 Force refresh requested, clearing cache and fetching fresh data');
      await clearProductCache(session.shop);
    }
    // Fetch published products from Stanley/Stella API
    const publishedProducts = [];
    
    // Try different database names to see what's available
    const possibleDbNames = [
      "production_api",
      "test", 
      "demo"
    ];
    
    log('info', '🔍 Testing different database names:', possibleDbNames);
    
    // First, try with the exact same structure as the working PHP code
    for (const dbName of possibleDbNames) {
      log('info', `🔍 Testing database: ${dbName}`);
      
      // Create request to match the working PHP code exactly
      const requestData = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          db_name: dbName,
          user: credentials.user,
          password: credentials.password,
          LanguageCode: "en_US" // Changed from "EN" to "en_US" to match PHP code
        },
        id: 0
      };

      log('info', `🔍 Testing ${dbName} - Request data:`, maskSensitiveData(JSON.stringify(requestData, null, 2)));
      
      const apiUrl = `https://${process.env.STST_HOSTNAME}/webrequest/productsV2/get_json`;
      log('info', '🌐 Making request to:', apiUrl);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
            // Removed Content-Length header to match PHP code
          },
          body: JSON.stringify(requestData)
        });

        log('info', `📡 ${dbName} - API Response status:`, response.status);
        
        if (!response.ok) {
          log('warn', `⚠️ ${dbName} - API request failed: ${response.status} ${response.statusText}`);
          continue;
        }

        const data = await response.text();
        log('info', `📦 ${dbName} - Raw response data length:`, data.length);
        log('info', `📦 ${dbName} - Raw response data (first 200 chars):`, data.substring(0, 200));
        
        if (!data || data.trim() === '') {
          log('warn', `⚠️ ${dbName} - Empty response from API`);
          continue;
        }
        
        const responseData = JSON.parse(data);
        log('info', `📦 ${dbName} - Parsed responseData keys:`, Object.keys(responseData));
        log('info', `📦 ${dbName} - responseData.result type:`, typeof responseData.result);
        
        if (!responseData.result) {
          log('warn', `⚠️ ${dbName} - No result field in API response`);
          continue;
        }
        
        // Check if result is an error message
        if (typeof responseData.result === 'string' && responseData.result.includes('error')) {
          log('warn', `⚠️ ${dbName} - API error: ${responseData.result}`);
          continue;
        }
        
        const apiResult = JSON.parse(responseData.result);
        
        log('info', `📦 ${dbName} - Parsed result structure:`, Object.keys(apiResult));
        log('info', `📦 ${dbName} - Result is array:`, Array.isArray(apiResult));
        log('info', `📦 ${dbName} - Result length:`, apiResult.length);
        
        if (Array.isArray(apiResult) && apiResult.length > 0) {
          log('info', `✅ ${dbName} - Found ${apiResult.length} total products from Stanley/Stella API`);
          
          // 🚨 CRITICAL FIX: Check if we received flattened variant records instead of grouped products
          const firstItem = apiResult[0];
          const hasVariantsArray = firstItem && firstItem.Variants && Array.isArray(firstItem.Variants);
          const isFlattened = !hasVariantsArray && apiResult.length > 100; // Many items without Variants suggests flattened structure
          
          log('info', `🔍 ${dbName} - Data structure analysis:`);
          log('info', `🔍   First item has Variants array: ${hasVariantsArray}`);
          log('info', `🔍   Total items: ${apiResult.length}`);
          log('info', `🔍   Appears to be flattened: ${isFlattened}`);
          
          let processedItems = apiResult;
          
          if (isFlattened) {
            log('info', `🔄 ${dbName} - Detected flattened variant structure, grouping by StyleCode...`);
            
            // Group flattened records by StyleCode to reconstruct product structure
            const groupedByStyle = {};
            
            apiResult.forEach((record, index) => {
              const styleCode = record.StyleCode;
              if (!styleCode) {
                log('warn', `⚠️ ${dbName} - Record ${index + 1} missing StyleCode, skipping`);
                return;
              }
              
              if (!groupedByStyle[styleCode]) {
                // Create product structure from first record of this style
                groupedByStyle[styleCode] = {
                  StyleCode: record.StyleCode,
                  StyleName: record.StyleName,
                  StylePublished: record.StylePublished,
                  Type: record.Type,
                  Category: record.Category,
                  Gender: record.Gender,
                  Fit: record.Fit,
                  Neckline: record.Neckline,
                  Sleeve: record.Sleeve,
                  MainPicture: record.MainPicture,
                  // Copy all product-level fields
                  ...Object.fromEntries(
                    Object.entries(record).filter(([key, value]) => 
                      !['ColorCode', 'SizeCode', 'Color', 'Size', 'Stock', 'WeightPerUnit', 'Price'].some(variantField => 
                        key.toLowerCase().includes(variantField.toLowerCase())
                      )
                    )
                  ),
                  Variants: [] // Initialize empty variants array
                };
                log('info', `🔄 ${dbName} - Created product group for ${styleCode}: ${record.StyleName}`);
              }
              
              // Add this record as a variant (if it has variant-specific data)
              const hasVariantData = record.ColorCode || record.SizeCode || record.Color || record.Size;
              if (hasVariantData) {
                groupedByStyle[styleCode].Variants.push(record);
              }
            });
            
            // Convert grouped object back to array
            processedItems = Object.values(groupedByStyle);
            
            log('info', `🔄 ${dbName} - Grouped ${apiResult.length} records into ${processedItems.length} products`);
            
            // Log sample of grouped structure
            if (processedItems.length > 0) {
              const sampleProduct = processedItems[0];
              log('info', `🔍 ${dbName} - Sample grouped product: ${sampleProduct.StyleName} with ${sampleProduct.Variants.length} variants`);
            }
          }
          
          // Process and format the products, filtering by StylePublished and Published fields
          processedItems.forEach((item, index) => {
            log('info', `📋 ${dbName} - Processing item ${index + 1}:`, {
              StyleCode: item.StyleCode,
              StyleName: item.StyleName,
              StylePublished: item.StylePublished,
              StylePublishedType: typeof item.StylePublished,
              hasMainPicture: !!item.MainPicture,
              mainPictureLength: item.MainPicture ? item.MainPicture.length : 0,
              hasVariants: !!item.Variants,
              variantsLength: item.Variants ? item.Variants.length : 0,
              firstVariantPublished: item.Variants && item.Variants.length > 0 ? item.Variants[0].Published : 'N/A',
              firstVariantPublishedType: item.Variants && item.Variants.length > 0 ? typeof item.Variants[0].Published : 'N/A'
            });
            
            // Only include products that are published at style level (StylePublished = 1)
            if (item.StyleCode && item.StyleName && item.StylePublished === 1) {
              // Count published variants
              const publishedVariants = item.Variants ? item.Variants.filter(variant => variant.Published === 1) : [];
              const totalVariants = item.Variants ? item.Variants.length : 0;
              
              log('info', `📊 ${dbName} - Style ${item.StyleName}: ${publishedVariants.length}/${totalVariants} variants published`);
              
              // Only include styles that have at least one published variant
              if (publishedVariants.length > 0) {
                // Get the first image URL for thumbnail
                let firstImageUrl = null;
                if (item.MainPicture && Array.isArray(item.MainPicture) && item.MainPicture.length > 0) {
                  const firstPicture = item.MainPicture[0];
                  firstImageUrl = firstPicture.HTMLPath || firstPicture.URL || firstPicture.Url || firstPicture.url || '';
                }
                
                publishedProducts.push({
                  styleCode: item.StyleCode,
                  styleName: item.StyleName,
                  productName: item.ProductName || item.StyleName,
                  typeCode: item.TypeCode || '',
                  category: item.Category || '',
                  description: item.Description || '',
                  hasImages: item.MainPicture && item.MainPicture.length > 0,
                  imageCount: item.MainPicture ? item.MainPicture.length : 0,
                  imageUrl: firstImageUrl, // Add the first image URL for thumbnail
                  totalVariants: totalVariants,
                  publishedVariants: publishedVariants.length,
                  stylePublished: item.StylePublished === 1,
                  database: dbName
                });
                log('info', `✅ ${dbName} - Added published style: ${item.StyleName} (${item.StyleCode}) with ${publishedVariants.length} published variants`);
              } else {
                log('info', `⏭️ ${dbName} - Skipping style ${item.StyleName} (${item.StyleCode}) - no published variants`);
              }
            } else if (item.StyleCode && item.StyleName && item.StylePublished === 0) {
              log('info', `⏭️ ${dbName} - Skipping unpublished style: ${item.StyleName} (${item.StyleCode}) - StylePublished: ${item.StylePublished}`);
            } else if (item.StyleCode && item.StyleName) {
              log('warn', `⚠️ ${dbName} - Skipping item ${index + 1} - StylePublished field missing or invalid: ${item.StylePublished}`);
            } else {
              log('warn', `⚠️ ${dbName} - Skipping item ${index + 1} - missing StyleCode or StyleName`);
            }
          });

          log('info', `✅ ${dbName} - Successfully processed ${publishedProducts.length} published styles out of ${processedItems.length} total styles`);
          
          // If we found products, we can stop testing other databases
          if (publishedProducts.length > 0) {
            log('info', `✅ Found products in database: ${dbName}, stopping search`);
            break;
          }
        } else {
          log('info', `📦 ${dbName} - No products found or empty array`);
        }
      } catch (error) {
        log('error', `❌ ${dbName} - Error testing database:`, error.message);
      }
    }

    // Sort by style name
    publishedProducts.sort((a, b) => a.styleName.localeCompare(b.styleName));
    
    log('info', `✅ Final result: ${publishedProducts.length} published products found across all databases`);

    // Cache the results for future use
    if (publishedProducts.length > 0) {
      log('info', `💾 Caching ${publishedProducts.length} products for shop ${session.shop}`);
      await setCachedProducts(session.shop, publishedProducts);
    }

    return json({
      publishedProducts,
      totalCount: publishedProducts.length,
      success: true,
      cached: false
    });
    
  } catch (error) {
    log('error', '❌ Error fetching published products from Stanley/Stella API:', error);
    console.error('❌ Fetch products error:', error);
    return json({ 
      publishedProducts: [],
      totalCount: 0,
      error: `Failed to fetch published products: ${error.message}`,
      success: false
    });
  }
}

// Handle importing products (existing import logic)
async function handleImportProducts(request, formData) {
  const styleCodes = formData.get("styleCodes");
  const languageCode = formData.get("languageCode");
  const delay = parseInt(formData.get("delay") || "500");

  if (!styleCodes) {
    return json({ error: "Style codes are required" }, { status: 400 });
  }

  const { admin, session } = await authenticate.admin(request);
  const credentials = await getCredentialsWithFallback(session.shop);
  
  if (!credentials) {
    return json({ error: "Stanley/Stella credentials not found. Please set them up first." }, { status: 400 });
  }

      const results = {
      productsCreated: 0,
      productsUpdated: 0,
      productsSkipped: 0,
      variantsCreated: 0,
      variantsUpdated: 0,
      imagesUploaded: 0,
      categoriesAssigned: 0,
      metafieldsCreated: 0,
      processedStyles: [],
      errors: []
    };

  // Global caches for image deduplication
  const globalMediaCache = new Map();
  const urlToMediaCache = new Map();

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  async function attachMediaWithRetry(admin, mediaId, productId, retries = 5) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await admin.graphql(
          `mutation fileUpdate($files: [FileUpdateInput!]!) { fileUpdate(files: $files) { userErrors { field message } } }`,
          { variables: { files: [{ id: mediaId, referencesToAdd: [productId] }] } }
        );
        const json = await res.json();
        const errs = json.data?.fileUpdate?.userErrors || [];
        const blocking = errs.filter((e) => !/already|processing|non-ready files/i.test(e.message));
        const processingErr = errs.find((e) => /processing|non-ready files/i.test(e.message));
        if (blocking.length === 0) {
          if (!processingErr) return true; // success or just already attached
        }
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
          continue;
        }
        log('error', "Image attach errors", errs);
        return false;
      } catch (err) {
        if (attempt === retries) {
          log('error', "attachMediaWithRetry failed", err);
          return false;
        }
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
    return false;
  }

  const getField = (obj, logicalKey) => {
    // Try direct key first
    const direct = obj[logicalKey];
    if (direct !== undefined) return direct;
    
    // Try case variations
    const keys = [logicalKey, logicalKey.toLowerCase(), logicalKey.toUpperCase()];
    for (const key of keys) {
      if (obj[key] !== undefined) return obj[key];
    }
    
    // Try common field name variations
    const fieldVariations = {
      'StyleCode': ['StyleCode', 'stylecode', 'Style_Code', 'style_code'],
      'ColorCode': ['ColorCode', 'colourcode', 'Color_Code', 'colour_code', 'ColorCode'],
      'SizeCode': ['SizeCode', 'sizecode', 'Size_Code', 'size_code', 'SizeCodeNavision'],
      'Color': ['Color', 'colour', 'ColorName', 'colourname'],
      'Size': ['Size', 'size', 'SizeName', 'sizename'],
      'SKU': ['SKU', 'sku', 'Sku'],
      'Price': ['Price', 'price', 'UnitPrice', 'unitprice'],
      'Weight': ['Weight', 'weight', 'WeightPerUnit', 'weight_per_unit', 'Weight per unit'],
      'Description': ['Description', 'description', 'DescriptionHTML', 'descriptionhtml', 'ShortDescription'],
      'TypeCode': ['TypeCode', 'typecode', 'Type_Code', 'type_code', 'ProductType', 'producttype'],
      'Category': ['Category', 'category', 'CategoryName', 'categoryname']
    };
    
    if (fieldVariations[logicalKey]) {
      for (const variation of fieldVariations[logicalKey]) {
        if (obj[variation] !== undefined) return obj[variation];
      }
    }
    
    return undefined;
  };

  const generateImageIdentifier = (styleName) => {
    return styleName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  };

  // Helper function to find the original variant index for split products
  const findOriginalVariantIndex = (variantTitle, variantSku, originalVariants) => {
    // Try to match by SKU first (most reliable)
    for (let i = 0; i < originalVariants.length; i++) {
      const variant = originalVariants[i];
      const expectedSku = `${getField(variant, 'StyleCode') || ''}${getField(variant, 'ColorCode') || ''}${getField(variant, 'SizeCodeNavision') || ''}`;
      if (variantSku === expectedSku) {
        return i;
      }
    }
    
    // Try to match by parsing variant title (contains size and color info)
    // For split products, variant titles are like "Size - Color"
    const titleParts = variantTitle.split(' - ');
    if (titleParts.length >= 2) {
      const [size, color] = titleParts;
      for (let i = 0; i < originalVariants.length; i++) {
        const variant = originalVariants[i];
        const variantSize = getField(variant, 'Size') || getField(variant, 'SizeCode') || getField(variant, 'SizeCodeNavision');
        const variantColor = getField(variant, 'Color') || getField(variant, 'Colour');
        
        if (variantSize === size && variantColor === color) {
          return i;
        }
      }
    }
    
    // Fallback: return 0 (first variant)
    return 0;
  };



  const createRequestData = (styleCode, dbName = null) => {
    // Map language codes to match the working fetch products function
    const languageMapping = {
      "EN": "en_US",
      "FI": "fi_FI", 
      "SV": "sv_SE",
      "DE": "de_DE",
      "FR": "fr_FR",
      "ES": "es_ES",
      "IT": "it_IT",
      "NL": "nl_NL",
      "DA": "da_DK",
      "NO": "no_NO"
    };
    
    const mappedLanguageCode = languageMapping[languageCode] || "en_US";
    
    return {
      jsonrpc: "2.0",
      method: "call",
      params: {
        db_name: dbName || process.env.STST_DB_NAME || "stanleystella",
        user: credentials.user,
        password: credentials.password,
        StyleCode: styleCode,
        LanguageCode: mappedLanguageCode
      },
      id: 0
    };
  };

  const productCreateMutation = (item, isSplitProduct = false, sizes = [], colors = [], size = null) => {
    const title = getField(item, 'StyleName') || getField(item, 'Name') || 'Unknown Product';
    const description = getField(item, 'Description') || getField(item, 'DescriptionHTML') || '';
    const vendor = "Stanley/Stella";
    const productType = getField(item, 'Type') || getField(item, 'TypeCode') || getField(item, 'ProductType') || 'Suggested';
    
    // Set product category directly in the input like the upload file does
    const categoryId = getProductCategoryId(getField(item, 'Type') || "Suggested", item);
    
    // Build productOptions from sizes and colors
    const productOptions = (() => {
      const optionSets = {};
      
      // For split products, always create Size option (to show which size this product is)
      // and Color option if there are multiple colors
      if (isSplitProduct) {
        optionSets["Size"] = new Set(sizes);
        if (colors.length > 1) {
          optionSets["Color"] = new Set(colors);
        }
      } else {
        // For non-split products, create both Size and Color options as needed
        if (sizes.length > 1) {
          optionSets["Size"] = new Set(sizes);
        }
        if (colors.length > 1) {
          optionSets["Color"] = new Set(colors);
        }
      }
      
      return Object.entries(optionSets).map(([name, values]) => ({
        name,
        values: Array.from(values).map((val) => ({ name: val })),
      }));
    })();
      
      return {
        variables: {
          input: {
            title: isSplitProduct ? `${title} - ${size || getField(item, 'Size') || 'Standard'}` : title,
            descriptionHtml: description,
            vendor,
            productType,
            status: "DRAFT",
            category: categoryId, // Add category assignment
            productOptions: productOptions, // Add product options
            tags: ["Stanley/Stella Importer"] // Tag all imported products
          }
        }
      };
    };

  // Simplified buildVariants function without metafields
  const buildVariants = (variants, sizes, colors, styleCode, isSplitProduct = false) => {
    const variantInputs = [];
    
    log('info', `🔧 buildVariants called with ${variants.length} variants, ${sizes.length} sizes, ${colors.length} colors`);
    log('info', `🔧 Sizes: ${sizes.join(', ')}`);
    log('info', `🔧 Colors: ${colors.join(', ')}`);
    
    // Debug: Log the first variant to see available fields
    if (variants.length > 0) {
      log('info', `🔍 First variant fields:`, Object.keys(variants[0]));
      log('info', `🔍 First variant data:`, {
        StyleCode: getField(variants[0], 'StyleCode'),
        ColorCode: getField(variants[0], 'ColorCode'),
        SizeCodeNavision: getField(variants[0], 'SizeCodeNavision'),
        SizeCode: getField(variants[0], 'SizeCode'),
        Size: getField(variants[0], 'Size'),
        Color: getField(variants[0], 'Color'),
        Colour: getField(variants[0], 'Colour'),
        ColourCode: getField(variants[0], 'ColourCode')
      });
    }
    
    // Always create all size-color combinations, regardless of source data
    // Only create a single variant without options if we truly have just one size and one color
    if (sizes.length === 1 && colors.length === 1) {
      log('info', `🔧 Single size and color detected, creating without size/color options`);
      
      // Use the same intelligent variant matching logic as multiple variants
      const size = sizes[0];
      const color = colors[0];
      
      // Try to find the best matching variant
      const matching = variants.find((r) => {
        const rowSize = getField(r, "SizeCode") || getField(r, "Size") || getField(r, "SizeCodeNavision") || r.Size;
        const colorNameRow = getField(r, "Color") || getField(r, "Colour") || r.Color;
        const colorCodeRow = getField(r, "ColorCode") || getField(r, "ColourCode") || r.ColorCode;
        const rowColor = colorNameRow ? `${colorNameRow} - ${colorCodeRow || ""}`.trim() : colorCodeRow;
        return rowSize === size && rowColor === color;
      });
      
      // If no exact match, try to find a variant with the same size
      const sizeMatch = !matching ? variants.find((r) => {
        const rowSize = getField(r, "SizeCode") || getField(r, "Size") || getField(r, "SizeCodeNavision") || r.Size;
        return rowSize === size;
      }) : null;
      
      // If no size match, try to find a variant with the same color
      const colorMatch = !matching && !sizeMatch ? variants.find((r) => {
        const colorNameRow = getField(r, "Color") || getField(r, "Colour") || r.Color;
        const colorCodeRow = getField(r, "ColorCode") || getField(r, "ColourCode") || r.ColorCode;
        const rowColor = colorNameRow ? `${colorNameRow} - ${colorCodeRow || ""}`.trim() : colorCodeRow;
        return rowColor === color;
      }) : null;
      
      // Use the best available match, or fallback to first variant
      const variant = matching || sizeMatch || colorMatch || variants[0] || {};
      
      log('info', `🔧 Using variant data: ${matching ? 'exact match' : sizeMatch ? 'size match' : colorMatch ? 'color match' : 'fallback'}`);
      log('info', `🔍 Selected variant fields:`, Object.keys(variant));
      
      // Try multiple field combinations for SKU generation
      let sku = `${styleCode || ""}${getField(variant, "ColorCode") || ""}${getField(variant, "SizeCodeNavision") || ""}`;
      if (!sku || sku.trim() === "") {
        // Derive parts manually - exactly like upload.jsx
        const styleCodePart = styleCode || "";
        const colorCodePart = (() => {
          const parts = colors[0] ? colors[0].split(" - ") : [];
          return parts.length > 1 ? parts[1] : parts[0] || "";
        })();
        const sizePart = sizes[0] || "Default";
        sku = `${styleCodePart}${colorCodePart}${sizePart}`;
      }
      log('info', `🔧 Generated SKU for single variant: ${sku}`);
      
      let weightGrams = null;
      const weightField = getField(variant, "Weight");
      const weightPerUnit = getField(variant, "Weight per unit") || getField(variant, "Weight_per_unit") || getField(variant, "WeightPerUnit");
      if (weightField && !isNaN(parseFloat(weightField))) {
        weightGrams = parseFloat(weightField);
      } else if (weightPerUnit && !isNaN(parseFloat(weightPerUnit))) {
        weightGrams = parseFloat(weightPerUnit) * 1000;
      }
      
      const variantObj = {
        inventoryItem: {
          sku,
          tracked: false,
        },
      };
      
      if (weightGrams !== null) {
        variantObj.inventoryItem.measurement = {
          weight: {
            value: weightGrams,
            unit: "GRAMS",
          },
        };
      }
      
      variantInputs.push(variantObj);
      log('info', `🔧 Created single variant: ${sku} with weight: ${weightGrams}g`);
      
    } else {
      // Multiple variants - create size/color combinations
      log('info', `🔧 Multiple variants detected, creating size/color combinations`);
      log('info', `🔧 Will create ${sizes.length} × ${colors.length} = ${sizes.length * colors.length} variant combinations`);
      
      for (const size of sizes) {
        for (const color of colors) {
          // Always try to find the best matching variant for this size-color combination
          const matching = variants.find((r) => {
            const rowSize = getField(r, "SizeCode") || getField(r, "Size") || getField(r, "SizeCodeNavision") || r.Size;
            const colorNameRow = getField(r, "Color") || getField(r, "Colour") || r.Color;
            const colorCodeRow = getField(r, "ColorCode") || getField(r, "ColourCode") || r.ColorCode;
            const rowColor = colorNameRow ? `${colorNameRow} - ${colorCodeRow || ""}`.trim() : colorCodeRow;
            return rowSize === size && rowColor === color;
          });
          
          // If no exact match, try to find a variant with the same size
          const sizeMatch = !matching ? variants.find((r) => {
            const rowSize = getField(r, "SizeCode") || getField(r, "Size") || getField(r, "SizeCodeNavision") || r.Size;
            return rowSize === size;
          }) : null;
          
          // If no size match, try to find a variant with the same color
          const colorMatch = !matching && !sizeMatch ? variants.find((r) => {
            const colorNameRow = getField(r, "Color") || getField(r, "Colour") || r.Color;
            const colorCodeRow = getField(r, "ColorCode") || getField(r, "ColourCode") || r.ColorCode;
            const rowColor = colorNameRow ? `${colorNameRow} - ${colorCodeRow || ""}`.trim() : colorCodeRow;
            return rowColor === color;
          }) : null;
          
          // Use the best available match, or fallback to first variant
          const row = matching || sizeMatch || colorMatch || variants[0] || {};
          
          log('info', `🔧 Creating variant ${size}-${color}: ${matching ? 'exact match' : sizeMatch ? 'size match' : colorMatch ? 'color match' : 'fallback'}`);
          
          // Try multiple field combinations for SKU generation
          let sku = "";
          if (matching) {
            // Use exact match data for SKU
            sku = `${styleCode || ""}${getField(matching, "ColorCode") || ""}${getField(matching, "SizeCodeNavision") || ""}`;
          }
          
          if (!sku || sku.trim() === "") {
            // Derive parts manually - exactly like upload.jsx
            const styleCodePart = styleCode || "";
            const colorCodePart = (() => {
              const parts = color.split(" - ");
              return parts.length > 1 ? parts[1] : parts[0];
            })();
            const sizePart = size;
            sku = `${styleCodePart}${colorCodePart}${sizePart}`;
          }
          log('info', `🔧 Generated SKU for variant ${size}-${color}: ${sku}`);
          
          let weightGrams = null;
          const weightField = getField(row, "Weight");
          const weightPerUnit = getField(row, "Weight per unit") || getField(row, "Weight_per_unit") || getField(row, "WeightPerUnit");
          if (weightField && !isNaN(parseFloat(weightField))) {
            weightGrams = parseFloat(weightField);
          } else if (weightPerUnit && !isNaN(parseFloat(weightPerUnit))) {
            weightGrams = parseFloat(weightPerUnit) * 1000;
          }
          
          const variantObj = {
            inventoryItem: {
              sku,
              tracked: false,
            },
          };
          
          // For split products, always add Size option (to show which size this product is)
          // and Color option if there are multiple colors
          if (isSplitProduct) {
            const optionValues = [
              { optionName: "Size", name: size },
            ];
            if (colors.length > 1) {
              optionValues.push({ optionName: "Color", name: color });
            }
            variantObj.optionValues = optionValues;
          } else {
            // For non-split products, use the same logic as the working upload file
            const optionValues = [
              { optionName: sizes.length > 1 ? "Size" : "Color", name: sizes.length > 1 ? size : color },
              ...(sizes.length > 1 ? [{ optionName: "Color", name: color }] : []),
            ];
            variantObj.optionValues = optionValues;
          }
          
          if (weightGrams !== null) {
            variantObj.inventoryItem.measurement = {
              weight: {
                value: weightGrams,
                unit: "GRAMS",
              },
            };
          }
          
          variantInputs.push(variantObj);
          log('info', `🔧 Created variant: ${sku} (${size}-${color}) with weight: ${weightGrams}g`);
        }
      }
    }
    
    log('info', `🔧 Built ${variantInputs.length} total variants`);
    return variantInputs;
  };

  const styleCodeList = styleCodes.split(',').map(code => code.trim()).filter(code => code);

  for (const styleCode of styleCodeList) {
    try {
      log('info', `🔄 Processing style code: ${styleCode}`);
      
      // Try different database names to find the product
      const possibleDbNames = [
        "production_api",
        "test", 
        "demo"
      ];
      
      let result = null;
      let usedDbName = null;
      
      // Retry logic for database requests
      const maxDbRetries = 3;
      let dbRetryCount = 0;
      
      while (dbRetryCount < maxDbRetries && !result) {
        dbRetryCount++;
        log('info', `🔄 Database request attempt ${dbRetryCount}/${maxDbRetries} for style code: ${styleCode}`);
        
        for (const dbName of possibleDbNames) {
          try {
            log('info', `🔍 Trying database: ${dbName} for style code: ${styleCode}`);
            
            const requestData = createRequestData(styleCode, dbName);
            
            log('info', `🌐 Making API request for style code: ${styleCode} with database: ${dbName}`);
            log('info', `📤 Request data:`, maskSensitiveData(JSON.stringify(requestData, null, 2)));
            
            const response = await fetch(`https://${process.env.STST_HOSTNAME}/webrequest/productsV2/get_json`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(requestData))
              },
              body: JSON.stringify(requestData)
            });

            if (!response.ok) {
              log('warn', `⚠️ API request failed for database ${dbName}: ${response.status} ${response.statusText}`);
              continue;
            }

            const data = await response.text();
            log('info', `📡 API Response status: ${response.status}`);
            log('info', `📦 Raw response data:`, truncateForLog(data));
            
            const responseData = JSON.parse(data);
            
            // Check if the response contains an error
            if (responseData.error) {
              log('warn', `⚠️ API error for database ${dbName}:`, responseData.error);
              
              // Check if it's a database connection error
              const errorMessage = responseData.error.message || '';
              const isDbConnectionError = errorMessage.includes('psycopg2.OperationalError') || 
                                        errorMessage.includes('database') || 
                                        errorMessage.includes('connection') ||
                                        errorMessage.includes('timeout');
              
              if (isDbConnectionError) {
                log('warn', `🔄 Database connection error detected for ${dbName}, will retry with different database...`);
                // Add a small delay before trying the next database
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
              continue;
            }
            
            // Check if result exists and is valid
            if (!responseData.result) {
              log('warn', `⚠️ No result field in response for database ${dbName}`);
              continue;
            }
            
            let parsedResult;
            try {
              parsedResult = JSON.parse(responseData.result);
            } catch (parseError) {
              log('error', `❌ Error parsing result for database ${dbName}:`, parseError.message);
              continue;
            }

            log('info', `📦 Parsed result length:`, Array.isArray(parsedResult) ? parsedResult.length : 'Not an array');
            log('info', `📦 Parsed result:`, truncateForLog(JSON.stringify(parsedResult)));

            if (Array.isArray(parsedResult) && parsedResult.length > 0) {
              log('info', `✅ Found product in database: ${dbName}`);
              result = parsedResult;
              usedDbName = dbName;
              break;
            } else {
              log('info', `📦 No products found in database: ${dbName}`);
            }
          } catch (dbError) {
            log('error', `❌ Error trying database ${dbName}:`, dbError.message);
            continue;
          }
        }
        
        // If we didn't find a result and this isn't the last retry, wait before retrying
        if (!result && dbRetryCount < maxDbRetries) {
          const retryDelay = dbRetryCount * 2000; // 2s, 4s delays
          log('info', `⏳ No products found in any database, waiting ${retryDelay}ms before retry ${dbRetryCount + 1}/${maxDbRetries}...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
      
      if (!result || result.length === 0) {
        log('warn', `⚠️ No products found for style code: ${styleCode} in any database`);
        results.errors.push(`No products found for style code: ${styleCode}`);
        continue;
      }

      // 🚨🚨🚨 CRITICAL: Create ALL metafield definitions BEFORE processing any products 🚨🚨🚨
      // NOTE: Product grouping metafield definitions should be created first in the Metaobjects page using "Complete Setup"
      log('info', '🚨🚨🚨 CRITICAL: Creating ALL metafield definitions BEFORE product processing! 🚨🚨🚨');
      
      try {
        // Import metafield functions (server-only)
        log('info', '🚨 DEBUG: Importing metafield functions for definition creation...');
        const metafieldModule = await import("../utils/metafields.server.js");
        log('info', '🚨 DEBUG: Metafield module imported successfully');
        log('info', '🚨 DEBUG: Available functions:', Object.keys(metafieldModule));
        
        const {
          ensureAllMetafieldDefinitions
        } = metafieldModule;
        
        log('info', '🚨 DEBUG: ensureAllMetafieldDefinitions function:', typeof ensureAllMetafieldDefinitions);
        if (typeof ensureAllMetafieldDefinitions !== 'function') {
          throw new Error('ensureAllMetafieldDefinitions is not a function!');
        }
        
        // Create ALL metafield definitions first
        log('info', '🔧 PHASE 1: Creating ALL metafield definitions for all fields in FIELD_MAPPING...');
        log('info', '🚨 DEBUG: About to call ensureAllMetafieldDefinitions...');
        
        try {
          const definitionsResult = await ensureAllMetafieldDefinitions(admin);
          log('info', `✅ Metafield definitions result: ${definitionsResult.created} created, ${definitionsResult.existing} existing, ${definitionsResult.errors.length} errors`);
          
          if (definitionsResult.errors.length > 0) {
            log('error', '❌ CRITICAL: Metafield definition creation failed!');
            log('error', '❌ FULL metafield definition errors:', definitionsResult.errors);
            throw new Error(`Metafield definition creation failed with ${definitionsResult.errors.length} errors: ${definitionsResult.errors.slice(0, 3).join(', ')}`);
          }
        } catch (definitionsError) {
          log('error', '❌ CRITICAL ERROR in ensureAllMetafieldDefinitions:', definitionsError);
          log('error', '❌ Error details:', {
            message: definitionsError.message,
            stack: definitionsError.stack,
            name: definitionsError.name
          });
          throw definitionsError; // Re-throw to be caught by outer try-catch
        }
        
        // Wait for definitions to propagate
        log('info', '⏳ Waiting 5 seconds for metafield definitions to propagate...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        log('info', '✅ SUCCESS: All metafield definitions created successfully!');
        
      } catch (metafieldSetupError) {
        log('error', `❌ CRITICAL ERROR setting up metafield definitions:`, metafieldSetupError);
        results.errors.push(`Metafield definition setup error: ${metafieldSetupError.message}`);
        // Continue with product processing even if metafield definitions fail
      }

      // Process the found product
      console.log('🚨🚨🚨 ABOUT TO ENTER MAIN LOOP! 🚨🚨🚨');
      console.log('🚨 result.length:', result.length);
      console.log('🚨 result[0] keys:', Object.keys(result[0] || {}).slice(0, 10));
      log('info', '🚨🚨🚨 CRITICAL: About to enter main product processing loop! ��🚨🚨');
      for (const item of result) {
        // 🚨 MAIN CHECKPOINT: Are we processing any products at all?
        log('info', '🚨🚨🚨 MAIN CHECKPOINT: STARTING PRODUCT PROCESSING 🚨🚨🚨');
        log('info', `🚨 PRODUCT: ${getField(item, 'StyleName') || getField(item, 'Name') || 'Unknown'}`);
        log('info', `🚨 ITEM KEYS: ${Object.keys(item).slice(0, 10).join(', ')}`);
        
        if (item.Variants && Array.isArray(item.Variants)) {
          try {
            const styleName = getField(item, 'StyleName') || getField(item, 'Name') || 'Unknown Product';
            log('info', `📦 Processing product: ${styleName}`);
            log('info', `🚨 DEBUG: Extracted styleName: "${styleName}"`);
            log('info', `🚨 DEBUG: styleName source - getField(item, 'StyleName'): "${getField(item, 'StyleName')}"`);
            log('info', `🚨 DEBUG: styleName source - getField(item, 'Name'): "${getField(item, 'Name')}"`);
            log('info', `🚨 DEBUG: Raw item.StyleName: "${item.StyleName}"`);
            log('info', `🚨 DEBUG: Raw item.Name: "${item.Name}"`);
            log('info', `📦 Item structure:`, Object.keys(item));
            log('info', `📦 MainPicture data:`, item.MainPicture);
            
            // Check if product already exists by multiple criteria
            const styleCode = getField(item, 'StyleCode') || styleCode;
            const productTitle = getField(item, 'StyleName') || getField(item, 'Name') || 'Unknown Product';
            
            // First, determine if this should be a split product to adjust our search strategy
            const itemVariants = item.Variants || [];
            const willSplitBySize = itemVariants.length > 100;
            
            let existingProduct = null;
            let existingProducts = []; // For split products, we may find multiple existing products
            
            if (willSplitBySize) {
              // For split products, check if any size-specific products already exist
              log('info', `🔍 Checking for existing split products for: ${productTitle}`);
              
              // Get all sizes to check for size-specific products
              const sizes = [...new Set(itemVariants.map(variant => 
                getField(variant, 'Size') || getField(variant, 'SizeCode') || 'Default'
              ))];
              
              // Check for existing size-specific products
              for (const size of sizes) {
                const sizeSpecificTitle = `${productTitle} - ${size}`;
                const searchQueries = [
                  `title:"${sizeSpecificTitle}"`,
                  `handle:"${sizeSpecificTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"`,
                  `title:*${styleCode}*${size}*`,
                  `sku:*${styleCode}*`
                ];
                
                for (const query of searchQueries) {
                  try {
                    const existingProductRes = await admin.graphql(
                      `query ($query: String!) {
                        products(first: 10, query: $query) {
                          edges {
                            node {
                              id
                              title
                              handle
                              variants(first: 10) {
                                edges {
                                  node {
                                    sku
                                    title
                                  }
                                }
                              }
                            }
                          }
                        }
                      }`,
                      { variables: { query } }
                    );
                    
                    const existingProductJson = await existingProductRes.json();
                    const products = existingProductJson.data?.products?.edges || [];
                    
                    for (const productEdge of products) {
                      const product = productEdge.node;
                      
                      // Check if title matches the size-specific title
                      if (product.title.toLowerCase() === sizeSpecificTitle.toLowerCase()) {
                        existingProducts.push({ product, size });
                        log('info', `⏭️ Found existing size-specific product: ${product.title} (${product.id})`);
                        break;
                      }
                      
                      // Check if title contains the style code and size
                      if (product.title.toLowerCase().includes(styleCode.toLowerCase()) && 
                          product.title.toLowerCase().includes(size.toLowerCase())) {
                        existingProducts.push({ product, size });
                        log('info', `⏭️ Found existing product by style+size pattern: ${product.title} (${product.id})`);
                        break;
                      }
                    }
                    
                    if (existingProducts.some(ep => ep.size === size)) break; // Found for this size, move to next
                  } catch (searchError) {
                    log('warn', `⚠️ Search query failed for "${query}":`, searchError.message);
                    continue;
                  }
                }
              }
              
              if (existingProducts.length > 0) {
                log('info', `⏭️ Found ${existingProducts.length} existing split products for ${productTitle}`);
                // Use the first existing product as the main product for consistency
                existingProduct = existingProducts[0].product;
              }
              
            } else {
              // For non-split products, use the original search logic
              const searchQueries = [
                `title:"${productTitle}"`,
                `handle:"${productTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"`,
                `sku:*${styleCode}*`,
                `title:*${styleCode}*`
              ];
              
              for (const query of searchQueries) {
                try {
                  const existingProductRes = await admin.graphql(
                    `query ($query: String!) {
                      products(first: 5, query: $query) {
                        edges {
                          node {
                            id
                            title
                            handle
                            variants(first: 10) {
                              edges {
                                node {
                                  sku
                                  title
                                }
                              }
                            }
                          }
                        }
                      }
                    }`,
                    { variables: { query } }
                  );
                  
                  const existingProductJson = await existingProductRes.json();
                  const products = existingProductJson.data?.products?.edges || [];
                  
                  // Check if any of the returned products match our criteria
                  for (const productEdge of products) {
                    const product = productEdge.node;
                    
                    // Check if title matches (case insensitive)
                    if (product.title.toLowerCase() === productTitle.toLowerCase()) {
                      existingProduct = product;
                      log('info', `⏭️ Found existing product by title: ${product.title} (${product.id})`);
                      break;
                    }
                    
                    // Check if any variant SKU contains the style code
                    const hasMatchingSku = product.variants.edges.some(variantEdge => 
                      variantEdge.node.sku && variantEdge.node.sku.includes(styleCode)
                    );
                    
                    if (hasMatchingSku) {
                      existingProduct = product;
                      log('info', `⏭️ Found existing product by SKU pattern: ${product.title} (${product.id})`);
                      break;
                    }
                  }
                  
                  if (existingProduct) break;
                } catch (searchError) {
                  log('warn', `⚠️ Search query failed for "${query}":`, searchError.message);
                  continue;
                }
              }
            }
            
            let mainProduct = null;
            let mainProductId = null;
            let isExistingProduct = false;
            let createdProducts = []; // Initialize early to avoid reference errors
            
            if (existingProduct) {
              if (willSplitBySize && existingProducts.length > 0) {
                // For split products, check if ALL sizes already exist
                const sizes = [...new Set(itemVariants.map(variant => 
                  getField(variant, 'Size') || getField(variant, 'SizeCode') || 'Default'
                ))];
                
                const existingSizes = existingProducts.map(ep => ep.size);
                const allSizesExist = sizes.every(size => existingSizes.includes(size));
                
                if (allSizesExist) {
                  log('info', `⏭️ All ${sizes.length} split products already exist for: ${productTitle}`);
                  log('info', `⏭️ Existing sizes: ${existingSizes.join(', ')}`);
                  results.productsSkipped += existingProducts.length;
                  isExistingProduct = true;
                  
                  // Use the first existing product as main product for metafield creation
                  mainProduct = existingProducts[0].product;
                  mainProductId = existingProducts[0].product.id;
                  
                  // Add all existing products to createdProducts array for consistency
                  for (const existingProd of existingProducts) {
                    createdProducts.push({
                      product: existingProd.product,
                      productId: existingProd.product.id,
                      size: existingProd.size,
                      variants: itemVariants.filter(variant => {
                        const variantSize = getField(variant, 'Size') || getField(variant, 'SizeCode') || 'Default';
                        return variantSize === existingProd.size;
                      }),
                      isFirst: existingProd === existingProducts[0]
                    });
                  }
                  
                  // Product grouping metafields will be handled later in the dedicated section
                  
                  log('info', `📦 Using existing split products for metafield creation: ${existingProducts.length} products`);
                  
                  // Update the Product Grouping metaobject with existing product references if needed
                  try {
                    log('info', `🔗 Checking if Product Grouping metaobject needs to be updated for existing products`);
                    
                    // Find the existing Product Grouping metaobject for this style
                    const existingGroupingRes = await admin.graphql(
                      `query {
                        metaobjects(type: "product_grouping_option_1_entries", first: 10) {
                          edges {
                            node {
                              id
                              fields {
                                key
                                value
                              }
                            }
                          }
                        }
                      }`
                    );
                    const existingGroupingJson = await existingGroupingRes.json();
                    const existingGrouping = existingGroupingJson.data?.metaobjects?.edges?.find(
                      edge => edge.node.fields.find(field => field.key === "grouping_name" && field.value === styleName)
                    );
                    
                    if (existingGrouping) {
                      // Import the function for updating product grouping
                      const { updateProductGroupingWithProducts } = await import("../utils/metafields.server.js");
                      
                      // Get all the existing product IDs
                      const existingProductIds = existingProducts.map(ep => ep.product.id);
                      
                      const updateSuccess = await updateProductGroupingWithProducts(admin, existingGrouping.node.id, existingProductIds);
                      
                      if (updateSuccess) {
                        log('info', `✅ Successfully updated Product Grouping metaobject for existing products`);
                      } else {
                        log('error', `❌ Failed to update Product Grouping metaobject for existing products`);
                      }
                    }
                  } catch (updateError) {
                    log('error', `❌ Error updating Product Grouping metaobject for existing products:`, updateError);
                  }
                } else {
                  // Some sizes exist, some don't - we'll need to create the missing ones
                  const missingSizes = sizes.filter(size => !existingSizes.includes(size));
                  log('info', `⚠️ Partial split products exist. Missing sizes: ${missingSizes.join(', ')}`);
                  log('info', `⚠️ This case is not fully supported yet - will create all products`);
                  isExistingProduct = false;
                }
              } else {
                // For non-split products, handle as before
                log('info', `⏭️ Product already exists: ${productTitle} (ID: ${existingProduct.id})`);
                log('info', `⏭️ Existing variants:`, existingProduct.variants.edges.map(v => v.node.sku).join(', '));
                results.productsSkipped++;
                isExistingProduct = true;
                
                // Use existing product for metafield creation
                mainProduct = existingProduct;
                mainProductId = existingProduct.id;
                
                // 🚨 UPDATE EXISTING PRODUCT: Update the product with latest data instead of just skipping
                log('info', `🔄 Updating existing product with latest data: ${productTitle}`);
                try {
                  const updateInput = {
                    id: existingProduct.id,
                    title: getField(item, 'StyleName') || getField(item, 'Name') || productTitle,
                    descriptionHtml: getField(item, 'ShortDescription') || getField(item, 'Description') || getField(item, 'DescriptionHTML') || '',
                    vendor: "Stanley/Stella",
                    productType: getField(item, 'Type') || getField(item, 'TypeCode') || getField(item, 'ProductType') || 'Suggested',
                    tags: [`style_code:${getField(item, 'StyleCode') || 'unknown'}`, 'Stanley/Stella Importer']
                  };
                  
                  // Add category if available
                  const categoryId = getProductCategoryId(getField(item, 'Type') || "Suggested", item);
                  if (categoryId) {
                    updateInput.productCategoryId = categoryId;
                    log('info', `📂 Updating product category to: ${categoryId}`);
                  }
                  
                  const updateRes = await admin.graphql(
                    `mutation ($input: ProductInput!) {
                      productUpdate(input: $input) {
                        product {
                          id
                          title
                          descriptionHtml
                          vendor
                          productType
                          tags
                        }
                        userErrors {
                          field
                          message
                        }
                      }
                    }`,
                    { variables: { input: updateInput } }
                  );
                  
                  const updateJson = await updateRes.json();
                  const updateErrors = updateJson.data?.productUpdate?.userErrors || [];
                  
                  if (updateErrors.length > 0) {
                    log('error', `❌ Error updating existing product:`, updateErrors);
                    results.errors.push(`Product update failed for ${productTitle}: ${updateErrors[0].message}`);
                  } else {
                    const updatedProduct = updateJson.data?.productUpdate?.product;
                    log('info', `✅ Successfully updated existing product: ${updatedProduct.title}`);
                    results.productsUpdated++;
                    
                    // Use the updated product for metafield creation
                    mainProduct = updatedProduct;
                    mainProductId = updatedProduct.id;
                  }
                } catch (updateError) {
                  log('error', `❌ Error updating existing product:`, updateError);
                  results.errors.push(`Product update failed for ${productTitle}: ${updateError.message}`);
                }
                
                // 🚨 EXISTING PRODUCT CHECKPOINT: What happens after existing product detection?
                console.log('🚨🚨🚨 EXISTING PRODUCT CHECKPOINT! 🚨🚨🚨');
                log('info', '🚨🚨🚨 EXISTING PRODUCT CHECKPOINT: Found existing product! 🚨🚨🚨');
                log('info', `🚨 mainProductId: ${mainProductId}`);
                log('info', `🚨 About to retrieve full product details...`);
                
                // Get full product details for metafield creation
                try {
                  const fullProductRes = await admin.graphql(
                    `query ($productId: ID!) {
                      product(id: $productId) {
                        id
                        title
                        handle
                        variants(first: 50) {
                          edges {
                            node {
                              id
                              title
                              sku
                            }
                          }
                        }
                      }
                    }`,
                    { variables: { productId: mainProductId } }
                  );
                  const fullProductJson = await fullProductRes.json();
                  mainProduct = fullProductJson.data?.product;
                  log('info', `📦 Retrieved full product details for metafield creation: ${mainProduct.title}`);
                  
                  // 🚨 PRODUCT DETAILS CHECKPOINT: Did we successfully retrieve product details?
                  log('info', '🚨🚨🚨 PRODUCT DETAILS CHECKPOINT: Successfully retrieved product details! 🚨🚨🚨');
                  log('info', `🚨 mainProduct.title: ${mainProduct.title}`);
                  log('info', `🚨 mainProduct.variants.length: ${mainProduct.variants?.edges?.length || 'undefined'}`);
                  
                  // Add existing product to createdProducts array for consistency
                  createdProducts.push({
                    product: mainProduct,
                    productId: mainProductId,
                    variants: itemVariants,
                    isFirst: true
                  });
                } catch (productError) {
                  console.log('🚨🚨🚨 PRODUCT ERROR - BUT NOT CONTINUING! 🚨🚨🚨', productError);
                  log('error', `❌ Error retrieving full product details:`, productError.message);
                  log('error', `🚨 FIXED: Will continue with metafield processing despite product details error`);
                  
                  // Don't continue - we still want to process metafields even if product details fail
                  // Use the basic existing product info we already have
                  mainProduct = existingProduct;
                  mainProductId = existingProduct.id;
                  
                  // Add existing product to createdProducts array for consistency
                  createdProducts.push({
                    product: mainProduct,
                    productId: mainProductId,
                    variants: itemVariants,
                    isFirst: true
                  });
                }
                
                // 🚨 POST-PRODUCT-DETAILS CHECKPOINT: Did we get past product details retrieval?
                log('info', '🚨🚨🚨 POST-PRODUCT-DETAILS CHECKPOINT: Past product details section! 🚨🚨🚨');
              }
            }

            // Extract variants, sizes, and colors for both new and existing products
            const variants = item.Variants || [];
            if (variants.length === 0) {
              console.log('🚨🚨🚨 NO VARIANTS - BUT PROCESSING METAFIELDS FIRST! 🚨🚨🚨');
              log('info', `⚠️ No variants found for ${styleName}`);
              log('error', `🚨 FIXED: Will process metafields first, then skip product creation`);
              // Don't continue yet - we still want to process metafields
            }

            // NOW check if we should skip product creation due to no variants
            if (variants.length === 0) {
              log('info', `🚨 NO VARIANTS - Skipping product creation`);
              continue;
            }

            // Extract sizes and colors for variant creation
            const sizes = [...new Set(variants.map(variant => 
              getField(variant, 'Size') || getField(variant, 'SizeCode') || 'Default'
            ))];
            const colors = [...new Set(variants.map(variant => {
              const colorName = getField(variant, 'ColorName') || getField(variant, 'Color') || 'Unknown';
              const colorCode = getField(variant, 'ColorCode') || '';
              return colorName && colorCode ? `${colorName} - ${colorCode}` : (colorName || colorCode || "Default");
            }))];
            
            // Initialize metafield processing variables (will be populated in metafield section)
            let processedProductMetafields = [];
            let processedVariantMetafields = [];
            let totalMetafieldsCreated = 0;

            // Debug logging for sizes and colors
            log('info', `🔍 Product ${styleName} has ${variants.length} variants`);
            log('info', `🔍 Extracted ${sizes.length} sizes: ${sizes.join(', ')}`);
            log('info', `🔍 Extracted ${colors.length} colors: ${colors.join(', ')}`);
            log('info', `🔍 Sample variant data:`, variants.slice(0, 3).map(v => ({
              Size: getField(v, 'Size') || getField(v, 'SizeCode'),
              Color: getField(v, 'ColorName') || getField(v, 'Color'),
              ColorCode: getField(v, 'ColorCode')
            })));

            // Check if product should be split (over 100 variants) - use the same logic as earlier
            const shouldSplitBySize = willSplitBySize;
            log('info', `🔍 Should split by size: ${shouldSplitBySize} (willSplitBySize: ${willSplitBySize}, variants.length: ${variants.length})`);

            // Initialize products array for both new and existing products
            // createdProducts already declared above
            
            // Only create new product if it doesn't exist
            if (!isExistingProduct) {
              
              if (shouldSplitBySize) {
                log('info', `🔧 Splitting product ${styleName} by size into ${sizes.length} separate products`);
                
                // Create the Product Grouping Option 1 Entries metaobject FIRST
                let productGroupingOption1 = null;
                try {
                  log('info', `🔗 Creating product grouping metaobject for style: "${styleName}"`);
                  
                  const existingGroupingRes = await admin.graphql(
                    `query {
                      metaobjects(type: "product_grouping_option_1_entries", first: 10) {
                        edges {
                          node {
                            id
                            fields {
                              key
                              value
                            }
                          }
                        }
                      }
                    }`
                  );
                  const existingGroupingJson = await existingGroupingRes.json();
                  const existingGrouping = existingGroupingJson.data?.metaobjects?.edges?.find(
                    edge => edge.node.fields.find(field => field.key === "grouping_name" && field.value === styleName)
                  );
                  
                  if (existingGrouping) {
                    productGroupingOption1 = existingGrouping.node;
                    log('info', `⏭️ Found existing Product Grouping Option 1 Entry: ${styleName}`);
                  } else {
                    // Create new Product Grouping Option 1 Entries metaobject
                    // Use StyleName as the metaobject ID/name
                    const groupingName = styleName && styleName.trim() !== '' ? styleName : `Style_${getField(item, 'StyleCode') || 'Unknown'}`;
                    log('info', `🔗 Creating NEW product grouping metaobject for style: "${groupingName}" (original styleName: "${styleName}")`);
                    
                    const createGroupingRes = await admin.graphql(
                      `mutation ($metaobject: MetaobjectCreateInput!) {
                        metaobjectCreate(metaobject: $metaobject) {
                          metaobject {
                            id
                            fields {
                              key
                              value
                            }
                          }
                          userErrors {
                            field
                            message
                          }
                        }
                      }`,
                      {
                        variables: {
                          metaobject: {
                            type: "product_grouping_option_1_entries",
                            fields: [
                              {
                                key: "grouping_name",
                                value: groupingName
                              }
                            ]
                          }
                        }
                      }
                    );
                    
                    const createGroupingJson = await createGroupingRes.json();
                    const groupingErrs = createGroupingJson.data?.metaobjectCreate?.userErrors || [];
                    
                                      if (groupingErrs.length) {
                    log('error', "Product Grouping Option 1 Entries creation errors", groupingErrs);
                    results.errors.push(`Product grouping metaobject creation error: ${groupingErrs[0].message}`);
                  } else {
                    productGroupingOption1 = createGroupingJson.data?.metaobjectCreate?.metaobject;
                    log('info', `✅ Created Product Grouping Option 1 Entry: ${styleName} (${productGroupingOption1.id})`);
                    log('info', `🔗 Metaobject details:`, productGroupingOption1);
                  }
                  }
                } catch (groupingError) {
                  log('error', `❌ Error creating/finding Product Grouping Option 1 Entry:`, groupingError);
                }

                // Create separate products for each size
                for (let sizeIndex = 0; sizeIndex < sizes.length; sizeIndex++) {
                  const size = sizes[sizeIndex];
                  const sizeVariants = variants.filter(variant => {
                    const variantSize = getField(variant, 'Size') || getField(variant, 'SizeCode') || 'Default';
                    return variantSize === size;
                  });
                  
                  if (sizeVariants.length === 0) {
                    log('warn', `⚠️ No variants found for size: ${size}`);
                    continue;
                  }
                  
                  log('info', `🔧 Creating size-specific product: ${styleName} - ${size} (${sizeVariants.length} variants)`);
                  
                  // Create size-specific product
                  const sizeProductRes = await admin.graphql(
                    `mutation ($input: ProductInput!) {
                      productCreate(input: $input) {
                        product {
                          id
                          title
                          handle
                          options {
                            id
                            name
                            values
                          }
                          variants(first: 10) {
                            edges {
                              node {
                                id
                                title
                                sku
                              }
                            }
                          }
                        }
                        userErrors {
                          field
                          message
                        }
                      }
                    }`,
                    productCreateMutation(item, true, [size], colors, size)
                  );

                  const sizeProductJson = await sizeProductRes.json();
                  const sizeProductErrs = sizeProductJson.data?.productCreate?.userErrors || [];
                  
                  if (sizeProductErrs.length) {
                    log('error', `Size product creation errors for ${size}`, sizeProductErrs);
                    results.errors.push(`Size product creation failed for ${styleCode} - ${size}: ${sizeProductErrs[0].message}`);
                    continue;
                  }

                  const sizeProduct = sizeProductJson.data?.productCreate?.product;
                  const sizeProductId = sizeProduct?.id;
                  
                  if (!sizeProductId) {
                    log('error', `No size product ID returned for ${size}`);
                    results.errors.push(`No size product ID returned for ${styleCode} - ${size}`);
                    continue;
                  }

                  createdProducts.push({
                    product: sizeProduct,
                    productId: sizeProductId,
                    size: size,
                    variants: sizeVariants,
                    isFirst: sizeIndex === 0
                  });

                  results.productsCreated++;
                  log('info', `✅ Created size product: ${sizeProduct.title} (${sizeProductId}) with tag: Stanley/Stella Importer`);

                  // Store product grouping info to be added later with all metafields
                  if (productGroupingOption1) {
                    createdProducts[createdProducts.length - 1].productGroupingOption1 = productGroupingOption1;
                    createdProducts[createdProducts.length - 1].size = size;
                    log('info', `📝 Stored product grouping info for ${sizeProduct.title}: ${productGroupingOption1.id}, size: ${size}`);
                    log('info', `📝 Product grouping metaobject:`, productGroupingOption1);
                    log('info', `📝 Metaobject ID to be used: ${productGroupingOption1.id}`);
                    log('info', `📝 StyleName: "${styleName}"`);
                  } else {
                    log('warn', `⚠️ No productGroupingOption1 available for ${sizeProduct.title}`);
                  }

                  await sleep(delay);
                }
                
                // Update the Product Grouping metaobject with product references
                if (productGroupingOption1 && createdProducts.length > 0) {
                  try {
                    log('info', `🔗 Updating Product Grouping metaobject ${productGroupingOption1.id} with ${createdProducts.length} product references`);
                    
                    // Import the function for updating product grouping
                    const { updateProductGroupingWithProducts } = await import("../utils/metafields.server.js");
                    
                    // Get all the product IDs from the created products
                    const productIds = createdProducts.map(prod => prod.productId);
                    
                    const updateSuccess = await updateProductGroupingWithProducts(admin, productGroupingOption1.id, productIds);
                    
                    if (updateSuccess) {
                      log('info', `✅ Successfully updated Product Grouping metaobject with product references`);
                    } else {
                      log('error', `❌ Failed to update Product Grouping metaobject with product references`);
                      results.errors.push(`Failed to update Product Grouping metaobject with product references for ${styleName}`);
                    }
                  } catch (updateError) {
                    log('error', `❌ Error updating Product Grouping metaobject:`, updateError);
                    results.errors.push(`Error updating Product Grouping metaobject: ${updateError.message}`);
                  }
                }
                
                // Set the main product to the first created product for further processing
                if (createdProducts.length > 0) {
                  mainProduct = createdProducts[0].product;
                  mainProductId = createdProducts[0].productId;
                  log('info', `🔧 Using first size product as main product: ${mainProduct.title}`);
                }
                
              } else {
                // Create single product (not split)
                // Note: We'll build variants after getting existing variant definitions
                // Just create the product structure first
                
                log('info', `🔧 Will create variants after getting metafield definitions for product: ${styleName}`);
                log('info', `🔧 Sizes: ${sizes.join(', ')}`);
                log('info', `🔧 Colors: ${colors.join(', ')}`);

                // Create main product with proper options
                const mainProductRes = await admin.graphql(
                  `mutation ($input: ProductInput!) {
                    productCreate(input: $input) {
                      product {
                        id
                        title
                        handle
                        options {
                          id
                          name
                          values
                        }
                        variants(first: 10) {
                          edges {
                            node {
                              id
                              title
                              sku
                            }
                          }
                        }
                      }
                      userErrors {
                        field
                        message
                      }
                    }
                  }`,
                  productCreateMutation(item, false, sizes, colors)
                );

                const mainProductJson = await mainProductRes.json();
                const mainProductErrs = mainProductJson.data?.productCreate?.userErrors || [];
                
                if (mainProductErrs.length) {
                  log('error', "Main product creation errors", mainProductErrs);
                  results.errors.push(`Main product creation failed for ${styleCode}: ${mainProductErrs[0].message}`);
                  continue;
                }

                mainProduct = mainProductJson.data?.productCreate?.product;
                mainProductId = mainProduct?.id;
                
                if (!mainProductId) {
                  log('error', "No main product ID returned");
                  results.errors.push(`No main product ID returned for ${styleCode}`);
                  continue;
                }

                results.productsCreated++;
                log('info', `✅ Created main product: ${mainProduct.title} (${mainProductId}) with tag: Stanley/Stella Importer`);
                
                createdProducts.push({
                  product: mainProduct,
                  productId: mainProductId,
                  variants: variants,
                  isFirst: true
                });
              }
              
              // Log the options that were created
              const productOptions = mainProduct.options || [];
              log('info', `🔧 Product created with ${productOptions.length} options:`, productOptions.map(opt => `${opt.name}: [${opt.values.join(', ')}]`));
              
              // Track category assignment
              const categoryId = getProductCategoryId(getField(item, 'Type') || "Suggested", item);
              if (categoryId) {
                results.categoriesAssigned++;
                log('info', `📂 Category assigned to ${styleName}: ${categoryId}`);
              }

              await sleep(delay);
            }

            // Create or update variants for both new and existing products
            if (!isExistingProduct) {
              // Create new variants for new products
              // Handle variant creation for both split and non-split products
              if (shouldSplitBySize && createdProducts.length > 0) {
                // Create variants for each size-specific product
                for (const productInfo of createdProducts) {
                  const { product, productId, size, variants: sizeVariants } = productInfo;
                  
                  // For split products, we need to create variants for ALL colors but only for this specific size
                  // Get all colors from the original variants (not just the size-specific ones)
                  const allColors = [...new Set(variants.map(variant => {
                    const colorName = getField(variant, 'ColorName') || getField(variant, 'Color') || getField(variant, 'Colour') || 'Unknown';
                    const colorCode = getField(variant, 'ColorCode') || getField(variant, 'ColourCode') || '';
                    return colorName && colorCode ? `${colorName} - ${colorCode}` : (colorName || colorCode || "Default");
                  }))];
                  
                  // Filter variants to only include those that match this size
                  const sizeSpecificVariants = variants.filter(variant => {
                    const variantSize = getField(variant, 'Size') || getField(variant, 'SizeCode') || getField(variant, 'SizeCodeNavision') || 'Default';
                    return variantSize === size;
                  });
                  
                  log('info', `🔧 Building variants for size ${size}: ${sizeSpecificVariants.length} size-specific variants, ${allColors.length} colors`);
                  log('info', `🔧 Colors for ${size}: ${allColors.join(', ')}`);
                  
                  // Build variants using ALL variants (not just size-specific) but only for this size, to ensure all colors are created
                  const variantInputs = buildVariants(variants, [size], allColors, styleCode, true);
                  
                  log('info', `🔧 Creating ${variantInputs.length} variants for size product: ${product.title}`);
                  
                  if (variantInputs.length > 0) {
                    try {
                      const variantRes = await admin.graphql(
                        `mutation ($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                          productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: REMOVE_STANDALONE_VARIANT) {
                            productVariants { 
                              id 
                              title 
                              sku 
                            }
                            userErrors { 
                              field 
                              message 
                            }
                          }
                        }`,
                        { 
                          variables: { 
                            productId: productId, 
                            variants: variantInputs 
                          } 
                        }
                      );

                      const variantJson = await variantRes.json();
                      const variantErrs = variantJson.data?.productVariantsBulkCreate?.userErrors || [];
                      
                      if (variantErrs.length) {
                        const nonDup = variantErrs.filter(
                          (e) => !/already exists/i.test(e.message)
                        );
                        if (nonDup.length) {
                          log('error', `Variant creation errors for ${size}`, nonDup);
                          results.errors.push(`Variant creation failed for ${styleCode} - ${size}: ${nonDup.map(e => e.message).join(", ")}`);
                        } else {
                          log('info', `✅ Variants created for ${size} with expected duplicate warnings`);
                        }
                      }
                      
                      const createdVariantsData = variantJson.data?.productVariantsBulkCreate?.productVariants || [];
                      if (createdVariantsData.length > 0) {
                        log('info', `✅ Created ${createdVariantsData.length} variants for size product: ${product.title}`);
                        results.variantsCreated += createdVariantsData.length;
                      }
                      
                    } catch (variantError) {
                      log('error', `Error creating variants for size ${size}:`, variantError);
                      results.errors.push(`Error creating variants for ${styleCode} - ${size}: ${variantError.message}`);
                    }
                  }
                }
              } else {
                // Create variants for single product (not split)
                const createdVariants = [];
                const variantInputs = buildVariants(variants, sizes, colors, styleCode, false);
                
                log('info', `🔧 Creating ${variantInputs.length} variants for product: ${styleName}`);
                log('info', `🔧 Variant inputs:`, variantInputs);
                
                if (variantInputs.length === 0) {
                  log('warn', `⚠️ No variants built for product: ${styleName}`);
                  log('warn', `⚠️ Sizes: ${sizes.join(', ')}`);
                  log('warn', `⚠️ Colors: ${colors.join(', ')}`);
                  log('warn', `⚠️ Variants data:`, variants);
                }
                
                // Use bulk variant creation like the working upload file
                if (variantInputs.length > 0) {
                  try {
                    log('info', `🔧 Creating ${variantInputs.length} variants using bulk create for product: ${styleName}`);
                    
                    const variantRes = await admin.graphql(
                      `mutation ($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                        productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: REMOVE_STANDALONE_VARIANT) {
                          productVariants { 
                            id 
                            title 
                            sku 
                          }
                          userErrors { 
                            field 
                            message 
                          }
                        }
                      }`,
                      { 
                        variables: { 
                          productId: mainProductId, 
                          variants: variantInputs 
                        } 
                      }
                    );

                    const variantJson = await variantRes.json();
                    const variantErrs = variantJson.data?.productVariantsBulkCreate?.userErrors || [];
                    
                    if (variantErrs.length) {
                      // Filter out duplicate errors (which are expected)
                      const nonDup = variantErrs.filter(
                        (e) => !/already exists/i.test(e.message)
                      );
                      if (nonDup.length) {
                        log('error', "Variant creation errors", nonDup);
                        results.errors.push(`Variant creation failed for ${styleCode}: ${nonDup.map(e => e.message).join(", ")}`);
                      } else {
                        log('info', `✅ Variants created with expected duplicate warnings`);
                      }
                    }
                    
                    const createdVariantsData = variantJson.data?.productVariantsBulkCreate?.productVariants || [];
                    if (createdVariantsData.length > 0) {
                      createdVariants.push(...createdVariantsData);
                      log('info', `✅ Created ${createdVariantsData.length} variants for main product`);
                      results.variantsCreated += createdVariantsData.length;
                    }
                    
                  } catch (variantError) {
                    log('error', "Error creating variants:", variantError);
                    results.errors.push(`Error creating variants for ${styleCode}: ${variantError.message}`);
                  }
                }
              }
            } else {
              // Update existing variants for existing products
              log('info', `🔄 Updating existing variants for product: ${mainProduct.title}`);
              
              try {
                // Get existing variants
                const existingVariantsRes = await admin.graphql(
                  `query ($productId: ID!) {
                    product(id: $productId) {
                      variants(first: 250) {
                        edges {
                          node {
                            id
                            title
                            sku
                            selectedOptions {
                              name
                              value
                            }
                          }
                        }
                      }
                    }
                  }`,
                  { variables: { productId: mainProductId } }
                );
                
                const existingVariantsJson = await existingVariantsRes.json();
                const existingVariants = existingVariantsJson.data?.product?.variants?.edges?.map(edge => edge.node) || [];
                
                log('info', `🔍 Found ${existingVariants.length} existing variants to update`);
                
                // Update each existing variant with latest data
                for (const existingVariant of existingVariants) {
                  try {
                    // Find matching API variant data
                    const matchingApiVariant = variants.find(apiVariant => {
                      const apiSku = getField(apiVariant, 'B2BSKUREF') || getField(apiVariant, 'SKU') || '';
                      const apiSize = getField(apiVariant, 'Size') || getField(apiVariant, 'SizeCode') || '';
                      const apiColor = getField(apiVariant, 'Color') || getField(apiVariant, 'ColorName') || '';
                      
                      // Match by SKU first, then by size/color combination
                      if (apiSku && existingVariant.sku && existingVariant.sku.includes(apiSku)) {
                        return true;
                      }
                      
                      // Match by size/color combination
                      const variantSize = existingVariant.selectedOptions.find(opt => opt.name === 'Size')?.value || '';
                      const variantColor = existingVariant.selectedOptions.find(opt => opt.name === 'Color')?.value || '';
                      
                      return variantSize === apiSize && variantColor.includes(apiColor);
                    });
                    
                    if (matchingApiVariant) {
                      log('info', `🔄 Updating variant: ${existingVariant.title} (${existingVariant.sku})`);
                      
                      // Update variant with latest data
                      const updateVariantInput = {
                        id: existingVariant.id,
                        sku: getField(matchingApiVariant, 'B2BSKUREF') || getField(matchingApiVariant, 'SKU') || existingVariant.sku,
                        weight: parseFloat(getField(matchingApiVariant, 'WeightPerUnit') || '0') || 0,
                        weightUnit: 'KILOGRAMS'
                      };
                      
                      const updateVariantRes = await admin.graphql(
                        `mutation ($variants: [ProductVariantsBulkInput!]!) {
                          productVariantsBulkUpdate(variants: $variants) {
                            productVariants {
                              id
                              title
                              sku
                              weight
                            }
                            userErrors {
                              field
                              message
                            }
                          }
                        }`,
                        { variables: { variants: [updateVariantInput] } }
                      );
                      
                      const updateVariantJson = await updateVariantRes.json();
                      const updateVariantErrors = updateVariantJson.data?.productVariantsBulkUpdate?.userErrors || [];
                      
                      if (updateVariantErrors.length > 0) {
                        log('warn', `⚠️ Error updating variant ${existingVariant.sku}:`, updateVariantErrors);
                      } else {
                        log('info', `✅ Updated variant: ${existingVariant.sku}`);
                        results.variantsUpdated++;
                      }
                    } else {
                      log('info', `⏭️ No matching API data found for variant: ${existingVariant.sku}`);
                    }
                  } catch (variantUpdateError) {
                    log('error', `❌ Error updating variant ${existingVariant.sku}:`, variantUpdateError);
                  }
                }
                
                log('info', `✅ Updated ${results.variantsUpdated || 0} existing variants`);
                
              } catch (existingVariantsError) {
                log('error', `❌ Error updating existing variants:`, existingVariantsError);
                results.errors.push(`Error updating existing variants: ${existingVariantsError.message}`);
              }
            }

            // ========== METAFIELD CREATION SECTION - PROCESS AND CREATE METAFIELDS ==========
            // Now that we have products created (or identified existing ones), process and create the metafields
            
            log('info', '🔧 PHASE 3: Processing and creating metafields for products...');
            
            try {
              // Import metafield functions for processing and creation
              const {
                processItemMetafields,
                createProductGroupingMetafields,
                createMetafields,
                ensureProductGroupingMetaobject,
                processVariantMetafields,
                ensureProductGroupingMetafieldDefinitionsAfterProducts
              } = await import("../utils/metafields.server.js");
              
              // 🚨 STEP 1: Process regular product and variant metafields FIRST (before product grouping)
              log('info', '🚨 STEP 1: Processing regular product and variant metafields...');
              
              // Determine if this is a split product based on variant count
              const isSplitProduct = variants.length > 100;
              log('info', `🚨 SPLIT PRODUCT CHECK: ${variants.length} variants, isSplitProduct: ${isSplitProduct}`);
              
              // Process regular metafields (without product grouping info for now)
              const metafieldResults = processItemMetafields(item, isSplitProduct, null);
              
              // Assign to the variables declared in the outer scope
              processedProductMetafields = metafieldResults.productMetafields || [];
              processedVariantMetafields = metafieldResults.variantMetafields || [];
              
              log('info', `🚨 STEP 1 COMPLETE: Processed ${processedProductMetafields.length} product metafields and ${processedVariantMetafields.length} variant metafields`);
              
              // Show sample of processed metafields
              if (processedProductMetafields.length > 0) {
                log('info', `🚨 Sample product metafields:`, processedProductMetafields.slice(0, 3).map(mf => `${mf.namespace}.${mf.key} = "${String(mf.value).substring(0, 50)}"`));
              }
              
              if (processedVariantMetafields.length > 0) {
                log('info', `🚨 Sample variant metafields:`, processedVariantMetafields.slice(0, 3).map(mf => `${mf.namespace}.${mf.key} = "${String(mf.value).substring(0, 50)}"`));
              }
              
              log('info', `🔧 Will create ${processedProductMetafields.length} product metafields and ${processedVariantMetafields.length} variant metafields`);
              
              // Product grouping metafield definitions were already created in PHASE 2 before product processing
              
              // Determine which products need metafields
              const productsToAddMetafields = shouldSplitBySize && createdProducts.length > 0 ? 
                createdProducts : [{ productId: mainProductId, product: mainProduct, isFirst: true }];
              
              log('info', `🔧 Creating metafields for ${productsToAddMetafields.length} products`);
              log('info', `🚨 DEBUG: isExistingProduct=${isExistingProduct}, shouldSplitBySize=${shouldSplitBySize}, createdProducts.length=${createdProducts.length}`);
              log('info', `🚨 DEBUG: mainProductId=${mainProductId}, mainProduct?.title=${mainProduct?.title}`);
              log('info', `🚨 DEBUG: productsToAddMetafields=`, productsToAddMetafields.map(p => ({ productId: p.productId, title: p.product?.title })));
              
              for (const productInfo of productsToAddMetafields) {
                const { productId, isFirst } = productInfo;
                
                log('info', `🔧 Processing metafields for product ${productId} (isFirst: ${isFirst})`);
                
                // Create product metafields FIRST (before variant metafields)
                let allProductMetafields = [...processedProductMetafields];
                
                // For split products, add product grouping metafields with the correct size
                if (shouldSplitBySize && productInfo.productGroupingOption1 && productInfo.productGroupingOption1.id && productInfo.size) {
                  log('info', `🔗 Adding product grouping metafields for split product: ${productInfo.size}`);
                  log('info', `🔗 Metaobject ID: ${productInfo.productGroupingOption1.id}`);
                  log('info', `🔗 Size: ${productInfo.size}`);
                  
                  // Create product grouping metafields with the correct metaobject ID and size
                  log('info', `🔗 Creating product grouping metafields with metaobject ID: ${productInfo.productGroupingOption1.id}, size: ${productInfo.size}`);
                  
                  const groupingMetafields = createProductGroupingMetafields(
                    productInfo.productGroupingOption1.id, 
                    productInfo.size
                  );
                  
                  log('info', `🔗 Created ${groupingMetafields.length} product grouping metafields:`, groupingMetafields.map(mf => `${mf.namespace}.${mf.key} = "${mf.value}"`));
                  
                  allProductMetafields.push(...groupingMetafields);
                  log('info', `🔗 Added ${groupingMetafields.length} product grouping metafields for size: ${productInfo.size}`);
                } else if (shouldSplitBySize) {
                  log('warn', `⚠️ Missing product grouping info: shouldSplitBySize=${shouldSplitBySize}, productGroupingOption1=${!!productInfo.productGroupingOption1}, productGroupingOption1.id=${productInfo.productGroupingOption1?.id || 'undefined'}, size=${productInfo.size}`);
                }
                
                if (allProductMetafields.length > 0) {
                  log('info', `🔧 Creating ${allProductMetafields.length} product metafields for product ${productId}`);
                  log('info', `📋 Creating product metafields:`, allProductMetafields.slice(0, 5).map(mf => `${mf.namespace}.${mf.key} = "${String(mf.value).substring(0, 50)}"`));
                  
                  const productResult = await createMetafields(admin, allProductMetafields, productId, 'PRODUCT');
                  totalMetafieldsCreated += productResult.created;
                  log('info', `✅ Created ${productResult.created} product metafields, ${productResult.errors.length} errors`);
                  
                  if (productResult.errors.length > 0) {
                    log('warn', `⚠️ Product metafield errors:`, productResult.errors);
                    results.errors.push(...productResult.errors.map(err => `Product metafield error for ${productId}: ${JSON.stringify(err)}`));
                  }
                } else {
                  log('warn', `⚠️ No product metafields to create for product ${productId}`);
                }
                
                // Create variant metafields for this product's variants
                if (processedVariantMetafields.length > 0) {
                  // Get the product's variants to attach metafields to
                  try {
                    const productVariantsRes = await admin.graphql(
                      `query ($productId: ID!) {
                        product(id: $productId) {
                          variants(first: 250) {
                            edges {
                              node {
                                id
                                title
                                sku
                              }
                            }
                          }
                        }
                      }`,
                      { variables: { productId } }
                    );
                    
                    const productVariantsJson = await productVariantsRes.json();
                    const productVariants = productVariantsJson.data?.product?.variants?.edges?.map(edge => edge.node) || [];
                    
                    log('info', `🔧 Creating variant metafields for ${productVariants.length} variants of product ${productId}`);
                    
                    for (const shopifyVariant of productVariants) {
                      // Find the corresponding API variant data for this Shopify variant
                      let matchingApiVariant = null;
                      
                      // Try to match by SKU pattern (most reliable)
                      if (shopifyVariant.sku) {
                        matchingApiVariant = variants.find(apiVariant => {
                          const expectedSku = `${getField(apiVariant, 'StyleCode') || ''}${getField(apiVariant, 'ColorCode') || ''}${getField(apiVariant, 'SizeCodeNavision') || ''}`;
                          return shopifyVariant.sku === expectedSku;
                        });
                      }
                      
                      // Fallback to first variant if no specific match
                      if (!matchingApiVariant && variants.length > 0) {
                        matchingApiVariant = variants[0];
                        log('info', `⚠️ Using fallback API variant for Shopify variant ${shopifyVariant.sku}`);
                      }
                      
                      if (matchingApiVariant) {
                        log('info', `🔧 Creating variant-specific metafields for variant ${shopifyVariant.id} (${shopifyVariant.sku})`);
                        
                        // Process variant-specific metafields using the matching API variant data
                        const variantSpecificMetafields = processVariantMetafields(matchingApiVariant, variants);
                        
                        if (variantSpecificMetafields.length > 0) {
                          log('info', `🔧 Creating ${variantSpecificMetafields.length} variant-specific metafields for variant ${shopifyVariant.id} (${shopifyVariant.sku})`);
                          log('info', `📋 Creating variant metafields:`, variantSpecificMetafields.slice(0, 3).map(mf => `${mf.namespace}.${mf.key} = "${String(mf.value).substring(0, 50)}"`));
                          
                          const variantResult = await createMetafields(admin, variantSpecificMetafields, shopifyVariant.id, 'PRODUCTVARIANT');
                          totalMetafieldsCreated += variantResult.created;
                          log('info', `✅ Created ${variantResult.created} variant metafields for ${shopifyVariant.sku}, ${variantResult.errors.length} errors`);
                          
                          if (variantResult.errors.length > 0) {
                            log('warn', `⚠️ Variant metafield errors for ${shopifyVariant.sku}:`, variantResult.errors);
                            results.errors.push(...variantResult.errors.map(err => `Variant metafield error for ${shopifyVariant.sku}: ${typeof err === 'object' ? JSON.stringify(err) : err}`));
                          }
                        } else {
                          log('warn', `⚠️ No variant-specific metafields generated for ${shopifyVariant.sku}`);
                        }
                      } else {
                        log('warn', `⚠️ No matching API variant found for Shopify variant ${shopifyVariant.sku}`);
                      }
                    }
                  } catch (variantError) {
                    log('error', `❌ Error processing variants for metafields:`, variantError);
                    results.errors.push(`Error processing variants for metafields: ${variantError.message}`);
                  }
                }
              }
              
              // Update results
              results.metafieldsCreated = totalMetafieldsCreated;
              log('info', `✅ Successfully created ${totalMetafieldsCreated} total metafields`);
              
            } catch (metafieldError) {
              log('error', `❌ Error in metafield creation:`, metafieldError);
              results.errors.push(`Metafield creation error: ${metafieldError.message}`);
            }

            // Add images
            if (item.MainPicture && item.MainPicture.length > 0) {
              log('info', `📸 Found ${item.MainPicture.length} images for product: ${styleName}`);
              
              // Handle images for split products vs single products
              const productsToAttachImages = shouldSplitBySize && createdProducts.length > 0 ? createdProducts : [{ product: mainProduct, productId: mainProductId, isFirst: true }];
              
              for (const picture of item.MainPicture) {
                log('info', `📸 Processing picture:`, picture);
                const imageUrl = getField(picture, 'HTMLPath') || picture.HTMLPath || picture.URL || picture.Url || '';
                log('info', `📸 Extracted image URL: ${imageUrl}`);
                if (!imageUrl) {
                  log('info', `⚠️ No image URL found for picture:`, picture);
                  continue;
                }
                
                // Generate alt text and filename for this product
                const baseAlt = styleName; // Use the style name as alt text
                
                // Get original filename from picture data or generate one
                let originalFilename = '';
                if (picture.FName) {
                  originalFilename = picture.FName;
                } else if (picture.filename) {
                  originalFilename = picture.filename;
                } else {
                  // Fallback: generate filename from style name
                  originalFilename = `${generateImageIdentifier(baseAlt)}.jpg`;
                }
                
                log('info', `📸 Original filename: ${originalFilename}`);
                
                let mediaId = null;
                
                // Check global cache first (fastest)
                if (globalMediaCache.has(baseAlt)) {
                  const cachedMedia = globalMediaCache.get(baseAlt);
                  log('info', `🚀 Found image in global cache for '${baseAlt}': ${cachedMedia.mediaId}`);
                  mediaId = cachedMedia.mediaId;
                } 
                // Check URL cache to prevent duplicate uploads of the same image URL
                else if (urlToMediaCache.has(imageUrl)) {
                  const cached = urlToMediaCache.get(imageUrl);
                  log('info', `🚀 Reusing cached image for URL: ${imageUrl}`);
                  mediaId = cached.mediaId;
                } else {
                  // Check if a file with this identifier already exists to avoid duplicates across runs
                  let existingNode = null;
                  
                  try {
                    // Enhanced search with more comprehensive queries
                    const searchQueries = [
                      `filename:"${originalFilename}"`, // Exact filename match (most reliable)
                      `alt:"${baseAlt}"`, // Exact alt text match
                      `alt:"${originalFilename}"`, // Alt text with filename
                      `"${baseAlt}"`, // Simple text search for alt
                      `"${originalFilename}"` // Simple filename search
                    ];
                    
                    // Try multiple search strategies to find existing media
                    for (const searchQ of searchQueries) {
                      log('info', `🔍 Searching for existing media with query: ${truncateForLog(searchQ)}`);
                      
                      const searchRes = await admin.graphql(
                        `query ($q: String!) { files(first: 50, query: $q) { edges { node { id alt ... on MediaImage { image { url } } } } } }`,
                        { variables: { q: searchQ } }
                      );
                      
                      const searchJson = await searchRes.json();
                      const edges = searchJson?.data?.files?.edges || [];
                      log('info', `🔍 Search query '${truncateForLog(searchQ)}' returned ${edges.length} results`);
                      
                      if (edges.length > 0) {
                        // Look for exact matches first (by alt text or filename pattern)
                        for (const edge of edges) {
                          const node = edge.node;
                          const nodeAlt = node.alt || '';
                          const nodeUrl = node.image?.url || '';
                          
                          // Prefer files without UUID suffixes (original files)
                          const hasUUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(nodeUrl);
                          
                          // Check for exact matches
                          if (nodeAlt === baseAlt || nodeAlt === originalFilename) {
                            if (!hasUUID || !existingNode) {
                              existingNode = node;
                              log('info', `✅ Found exact alt match: ${existingNode.id} (alt: '${nodeAlt}') ${hasUUID ? '[has UUID]' : '[original]'}`);
                              if (!hasUUID) break; // Prefer original filename
                            }
                          }
                          
                          // Check if the filename pattern matches (for images uploaded with custom filenames)
                          if (nodeAlt.includes(originalFilename) || nodeAlt.includes(baseAlt.replace(/\s+/g, '_'))) {
                            if (!hasUUID || !existingNode) {
                              existingNode = node;
                              log('info', `✅ Found pattern match: ${existingNode.id} (alt: '${nodeAlt}') ${hasUUID ? '[has UUID]' : '[original]'}`);
                              if (!hasUUID) break; // Prefer original filename
                            }
                          }
                        }
                        
                        // If no exact match, use the first result as fallback (prefer non-UUID)
                        if (!existingNode && searchQ.includes('filename:')) {
                          // Find the first file without UUID, or fallback to first file
                          for (const edge of edges) {
                            const node = edge.node;
                            const nodeUrl = node.image?.url || '';
                            const hasUUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(nodeUrl);
                            
                            if (!hasUUID) {
                              existingNode = node;
                              log('info', `✅ Using first non-UUID filename search result: ${existingNode.id} (alt: '${existingNode.alt || 'no alt'}')`);
                              break;
                            }
                          }
                          
                          // If all have UUIDs, use the first one
                          if (!existingNode) {
                            existingNode = edges[0].node;
                            log('info', `✅ Using first filename search result: ${existingNode.id} (alt: '${existingNode.alt || 'no alt'}')`);
                          }
                        }
                        
                        if (existingNode) break;
                      }
                    }
                  } catch (searchErr) {
                    log('error', "Media search failed", searchErr);
                    existingNode = null; // Reset so we upload new image
                  }

                  if (existingNode) {
                    // Re-use existing file and add to global cache
                    log('info', `♻️ Found existing media for '${baseAlt}', re-using (id: ${existingNode.id})`);
                    mediaId = existingNode.id;
                    
                    // Add to global cache for future use
                    globalMediaCache.set(baseAlt, {
                      mediaId: existingNode.id,
                      imageUrl: existingNode.image?.url || imageUrl,
                      altText: existingNode.alt || baseAlt
                    });
                    
                    // Also add to URL cache to prevent future duplicate uploads
                    urlToMediaCache.set(imageUrl, {
                      mediaId: existingNode.id,
                      imageUrl: existingNode.image?.url || imageUrl,
                      altText: existingNode.alt || baseAlt,
                      filename: existingNode.alt || originalFilename
                    });
                    
                    log('info', `🔗 Added existing file to URL cache: ${truncateForLog(imageUrl)} -> ${existingNode.id}`);
                    log('info', `✅ Successfully found existing media: ${existingNode.id} (added to cache)`);
                  }
                  
                  if (!existingNode) {
                    // Upload fresh image (first time we see this style or reuse failed) with custom filename
                    log('info', `📤 Uploading new image for StyleName: '${baseAlt}'`);
                    
                    try {
                      // First create the file with custom filename
                      const fileRes = await admin.graphql(
                        `mutation fileCreate($files: [FileCreateInput!]!) {
                           fileCreate(files: $files) {
                             files { id alt ... on MediaImage { image { url } } }
                             userErrors { field message }
                           }
                         }`,
                        {
                          variables: {
                            files: [
                              {
                                originalSource: imageUrl,
                                alt: baseAlt, // Use StyleName as alt text
                                filename: originalFilename, // Use original filename
                                contentType: "IMAGE",
                              },
                            ],
                          },
                        }
                      );
                      const fileJson = await fileRes.json();
                      const fileErrs = fileJson.data?.fileCreate?.userErrors || [];
                      if (fileErrs.length) {
                        log('error', "File create errors", fileErrs);
                        results.errors.push(`Image creation failed for ${styleCode}: ${fileErrs[0].message}`);
                      } else {
                        const createdFile = fileJson.data?.fileCreate?.files?.[0];
                        if (createdFile) {
                          log('info', `Image uploaded for URL: ${imageUrl} with alt text: "${baseAlt}"`);
                          mediaId = createdFile.id;
                          
                          // Add to global cache
                          globalMediaCache.set(baseAlt, {
                            mediaId: createdFile.id,
                            imageUrl: createdFile.image?.url || imageUrl,
                            altText: createdFile.alt || baseAlt
                          });
                          
                          // Add to URL cache to prevent duplicate uploads of the same image URL
                          urlToMediaCache.set(imageUrl, {
                            mediaId: createdFile.id,
                            imageUrl: createdFile.image?.url || imageUrl,
                            altText: createdFile.alt || baseAlt,
                            filename: originalFilename
                          });
                          
                          log('info', `🔗 Added to URL cache: ${truncateForLog(imageUrl)} -> ${createdFile.id}`);
                          log('info', `✅ Successfully uploaded new image with filename '${originalFilename}': ${createdFile.id} (added to cache)`);
                        }
                      }
                    } catch (uploadErr) {
                      log('error', "Image upload failed", uploadErr);
                      results.errors.push(`Image upload failed for ${styleCode}: ${uploadErr.message}`);
                    }
                  }
                }
                
                // Attach the image to all products (first product gets uploaded image, others reuse it)
                if (mediaId) {
                  for (const productInfo of productsToAttachImages) {
                    const { productId, isFirst } = productInfo;
                    log('info', `📎 Attaching image ${mediaId} to product ${productId} (isFirst: ${isFirst})`);
                    
                    const attachSuccess = await attachMediaWithRetry(admin, mediaId, productId);
                    if (attachSuccess) {
                      results.imagesUploaded++;
                      log('info', `✅ Successfully attached image to product: ${productId}`);
                    } else {
                      log('error', `❌ Failed to attach image to product: ${productId}`);
                      results.errors.push(`Failed to attach image to product: ${productId}`);
                    }
                    
                    await sleep(100); // Small delay between attachments
                  }
                }
              }
            } else {
              log('info', `⚠️ No images found for product: ${styleName}. MainPicture:`, item.MainPicture);
            }

            log('info', 'All steps completed successfully!');
            
            // ENHANCED ERROR LOGGING: Log any errors that might have been caught silently
            log('info', '🔍 FINAL DEBUG: Checking for any silent errors...');
            log('info', `🔍 FINAL DEBUG: Total metafields created: ${totalMetafieldsCreated}`);
            log('info', `🔍 FINAL DEBUG: Should have created product metafields: ${processedProductMetafields ? processedProductMetafields.length : 'undefined'}`);
            log('info', `🔍 FINAL DEBUG: Should have created variant metafields: ${processedVariantMetafields ? processedVariantMetafields.length : 'undefined'}`);
            log('info', `🔍 FINAL DEBUG: Products to add metafields: ${createdProducts ? createdProducts.length : 'undefined'}`);
            
            // Check if we have any unhandled errors in the results
            if (results.errors && results.errors.length > 0) {
              log('error', '🔍 FINAL DEBUG: Found errors in results:', results.errors);
            }
            
            // Check if metafield processing was skipped
            if (totalMetafieldsCreated === 0) {
              log('error', '🔍 FINAL DEBUG: CRITICAL - No metafields were created at all!');
              log('error', '🔍 FINAL DEBUG: This indicates metafield processing was skipped or failed silently');
            }
            
          } catch (error) {
            log('error', 'Error processing item:', error);
            log('error', 'Error processing item - FULL ERROR DETAILS:', {
              message: error.message,
              stack: error.stack,
              name: error.name,
              cause: error.cause
            });
            results.errors.push(`Error processing ${styleCode}: ${error.message}`);
          }
        }
      }

      results.processedStyles.push(styleCode);
      
    } catch (error) {
      log('error', 'Error processing style code:', error);
      results.errors.push(`Error processing style code ${styleCode}: ${error.message}`);
    }
  }

  // FINAL ERROR LOGGING: Show all errors that occurred during import
  log('info', '🔍 FINAL IMPORT SUMMARY:');
  log('info', `🔍 Total products processed: ${results.processedStyles.length}`);
  log('info', `🔍 Products created: ${results.productsCreated}`);
  log('info', `🔍 Products updated: ${results.productsUpdated}`);
  log('info', `🔍 Products skipped: ${results.productsSkipped}`);
  log('info', `🔍 Variants created: ${results.variantsCreated}`);
  log('info', `🔍 Variants updated: ${results.variantsUpdated}`);
  log('info', `🔍 Images uploaded: ${results.imagesUploaded}`);
  log('info', `🔍 Metafields created: ${results.metafieldsCreated}`);
  log('info', `🔍 Total errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    log('error', '🔍 FINAL ERROR LIST:');
    results.errors.forEach((error, index) => {
      log('error', `🔍 ERROR ${index + 1}: ${error}`);
    });
  }
  
  // Check for critical issues
  if (results.metafieldsCreated === 0 && results.productsCreated > 0) {
    log('error', '🔍 CRITICAL ISSUE: Products were created but NO metafields were created!');
    log('error', '🔍 This indicates the metafield processing system is not working correctly');
  }

  // 🔧 FINAL STEP: Fix Product Grouping references automatically
  // Run this if products were created/updated OR if metafields were created (for existing products)
  if (results.productsCreated > 0 || results.productsUpdated > 0 || results.metafieldsCreated > 0) {
    log('info', '🔧 FINAL STEP: Fixing Product Grouping references...');
    try {
      const { fixProductGroupingReferences } = await import("../utils/metafields.server.js");
      
      const fixResults = await fixProductGroupingReferences(admin);
      
      log('info', `🔧 Product Grouping fix complete: ${fixResults.fixed}/${fixResults.totalChecked} metaobjects fixed`);
      
      // Add fix results to the main results
      results.productGroupingFixed = fixResults.fixed;
      results.productGroupingChecked = fixResults.totalChecked;
      
      if (fixResults.errors && fixResults.errors.length > 0) {
        log('warn', '⚠️ Product Grouping fix errors:', fixResults.errors);
        results.errors.push(...fixResults.errors.map(err => `Product Grouping fix: ${err}`));
      }
      
      if (fixResults.fixed > 0) {
        log('info', `✅ Successfully fixed ${fixResults.fixed} Product Grouping metaobjects`);
      } else {
        log('info', '✅ No Product Grouping metaobjects needed fixing');
      }
      
    } catch (fixError) {
      log('error', '❌ Error in Product Grouping fix:', fixError);
      results.errors.push(`Product Grouping fix error: ${fixError.message}`);
    }
  } else {
    log('info', '⏭️ Skipping Product Grouping fix - no products were created/updated and no metafields were created');
  }

  try {
    return json(results);
  } catch (error) {
    log('error', '🔍 FINAL JSON ERROR:', error);
    return json({ error: "Error processing import: " + error.message }, { status: 500 });
  }
}

// Handle clearing the product cache
async function handleClearCache(request, formData) {
  const { admin, session } = await authenticate.admin(request);
  
  try {
    await clearProductCache(session.shop);
    log('info', `🗑️ Cleared product cache for shop ${session.shop}`);
    
    return json({
      success: true,
      message: "Cache cleared successfully"
    });
  } catch (error) {
    log('error', '❌ Error clearing cache:', error);
    return json({ error: "Failed to clear cache: " + error.message }, { status: 500 });
  }
}

// Handle getting cache information
async function handleGetCacheInfo(request, formData) {
  const { admin, session } = await authenticate.admin(request);
  
  try {
    const cacheInfo = await getCacheInfo(session.shop);
    
    return json({
      success: true,
      cacheInfo
    });
  } catch (error) {
    log('error', '❌ Error getting cache info:', error);
    return json({ error: "Failed to get cache info: " + error.message }, { status: 500 });
  }
}

// Handle checking setup status
async function handleCheckSetupStatus(request, formData) {
  const { admin, session } = await authenticate.admin(request);
  
  try {
    log('info', '🔍 Checking setup status...');
    
    // Check for Product Grouping metaobject definition
    const metaobjectDefRes = await admin.graphql(`
      query {
        metaobjectDefinitions(first: 50) {
          edges {
            node {
              id
              type
              name
            }
          }
        }
      }
    `);
    
    const metaobjectDefJson = await metaobjectDefRes.json();
    const metaobjectDefs = metaobjectDefJson.data?.metaobjectDefinitions?.edges || [];
    const hasProductGroupingMetaobject = metaobjectDefs.some(edge => 
      edge.node.type === "product_grouping_option_1_entries"
    );
    
    // Check for Product Grouping metafield definitions
    const metafieldDefRes = await admin.graphql(`
      query {
        metafieldDefinitions(first: 50, namespace: "stanley_stella", ownerType: PRODUCT) {
          edges {
            node {
              id
              key
              type {
                name
              }
            }
          }
        }
      }
    `);
    
    const metafieldDefJson = await metafieldDefRes.json();
    const metafieldDefs = metafieldDefJson.data?.metafieldDefinitions?.edges || [];
    const hasProductGroupingMetafield = metafieldDefs.some(edge => 
      edge.node.key === "product_grouping_option_1" && edge.node.type.name === "metaobject_reference"
    );
    const hasProductGroupingValueMetafield = metafieldDefs.some(edge => 
      edge.node.key === "product_grouping_option_1_value"
    );
    
    const setupComplete = hasProductGroupingMetaobject && hasProductGroupingMetafield && hasProductGroupingValueMetafield;
    
    log('info', `🔍 Setup check results:`);
    log('info', `  - Product Grouping metaobject: ${hasProductGroupingMetaobject}`);
    log('info', `  - Product Grouping metafield: ${hasProductGroupingMetafield}`);
    log('info', `  - Product Grouping value metafield: ${hasProductGroupingValueMetafield}`);
    log('info', `  - Setup complete: ${setupComplete}`);
    
    return json({
      success: true,
      setupComplete,
      details: {
        hasProductGroupingMetaobject,
        hasProductGroupingMetafield,
        hasProductGroupingValueMetafield
      }
    });
  } catch (error) {
    log('error', '❌ Error checking setup status:', error);
    return json({ error: "Failed to check setup status: " + error.message }, { status: 500 });
  }
}

// Handle fixing Product Grouping references manually
async function handleFixProductGrouping(request, formData) {
  const { admin, session } = await authenticate.admin(request);
  
  try {
    log('info', '🔧 Manually fixing Product Grouping references...');
    
    const { fixProductGroupingReferences } = await import("../utils/metafields.server.js");
    
    const fixResults = await fixProductGroupingReferences(admin);
    
    log('info', `🔧 Manual Product Grouping fix complete: ${fixResults.fixed}/${fixResults.totalChecked} metaobjects fixed`);
    
    return json({
      success: true,
      message: `Product Grouping fix complete: ${fixResults.fixed}/${fixResults.totalChecked} metaobjects fixed`,
      fixed: fixResults.fixed,
      totalChecked: fixResults.totalChecked,
      errors: fixResults.errors || []
    });
  } catch (error) {
    log('error', '❌ Error in manual Product Grouping fix:', error);
    return json({ error: "Failed to fix Product Grouping references: " + error.message }, { status: 500 });
  }
}

// Debug function to inspect field processing
async function handleDebugFields(request, formData) {
  const { admin, session } = await authenticate.admin(request);
  const credentials = await getCredentialsWithFallback(session.shop);
  
  if (!credentials) {
    return json({ error: "Stanley/Stella credentials not found. Please set them up first." }, { status: 400 });
  }

  try {
    const styleCode = formData.get("styleCode") || "STSU177"; // Default to a known style
    log('info', `🔍 Debugging fields for style: ${styleCode}`);
    
    // Use the EXACT same approach as the working import process
    const possibleDbNames = [
      "production_api",
      "test", 
      "demo"
    ];
    
    log('info', '🔍 Testing different database names for debug:', possibleDbNames);
    
    let successfulData = null;
    let usedDbName = null;
    
    for (const dbName of possibleDbNames) {
      try {
        // 🚨 CRITICAL FIX: Use the EXACT same request format as the working import process
        // DO NOT include StyleCode parameter - fetch all products then filter
        const requestData = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            db_name: dbName,
            user: credentials.user,
            password: credentials.password,
            LanguageCode: "en_US" // Use exact same language code as working import
          },
          id: 0
        };

        const apiUrl = `https://${process.env.STST_HOSTNAME}/webrequest/productsV2/get_json`;
        log('info', `🌐 Making debug request to: ${apiUrl} with db: ${dbName}`);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          log('warn', `❌ ${dbName} - HTTP ${response.status}: ${response.statusText}`);
          continue;
        }

        const data = await response.text();
        const responseData = JSON.parse(data);
        
        if (!responseData.result) {
          log('warn', `❌ ${dbName} - No result field in API response`);
          continue;
        }

        // 🚨 CRITICAL FIX: Do double JSON parsing like the working import process
        // The API returns JSON-encoded string inside the result field
        const apiResult = JSON.parse(responseData.result);

        if (!Array.isArray(apiResult) || apiResult.length === 0) {
          log('warn', `❌ ${dbName} - Empty or invalid result array`);
          continue;
        }

        // Success! Found data
        successfulData = apiResult;
        usedDbName = dbName;
        log('info', `✅ ${dbName} - Found ${successfulData.length} total products, searching for style ${styleCode}`);
        break;
        
      } catch (error) {
        log('warn', `❌ ${dbName} - Error: ${error.message}`);
        continue;
      }
    }

    if (!successfulData) {
      return json({ error: `No data found in any database. Tried: ${possibleDbNames.join(', ')}` }, { status: 500 });
    }

    // Find the specific product from the full product list
    const product = successfulData.find(item => 
      item.StyleCode === styleCode || 
      item.StyleName === styleCode
    );

    if (!product) {
      // Show available style codes for debugging
      const availableStyles = successfulData.slice(0, 10).map(item => item.StyleCode).filter(Boolean);
      return json({ 
        error: `Product not found: ${styleCode}. Found ${successfulData.length} total products but none matched the style code.`,
        availableStyles: availableStyles,
        suggestion: `Try one of these available styles: ${availableStyles.join(', ')}`
      }, { status: 404 });
    }

    log('info', `🎯 Found matching product: ${product.StyleName} (${product.StyleCode})`);

    // Analyze the product structure using the same function as the import process
    const { debugApiDataStructure } = await import("../utils/metafields.server.js");
    const analysisResults = debugApiDataStructure(product);

    // Return detailed field analysis
    return json({
      success: true,
      styleCode,
      usedDatabase: usedDbName,
      productFound: true,
      productName: product.StyleName,
      productStyleCode: product.StyleCode,
      totalProducts: successfulData.length,
      totalFields: analysisResults.totalFields,
      mappedFields: analysisResults.exactMatches,
      unmappedFields: analysisResults.unmappedFields,
      fieldAnalysis: analysisResults,
      // Show some sample field values for debugging
      sampleFields: {
        StyleCode: product.StyleCode,
        StyleName: product.StyleName,
        Type: product.Type,
        Category: product.Category,
        Fairwear_URL: product.Fairwear_URL,
        VEGAN_URL: product.VEGAN_URL,
        GOTS: product.GOTS,
        StylePublished: product.StylePublished,
        hasVariants: !!(product.Variants && Array.isArray(product.Variants)),
        variantCount: product.Variants ? product.Variants.length : 0,
        // Add more fields that should have real values
        Gender: product.Gender,
        Fit: product.Fit,
        Neckline: product.Neckline,
        Sleeve: product.Sleeve,
        CountryOfOrigin: product.CountryOfOrigin,
        CategoryCode: product.CategoryCode,
        TypeCode: product.TypeCode,
        StyleSegment: product.StyleSegment,
        SequenceStyle: product.SequenceStyle,
        StyleNotice: product.StyleNotice,
        // Debug: Show all available fields
        allFields: Object.keys(product).slice(0, 20), // First 20 field names
        // Show actual field values that exist
        existingFields: Object.entries(product)
          .filter(([key, value]) => value !== null && value !== undefined && value !== '')
          .slice(0, 10) // First 10 non-empty fields
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {})
      }
    });

  } catch (error) {
    log('error', '❌ Error in debug fields:', error);
    return json({ error: `Debug error: ${error.message}` }, { status: 500 });
  }
}

// --------------------------------------------------------------
//  React component – renders the import products page
// --------------------------------------------------------------
export default function ImportProductsPage() {
  const { shop, publishedProducts: initialProducts, totalCount: initialCount, error: loaderError, cached, cachedAt, expiresAt, setupComplete } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const app = useAppBridge();
  const isSubmitting = navigation.state === "submitting";

  // State for fetched products (separate from loader data)
  const [publishedProducts, setPublishedProducts] = useState(initialProducts || []);
  const [totalCount, setTotalCount] = useState(initialCount || 0);
  const [fetchError, setFetchError] = useState(loaderError || null);
  const [isFetching, setIsFetching] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [isCached, setIsCached] = useState(cached || false);
  const [cacheTimestamp, setCacheTimestamp] = useState(cachedAt || null);
  const [cacheExpires, setCacheExpires] = useState(expiresAt || null);
  
  // Setup status state (can override loader data)
  const [currentSetupComplete, setCurrentSetupComplete] = useState(setupComplete);
  const [isCheckingSetup, setIsCheckingSetup] = useState(false);

  // Sync setup status when loader data changes
  useEffect(() => {
    setCurrentSetupComplete(setupComplete);
  }, [setupComplete]);



  // Debug logging
  console.log('🔍 ImportProductsPage render:', {
    shop,
    publishedProductsLength: publishedProducts?.length || 0,
    totalCount,
    fetchError,
    publishedProducts: publishedProducts?.slice(0, 3) // First 3 items for debugging
  });

  // Additional debugging
  console.log('🔍 Component state check:', {
    hasPublishedProducts: !!publishedProducts,
    isArray: Array.isArray(publishedProducts),
    length: publishedProducts?.length,
    firstItem: publishedProducts?.[0],
    fetchError
  });

  const [styleCodes, setStyleCodes] = useState("");
  const [languageCode, setLanguageCode] = useState("EN");
  const [delay, setDelay] = useState("500");
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [showPublishedProducts, setShowPublishedProducts] = useState(
    // Auto-show products if we have cached data or initial products
    (initialProducts && initialProducts.length > 0) || false
  );

  
  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [importStartTime, setImportStartTime] = useState(null);
  const progressTimerRef = useRef(null);

  // Lazy Image Component
  const LazyImage = ({ src, alt, style, onError }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        {
          rootMargin: '50px', // Start loading 50px before the image comes into view
          threshold: 0.1
        }
      );

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }

      return () => {
        if (imgRef.current) {
          observer.unobserve(imgRef.current);
        }
      };
    }, []);

    const handleLoad = () => {
      setIsLoaded(true);
    };

    const handleError = (e) => {
      if (onError) {
        onError(e);
      }
    };

    return (
      <div ref={imgRef} style={style}>
        {isInView && (
          <img 
            src={src}
            alt={alt}
            style={{ 
              ...style,
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }}
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
        {!isLoaded && isInView && (
          <div 
            style={{ 
              ...style,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f6f6f7',
              color: '#6d7175',
              fontSize: '12px'
            }}
          >
            Loading...
          </div>
        )}
      </div>
    );
  };

  // Handle fetching products when Show Published Products is clicked
  const handleFetchProducts = useCallback((forceRefresh = false) => {
    if (publishedProducts.length > 0 && !isFetching && !forceRefresh) {
      // If we already have products, just toggle the display
      setShowPublishedProducts(!showPublishedProducts);
    } else {
      // Fetch products if we don't have them yet or force refresh
      setIsFetching(true);
      setFetchError(null);
      
      const formData = new FormData();
      formData.append("actionType", "fetchProducts");
      if (forceRefresh) {
        formData.append("forceRefresh", "true");
      }
      
      submit(formData, { method: "post" });
    }
  }, [publishedProducts.length, isFetching, showPublishedProducts, submit]);

  // Handle clearing cache
  const handleClearCache = useCallback(() => {
    const formData = new FormData();
    formData.append("actionType", "clearCache");
    submit(formData, { method: "post" });
  }, [submit]);

  // Handle force refresh (clear cache and fetch fresh data)
  const handleForceRefresh = useCallback(() => {
    handleFetchProducts(true);
  }, [handleFetchProducts]);

  // Handle product import
  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    setImportResults(null); // Clear previous results
    setIsImporting(true);
    setImportStartTime(Date.now());
    
    // Start the progress modal timer (30 seconds)
    progressTimerRef.current = setTimeout(() => {
      setShowProgressModal(true);
    }, 30000); // 30 seconds
    
    const formData = new FormData();
    formData.append("actionType", "importProducts");
    formData.append("styleCodes", styleCodes);
    formData.append("languageCode", languageCode);
    formData.append("delay", delay);
    submit(formData, { method: "post" });
  }, [styleCodes, languageCode, delay, submit]);

  // Handle debug fields
  const handleDebugFields = useCallback(() => {
    const formData = new FormData();
    formData.append("actionType", "debugFields");
    formData.append("styleCode", styleCodes || "STSU177");
    submit(formData, { method: "post" });
  }, [styleCodes, submit]);

  // Handle refreshing setup status
  const handleRefreshSetupStatus = useCallback(() => {
    setIsCheckingSetup(true);
    const formData = new FormData();
    formData.append("actionType", "checkSetupStatus");
    submit(formData, { method: "post" });
  }, [submit]);

  // Handle fixing Product Grouping references manually
  const handleFixProductGrouping = useCallback(() => {
    const formData = new FormData();
    formData.append("actionType", "fixProductGrouping");
    submit(formData, { method: "post" });
  }, [submit]);

  // Auto-refresh setup status when page becomes visible (user returning from Metaobjects page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentSetupComplete === false && !isCheckingSetup) {
        // Small delay to ensure page is fully loaded
        setTimeout(() => {
          handleRefreshSetupStatus();
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentSetupComplete, isCheckingSetup, handleRefreshSetupStatus]);

  // Update products when action data changes (from fetch products)
  useEffect(() => {
    if (actionData && actionData.success !== undefined) {
      setIsFetching(false);
      setIsCheckingSetup(false);
      
      if (actionData.success) {
        if (actionData.publishedProducts) {
          setPublishedProducts(actionData.publishedProducts || []);
          setTotalCount(actionData.totalCount || 0);
          setFetchError(null);
          setIsCached(actionData.cached || false);
          setCacheTimestamp(actionData.cachedAt || null);
          setCacheExpires(actionData.expiresAt || null);
          // Automatically show the products list when products are fetched
          setShowPublishedProducts(true);
        }
        
        // Handle setup status check response
        if (actionData.setupComplete !== undefined) {
          setCurrentSetupComplete(actionData.setupComplete);
          console.log('🔍 Setup status updated:', actionData.setupComplete);
        }
        
        // Handle Product Grouping fix response
        if (actionData.message && actionData.message.includes('Product Grouping fix complete')) {
          console.log('🔧 Product Grouping fix completed:', actionData.message);
          // You could show a success message here if needed
        }
        
        // Handle cache clear success
        if (actionData.message === "Cache cleared successfully") {
          setIsCached(false);
          setCacheTimestamp(null);
          setCacheExpires(null);
          setPublishedProducts([]);
          setTotalCount(0);
          setShowPublishedProducts(false);
        }
      } else {
        setFetchError(actionData.error || 'Failed to fetch products');
      }
    }
    
    // Handle import results (but not manual Product Grouping fix results)
    if (actionData && (actionData.productsCreated !== undefined || actionData.productsUpdated !== undefined) && !actionData.results) {
      setImportResults(actionData);
      
      // If this is an import completion, reset import state
      setIsImporting(false);
      
      // Clear the progress modal timer
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      
      // Reset import timing
      setImportStartTime(null);
    }
  }, [actionData]);



  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
    };
  }, []);

  const handleProductSelection = useCallback((styleCode, checked) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(styleCode);
      } else {
        newSet.delete(styleCode);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const filteredProducts = publishedProducts.filter(product =>
      product.styleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.styleCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSelectedProducts(new Set(filteredProducts.map(p => p.styleCode)));
  }, [publishedProducts, searchTerm]);

  const handleDeselectAll = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  const handleImportSelected = useCallback(() => {
    const selectedStyleCodes = Array.from(selectedProducts).join(', ');
    setStyleCodes(selectedStyleCodes);
    setImportResults(null); // Clear previous results
    setIsImporting(true);
    setImportStartTime(Date.now());
    
    // Start the progress modal timer (30 seconds)
    progressTimerRef.current = setTimeout(() => {
      setShowProgressModal(true);
    }, 30000); // 30 seconds
    
    // Start the import process immediately
    const formData = new FormData();
    formData.append("actionType", "importProducts");
    formData.append("styleCodes", selectedStyleCodes);
    formData.append("languageCode", languageCode);
    formData.append("delay", delay);
    submit(formData, { method: "post" });
  }, [selectedProducts, languageCode, delay, submit]);

  const filteredProducts = publishedProducts.filter(product =>
    product.styleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.styleCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const languageOptions = [
    { label: "English", value: "EN" },
    { label: "Finnish", value: "FI" },
    { label: "Swedish", value: "SV" },
    { label: "German", value: "DE" },
    { label: "French", value: "FR" },
    { label: "Spanish", value: "ES" },
    { label: "Italian", value: "IT" },
    { label: "Dutch", value: "NL" },
    { label: "Danish", value: "DA" },
    { label: "Norwegian", value: "NO" }
  ];

  return (
    <Page>
      <TitleBar title="Import Products" />
      <Layout>
        {/* Published Products Section */}
        <Layout.Section>
          <Card>
            <div style={{ border: '2px solid #000000', borderRadius: '8px', padding: '16px' }}>
            <BlockStack gap="500">
              {/* Setup Reminder Banner - Only show if setup is not complete */}
              {currentSetupComplete === false && (
                <Banner status="info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0 }}>
                      <strong>💡 Setup Reminder:</strong> Before importing products with split sizes, make sure to run "Complete Setup" in the 
                      <strong> Metaobjects page</strong> to create the required Product Grouping metafield definitions.
                    </p>
                    <button
                      onClick={handleRefreshSetupStatus}
                      disabled={isCheckingSetup}
                      style={{
                        backgroundColor: '#1976d2',
                        color: 'white',
                        border: '1px solid #1976d2',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        minHeight: '28px',
                        transition: 'all 0.2s ease',
                        fontFamily: 'inherit',
                        lineHeight: '1.2',
                        textDecoration: 'none',
                        boxSizing: 'border-box',
                        flexShrink: 0,
                        marginLeft: '16px'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCheckingSetup) {
                          e.target.style.backgroundColor = '#1565c0';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCheckingSetup) {
                          e.target.style.backgroundColor = '#1976d2';
                        }
                      }}
                    >
                      {isCheckingSetup ? (
                        <>
                          <Spinner size="small" />
                          Checking...
                        </>
                      ) : (
                        "Refresh Status"
                      )}
                    </button>
                  </div>
                </Banner>
              )}
              <InlineStack align="space-between">
                <Text variant="headingLg" as="h2">
                  📦 Published Products from Stanley/Stella ({totalCount || 0})
                </Text>
                {!showPublishedProducts && (
                  <button
                    onClick={handleFetchProducts}
                    disabled={isFetching}
                    style={{
                      backgroundColor: '#059669',
                      color: 'white',
                      border: '1px solid #059669',
                      borderRadius: '8px',
                      padding: '12px 20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      minHeight: '44px',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit',
                      lineHeight: '1.2',
                      textDecoration: 'none',
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={(e) => {
                      if (!isFetching) {
                        e.target.style.backgroundColor = '#047857';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isFetching) {
                        e.target.style.backgroundColor = '#059669';
                      }
                    }}
                  >
                    {isFetching ? (
                      <>
                        <Spinner size="small" />
                        Fetching...
                      </>
                    ) : (
                      publishedProducts.length > 0 ? 
                        `Show ${totalCount} Products` : 
                        "Show Published Products"
                    )}
                  </button>
                )}
              </InlineStack>

              {fetchError && (
                <Banner status="critical">
                  <p>Error: {fetchError}</p>
                </Banner>
              )}

              {/* Cache Information */}
              {(isCached || cacheTimestamp) && (
                <Banner status="success">
                  <p>
                    <strong>📦 Cache Info:</strong> 
                    {isCached ? " Using cached data" : " Fresh data fetched"}
                    {cacheTimestamp && (
                      <>
                        {" • Cached: "}
                        {new Date(cacheTimestamp).toLocaleString()}
                      </>
                    )}
                    {cacheExpires && (
                      <>
                        {" • Expires: "}
                        {new Date(cacheExpires).toLocaleString()}
                      </>
                    )}
                  </p>
                </Banner>
              )}
              
              {/* Cache Controls */}
              {(publishedProducts.length > 0 || isCached) && (
                <InlineStack gap="200">
                  <Button 
                    onClick={handleForceRefresh} 
                    disabled={isFetching}
                    variant="tertiary"
                    size="slim"
                  >
                    🔄 Force Refresh
                  </Button>
                  <Button 
                    onClick={handleClearCache} 
                    disabled={isFetching}
                    variant="tertiary"
                    size="slim"
                  >
                    🗑️ Clear Cache
                  </Button>
                  <Button 
                    onClick={handleFixProductGrouping} 
                    disabled={isSubmitting}
                    variant="tertiary"
                    size="slim"
                  >
                    🔧 Fix Product Grouping
                  </Button>
                </InlineStack>
              )}

              {showPublishedProducts && (
                <BlockStack gap="400">
                  {publishedProducts && publishedProducts.length > 0 ? (
                    <>
                      <InlineStack gap="400" align="space-between">
                        <TextField
                          label="Search Products"
                          value={searchTerm}
                          onChange={setSearchTerm}
                          placeholder="Filter by style name or code..."
                          clearButton
                          onClearButtonClick={() => setSearchTerm("")}
                        />
                        <InlineStack gap="200">
                          <Button onClick={handleSelectAll} size="slim">
                            Select All
                          </Button>
                          <Button onClick={handleDeselectAll} size="slim" variant="tertiary">
                            Deselect All
                          </Button>
                          {selectedProducts.size > 0 && (
                            <button
                              onClick={handleImportSelected}
                              disabled={isSubmitting}
                              style={{
                                backgroundColor: '#059669',
                                color: 'white',
                                border: '1px solid #059669',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                minHeight: '32px',
                                transition: 'all 0.2s ease',
                                fontFamily: 'inherit',
                                lineHeight: '1.2',
                                textDecoration: 'none',
                                boxSizing: 'border-box'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSubmitting) {
                                  e.target.style.backgroundColor = '#047857';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSubmitting) {
                                  e.target.style.backgroundColor = '#059669';
                                }
                              }}
                            >
                              {isSubmitting ? (
                                <>
                                  <Spinner size="small" />
                                  Importing...
                                </>
                              ) : (
                                `Import Selected (${selectedProducts.size})`
                              )}
                            </button>
                          )}
                        </InlineStack>
                      </InlineStack>

                      {filteredProducts.length > 0 ? (
                        <div style={{ maxHeight: "500px", overflowY: "auto", border: "1px solid #e1e3e5", borderRadius: "8px", padding: "16px" }}>
                          <BlockStack gap="300">
                            {filteredProducts.map((product) => (
                              <InlineStack key={product.styleCode} align="space-between">
                                <InlineStack gap="300" align="start">
                                  <input
                                    type="checkbox"
                                    id={product.styleCode}
                                    checked={selectedProducts.has(product.styleCode)}
                                    onChange={(e) => handleProductSelection(product.styleCode, e.target.checked)}
                                    style={{ marginTop: "4px" }}
                                  />
                                  {/* Product Thumbnail */}
                                  {product.hasImages && (
                                    <div style={{ 
                                      width: "60px", 
                                      height: "60px", 
                                      borderRadius: "8px", 
                                      overflow: "hidden",
                                      border: "1px solid #e1e3e5",
                                      flexShrink: 0
                                    }}>
                                      <LazyImage 
                                        src={product.imageUrl || product.mainPictureUrl} 
                                        alt={product.styleName}
                                        style={{ 
                                          width: "100%", 
                                          height: "100%", 
                                          objectFit: "cover" 
                                        }}
                                        onError={(e) => {
                                          // Show "No Image" fallback
                                          const container = e.target.parentElement;
                                          const fallback = container.querySelector('.no-image-fallback');
                                          if (fallback) {
                                            e.target.style.display = 'none';
                                            fallback.style.display = 'flex';
                                          }
                                        }}
                                      />
                                      <div 
                                        className="no-image-fallback"
                                        style={{ 
                                          width: "100%", 
                                          height: "100%", 
                                          display: "none",
                                          alignItems: "center", 
                                          justifyContent: "center",
                                          backgroundColor: "#f6f6f7",
                                          color: "#6d7175",
                                          fontSize: "12px"
                                        }}
                                      >
                                        No Image
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <Text variant="bodyMd" fontWeight="bold">
                                      {product.styleName}
                                    </Text>
                                    <Text variant="bodySm" tone="subdued">
                                      <strong>Code:</strong> {product.styleCode} • <strong>Category:</strong> {product.category} • <strong>Type:</strong> {product.typeCode}
                                    </Text>
                                    <Text variant="bodySm" tone="subdued">
                                      <strong>Images:</strong> {product.imageCount} • <strong>Variants:</strong> {product.publishedVariants}/{product.totalVariants} published
                                    </Text>
                                    {product.description && (
                                      <Text variant="bodySm" tone="subdued" style={{ maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {product.description}
                                      </Text>
                                    )}
                                  </div>
                                </InlineStack>
                              </InlineStack>
                            ))}
                          </BlockStack>
                        </div>
                      ) : (
                        <Banner status="info">
                          <p>No products found matching "{searchTerm}"</p>
                        </Banner>
                      )}

                      {/* Bottom action buttons */}
                      <InlineStack gap="200" align="end">
                        <Button onClick={handleSelectAll} size="slim">
                          Select All
                        </Button>
                        <Button onClick={handleDeselectAll} size="slim" variant="tertiary">
                          Deselect All
                        </Button>
                        {selectedProducts.size > 0 && (
                          <button
                            onClick={handleImportSelected}
                            disabled={isSubmitting}
                            style={{
                              backgroundColor: '#059669',
                              color: 'white',
                              border: '1px solid #059669',
                              borderRadius: '8px',
                              padding: '8px 16px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              minHeight: '32px',
                              transition: 'all 0.2s ease',
                              fontFamily: 'inherit',
                              lineHeight: '1.2',
                              textDecoration: 'none',
                              boxSizing: 'border-box'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSubmitting) {
                                e.target.style.backgroundColor = '#047857';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSubmitting) {
                                e.target.style.backgroundColor = '#059669';
                              }
                            }}
                          >
                            {isSubmitting ? (
                              <>
                                <Spinner size="small" />
                                Importing...
                              </>
                            ) : (
                              `Import Selected (${selectedProducts.size})`
                            )}
                          </button>
                        )}
                      </InlineStack>
                    </>
                  ) : (
                    <Banner status="info">
                      <p>
                        <strong>No published products found.</strong> This could mean:
                        <br />• No products are published in Stanley/Stella (Published = 1)
                        <br />• API connection issue
                        <br />• Credentials not configured properly
                        <br />• Check browser console for detailed logs
                      </p>
                    </Banner>
                  )}
                </BlockStack>
              )}

              {/* Show products list when products are fetched */}
              {publishedProducts && publishedProducts.length > 0 && !showPublishedProducts && (
                <Banner status="info">
                  <p>
                    <strong>{publishedProducts.length}</strong> products fetched. Click "Show Published Products" to view and select them.
                  </p>
                </Banner>
              )}
            </BlockStack>
            </div>
          </Card>
        </Layout.Section>



        {/* Import Results Section */}
        {actionData && (actionData.productsCreated !== undefined || actionData.productsUpdated !== undefined) && (
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text variant="headingLg" as="h2">
                  📊 Import Results
                </Text>
                
                {actionData.error ? (
                  <Banner status="critical">
                    <p><strong>Import Error:</strong> {actionData.error}</p>
                  </Banner>
                ) : (
                  <Banner status="success">
                    <p><strong>Import Completed Successfully!</strong></p>
                    <div style={{ marginTop: '12px' }}>
                      <BlockStack gap="200">
                        <InlineStack gap="400">
                          <Text variant="bodyMd"><strong>Products Created:</strong> {actionData.productsCreated || 0}</Text>
                          <Text variant="bodyMd"><strong>Products Updated:</strong> {actionData.productsUpdated || 0}</Text>
                          <Text variant="bodyMd"><strong>Products Skipped:</strong> {actionData.productsSkipped || 0}</Text>
                        </InlineStack>
                        <InlineStack gap="400">
                          <Text variant="bodyMd"><strong>Variants Created:</strong> {actionData.variantsCreated || 0}</Text>
                          <Text variant="bodyMd"><strong>Variants Updated:</strong> {actionData.variantsUpdated || 0}</Text>
                          <Text variant="bodyMd"><strong>Images Uploaded:</strong> {actionData.imagesUploaded || 0}</Text>
                        </InlineStack>
                        <InlineStack gap="400">
                          <Text variant="bodyMd"><strong>Metafields Created:</strong> {actionData.metafieldsCreated || 0}</Text>
                          <Text variant="bodyMd"><strong>Categories Assigned:</strong> {actionData.categoriesAssigned || 0}</Text>
                        </InlineStack>
                        {(actionData.productGroupingFixed !== undefined || actionData.productGroupingChecked !== undefined) && (
                          <InlineStack gap="400">
                            <Text variant="bodyMd"><strong>Product Grouping Fixed:</strong> {actionData.productGroupingFixed || 0}/{actionData.productGroupingChecked || 0} metaobjects</Text>
                          </InlineStack>
                        )}
                      </BlockStack>
                    </div>
                  </Banner>
                )}
                
                {actionData.processedStyles && actionData.processedStyles.length > 0 && (
                  <div>
                    <Text variant="bodyMd" fontWeight="semibold">Processed Style Codes:</Text>
                    <Text variant="bodySm" tone="subdued">{actionData.processedStyles.join(', ')}</Text>
                  </div>
                )}
                
                {actionData.errors && actionData.errors.length > 0 && (
                  <Banner status="warning">
                    <div>
                      <Text variant="bodyMd" fontWeight="semibold">Errors ({actionData.errors.length}):</Text>
                      <div style={{ marginTop: '8px' }}>
                        {actionData.errors.slice(0, 5).map((error, index) => (
                          <div key={index} style={{ marginBottom: '4px' }}>
                            <Text variant="bodySm" tone="subdued">• {error}</Text>
                          </div>
                        ))}
                        {actionData.errors.length > 5 && (
                          <Text variant="bodySm" tone="subdued">
                            ... and {actionData.errors.length - 5} more errors
                          </Text>
                        )}
                      </div>
                    </div>
                  </Banner>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
      
            {/* Progress Modal */}
      <Modal
        open={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        title="Import in Progress"
        secondaryActions={[
          {
            content: 'Close',
            onAction: () => setShowProgressModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h3">
              This might take awhile.
            </Text>
            <Text variant="bodyMd">
               Follow progress on Product page, refresh every now and then. When all products have images, then the import is ready and finished.
            </Text>
            <Text variant="bodySm" tone="subdued">
              The import process can take several minutes depending on the number of products and their complexity. 
               New products will appear in your Shopify admin as they are created, and images are added last.
            </Text>
            <InlineStack align="end">
              <button
                onClick={() => {
                  window.open(`https://${shop}/admin/products?selectedView=all`, '_blank');
                }}
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  border: '1px solid #059669',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '44px',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                  lineHeight: '1.2',
                  textDecoration: 'none',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#047857';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#059669';
                }}
              >
                Follow Progress
              </button>
            </InlineStack>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}