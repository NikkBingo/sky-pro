import {
  Box,
  Card,
  Layout,
  Page,
  Text,
  BlockStack,
  Button,
  Banner,
  InlineStack,
  Select,
  Spinner,
  DataTable,
  Divider,
  TextField,
  Modal,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData } from "@remix-run/react";
import { getCredentialsWithFallback } from "../utils/credentials.server";

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

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return json({ shop: session.shop });
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  
  try {
    const formData = await request.formData();
    const action = formData.get("action");
    
    console.log("Images API action:", action);
    
    // Helper function to make authenticated Stanley/Stella API calls with StyleCode
    async function makeStanleyStellaRequestWithStyleCode(endpoint, styleCode, options = {}) {
      const credentials = await getCredentialsWithFallback(session.shop);
      
      if (!credentials) {
        throw new Error("Stanley/Stella credentials not configured. Please set up your credentials in the app settings first.");
      }
      
      // Check if we have the required environment variables
      if (!process.env.STST_HOSTNAME) {
        throw new Error("STST_HOSTNAME environment variable is not set. Please configure the Stanley/Stella API settings.");
      }
      
      const { user, password } = credentials;
      
      // Use the same format as the working import-products page
      // Try different database names like the working code does
      const possibleDbNames = [
        "production_api",
        "test",
        "demo"
      ];
      
      console.log(`🔍 Testing different database names for StyleCode ${styleCode}:`, possibleDbNames);
      
      // Try each database until we find one that works
      let successfulData = null;
      let usedDbName = null;
      
      for (const dbName of possibleDbNames) {
        console.log(`🔍 Testing database: ${dbName} with StyleCode: ${styleCode}`);
        
        const requestData = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            db_name: dbName,
            user: user,
            password: password,
            StyleCode: styleCode, // Include StyleCode for specific product
            LanguageCode: "en_US"
          },
          id: 0
        };
        
        console.log(`🔐 Testing ${dbName} with StyleCode - Request data:`, maskSensitiveData(JSON.stringify(requestData, null, 2)));
        
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData),
            timeout: 15000
          });
          
          console.log(`📡 ${dbName} with StyleCode - API Response status:`, response.status);
          
          if (!response.ok) {
            console.warn(`⚠️ ${dbName} with StyleCode - API request failed: ${response.status} ${response.statusText}`);
            continue;
          }
          
          const data = await response.text();
          console.log(`📦 ${dbName} with StyleCode - Raw response data length:`, data.length);
          console.log(`📦 ${dbName} with StyleCode - Raw response data (first 200 chars):`, data.substring(0, 200));
          
          if (!data || data.trim() === '') {
            console.warn(`⚠️ ${dbName} with StyleCode - Empty response from API`);
            continue;
          }
          
          const responseData = JSON.parse(data);
          console.log(`📦 ${dbName} with StyleCode - Parsed responseData keys:`, Object.keys(responseData));
          
          // Check for API errors first
          if (responseData.error) {
            console.warn(`⚠️ ${dbName} with StyleCode - API returned error:`, responseData.error);
            continue;
          }
          
          if (!responseData.result) {
            console.warn(`⚠️ ${dbName} with StyleCode - No result field in API response`);
            continue;
          }
          
          // Check if result is an error message
          if (typeof responseData.result === 'string' && responseData.result.includes('error')) {
            console.warn(`⚠️ ${dbName} with StyleCode - API error: ${responseData.result}`);
            continue;
          }
          
          // Parse the result field (it comes as a JSON string)
          let apiResult;
          try {
            apiResult = JSON.parse(responseData.result);
          } catch (parseError) {
            console.error(`❌ ${dbName} with StyleCode - Error parsing result:`, parseError.message);
            continue;
          }
          
          console.log(`📦 ${dbName} with StyleCode - Parsed result structure:`, Object.keys(apiResult));
          console.log(`📦 ${dbName} with StyleCode - Result is array:`, Array.isArray(apiResult));
          console.log(`📦 ${dbName} with StyleCode - Result length:`, Array.isArray(apiResult) ? apiResult.length : 'Not an array');
          
          if (Array.isArray(apiResult) && apiResult.length > 0) {
            console.log(`✅ ${dbName} with StyleCode - Found ${apiResult.length} products from Stanley/Stella API`);
            successfulData = apiResult;
            usedDbName = dbName;
            break;
          } else {
            console.log(`📦 ${dbName} with StyleCode - No products found or empty array`);
          }
        } catch (error) {
          console.error(`❌ ${dbName} with StyleCode - Error testing database:`, error.message);
          continue;
        }
      }
      
      if (!successfulData) {
        throw new Error(`No data found for StyleCode ${styleCode} in any database`);
      }
      
      console.log(`✅ Successfully got data for StyleCode ${styleCode} from database: ${usedDbName}`);
      return successfulData;
    }

    // Helper function to make authenticated Stanley/Stella API calls
    async function makeStanleyStellaRequest(endpoint, options = {}) {
      const credentials = await getCredentialsWithFallback(session.shop);
      
      if (!credentials) {
        throw new Error("Stanley/Stella credentials not configured. Please set up your credentials in the app settings first.");
      }
      
      // Check if we have the required environment variables
      if (!process.env.STST_HOSTNAME) {
        throw new Error("STST_HOSTNAME environment variable is not set. Please configure the Stanley/Stella API settings.");
      }
      
      const { user, password } = credentials;
      
      // Use the same format as the working import-products page
      // Try different database names like the working code does
      const possibleDbNames = [
        "production_api",
        "test",
        "demo"
      ];
      
      console.log(`🔍 Testing different database names:`, possibleDbNames);
      
      // Try each database until we find one that works
      let successfulData = null;
      let usedDbName = null;
      
      for (const dbName of possibleDbNames) {
        console.log(`🔍 Testing database: ${dbName}`);
        
        const requestData = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            db_name: dbName,
            user: user,
            password: password,
            LanguageCode: "en_US" // Don't include StyleCode when fetching all products
          },
          id: 0
        };
        
        console.log(`🔐 Testing ${dbName} - Request data:`, maskSensitiveData(JSON.stringify(requestData, null, 2)));
        
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData),
            timeout: 15000
          });
          
          console.log(`📡 ${dbName} - API Response status:`, response.status);
          
          if (!response.ok) {
            console.warn(`⚠️ ${dbName} - API request failed: ${response.status} ${response.statusText}`);
            continue;
          }
          
          const data = await response.text();
          console.log(`📦 ${dbName} - Raw response data length:`, data.length);
          console.log(`📦 ${dbName} - Raw response data (first 200 chars):`, data.substring(0, 200));
          
          if (!data || data.trim() === '') {
            console.warn(`⚠️ ${dbName} - Empty response from API`);
            continue;
          }
          
          const responseData = JSON.parse(data);
          console.log(`📦 ${dbName} - Parsed responseData keys:`, Object.keys(responseData));
          
          // Check for API errors first
          if (responseData.error) {
            console.warn(`⚠️ ${dbName} - API returned error:`, responseData.error);
            continue;
          }
          
          if (!responseData.result) {
            console.warn(`⚠️ ${dbName} - No result field in API response`);
            continue;
          }
          
          // Check if result is an error message
          if (typeof responseData.result === 'string' && responseData.result.includes('error')) {
            console.warn(`⚠️ ${dbName} - API error: ${responseData.result}`);
            continue;
          }
          
          // Parse the result field (it comes as a JSON string)
          let apiResult;
          try {
            apiResult = JSON.parse(responseData.result);
          } catch (parseError) {
            console.error(`❌ ${dbName} - Error parsing result:`, parseError.message);
            continue;
          }
          
          console.log(`📦 ${dbName} - Parsed result structure:`, Object.keys(apiResult));
          console.log(`📦 ${dbName} - Result is array:`, Array.isArray(apiResult));
          console.log(`📦 ${dbName} - Result length:`, Array.isArray(apiResult) ? apiResult.length : 'Not an array');
          
          if (Array.isArray(apiResult) && apiResult.length > 0) {
            console.log(`✅ ${dbName} - Found ${apiResult.length} products from Stanley/Stella API`);
            successfulData = apiResult;
            usedDbName = dbName;
            break;
          } else {
            console.log(`📦 ${dbName} - No products found or empty array`);
          }
        } catch (error) {
          console.error(`❌ ${dbName} - Error testing database:`, error.message);
          continue;
        }
      }
      
      if (!successfulData) {
        throw new Error("No data found in any database");
      }
      
      console.log(`✅ Successfully got data from database: ${usedDbName}`);
      return successfulData;
    }
    
    try {
      if (action === "loadStyleNames") {
        console.log("Loading style names from Stanley/Stella API...");
        
        // Use the dedicated images endpoint to get all available images
        const endpoint = `https://${process.env.STST_HOSTNAME}/webrequest/products_images/get_json`;
        
        try {
          console.log(`🌐 Trying endpoint: ${endpoint}`);
          const data = await makeStanleyStellaRequest(endpoint);
          console.log(`✅ Success with endpoint: ${endpoint}`);
          
          console.log("API response:", data);
          
          if (!Array.isArray(data)) {
            throw new Error("Invalid API response format - expected array");
          }
          
          // Extract unique style names from image records (images API returns individual images)
          // Only use items that have HTMLPath (actual image URLs)
          const styleNames = [...new Set(
            data
              .filter(item => {
                // Only include items that have HTMLPath (direct image URL)
                return item.HTMLPath && item.HTMLPath.trim() !== '';
              })
              .map(item => item.StyleName)
              .filter(Boolean)
          )].sort();
          console.log("Extracted style names with images:", styleNames);
          
          return json({
            success: true,
            styleNames: styleNames
          });
          
        } catch (endpointError) {
          console.log(`❌ Endpoint ${endpoint} failed:`, endpointError.message);
          throw new Error(`Could not access Stanley/Stella products API: ${endpointError.message}`);
        }
        
      } else if (action === "loadImagesForStyle") {
        const selectedStyleName = formData.get("styleName");
        console.log("Loading images for style:", selectedStyleName);
        
        // Use the dedicated images endpoint to get all available images
        const endpoint = `https://${process.env.STST_HOSTNAME}/webrequest/products_images/get_json`;
        
        try {
          console.log(`🌐 Trying endpoint: ${endpoint}`);
          
          // For the images endpoint, we can directly query for a specific style or get all images
          let data;
          if (selectedStyleName !== "All") {
            console.log(`🔍 Loading images for specific style: ${selectedStyleName}`);
            
            // First get all images to find the StyleCode for this StyleName
            const allData = await makeStanleyStellaRequest(endpoint);
            
            // Find images that match this style name
            const matchingImages = allData.filter(item => item.StyleName === selectedStyleName);
            
            if (matchingImages.length > 0) {
              console.log(`🔍 Found ${matchingImages.length} images for style: ${selectedStyleName}`);
              
              // Get the StyleCode from the first matching image
              const styleCode = matchingImages[0].StyleCode;
              if (styleCode) {
                console.log(`🔍 Found StyleCode for ${selectedStyleName}: ${styleCode}`);
                // Try to get more complete image data using StyleCode
                try {
                  data = await makeStanleyStellaRequestWithStyleCode(endpoint, styleCode);
                  console.log(`✅ Got enhanced image data using StyleCode: ${data.length} images`);
                } catch (styleCodeError) {
                  console.log(`⚠️ StyleCode query failed, using filtered data: ${styleCodeError.message}`);
                  data = matchingImages;
                }
              } else {
                console.log(`⚠️ No StyleCode found, using filtered images`);
                data = matchingImages;
              }
            } else {
              console.log(`⚠️ No images found for style: ${selectedStyleName}`);
              data = [];
            }
          } else {
            console.log(`🔍 Loading images for all styles`);
            data = await makeStanleyStellaRequest(endpoint);
          }
          
          console.log(`✅ Success with endpoint: ${endpoint}`);
          
          console.log("API response:", data);
          
          if (!Array.isArray(data)) {
            throw new Error("Invalid API response format - expected array");
          }
          
          // Extract images from the images API response
          const allImages = [];
          
          console.log(`🔍 Total items from images API: ${data.length}`);
          
          // First, let's analyze the data structure from the images endpoint
          const sampleItem = data.find(p => p.StyleName === selectedStyleName || selectedStyleName === "All") || data[0];
          if (sampleItem) {
            console.log(`🔍 Sample item structure from images API:`, Object.keys(sampleItem));
            console.log(`🔍 FULL sample item data:`, JSON.stringify(sampleItem, null, 2));
            
            // Look for all possible image fields and HTMLPath fields
            const imageFields = [];
            const allFields = [];
            const htmlPathFields = [];
            
            for (const [key, value] of Object.entries(sampleItem)) {
              allFields.push({
                key,
                type: typeof value,
                isArray: Array.isArray(value),
                length: Array.isArray(value) ? value.length : 'N/A',
                hasImageProps: Array.isArray(value) && value.length > 0 && value[0] && typeof value[0] === 'object' && 
                              (value[0].HTMLPath || value[0].FName || value[0].URL || value[0].url),
                firstItemKeys: Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' ? Object.keys(value[0]) : null,
                sampleValue: typeof value === 'string' ? value.substring(0, 100) : 
                           typeof value === 'number' ? value :
                           Array.isArray(value) ? `[${value.length} items]` :
                           typeof value === 'object' ? `{${Object.keys(value).length} keys}` : String(value)
              });
              
              // Check for HTMLPath fields (direct image URLs)
              if (key === 'HTMLPath' || key.includes('HTMLPath')) {
                htmlPathFields.push(key);
                console.log(`🔍 Found HTMLPath field: ${key} = ${value}`);
              }
              
              if (key.toLowerCase().includes('picture') || 
                  key.toLowerCase().includes('image') || 
                  key.toLowerCase().includes('photo') ||
                  (Array.isArray(value) && value.length > 0 && 
                   value[0] && typeof value[0] === 'object' && 
                   (value[0].HTMLPath || value[0].FName || value[0].URL))) {
                imageFields.push(key);
                console.log(`🔍 Found potential image field: ${key} (${Array.isArray(value) ? value.length : 'not array'} items)`);
                if (Array.isArray(value) && value.length > 0) {
                  console.log(`🔍 First item in ${key}:`, JSON.stringify(value[0], null, 2));
                }
              }
            }
            
            console.log(`🔍 All potential image fields found: ${imageFields.join(', ')}`);
            console.log(`🔍 All HTMLPath fields found: ${htmlPathFields.join(', ')}`);
            console.log(`🔍 ALL FIELDS in product:`, allFields);
            
            // Check if this is an image item directly or contains image data
            if (sampleItem.HTMLPath || sampleItem.FName || sampleItem.URL) {
              console.log(`🔍 Item appears to be an image directly with HTMLPath: ${sampleItem.HTMLPath}`);
            }
            
            // Look specifically for variant-level images (if the structure still includes variants)
            if (sampleItem.Variants && Array.isArray(sampleItem.Variants)) {
              console.log(`🔍 Item has ${sampleItem.Variants.length} variants`);
              const firstVariant = sampleItem.Variants[0];
              if (firstVariant) {
                console.log(`🔍 First variant structure:`, Object.keys(firstVariant));
                console.log(`🔍 First variant data:`, JSON.stringify(firstVariant, null, 2));
                
                // Check for image fields in variants
                for (const [key, value] of Object.entries(firstVariant)) {
                  if (key.toLowerCase().includes('picture') || 
                      key.toLowerCase().includes('image') || 
                      key.toLowerCase().includes('photo') ||
                      (Array.isArray(value) && value.length > 0 && 
                       value[0] && typeof value[0] === 'object' && 
                       (value[0].HTMLPath || value[0].FName || value[0].URL))) {
                    console.log(`🔍 Found variant image field: ${key} (${Array.isArray(value) ? value.length : 'not array'} items)`);
                  }
                }
              }
            }
          }
          
          // Count products with any images
          let productsWithImages = 0;
          
          // Debug: Show all products for the selected style
          if (selectedStyleName !== "All") {
            const matchingProducts = data.filter(product => product.StyleName === selectedStyleName);
            console.log(`🔍 Products matching style "${selectedStyleName}": ${matchingProducts.length}`);
            console.log(`🔍 Matching products details:`, matchingProducts.map(p => {
              const imageFieldsCount = {};
              for (const [key, value] of Object.entries(p)) {
                if (key.toLowerCase().includes('picture') || 
                    key.toLowerCase().includes('image') || 
                    key.toLowerCase().includes('photo')) {
                  imageFieldsCount[key] = Array.isArray(value) ? value.length : (value ? 1 : 0);
                }
              }
              return {
                StyleName: p.StyleName,
                StyleCode: p.StyleCode,
                imageFields: imageFieldsCount
              };
            }));
          }
          
          for (const item of data) {
            // Skip items that don't match the selected style
            if (selectedStyleName !== "All" && item.StyleName !== selectedStyleName) {
              continue;
            }
            
            // Only process items that have HTMLPath (direct image URL)
            if (item.HTMLPath && item.HTMLPath.trim() !== '') {
              console.log(`🔍 Processing image with HTMLPath: ${item.FName || 'Unknown'}`);
              
              // This item has a direct HTMLPath image URL
              allImages.push({
                HTMLPath: item.HTMLPath,
                FName: item.FName || `image_${allImages.length}`,
                Color: item.Color || 'Unknown',
                ColorCode: item.ColorCode || 'Unknown',
                PhotoTypeCode: item.PhotoTypeCode || 'Unknown',
                PhotoStyle: item.PhotoStyle || 'Unknown',
                PhotoShootCode: item.PhotoShootCode || 'Unknown',
                Size: item.Size || item.SizeCode || 'Unknown',
                StyleName: item.StyleName,
                StyleCode: item.StyleCode,
                ProductType: item.Type,
                ProductDescription: item.Description,
                ImageSource: 'HTMLPath' // This image came from HTMLPath field
              });
              
              console.log(`✅ Added image: ${item.FName} (${item.Color} - ${item.ColorCode})`);
            } else {
              console.log(`⏭️ Skipping item without HTMLPath: ${item.StyleName || 'Unknown'}`);
            }
          }
          
          console.log(`🔍 Total images found: ${allImages.length}`);
          console.log('🔍 Loaded images for style:', selectedStyleName, 'Count:', allImages.length);
          console.log('🔍 Sample images:', allImages.slice(0, 5).map(img => ({
            FName: img.FName,
            StyleName: img.StyleName,
            StyleCode: img.StyleCode,
            HTMLPath: img.HTMLPath,
            Color: img.Color,
            ColorCode: img.ColorCode,
            PhotoTypeCode: img.PhotoTypeCode,
            PhotoStyle: img.PhotoStyle
          })));
          
          // Group images by StyleCode to see if there are multiple products per style
          const imagesByStyleCode = {};
          allImages.forEach(img => {
            if (!imagesByStyleCode[img.StyleCode]) {
              imagesByStyleCode[img.StyleCode] = [];
            }
            imagesByStyleCode[img.StyleCode].push(img);
          });
          
          console.log('🔍 Images grouped by StyleCode:', Object.keys(imagesByStyleCode).map(styleCode => ({
            styleCode,
            count: imagesByStyleCode[styleCode].length,
            styleName: imagesByStyleCode[styleCode][0]?.StyleName
          })));
          
          return json({ success: true, images: allImages });
          
        } catch (endpointError) {
          console.log(`❌ Endpoint ${endpoint} failed:`, endpointError.message);
          throw new Error(`Could not access Stanley/Stella products API: ${endpointError.message}`);
        }
      } else if (action === "importSelectedImages") {
        const selectedImagesJson = formData.get("selectedImages");
        console.log("🔍 RAW selectedImagesJson from form:", selectedImagesJson);
        
        const selectedImages = JSON.parse(selectedImagesJson);
        
        console.log("📸 IMPORT STARTING:");
        console.log("   Selected images array:", selectedImages);
        console.log("   Selected image count:", selectedImages.length);
        console.log("   First 5 selected:", selectedImages.slice(0, 5));
        
        // Debug: List all products in the store to understand what's available
        console.log("🔍 Debug: Listing all products in the store...");
        try {
          const allProductsQuery = await admin.graphql(`
            query {
              products(first: 100) {
                edges {
                  node {
                    id
                    title
                    handle
                    vendor
                    status
                    metafields(namespace: "stanley_stella", first: 10) {
                      edges {
                        node {
                          namespace
                          key
                          value
                        }
                      }
                    }
                  }
                }
              }
            }
          `);
          
          const allProductsResponse = await allProductsQuery.json();
          const allProducts = allProductsResponse.data?.products?.edges || [];
          
          console.log(`📋 Total products in store: ${allProducts.length}`);
          console.log("📋 All products:", allProducts.map(edge => ({
            title: edge.node.title,
            vendor: edge.node.vendor,
            status: edge.node.status,
            metafields: edge.node.metafields.edges.map(mf => `${mf.node.key}=${mf.node.value}`)
          })));
          
          const stanleyStellaProducts = allProducts.filter(edge => 
            edge.node.vendor === 'Stanley/Stella'
          );
          console.log(`📋 Stanley/Stella products: ${stanleyStellaProducts.length}`);
          console.log("📋 Stanley/Stella products:", stanleyStellaProducts.map(edge => ({
            title: edge.node.title,
            status: edge.node.status,
            metafields: edge.node.metafields.edges.map(mf => `${mf.node.key}=${mf.node.value}`)
          })));
          
          if (stanleyStellaProducts.length === 0) {
            console.log(`⚠️ WARNING: No Stanley/Stella products found in the store!`);
            console.log(`This means images cannot be imported because there are no products to attach them to.`);
            console.log(`Please import products first using the Products API Import page.`);
          }
          
        } catch (debugError) {
          console.error("Debug query failed:", debugError);
        }
        
        // Get all images from the images API to find the selected ones
        console.log("🌐 Fetching all images from Stanley/Stella API to match selected ones...");
        const endpoint = `https://${process.env.STST_HOSTNAME}/webrequest/products_images/get_json`;
        const imagesData = await makeStanleyStellaRequest(endpoint);
        console.log("📦 Retrieved images data from API, processing structure...");
        
        // Extract all images from the images API response (only HTMLPath images)
        const allImages = [];
        for (const item of imagesData) {
          // Only process items that have HTMLPath (direct image URL)
          if (item.HTMLPath && item.HTMLPath.trim() !== '') {
            allImages.push({
              HTMLPath: item.HTMLPath,
              FName: item.FName || `image_${allImages.length}`,
              Color: item.Color || 'Unknown',
              ColorCode: item.ColorCode || 'Unknown',
              PhotoTypeCode: item.PhotoTypeCode || 'Unknown',
              PhotoStyle: item.PhotoStyle || 'Unknown',
              PhotoShootCode: item.PhotoShootCode || 'Unknown',
              Size: item.Size || item.SizeCode || 'Unknown',
              StyleName: item.StyleName,
              StyleCode: item.StyleCode,
              ProductType: item.Type,
              ProductDescription: item.Description,
              ImageSource: 'HTMLPath' // This image came from HTMLPath field
                    });
                  }
                }
        console.log("🔍 MATCHING SELECTED IMAGES:");
        console.log("   Total images from API:", allImages.length);
        console.log("   Selected image FNames to find:", selectedImages);
        
        // Debug: Show available FNames for comparison
        const availableFNames = allImages.map(img => img.FName).filter(Boolean);
        console.log("   Available FNames in API (first 10):", availableFNames.slice(0, 10));
        console.log("   Total available FNames:", availableFNames.length);
        
        const imagesToImport = allImages.filter(img => selectedImages.includes(img.FName));
        
        console.log("✅ MATCHING RESULTS:");
        console.log("   Images to import:", imagesToImport.length);
        
        if (imagesToImport.length === 0) {
          console.error("❌ NO IMAGES MATCHED!");
          console.error("   This means selectedImages FNames don't match allImages FNames");
          console.error("   Selected FNames:", selectedImages);
          console.error("   Available FNames sample:", availableFNames.slice(0, 20));
          
          // Check for partial matches
          const partialMatches = selectedImages.filter(selected => 
            availableFNames.some(available => 
              available && (available.includes(selected) || selected.includes(available))
            )
          );
          console.error("   Partial matches found:", partialMatches);
        } else {
          console.log("   Matched images details:");
          imagesToImport.slice(0, 5).forEach((img, idx) => {
            console.log(`      ${idx + 1}. ${img.FName} (${img.StyleName} - ${img.Color})`);
          });
        }
        
        // Import logic based on app.image-upload.jsx
        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        const errors = []; // Initialize errors array properly
        
        // Safety check to ensure errors array is always defined
        if (typeof errors === 'undefined' || !Array.isArray(errors)) {
          if (typeof globalThis !== 'undefined') {
            globalThis.errors = [];
          }
        }
        
        // Safety check to ensure errors array is always defined
        if (typeof errors === 'undefined' || !Array.isArray(errors)) {
          if (typeof globalThis !== 'undefined') {
            globalThis.errors = [];
          }
        }
        
        // Track what happens to each image for debugging
        const imageProcessingLog = new Map(); // Key: FName, Value: { action, reason, mediaId }
        
        // Track uploaded images by StyleCode, ColorCode, and photo details to reuse for split products
        // This prevents duplicate uploads when the same image is used across multiple split products
        const uploadedImages = new Map(); // Key: "StyleCode-ColorCode-PhotoTypeCode-PhotoStyle-PhotoShootCode", Value: { mediaId, url, altText, uploadedToProduct }
        
                  // First, get all existing media across all products to check for duplicates
          console.log("🔍 Fetching all existing media to check for duplicates...");
          const allExistingMedia = new Map(); // Key: image URL, Value: { mediaId, productId, altText }
          
          try {
            // Use the files query to get all media more efficiently
            let hasNextPage = true;
            let cursor = null;
            let totalMediaFetched = 0;
            
            while (hasNextPage && totalMediaFetched < 500) { // Limit to prevent excessive API calls
              const filesResponse = await admin.graphql(`
                query getFiles($first: Int!, $after: String) {
                  files(first: $first, after: $after) {
                    pageInfo {
                      hasNextPage
                      endCursor
                    }
                    edges {
                      node {
                        id
                        alt
                        ... on MediaImage {
                          image {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              `, {
                variables: {
                  first: 50,
                  after: cursor
                }
              });
              
              const filesResult = await filesResponse.json();
              
              if (filesResult.errors) {
                console.error("GraphQL errors when fetching files:", filesResult.errors);
                break;
              }
              
              if (filesResult.data?.files?.edges) {
                for (const fileEdge of filesResult.data.files.edges) {
                  const file = fileEdge.node;
                  if (file.image?.url) {
                    // Store existing media by URL for duplicate detection
                    const existingKey = file.image.url;
                    const urlFilename = file.image.url.split('/').pop() || '';
                    
                    allExistingMedia.set(existingKey, {
                      mediaId: file.id,
                      productId: null, // We don't track product ID in this simplified version
                      altText: file.alt || '',
                      productTitle: 'Unknown', // We don't track product title in this simplified version
                      urlFilename: urlFilename // Store filename for better matching
                    });
                    
                    // Also store by clean filename for easier lookup
                    // Extract clean filename (remove UUID suffix if present)
                    const cleanFilenameMatch = urlFilename.match(/^(.+?)(?:-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/i);
                    if (cleanFilenameMatch) {
                      const cleanFilename = cleanFilenameMatch[1];
                      // Store with clean filename as key for easier lookup
                      allExistingMedia.set(`clean_${cleanFilename}`, {
                        mediaId: file.id,
                        productId: null,
                        altText: file.alt || '',
                        productTitle: 'Unknown',
                        urlFilename: urlFilename,
                        cleanFilename: cleanFilename,
                        isCleanVersion: !urlFilename.includes('-') || !urlFilename.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
                      });
                    }
                  }
                }
              }
              
              totalMediaFetched += filesResult.data?.files?.edges?.length || 0;
              const pageInfo = filesResult.data?.files?.pageInfo;
              hasNextPage = pageInfo?.hasNextPage || false;
              cursor = pageInfo?.endCursor;
              
              if (hasNextPage) {
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
            
            console.log(`📊 Found ${allExistingMedia.size} existing media files`);
            
            // Debug: Show some examples of clean vs UUID filenames
            const cleanExamples = [];
            const uuidExamples = [];
            for (const [key, mediaInfo] of allExistingMedia.entries()) {
              if (key.startsWith('clean_')) {
                if (mediaInfo.isCleanVersion) {
                  cleanExamples.push(mediaInfo.urlFilename);
                } else {
                  uuidExamples.push(mediaInfo.urlFilename);
                }
              }
            }
            console.log(`🔍 Clean filename examples:`, cleanExamples.slice(0, 5));
            console.log(`🔍 UUID filename examples:`, uuidExamples.slice(0, 5));
          
          // Group images by StyleName for processing
          const imagesByStyle = {};
          for (const imageData of imagesToImport) {
            const styleName = imageData.StyleName || 'Unknown';
            if (!imagesByStyle[styleName]) {
              imagesByStyle[styleName] = [];
            }
            imagesByStyle[styleName].push(imageData);
          }
          
          console.log(`\n📦 PROCESSING ${Object.keys(imagesByStyle).length} style groups from ${imagesToImport.length} selected images`);
          console.log(`📋 Style groups found:`, Object.keys(imagesByStyle));
          console.log(`📊 Images per style:`, Object.entries(imagesByStyle).map(([style, images]) => `${style}: ${images.length}`).join(', '));
          
          // Debug: Show first few images to verify data structure
          if (imagesToImport.length > 0) {
            console.log(`\n🔍 Sample image data (first 3):`);
            imagesToImport.slice(0, 3).forEach((img, idx) => {
              console.log(`   ${idx + 1}. ${img.FName || 'NO_FNAME'}`);
              console.log(`      StyleName: "${img.StyleName || 'NO_STYLENAME'}"`);
              console.log(`      StyleCode: "${img.StyleCode || 'NO_STYLECODE'}"`);
              console.log(`      Color: "${img.Color || 'NO_COLOR'}" (${img.ColorCode || 'NO_COLORCODE'})`);
              console.log(`      PhotoCode: ${img.PhotoTypeCode || '?'}${img.PhotoStyle || '?'}${img.PhotoShootCode || '?'}`);
            });
          }
          
          // Process each style group
          for (const [currentStyleName, styleImages] of Object.entries(imagesByStyle)) {
            console.log(`\n🎨 Processing style: ${currentStyleName} (${styleImages.length} images)`);
            console.log(`Style images:`, styleImages.map(img => ({
              FName: img.FName,
              Color: img.Color,
              ColorCode: img.ColorCode,
              StyleCode: img.StyleCode
            })));
            
            console.log(`🔍 Looking for products matching StyleName: "${currentStyleName}"`);
            
            // Find products that match this style name
            let allMatchingProducts = [];
            
            try {
              // Try multiple search strategies to find matching products
              const searchStrategies = [
                // Strategy 1: Exact title match
                { query: `title:'${currentStyleName}'`, description: "exact title match" },
                // Strategy 2: Contains style name
                { query: `title:*${currentStyleName}*`, description: "contains style name" },
                // Strategy 3: Vendor + style name
                { query: `vendor:Stanley/Stella AND title:*${currentStyleName}*`, description: "vendor + style name" },
                // Strategy 4: Handle contains style name
                { query: `handle:*${currentStyleName}*`, description: "handle contains style name" },
                // Strategy 5: Metafield search (if products have style_code metafield)
                { query: `metafield:stanley_stella.style_code:*${currentStyleName}*`, description: "style_code metafield" },
                // Strategy 6: Get all Stanley/Stella products and filter
                { query: `vendor:Stanley/Stella`, description: "all Stanley/Stella products" }
              ];
              
              console.log(`📋 Trying ${searchStrategies.length} search strategies for "${currentStyleName}"`);
              
              for (const strategy of searchStrategies) {
                console.log(`🔍 Strategy ${searchStrategies.indexOf(strategy) + 1}: ${strategy.description}`);
                console.log(`   Query: ${strategy.query}`);
                
                const searchQuery = await admin.graphql(`
                  query ($query: String!) {
                    products(first: 50, query: $query) {
                      edges {
                        node {
                          id
                          title
                          handle
                          vendor
                          metafields(namespace: "stanley_stella", first: 10) {
                            edges {
                              node {
                                namespace
                                key
                                value
                              }
                            }
                          }
                          variants(first: 50) {
                            edges {
                              node {
                                id
                                title
                                selectedOptions {
                                  name
                                  value
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                `, {
                  variables: { query: strategy.query }
                });

                const searchResponse = await searchQuery.json();
                
                if (searchResponse.errors) {
                  console.error(`❌ GraphQL errors in strategy ${searchStrategies.indexOf(strategy) + 1}:`, searchResponse.errors);
                  continue;
                }
                
                if (searchResponse.data && searchResponse.data.products) {
                  const foundProducts = searchResponse.data.products.edges.map(edge => edge.node);
                  console.log(`   📦 Found ${foundProducts.length} products`);
                  
                  if (foundProducts.length > 0) {
                    console.log(`   📋 Product titles:`, foundProducts.slice(0, 5).map(p => p.title));
                  }
                  
                  // For the "all Stanley/Stella products" strategy, filter by title similarity
                  if (strategy.description === "all Stanley/Stella products") {
                    console.log(`   🔍 Filtering products for StyleName match: "${currentStyleName}"`);
                    
                    const filteredProducts = foundProducts.filter(product => {
                      const titleLower = product.title.toLowerCase();
                      const styleNameLower = currentStyleName.toLowerCase();
                      
                      // Check various matching conditions
                      const includesStyle = titleLower.includes(styleNameLower);
                      const styleIncludesTitle = styleNameLower.includes(titleLower);
                      const startsWithStyle = titleLower.startsWith(styleNameLower);
                      const endsWithStyle = titleLower.endsWith(styleNameLower);
                      const wordMatch = styleNameLower.split(' ').some(word => 
                               word.length > 2 && titleLower.includes(word)
                             );
                      
                      const matches = includesStyle || styleIncludesTitle || startsWithStyle || endsWithStyle || wordMatch;
                      
                      if (matches) {
                        console.log(`     ✅ "${product.title}" matches "${currentStyleName}"`);
                      }
                      
                      return matches;
                    });
                    
                    console.log(`   📦 After filtering: ${filteredProducts.length}/${foundProducts.length} products match`);
                    allMatchingProducts = filteredProducts;
                  } else {
                    allMatchingProducts = foundProducts;
                  }
                  
                  // If we found products, break out of the search loop
                  if (allMatchingProducts.length > 0) {
                    console.log(`✅ SUCCESS: Found ${allMatchingProducts.length} products using strategy: ${strategy.description}`);
                    console.log(`   📋 Matching products:`, allMatchingProducts.map(p => p.title));
                    break;
                  } else {
                    console.log(`   ❌ No products found with this strategy`);
                  }
                }
              }
              
              // Log all found products for debugging
              if (allMatchingProducts.length > 0) {
                console.log(`📋 Found products for "${currentStyleName}":`, 
                  allMatchingProducts.map(p => ({
                    title: p.title,
                    handle: p.handle,
                    vendor: p.vendor,
                    metafields: p.metafields.edges.map(mf => `${mf.node.key}=${mf.node.value}`),
                    variants: p.variants.edges.map(v => ({
                      title: v.node.title,
                      color: v.node.selectedOptions.find(opt => opt.name.toLowerCase() === 'color')?.value || 'No color'
                    }))
                  }))
                );
              } else {
                console.log(`❌ No products found for style "${currentStyleName}"`);
              }
              
            } catch (searchError) {
              console.error('❌ Product search failed:', searchError);
            }
            
            if (allMatchingProducts.length === 0) {
              console.warn(`\n❌ NO PRODUCTS FOUND for StyleName: "${currentStyleName}"`);
              console.warn(`   📊 This affects ${styleImages.length} images:`);
              styleImages.forEach((img, idx) => {
                console.warn(`      ${idx + 1}. ${img.FName} (${img.Color} - ${img.ColorCode})`);
              });
              console.warn(`   💡 Suggestions:`);
              console.warn(`      1. Check if products for "${currentStyleName}" exist in your store`);
              console.warn(`      2. Verify the StyleName matches product titles`);
              console.warn(`      3. Consider importing products first using the Products API`);
              
              errorCount += styleImages.length;
              // Safety check for errors array
              if (typeof errors !== 'undefined' && errors && Array.isArray(errors)) {
                errors.push(`No products found: ${currentStyleName}`);
              } else if (typeof globalThis !== 'undefined' && globalThis.errors && Array.isArray(globalThis.errors)) {
                globalThis.errors.push(`No products found: ${currentStyleName}`);
              } else {
                console.error('Errors array is not properly initialized in no products found check');
              }
              continue;
            }
            
            console.log(`Found ${allMatchingProducts.length} products for ${currentStyleName}:`, 
              allMatchingProducts.map(p => p.title));
            
            // Process each image for all matching products
        console.log(`\n🎨 Processing ${styleImages.length} images for style: ${currentStyleName}`);
        for (let i = 0; i < styleImages.length; i++) {
          const imageData = styleImages[i];
              const altText = `${imageData.Color} - ${imageData.ColorCode}`;
              
          // Create a unique key for this specific image (using filename to ensure uniqueness)
          // This ensures each image is processed individually while preventing duplicate uploads
          const imageKey = imageData.FName; // Use the actual filename as the key
          
          console.log(`\n📸 Image ${i + 1}/${styleImages.length}: ${imageData.FName}`);
          console.log(`   📄 Details: ${imageData.PhotoTypeCode}${imageData.PhotoStyle}${imageData.PhotoShootCode} | Color: ${imageData.Color} (${imageData.ColorCode})`);
          console.log(`   🔑 ImageKey: ${imageKey}`);
          console.log(`   🌐 URL: ${imageData.HTMLPath}`);
          console.log(`   🎯 Will attach to all matching products`);
          
          // FILTER PRODUCTS: Only include products that have variants matching this image's color
          console.log(`\n🔍 VARIANT MATCHING: Filtering products that have variants for ${imageData.Color} (${imageData.ColorCode})`);
          const productsWithMatchingVariants = [];
          
          // Filter allMatchingProducts to only include products that have variants for this specific color
          for (const product of allMatchingProducts) {
            const variants = product.variants.edges.map(edge => edge.node);
            const hasMatchingVariant = variants.some(variant => {
              const colorOption = variant.selectedOptions.find(opt => opt.name.toLowerCase() === 'color');
              if (!colorOption) return false;
              
              const variantColor = colorOption.value;
              
              // Check for exact color match
              if (variantColor === imageData.Color) {
                console.log(`   ✅ Product "${product.title}" has variant with exact color match: ${variantColor}`);
                return true;
              }
              
              // Check for color code match
              if (imageData.ColorCode && variantColor.includes(imageData.ColorCode)) {
                console.log(`   ✅ Product "${product.title}" has variant with color code match: ${variantColor} (contains ${imageData.ColorCode})`);
                return true;
              }
              
              // Check for partial color name match
              const colorName = imageData.Color.split(' - ')[0].toLowerCase().trim();
              if (colorName && variantColor.toLowerCase().includes(colorName)) {
                console.log(`   ✅ Product "${product.title}" has variant with color name match: ${variantColor} (contains ${colorName})`);
                return true;
              }
              
              return false;
            });
            
            if (hasMatchingVariant) {
              productsWithMatchingVariants.push(product);
            } else {
              console.log(`   ⏭️ Product "${product.title}" has no variants matching color ${imageData.Color} (${imageData.ColorCode})`);
            }
          }
          
          console.log(`   📊 Found ${productsWithMatchingVariants.length}/${allMatchingProducts.length} products with matching variants for color ${imageData.Color}`);
          
          // Use the filtered products for attachment
          const productsToAttachTo = productsWithMatchingVariants;
          
          // Check if we already have media for this specific image (prevent duplicate uploads)
          let mediaToUse = uploadedImages.get(imageKey);
                  
                  console.log(`   🔍 Checking if this specific image already uploaded: ${imageKey}`);
                  console.log(`   📊 Uploaded images map size: ${uploadedImages.size}`);
                  console.log(`   🔑 Existing keys:`, Array.from(uploadedImages.keys()).slice(0, 10)); // Show first 10 keys
                  
                  // Also check if this image was already processed in this session
                  if (mediaToUse) {
                    console.log(`   ✅ Image already processed in this session: ${mediaToUse.mediaId}`);
                    successCount++;
                    continue; // Skip to next image
                  }
          
          // PROCESS EACH IMAGE INDIVIDUALLY: Process the image for all matching products
          if (!mediaToUse) {
                  // First time uploading this image for split products
                  console.log(`   📤 FIRST TIME UPLOAD: Creating new media for split products`);
                  
                  // Check if image already exists in media library by exact filename match
                  const originalFilename = imageData.FName; // The original filename like "SFM0_STTU964_C134"
                  
                  console.log(`   🔍 CHECKING FOR EXISTING IMAGE: ${originalFilename}`);
                  console.log(`   📊 Total existing media entries: ${allExistingMedia.size}`);
                  
                  // Search for exact filename match in existing media
                  let existingMediaByFilename = null;
                  let searchCount = 0;
                  
                  for (const [key, mediaInfo] of allExistingMedia.entries()) {
                    searchCount++;
                    const urlFilename = mediaInfo.urlFilename || '';
                    const altTextFilename = mediaInfo.altText || '';
                    
                    // Check for exact filename match (with or without extension)
                    const exactMatch = urlFilename === originalFilename || 
                                     altTextFilename === originalFilename ||
                                     urlFilename === `${originalFilename}.jpg` ||
                                     urlFilename === `${originalFilename}.png` ||
                                     urlFilename === `${originalFilename}.jpeg` ||
                                     altTextFilename === `${originalFilename}.jpg` ||
                                     altTextFilename === `${originalFilename}.png` ||
                                     altTextFilename === `${originalFilename}.jpeg`;
                    
                    if (exactMatch) {
                      console.log(`   ✅ EXACT FILENAME MATCH FOUND: ${mediaInfo.mediaId}`);
                      console.log(`   📁 URL filename: ${urlFilename}`);
                      console.log(`   📁 Alt text: ${altTextFilename}`);
                      console.log(`   🎯 Original filename: ${originalFilename}`);
                      existingMediaByFilename = mediaInfo;
                      break;
                    }
                  }
                  
                  // Also search for UUID versions of the same filename
                  if (!existingMediaByFilename) {
                    console.log(`   🔍 No exact match, searching for UUID versions...`);
                    
                    for (const [key, mediaInfo] of allExistingMedia.entries()) {
                      const urlFilename = mediaInfo.urlFilename || '';
                      const altTextFilename = mediaInfo.altText || '';
                      
                      // Check if this is a UUID version of our filename
                      const uuidPattern = new RegExp(`^${originalFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`, 'i');
                      
                      if (uuidPattern.test(urlFilename) || uuidPattern.test(altTextFilename)) {
                        console.log(`   ✅ UUID VERSION FOUND: ${mediaInfo.mediaId}`);
                        console.log(`   📁 URL filename: ${urlFilename}`);
                        console.log(`   📁 Alt text: ${altTextFilename}`);
                        console.log(`   🎯 Original filename: ${originalFilename}`);
                        existingMediaByFilename = mediaInfo;
                        break;
                      }
                    }
                  }
                  
                  // Also search for partial matches (filename contains our original filename)
                  if (!existingMediaByFilename) {
                    console.log(`   🔍 No UUID version found, searching for partial matches...`);
                    
                    for (const [key, mediaInfo] of allExistingMedia.entries()) {
                      const urlFilename = mediaInfo.urlFilename || '';
                      const altTextFilename = mediaInfo.altText || '';
                      
                      // Check if filename contains our original filename (case insensitive)
                      if (urlFilename.toLowerCase().includes(originalFilename.toLowerCase()) || 
                          altTextFilename.toLowerCase().includes(originalFilename.toLowerCase())) {
                        console.log(`   ✅ PARTIAL MATCH FOUND: ${mediaInfo.mediaId}`);
                        console.log(`   📁 URL filename: ${urlFilename}`);
                        console.log(`   📁 Alt text: ${altTextFilename}`);
                        console.log(`   🎯 Original filename: ${originalFilename}`);
                        existingMediaByFilename = mediaInfo;
                        break;
                      }
                    }
                  }
                  
                  console.log(`   🔍 Searched through ${searchCount} entries, exact match: ${existingMediaByFilename ? 'FOUND' : 'NOT FOUND'}`);
                  
                  // Also check for existing media with clean filename (without UUID) as fallback
                  let existingMediaByCleanFilename = null;
                  const cleanFilename = imageData.FName; // This should be the clean filename like "SFM0_STTU964_C134"
                  
                  if (!existingMediaByFilename) {
                    console.log(`   🔍 No exact match, trying clean filename search...`);
                    
                    // Debug: Show all clean filename entries
                    const cleanEntries = [];
                    for (const [key, mediaInfo] of allExistingMedia.entries()) {
                      if (key.startsWith('clean_')) {
                        cleanEntries.push({ key, filename: mediaInfo.urlFilename, isClean: mediaInfo.isCleanVersion });
                      }
                    }
                    console.log(`   🔍 Clean filename entries (${cleanEntries.length}):`, cleanEntries.slice(0, 10));
                    
                    // First, try direct lookup using the clean filename key
                    const directCleanMatch = allExistingMedia.get(`clean_${cleanFilename}`);
                    console.log(`   🔍 Direct lookup for 'clean_${cleanFilename}':`, directCleanMatch ? 'FOUND' : 'NOT FOUND');
                    
                    if (directCleanMatch) {
                      console.log(`   ✅ Direct clean filename match found: ${directCleanMatch.mediaId} (${directCleanMatch.urlFilename})`);
                      existingMediaByCleanFilename = directCleanMatch;
                    } else {
                      console.log(`   🔍 Direct lookup failed, trying fallback search...`);
                      
                      // Fallback: Search through all existing media to find one with matching clean filename
                      let searchCount = 0;
                      for (const [key, mediaInfo] of allExistingMedia.entries()) {
                        if (key.startsWith('clean_')) {
                          searchCount++;
                          const urlFilename = mediaInfo.urlFilename || '';
                          const altTextFilename = mediaInfo.altText || '';
                          
                          // Check if this existing media has our clean filename (without UUID)
                          if (urlFilename.includes(cleanFilename) || altTextFilename.includes(cleanFilename)) {
                            console.log(`   🔍 Potential match found: ${mediaInfo.mediaId} (${urlFilename})`);
                            
                            // Verify it's not a UUID version by checking if it ends with our clean filename
                            const isCleanVersion = urlFilename.endsWith(cleanFilename) || 
                                                 altTextFilename.endsWith(cleanFilename) ||
                                                 urlFilename === cleanFilename ||
                                                 altTextFilename === cleanFilename;
                            
                            console.log(`   🔍 Clean version check: ${isCleanVersion} (url: ${urlFilename}, alt: ${altTextFilename})`);
                            
                            if (isCleanVersion) {
                              existingMediaByCleanFilename = mediaInfo;
                              console.log(`   ✅ Found existing media with clean filename: ${mediaInfo.mediaId} (${urlFilename})`);
                              break;
                            }
                          }
                        }
                      }
                      console.log(`   🔍 Searched through ${searchCount} clean entries, found: ${existingMediaByCleanFilename ? 'YES' : 'NO'}`);
                    }
                  }
                  
                  if (existingMediaByFilename || existingMediaByCleanFilename) {
                    const existingMedia = existingMediaByFilename || existingMediaByCleanFilename;
                    const detectionMethod = existingMediaByFilename ? 'exact filename match' : 'clean filename match';
                    
                    console.log(`   🔍 Found existing media in library: ${existingMedia.mediaId} (${detectionMethod})`);
                    mediaToUse = {
                      mediaId: existingMedia.mediaId,
                      url: existingMedia.url || imageData.HTMLPath,
                      altText: altText,
                      isReused: true,
                      alreadyExists: true,
                      uploadedToProduct: null,
                      needsCopyToOtherProducts: productsToAttachTo.length > 0
                    };
                    uploadedImages.set(imageKey, mediaToUse);
                    
                    console.log(`   ✅ REUSING existing media from library: ${existingMedia.mediaId} (${detectionMethod})`);
                    
                    // Track this action
                    imageProcessingLog.set(imageData.FName, {
                      action: 'REUSED_FROM_LIBRARY',
                      reason: `found existing media in library via ${detectionMethod}`,
                      mediaId: existingMedia.mediaId,
                      imageKey: imageKey,
                      filename: imageData.FName,
                      attachedToProducts: 0, // Will be updated after attachment
                      totalMatchingProducts: productsToAttachTo.length,
                      method: 'attachExistingMediaToProductWithRetry_from_library',
                      detectionMethod: detectionMethod
                    });
                  } else {
                    // Upload the image to the first product
                    if (productsToAttachTo.length > 0) {
                    const firstProduct = productsToAttachTo[0];
                    console.log(`   📁 Creating media on first product: ${firstProduct.title}`);
                    console.log(`   📁 Original source URL: ${imageData.HTMLPath}`);
                    console.log(`   📁 Alt text: ${altText}`);
                    console.log(`   📁 Clean filename: ${cleanFilename}`);
                    
                    // Double-check: if we found existing media, don't create new
                    if (existingMediaByFilename || existingMediaByCleanFilename) {
                      console.log(`   ⚠️ WARNING: Found existing media but still trying to create new!`);
                      console.log(`   🔍 This should not happen - existing media should be reused`);
                      console.log(`   📁 Existing media found: ${existingMediaByFilename?.mediaId || existingMediaByCleanFilename?.mediaId}`);
                      
                      // Use the existing media instead of creating new
                      const existingMedia = existingMediaByFilename || existingMediaByCleanFilename;
                      const detectionMethod = existingMediaByFilename ? 'exact filename match' : 'clean filename match';
                      
                      console.log(`   🔍 Using existing media instead: ${existingMedia.mediaId} (${detectionMethod})`);
                      mediaToUse = {
                        mediaId: existingMedia.mediaId,
                        url: existingMedia.url || imageData.HTMLPath,
                        altText: altText,
                        isReused: true,
                        alreadyExists: true,
                        uploadedToProduct: null,
                        needsCopyToOtherProducts: productsToAttachTo.length > 0
                      };
                      uploadedImages.set(imageKey, mediaToUse);
                      
                      console.log(`   ✅ REUSING existing media from library: ${existingMedia.mediaId} (${detectionMethod})`);
                      
                      // Track this action
                      imageProcessingLog.set(imageData.FName, {
                        action: 'REUSED_FROM_LIBRARY',
                        reason: `found existing media in library via ${detectionMethod}`,
                        mediaId: existingMedia.mediaId,
                        imageKey: imageKey,
                        filename: imageData.FName,
                        attachedToProducts: 0, // Will be updated after attachment
                        totalMatchingProducts: productsToAttachTo.length,
                        method: 'attachExistingMediaToProductWithRetry_from_library',
                        detectionMethod: detectionMethod
                      });
                      
                      successCount++;
                      continue; // Skip the media creation below
                    }
                    
                    try {
                      const productMediaCreateQuery = await admin.graphql(`
                        mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
                          productCreateMedia(productId: $productId, media: $media) {
                            media {
                              id
                              alt
                              ... on MediaImage {
                                image {
                                  url
                                }
                              }
                            }
                            mediaUserErrors {
                              field
                              message
                            }
                          }
                        }
                      `, {
                        variables: {
                          productId: firstProduct.id,
                          media: [{
                            originalSource: imageData.HTMLPath,
                            alt: altText,
                            mediaContentType: "IMAGE"
                          }]
                        }
                      });

                      const productMediaResponse = await productMediaCreateQuery.json();
                      
                      if (productMediaResponse.errors) {
                        console.error('GraphQL errors in product media creation:', productMediaResponse.errors);
                        errorCount++;
                        // Safety check for errors array
                        if (typeof errors !== 'undefined' && errors && Array.isArray(errors)) {
                          errors.push(`GraphQL product media creation error for ${imageData.FName}: ${productMediaResponse.errors.map(e => e.message).join(', ')}`);
                        } else if (typeof globalThis !== 'undefined' && globalThis.errors && Array.isArray(globalThis.errors)) {
                          globalThis.errors.push(`GraphQL product media creation error for ${imageData.FName}: ${productMediaResponse.errors.map(e => e.message).join(', ')}`);
                        } else {
                          console.error('Errors array is not properly initialized in GraphQL errors check');
                        }
                        continue;
                      }
                      
                      const productMediaCreateResult = productMediaResponse.data?.productCreateMedia;
                      
                      if (productMediaCreateResult?.mediaUserErrors?.length > 0) {
                        console.error('Product media creation user errors:', productMediaCreateResult.mediaUserErrors);
                        errorCount++;
                        // Safety check for errors array
                        if (typeof errors !== 'undefined' && errors && Array.isArray(errors)) {
                          errors.push(`Product media creation user errors for ${imageData.FName}: ${productMediaCreateResult.mediaUserErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
                        } else if (typeof globalThis !== 'undefined' && globalThis.errors && Array.isArray(globalThis.errors)) {
                          globalThis.errors.push(`Product media creation user errors for ${imageData.FName}: ${productMediaCreateResult.mediaUserErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
                        } else {
                          console.error('Errors array is not properly initialized in mediaUserErrors check');
                        }
                        continue;
                      }
                      
                      if (!productMediaCreateResult?.media?.length > 0) {
                        console.error('No product media created in response:', productMediaCreateResult);
                        errorCount++;
                        // Safety check for errors array
                        if (typeof errors !== 'undefined' && errors && Array.isArray(errors)) {
                          errors.push(`No product media created for ${imageData.FName}`);
                        } else if (typeof globalThis !== 'undefined' && globalThis.errors && Array.isArray(globalThis.errors)) {
                          globalThis.errors.push(`No product media created for ${imageData.FName}`);
                        } else {
                          console.error('Errors array is not properly initialized in no media created check');
                        }
                        continue;
                      }
                      
                      const createdMedia = productMediaCreateResult.media[0];
                      const createdMediaId = createdMedia.id;
                      const createdMediaUrl = createdMedia.image?.url || imageData.HTMLPath;
                      
                      // Extract filename from created URL to see if it has UUID
                      const createdFilename = createdMediaUrl.split('/').pop() || '';
                      const hasUuid = createdFilename.includes('-') && createdFilename.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                      
                      console.log(`   ✅ NEW MEDIA CREATED: ${imageData.FName} (${createdMediaId})`);
                      console.log(`   🌐 Media URL: ${createdMediaUrl}`);
                      console.log(`   📁 Created filename: ${createdFilename}`);
                      console.log(`   🔍 Has UUID suffix: ${hasUuid ? 'YES' : 'NO'}`);
                      console.log(`   🎯 Media is automatically attached to first product: ${firstProduct.title}`);
                      
                      if (hasUuid) {
                        console.log(`   ⚠️ WARNING: Created media has UUID suffix despite duplicate detection!`);
                        console.log(`   🔍 Expected clean filename: ${cleanFilename}`);
                        console.log(`   🔍 Actual filename: ${createdFilename}`);
                      }
                      
                      // Store media info for split product reuse
                      mediaToUse = {
                        mediaId: createdMediaId,
                        url: createdMediaUrl,
                        altText: altText,
                        isReused: false,
                        alreadyExists: false,
                        uploadedToProduct: firstProduct.id,
                        needsCopyToOtherProducts: allMatchingProducts.length > 1
                      };
                      uploadedImages.set(imageKey, mediaToUse);
                      
                      // Track this action
                      imageProcessingLog.set(imageData.FName, {
                        action: 'UPLOADED_NEW_FOR_SPLIT_PRODUCTS',
                        reason: 'created new media for split products',
                        mediaId: createdMediaId,
                        imageKey: imageKey,
                        filename: imageData.FName,
                        attachedToProducts: 1,
                        totalMatchingProducts: productsToAttachTo.length,
                        productTitles: [firstProduct.title],
                        method: 'productCreateMedia_split_products',
                        attachmentSuccess: true
                      });
                      
                                            successCount++;
                      
                    } catch (uploadError) {
                      console.error(`❌ Upload error for ${imageData.FName}:`, uploadError);
                      errorCount++;
                      // Safety check for errors array
                      if (typeof errors !== 'undefined' && errors && Array.isArray(errors)) {
                        errors.push(`Upload error for ${imageData.FName}: ${uploadError.message}`);
                      } else if (typeof globalThis !== 'undefined' && globalThis.errors && Array.isArray(globalThis.errors)) {
                        globalThis.errors.push(`Upload error for ${imageData.FName}: ${uploadError.message}`);
                      } else {
                        console.error('Errors array is not properly initialized in upload catch block');
                      }
                      continue;
                    }
                } else {
                    console.log(`   ❌ No products with matching variants found for ${imageData.FName} - cannot create media`);
                    console.log(`   📊 Found ${allMatchingProducts.length} products with style "${currentStyleName}" but none have variants for color "${imageData.Color}"`);
                    errorCount++;
                    // Safety check for errors array
                    if (typeof errors !== 'undefined' && errors && Array.isArray(errors)) {
                      errors.push(`No products with matching variants for ${imageData.FName} (color: ${imageData.Color})`);
                    } else if (typeof globalThis !== 'undefined' && globalThis.errors && Array.isArray(globalThis.errors)) {
                      globalThis.errors.push(`No products with matching variants for ${imageData.FName} (color: ${imageData.Color})`);
                    } else {
                      console.error('Errors array is not properly initialized in no matching variants check');
                    }
                    continue;
                  }
                    } // Close the else block for existing media check
                                 } else {
                   // Reusing existing media for this specific image
                   console.log(`   🔗 REUSING existing media for this image: ${mediaToUse.mediaId}`);
                   
                   // Track this action
                   imageProcessingLog.set(imageData.FName, {
                     action: 'REUSED_EXISTING_IMAGE',
                     reason: 'reused existing media for this specific image',
                     mediaId: mediaToUse.mediaId,
                     imageKey: imageKey,
                     filename: imageData.FName,
                     attachedToProducts: 0, // Will be updated after attachment
                                           totalMatchingProducts: productsToAttachTo.length,
                     method: 'attachExistingMediaToProductWithRetry_existing_image'
                   });
                 }
                 
                 // Always increment success count for processed images (whether uploaded or reused)
                 successCount++;
                 
                                  // SPLIT PRODUCT ATTACHMENT: Attach media to ALL split products with matching variants
                 if (mediaToUse && productsToAttachTo.length > 0) {
                   console.log(`\n🔗 SPLIT PRODUCT ATTACHMENT: Attaching media to ${productsToAttachTo.length} split products with matching variants`);
                   console.log(`   📁 Filename: ${imageData.FName}`);
                   console.log(`   🆔 Media ID: ${mediaToUse.mediaId}`);
                   console.log(`   🎯 Strategy: All products with matching variants will use the same media`);
                   
                   let attachedToProducts = 0;
                   
                   // Attach to ALL products that have matching variants
                   for (let i = 0; i < productsToAttachTo.length; i++) {
                     const product = productsToAttachTo[i];
                     
                     // Skip if this is the product where we just created the media (it already has it)
                     if (mediaToUse.uploadedToProduct === product.id) {
                       console.log(`   ⏭️ Skipping ${product.title} - media already created here`);
                       attachedToProducts++; // Count it as attached since it was just created
                       continue;
                     }
                     
                     console.log(`   📎 Attaching to split product ${i + 1}/${productsToAttachTo.length}: ${product.title}`);
                     
                     try {
                       // Use the proven attachExistingMediaToProductWithRetry function
                       const attachmentSuccess = await attachExistingMediaToProductWithRetry(
                         admin,
                         product.id,
                         mediaToUse.mediaId,
                         mediaToUse.altText,
                         3 // Reduced retries for split products
                       );
                       
                       if (attachmentSuccess) {
                         console.log(`   ✅ Successfully attached to ${product.title}`);
                         attachedToProducts++;
                       } else {
                         console.log(`   ❌ Failed to attach to ${product.title}`);
                       }
                       
                     } catch (attachmentError) {
                       console.error(`   ❌ Error attaching to ${product.title}:`, attachmentError.message);
                     }
                     
                     // Small delay between products to be respectful to API
                     await new Promise(resolve => setTimeout(resolve, 200));
                   }
                   
                   console.log(`   📊 Split product attachment summary: ${attachedToProducts}/${productsToAttachTo.length} products`);
                   console.log(`   🎯 All split products now use the same media: ${mediaToUse.mediaId}`);
                   
                   // Update the processing log with attachment results
                   const existingLog = imageProcessingLog.get(imageData.FName);
                   if (existingLog) {
                     existingLog.attachedToProducts = attachedToProducts;
                     existingLog.productTitles = productsToAttachTo.map(p => p.title);
                     existingLog.attachmentSuccess = attachedToProducts > 0;
                     existingLog.attachmentRate = `${attachedToProducts}/${productsToAttachTo.length}`;
                     existingLog.splitProductMediaId = mediaToUse.mediaId; // Track which media all split products use
                     
                     if (attachedToProducts === 0) {
                       existingLog.attachmentIssue = 'No split products have this media';
                     } else if (attachedToProducts < productsToAttachTo.length) {
                       existingLog.attachmentIssue = `Partial split product coverage - only ${attachedToProducts} of ${productsToAttachTo.length} products`;
                      } else {
                       existingLog.attachmentIssue = 'All split products have this media';
                     }
                     
                     imageProcessingLog.set(imageData.FName, existingLog);
                   }
                   
                   successCount++;
                 } else if (mediaToUse && productsToAttachTo.length === 1) {
                   // Single product case
                   console.log(`   ✅ Single product case - media already attached to ${productsToAttachTo[0].title}`);
                   
                   // Update the processing log for single product case
                   const existingLog = imageProcessingLog.get(imageData.FName);
                   if (existingLog) {
                     existingLog.attachedToProducts = 1;
                     existingLog.productTitles = [productsToAttachTo[0].title];
                     existingLog.attachmentSuccess = true;
                     existingLog.attachmentRate = `1/1`;
                     imageProcessingLog.set(imageData.FName, existingLog);
                   }
                   
                   successCount++;
                 }
              

                   
                   
            }
          }
          
          console.log(`\n📊 Import Summary:`);
          console.log(`✅ Successfully processed: ${successCount} images`);
          console.log(`❌ Errors: ${errorCount} images`);
          console.log(`⏭️ Skipped: ${skippedCount} images`);
          console.log(`📦 Total processed: ${successCount + errorCount + skippedCount} images`);
          console.log(`🎯 Selected images: ${selectedImages.length}`);
          
          // Initialize variant assignment results
          let variantImageResults = {
            variantsProcessed: 0,
            imagesAssigned: 0,
            variantErrors: []
          };
          
          console.log(`\n💡 Success Details:`);
          console.log(`   📁 Files processed: ${successCount}`);
          console.log(`   🔗 Strategy: Upload → Reuse → Attach → Assign (complete four-step process)`);
          console.log(`   🎯 Variant images assigned automatically: ${variantImageResults.imagesAssigned}`);
          
          // PRODUCT ATTACHMENT VERIFICATION
          console.log(`\n🔍 PRODUCT ATTACHMENT VERIFICATION:`);
          const imagesWithoutProductAttachment = [];
          const imagesWithPartialAttachment = [];
          const imagesWithFullAttachment = [];
          
          for (const selectedFName of selectedImages) {
            const log = imageProcessingLog.get(selectedFName);
            if (log) {
              const attachedCount = log.attachedToProducts || 0;
              const totalExpected = log.totalMatchingProducts || 0;
              
              if (totalExpected === 0) {
                imagesWithoutProductAttachment.push({
                  name: selectedFName,
                  reason: 'No matching products found',
                  mediaId: log.mediaId
                });
              } else if (attachedCount === 0) {
                imagesWithoutProductAttachment.push({
                  name: selectedFName,
                  reason: 'Found products but attachment failed',
                  mediaId: log.mediaId,
                  expectedProducts: totalExpected
                });
              } else if (attachedCount < totalExpected) {
                imagesWithPartialAttachment.push({
                  name: selectedFName,
                  attached: attachedCount,
                  expected: totalExpected,
                  mediaId: log.mediaId
                });
              } else {
                imagesWithFullAttachment.push({
                  name: selectedFName,
                  attached: attachedCount,
                  mediaId: log.mediaId
                });
              }
            } else {
              imagesWithoutProductAttachment.push({
                name: selectedFName,
                reason: 'No processing log found',
                mediaId: 'unknown'
              });
            }
          }
          
          console.log(`   ✅ Images fully attached to products: ${imagesWithFullAttachment.length}`);
          console.log(`   ⚠️ Images with partial product attachment: ${imagesWithPartialAttachment.length}`);
          console.log(`   ❌ Images with no product attachment: ${imagesWithoutProductAttachment.length}`);
          
          if (imagesWithPartialAttachment.length > 0) {
            console.log(`\n⚠️ PARTIAL ATTACHMENT DETAILS:`);
            imagesWithPartialAttachment.forEach(img => {
              console.log(`   📁 ${img.name}: ${img.attached}/${img.expected} products (${img.mediaId})`);
            });
          }
          
          if (imagesWithoutProductAttachment.length > 0) {
            console.log(`\n❌ NO PRODUCT ATTACHMENT DETAILS:`);
            imagesWithoutProductAttachment.forEach(img => {
              console.log(`   📁 ${img.name}: ${img.reason} (${img.mediaId})`);
            });
            console.log(`\n📝 These images exist in media library but are NOT attached to any products:`);
            console.log(`   🔧 They won't appear in product media collections`);
            console.log(`   🔧 They won't be available for variant assignment`);
            console.log(`   🔧 These are ORPHANED IMAGES - they exist but have no product references`);
            console.log(`\n💡 SOLUTIONS FOR ORPHANED IMAGES:`);
            console.log(`   1. Re-run import - the improved logic will try to attach existing orphaned images`);
            console.log(`   2. Manual cleanup - delete orphaned images from media library if not needed`);
            console.log(`   3. The new direct-product-creation method prevents future orphaning`);
          }
          
          // ORPHANED IMAGES ANALYSIS
          console.log(`\n🚨 ORPHANED IMAGES ANALYSIS:`);
          const orphanedImages = imagesWithoutProductAttachment.filter(img => 
            img.reason.includes('attachment failed') || img.reason.includes('No processing log')
          );
          const noProductsImages = imagesWithoutProductAttachment.filter(img => 
            img.reason.includes('No matching products')
          );
          
          console.log(`   🏚️ True orphaned images (exist but unattached): ${orphanedImages.length}`);
          console.log(`   🔍 Images with no matching products: ${noProductsImages.length}`);
          console.log(`   ✅ Images properly attached to products: ${imagesWithFullAttachment.length}`);
          
          if (orphanedImages.length > 0) {
            console.log(`\n🏚️ TRUE ORPHANED IMAGES (need re-attachment):`);
            orphanedImages.forEach(img => {
              console.log(`   📁 ${img.name} (${img.mediaId})`);
            });
            console.log(`\n📝 These images will be fixed by re-running the import`);
            console.log(`   ✅ The improved logic now checks existing attachments first`);
            console.log(`   ✅ It will skip fully-attached images and attach orphaned ones`);
          }
          
          // DETAILED PROCESSING LOG
          console.log(`\n📋 DETAILED PROCESSING LOG (${imageProcessingLog.size}/${selectedImages.length} images tracked):`);
          
          const actionCounts = {
            'UPLOADED_NEW': 0,
            'REUSED_EXISTING': 0,
            'VERIFIED_COMPLETE': 0,
            'SKIPPED': 0,
            'FAILED': 0,
            'NOT_TRACKED': 0
          };
          
                    // Group images by action
          const imagesByAction = {
            'UPLOADED_NEW': [],
            'REUSED_EXISTING': [],
            'VERIFIED_COMPLETE': [], 
            'SKIPPED': [],
            'FAILED': [],
            'NOT_TRACKED': []
          };
          
          // Track all selected images
          for (const selectedFName of selectedImages) {
            const log = imageProcessingLog.get(selectedFName);
            if (log) {
              actionCounts[log.action]++;
              // Safety check for imagesByAction array
              if (imagesByAction[log.action] && Array.isArray(imagesByAction[log.action])) {
                imagesByAction[log.action].push({ fname: selectedFName, ...log });
              } else {
                console.error(`imagesByAction[${log.action}] is not properly initialized as an array`);
                // Initialize if missing
                imagesByAction[log.action] = [{ fname: selectedFName, ...log }];
              }
            } else {
              actionCounts['NOT_TRACKED']++;
              // Safety check for imagesByAction array
              if (imagesByAction['NOT_TRACKED'] && Array.isArray(imagesByAction['NOT_TRACKED'])) {
                imagesByAction['NOT_TRACKED'].push({ fname: selectedFName, action: 'NOT_TRACKED', reason: 'no log entry found' });
              } else {
                console.error('imagesByAction[NOT_TRACKED] is not properly initialized as an array');
                // Initialize if missing
                imagesByAction['NOT_TRACKED'] = [{ fname: selectedFName, action: 'NOT_TRACKED', reason: 'no log entry found' }];
              }
            }
          }
          
          // Print summary by action
          console.log(`\n📈 ACTIONS BREAKDOWN:`);
          Object.entries(actionCounts).forEach(([action, count]) => {
            if (count > 0) {
              console.log(`   ${action}: ${count} images`);
            }
          });
          
          // Print detailed breakdown
          Object.entries(imagesByAction).forEach(([action, images]) => {
            if (images.length > 0) {
              console.log(`\n🔍 ${action} (${images.length} images):`);
              images.forEach((img, idx) => {
                console.log(`   ${idx + 1}. ${img.fname}`);
                console.log(`      Reason: ${img.reason || 'unknown'}`);
                if (img.mediaId) console.log(`      Media ID: ${img.mediaId}`);
                if (img.imageKey) console.log(`      Image Key: ${img.imageKey}`);
                if (img.filename) console.log(`      Filename: ${img.filename}`);
                if (img.attachedToProducts !== undefined) {
                  console.log(`      Attached to Products: ${img.attachedToProducts}/${img.totalMatchingProducts || 0}`);
                  if (img.productTitles && img.productTitles.length > 0) {
                    console.log(`      Product Titles: ${img.productTitles.join(', ')}`);
                  }
                }
                if (img.method) console.log(`      Method: ${img.method}`);
                if (img.searchMethod) console.log(`      Search Method: ${img.searchMethod}`);
                if (img.attachmentRate) console.log(`      Product Attachment: ${img.attachmentRate} products`);
                if (img.attachmentIssue) console.log(`      Attachment Status: ${img.attachmentIssue}`);
              });
            }
          });
          
          // STEP 3: Automatically assign variant main images for ALL products (not just imported ones)
          console.log(`\n🎯 STEP 3: Automatically assigning variant main images for ALL products...`);
          
          // Add delay to ensure images are fully processed before variant assignment
          console.log(`⏳ Waiting 5 seconds for images to be fully processed before variant assignment...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log(`✅ Delay complete - proceeding with variant assignment`);
          
          try {
            // Step 1: Get all products with variants and their metafields
            console.log("📋 Fetching all products with variants for automatic assignment...");
            
            // Implement batched processing to avoid query cost limits
            const allProducts = [];
            let hasNextPage = true;
            let cursor = null;
            let batchCount = 0;
            const batchSize = 20; // Reduced batch size to stay under cost limit
            
            while (hasNextPage && batchCount < 10) { // Safety limit of 10 batches (200 products max)
              batchCount++;
              console.log(`📦 Fetching batch ${batchCount} (${batchSize} products)...`);
              
              const productsResponse = await admin.graphql(`
                query ($first: Int!, $after: String) {
                  products(first: $first, after: $after) {
                    pageInfo {
                      hasNextPage
                      endCursor
                    }
                    edges {
                      node {
                        id
                        title
                        handle
                        metafields(first: 20) {
                          edges {
                            node {
                              namespace
                              key
                              value
                            }
                          }
                        }
                        variants(first: 50) {
                          edges {
                            node {
                              id
                              title
                              selectedOptions {
                                name
                                value
                              }
                              image {
                                id
                              }
                              metafields(first: 20) {
                                edges {
                                  node {
                                    namespace
                                    key
                                    value
                                  }
                                }
                              }
                            }
                          }
                        }
                        media(first: 250) {
                          pageInfo {
                            hasNextPage
                          }
                          edges {
                            node {
                              id
                              alt
                              ... on MediaImage {
                                image {
                                  url
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              `, {
                variables: {
                  first: batchSize,
                  after: cursor
                }
              });

              const productsResult = await productsResponse.json();
              
              if (productsResult.errors) {
                console.error("GraphQL errors:", productsResult.errors);
                throw new Error(`GraphQL error: ${productsResult.errors[0].message}`);
              }
              
              const products = productsResult.data?.products?.edges?.map(edge => edge.node) || [];
              allProducts.push(...products);
              
              // Update pagination info
              const pageInfo = productsResult.data?.products?.pageInfo;
              hasNextPage = pageInfo?.hasNextPage || false;
              cursor = pageInfo?.endCursor;
              
              console.log(`✅ Batch ${batchCount}: Fetched ${products.length} products (total: ${allProducts.length})`);
              
              // Add small delay between batches to be respectful to API
              if (hasNextPage) {
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
            
            console.log(`📊 Found ${allProducts.length} products total to process for variant assignment`);
            
            // Step 2: Process each product for variant image assignment
            for (const product of allProducts) {
              variantImageResults.variantsProcessed++;
              console.log(`\n🔍 Processing product for variant assignment: ${product.title}`);
              
              // Check if this product already has ALL variant images assigned
              const variants = product.variants.edges.map(edge => edge.node);
              const variantsWithImages = variants.filter(variant => variant.image && variant.image.id);
              const variantsWithoutImages = variants.filter(variant => !variant.image || !variant.image.id);
              
              if (variantsWithImages.length === variants.length) {
                console.log(`⏭️ Skipping product "${product.title}" - all ${variants.length} variants already have images assigned`);
                continue;
              }
              
              if (variantsWithImages.length > 0) {
                console.log(`🔄 Processing product "${product.title}" - ${variantsWithImages.length}/${variants.length} variants have images, ${variantsWithoutImages.length} still need images`);
              } else {
                console.log(`🔄 Processing product "${product.title}" - ${variants.length} variants need images`);
              }
              
              // Get StyleCode from multiple sources
              console.log(`🔍 Searching for StyleCode in product: ${product.title}`);
              
              // Method 1: Check product metafields
              const productStyleCodeMetafield = product.metafields.edges.find(edge => 
                edge.node.key === 'style_code' || edge.node.key === 'stylecode' || edge.node.key === 'StyleCode'
              );
              let productStyleCode = productStyleCodeMetafield?.node.value;
              
              // Method 2: Check variant metafields if not found in product
              if (!productStyleCode && variants.length > 0) {
                const firstVariant = variants[0];
                const variantStyleCodeMetafield = firstVariant.metafields?.edges?.find(edge => 
                  edge.node.key === 'style_code' || edge.node.key === 'stylecode' || edge.node.key === 'StyleCode'
                );
                productStyleCode = variantStyleCodeMetafield?.node.value;
                if (productStyleCode) {
                  console.log(`📝 Found StyleCode in variant metafields: ${productStyleCode}`);
                }
              }
              
              // Method 3: Try to extract StyleCode from product title or handle
              if (!productStyleCode) {
                // Look for Stanley/Stella style codes in title (e.g., "STTU171", "STSU177", etc.)
                const titleStyleCodeMatch = product.title.match(/ST[A-Z]{2}\d{3}/);
                if (titleStyleCodeMatch) {
                  productStyleCode = titleStyleCodeMatch[0];
                  console.log(`📝 Extracted StyleCode from title: ${productStyleCode}`);
                }
              }
              
              // Method 4: Check if we can infer StyleCode from available images
              if (!productStyleCode) {
                console.log(`🔍 No StyleCode found, checking available images for clues...`);
                const availableMedia = product.media.edges.map(edge => edge.node);
                
                // Look for style codes in image filenames or alt text
                for (const media of availableMedia) {
                  if (!media.image) continue;
                  
                  const imageUrl = media.image.url || '';
                  const altText = media.alt || '';
                  
                  // Check filename for style code pattern
                  const filenameStyleMatch = imageUrl.match(/ST[A-Z]{2}\d{3}/);
                  const altStyleMatch = altText.match(/ST[A-Z]{2}\d{3}/);
                  
                  if (filenameStyleMatch || altStyleMatch) {
                    productStyleCode = filenameStyleMatch?.[0] || altStyleMatch?.[0];
                    console.log(`📝 Inferred StyleCode from image: ${productStyleCode}`);
                    break;
                  }
                }
              }
              
              // Even if no StyleCode is found, we can still process variants using alt text matching
              // This is the key difference from the original logic - we don't skip products without StyleCode
              if (!productStyleCode) {
                console.log(`📝 No StyleCode found for product "${product.title}" - will use alt text matching only`);
              } else {
                console.log(`📝 Product StyleCode: ${productStyleCode}`);
              }
              
              // Process each variant
              for (const variantEdge of product.variants.edges) {
                const variant = variantEdge.node;
                
                // Skip variants that already have images
                if (variant.image && variant.image.id) {
                  console.log(`⏭️ Skipping variant ${variant.title} - already has image assigned`);
                  continue;
                }
                
                // Get color information from variant
                const colorOption = variant.selectedOptions.find(opt => opt.name.toLowerCase() === 'color');
                
                if (!colorOption) {
                  console.warn(`   ⚠️ Skipping variant ${variant.title} - missing color option`);
                  continue;
                }
                
                const colorValue = colorOption.value;
                console.log(`\n   🎨 Processing variant: ${variant.title} (${colorValue})`);
                
                // Extract ColorCode from variant color value (e.g., "Bubble Pink - C129" -> "C129")
                // Improved: Handle multiple color code patterns
                const colorCodePatterns = [
                  /C\d+/,    // Standard: C001, C129, etc.
                  /B\d+/,    // Burgundy codes: B001, B129, etc.
                  /G\d+/,    // Green codes: G001, G129, etc.
                  /R\d+/,    // Red codes: R001, R129, etc.
                  /Y\d+/,    // Yellow codes: Y001, Y129, etc.
                  /P\d+/,    // Purple codes: P001, P129, etc.
                  /N\d+/,    // Navy codes: N001, N129, etc.
                  /O\d+/,    // Orange codes: O001, O129, etc.
                  /W\d+/,    // White codes: W001, W129, etc.
                  /K\d+/,    // Black codes: K001, K129, etc.
                  /\b\d{3,4}\b/ // Fallback: any 3-4 digit number
                ];
                
                let variantColorCode = null;
                for (const pattern of colorCodePatterns) {
                  const match = colorValue.match(pattern);
                  if (match) {
                    variantColorCode = match[0];
                    break;
                  }
                }
                
                // Also try to extract color code from the end of the color value
                if (!variantColorCode) {
                  const parts = colorValue.split(' - ');
                  if (parts.length > 1) {
                    const lastPart = parts[parts.length - 1].trim();
                    if (lastPart.length >= 3 && lastPart.length <= 6) {
                      variantColorCode = lastPart;
                    }
                  }
                }
                
                console.log(`   📝 Variant ColorCode: ${variantColorCode || 'NOT FOUND'}`);
                console.log(`   📝 Original color value: "${colorValue}"`);
                
                // Continue processing even if no color code is found - we can still match by color name
                console.log(`   🔄 Processing variant ${variant.title} - will try all matching strategies`);
                
                // Look for image in product media that matches the color
                const availableMedia = product.media.edges.map(edge => edge.node);
                let matchingImage = null;
                
                // Enhanced matching strategy with multiple approaches
                const matchingStrategies = [
                  // Strategy 1: Exact StyleCode + ColorCode pattern matching
                  {
                    name: 'StyleCode_ColorCode pattern',
                    matcher: (media) => {
                      if (!productStyleCode || !variantColorCode) return false;
                      
                      const cacheKey = `${productStyleCode}_${variantColorCode}`;
                      const altText = media.alt || '';
                      const imageUrl = media.image?.url || '';
                      
                      return altText.includes(cacheKey) || imageUrl.includes(cacheKey);
                    }
                  },
                  
                  // Strategy 2: ColorCode in filename or alt text
                  {
                    name: 'ColorCode match',
                    matcher: (media) => {
                      if (!variantColorCode) return false;
                      
                      const altText = media.alt || '';
                      const imageUrl = media.image?.url || '';
                      
                      // Check various formats: _C001, C001_, C001.jpg, etc.
                      const patterns = [
                        new RegExp(`_${variantColorCode}[\\.\\s_]`),
                        new RegExp(`${variantColorCode}[\\.\\s_]`),
                        new RegExp(`_${variantColorCode}$`),
                        new RegExp(`${variantColorCode}$`)
                      ];
                      
                      return patterns.some(pattern => 
                        pattern.test(altText) || pattern.test(imageUrl)
                      );
                    }
                  },
                  
                  // Strategy 3: Color name matching (improved)
                  {
                    name: 'Color name match',
                    matcher: (media) => {
                      const altText = (media.alt || '').toLowerCase();
                      const imageUrl = (media.image?.url || '').toLowerCase();
                      
                      // Extract color name from variant (e.g., "Burgundy - C048" -> "burgundy")
                      const colorName = colorValue.split(' - ')[0].toLowerCase().trim();
                      
                      // Check if alt text or URL contains the color name
                      const altContainsColor = altText.includes(colorName);
                      const urlContainsColor = imageUrl.includes(colorName);
                      
                      // Also check reverse (color name contains alt text)
                      const colorContainsAlt = colorName.includes(altText) && altText.length > 2;
                      
                      return altContainsColor || urlContainsColor || colorContainsAlt;
                    }
                  },
                  
                  // Strategy 4: Partial color name matching
                  {
                    name: 'Partial color name match',
                    matcher: (media) => {
                      const altText = (media.alt || '').toLowerCase();
                      const imageUrl = (media.image?.url || '').toLowerCase();
                      
                      // Extract color name and create variations
                      const colorName = colorValue.split(' - ')[0].toLowerCase().trim();
                      const colorWords = colorName.split(' ');
                      
                      // Check if any word from the color name appears in alt text or URL
                      return colorWords.some(word => {
                        if (word.length < 3) return false; // Skip short words
                        return altText.includes(word) || imageUrl.includes(word);
                      });
                    }
                  },
                  
                  // Strategy 5: Fuzzy matching for common color variations
                  {
                    name: 'Fuzzy color match',
                    matcher: (media) => {
                      const altText = (media.alt || '').toLowerCase();
                      const imageUrl = (media.image?.url || '').toLowerCase();
                      const colorName = colorValue.split(' - ')[0].toLowerCase().trim();
                      
                      // Common color variations
                      const colorVariations = {
                        'burgundy': ['bordeaux', 'wine', 'maroon', 'crimson'],
                        'navy': ['darkblue', 'dark blue', 'midnight'],
                        'grey': ['gray', 'silver'],
                        'black': ['noir', 'dark'],
                        'white': ['blanc', 'cream', 'ivory'],
                        'yellow': ['gold', 'amber'],
                        'orange': ['coral', 'peach'],
                        'green': ['lime', 'olive', 'forest'],
                        'red': ['crimson', 'cherry', 'ruby'],
                        'blue': ['azure', 'royal', 'sky'],
                        'pink': ['rose', 'blush', 'magenta']
                      };
                      
                      // Check if any variation matches
                      const variations = colorVariations[colorName] || [];
                      return variations.some(variation => 
                        altText.includes(variation) || imageUrl.includes(variation)
                      );
                    }
                  },
                  
                  // Strategy 6: Exact color name match (no code required)
                  {
                    name: 'Exact color name only',
                    matcher: (media) => {
                      const altText = (media.alt || '').toLowerCase();
                      const colorName = colorValue.split(' - ')[0].toLowerCase().trim();
                      
                      // Look for exact color name match in alt text
                      return altText === colorName || altText === colorName.replace(/\s+/g, '');
                    }
                  },
                  
                  // Strategy 7: Single word color match for simple cases
                  {
                    name: 'Single word color match',
                    matcher: (media) => {
                      const altText = (media.alt || '').toLowerCase().trim();
                      const colorName = colorValue.split(' - ')[0].toLowerCase().trim();
                      
                      // If both are single words and match exactly
                      if (!altText.includes(' ') && !colorName.includes(' ')) {
                        return altText === colorName;
                      }
                      
                      // If alt text is just the color name (common case)
                      if (altText === colorName) {
                        return true;
                      }
                      
                      return false;
                    }
                  }
                ];
                
                // Try each matching strategy
                for (const strategy of matchingStrategies) {
                  console.log(`   🔍 Trying strategy: ${strategy.name}`);
                  
                  for (const media of availableMedia) {
                    if (!media.image) continue;
                    
                    if (strategy.matcher(media)) {
                      console.log(`   ✅ Found matching image via ${strategy.name}: "${media.alt}" (${media.id})`);
                      matchingImage = {
                        id: media.id,
                        alt: media.alt,
                        url: media.image.url
                      };
                      break;
                    }
                  }
                  
                  if (matchingImage) break;
                }
                
                // Enhanced debugging: show what images are available
                if (!matchingImage) {
                  console.log(`   📋 Available images for debugging:`);
                  availableMedia.slice(0, 10).forEach((media, index) => {
                    if (media.image) {
                      console.log(`      ${index + 1}. Alt: "${media.alt || 'NO ALT'}" | URL: ${media.image.url.substring(0, 80)}...`);
                    }
                  });
                  
                                  const patternInfo = productStyleCode && variantColorCode ? ` for ${productStyleCode}_${variantColorCode}` : '';
                console.warn(`   ❌ No image found${patternInfo} using any matching strategy`);
                // Safety check for variantImageResults.variantErrors array
                if (variantImageResults && variantImageResults.variantErrors && Array.isArray(variantImageResults.variantErrors)) {
                  variantImageResults.variantErrors.push(`Variant ${variant.title} (${colorValue}) - no matching image found${patternInfo}`);
                } else {
                  console.error('variantImageResults.variantErrors array is not properly initialized');
                }
                continue;
                }
                
                console.log(`   ✅ Found matching image: "${matchingImage.alt}" (ID: ${matchingImage.id})`);
                
                // Try to assign the image to the variant using GraphQL
                try {
                  console.log(`   🔄 Attempting to assign image to variant using GraphQL...`);
                  const assignmentResult = await assignImageToVariant(admin, product.id, variant.id, matchingImage);
                  if (assignmentResult && assignmentResult.success) {
                    console.log(`   ✅ SUCCESS: Variant image assigned automatically via ${assignmentResult.method}`);
                    if (assignmentResult.imageId) {
                      console.log(`   🎯 Assigned image ID: ${assignmentResult.imageId}`);
                    }
                    variantImageResults.imagesAssigned++;
                  } else {
                    console.error(`   ❌ Failed to assign image to variant ${variant.title} - ${assignmentResult?.error || 'Unknown error'}`);
                    // Safety check for variantImageResults.variantErrors array
                    if (variantImageResults && variantImageResults.variantErrors && Array.isArray(variantImageResults.variantErrors)) {
                      variantImageResults.variantErrors.push(`Failed to assign image to variant ${variant.title} - ${assignmentResult?.error || 'GraphQL assignment failed'}`);
                    } else {
                      console.error('variantImageResults.variantErrors array is not properly initialized');
                    }
                    
                    // Try alternative approach: productVariantUpdate with imageId
                    console.log(`   🔄 Trying alternative approach: productVariantUpdate...`);
                    try {
                      const variantUpdateResponse = await admin.graphql(`
                        mutation productVariantUpdate($input: ProductVariantInput!) {
                          productVariantUpdate(input: $input) {
                            productVariant {
                              id
                              image {
                                id
                                url
                              }
                            }
                            userErrors {
                              field
                              message
                            }
                          }
                        }
                      `, {
                        variables: {
                          input: {
                            id: variant.id,
                            imageId: matchingImage.id
                          }
                        }
                      });

                      const variantResult = await variantUpdateResponse.json();
                      
                      if (variantResult.errors) {
                        console.log(`⚠️ Alternative method GraphQL errors:`, variantResult.errors);
                      } else if (variantResult.data?.productVariantUpdate?.userErrors?.length > 0) {
                        console.log(`⚠️ Alternative method user errors:`, variantResult.data.productVariantUpdate.userErrors);
                      } else if (variantResult.data?.productVariantUpdate?.productVariant?.image?.id) {
                        const updatedVariant = variantResult.data.productVariantUpdate.productVariant;
                        console.log(`✅ Alternative method SUCCESS: Variant image assigned via productVariantUpdate`);
                        console.log(`   Updated variant image: ${updatedVariant.image.id}`);
                        variantImageResults.imagesAssigned++;
                      } else {
                        console.log(`⚠️ Alternative method also failed - no image assigned`);
                      }
                    } catch (altError) {
                      console.log(`⚠️ Alternative method failed:`, altError.message);
                    }
                  }
                } catch (error) {
                  console.error(`   ❌ Error assigning image to variant ${variant.title}:`, error);
                  // Safety check for variantImageResults.variantErrors array
                  if (variantImageResults && variantImageResults.variantErrors && Array.isArray(variantImageResults.variantErrors)) {
                    variantImageResults.variantErrors.push(`Error assigning image to variant ${variant.title}: ${error.message}`);
                  } else {
                    console.error('variantImageResults.variantErrors array is not properly initialized');
                  }
                }
              }
            }

            console.log(`\n🎯 Variant Image Assignment Summary:`);
            console.log(`   📊 Products processed: ${allProducts.length}`);
            console.log(`   📊 Variants processed: ${variantImageResults.variantsProcessed}`);
            console.log(`   ✅ Images assigned: ${variantImageResults.imagesAssigned}`);
            console.log(`   ❌ Assignment errors: ${variantImageResults.variantErrors.length}`);
            
            if (variantImageResults.variantErrors.length > 0) {
              console.log(`\n❌ Variant assignment errors:`);
              variantImageResults.variantErrors.slice(0, 10).forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
              });
            }

          } catch (variantAssignmentError) {
            console.error("❌ Automatic variant image assignment error:", variantAssignmentError);
            // Safety check for variantImageResults.variantErrors array
            if (variantImageResults && variantImageResults.variantErrors && Array.isArray(variantImageResults.variantErrors)) {
              variantImageResults.variantErrors.push(`Variant assignment process failed: ${variantAssignmentError.message}`);
            } else {
              console.error('variantImageResults.variantErrors array is not properly initialized');
            }
          }
          
          // PRODUCT ATTACHMENT ANALYSIS
          console.log(`\n📊 PRODUCT ATTACHMENT ANALYSIS:`);
          const attachmentStats = {
            totalWithProducts: 0,
            fullAttachment: 0,
            partialAttachment: 0,
            noAttachment: 0,
            totalExpectedAttachments: 0,
            actualAttachments: 0
          };
          
          for (const selectedFName of selectedImages) {
            const log = imageProcessingLog.get(selectedFName);
            if (log && log.totalMatchingProducts > 0) {
              attachmentStats.totalWithProducts++;
              attachmentStats.totalExpectedAttachments += log.totalMatchingProducts;
              attachmentStats.actualAttachments += log.attachedToProducts || 0;
              
              if ((log.attachedToProducts || 0) === 0) {
                attachmentStats.noAttachment++;
              } else if ((log.attachedToProducts || 0) < log.totalMatchingProducts) {
                attachmentStats.partialAttachment++;
              } else {
                attachmentStats.fullAttachment++;
              }
            }
          }
          
          console.log(`   📈 ATTACHMENT STATISTICS:`);
          console.log(`      Images with matching products: ${attachmentStats.totalWithProducts}`);
          console.log(`      ✅ Full attachment (all products): ${attachmentStats.fullAttachment}`);
          console.log(`      ⚠️ Partial attachment (some products): ${attachmentStats.partialAttachment}`);
          console.log(`      ❌ No attachment (no products): ${attachmentStats.noAttachment}`);
          console.log(`      📊 Overall attachment rate: ${attachmentStats.actualAttachments}/${attachmentStats.totalExpectedAttachments} (${attachmentStats.totalExpectedAttachments > 0 ? Math.round((attachmentStats.actualAttachments / attachmentStats.totalExpectedAttachments) * 100) : 0}%)`);
          
          if (attachmentStats.noAttachment > 0 || attachmentStats.partialAttachment > 0) {
            console.log(`\n🔍 ATTACHMENT ISSUES BREAKDOWN:`);
            for (const selectedFName of selectedImages) {
              const log = imageProcessingLog.get(selectedFName);
              if (log && log.totalMatchingProducts > 0 && (log.attachedToProducts || 0) < log.totalMatchingProducts) {
                console.log(`   ${selectedFName}:`);
                console.log(`      Expected: ${log.totalMatchingProducts} products`);
                console.log(`      Actual: ${log.attachedToProducts || 0} products`);
                console.log(`      Issue: ${log.attachmentIssue || 'Unknown'}`);
                if (log.productTitles) {
                  console.log(`      Products: ${log.productTitles.join(', ')}`);
                }
              }
            }
            
            console.log(`\n💡 TROUBLESHOOTING SUGGESTIONS:`);
            console.log(`   1. Check the logs above for specific fileUpdate errors`);
            console.log(`   2. Look for "User errors when attaching media" messages`);
            console.log(`   3. Common issues:`);
            console.log(`      - Media still processing (temporary)`);
            console.log(`      - Product or media not found`);
            console.log(`      - Network/API timeout issues`);
            console.log(`      - Shopify API rate limiting`);
            console.log(`   4. If many failed, try importing smaller batches`);
          }
          
          // Analysis
          console.log(`\n🔬 ANALYSIS:`);
          console.log(`   🎯 IMPROVED FOUR-STEP APPROACH:`);
          console.log(`      1. Upload: Enhanced search to detect existing files`);
          console.log(`      2. Reuse: Use existing media with clean filename (prevents UUID duplicates)`);
          console.log(`      3. Attach: Create fresh copies on products using productCreateMedia (guaranteed product attachment)`);
          console.log(`      4. Assign: Automatically assign ONE image per color as variant main image`);
          console.log(`   🧹 This prevents UUID duplicates like "SFM9_STTU964_C134_ea43c707-7c3e-4854-a1ea-daf644bc0ba5"`);
          console.log(`   ✅ Clean filenames like "SFM9_STTU964_C134" are detected and reused`);
          console.log(`   🔗 Product references are created using productCreateMedia (more reliable than fileUpdate)`);
          console.log(`   📚 ALL IMAGES appear in product media collections, not just variant main images`);
          
          if (actionCounts.UPLOADED_NEW + actionCounts.REUSED_EXISTING < selectedImages.length) {
            console.log(`   ⚠️ Only ${actionCounts.UPLOADED_NEW + actionCounts.REUSED_EXISTING}/${selectedImages.length} images made it to media library`);
            if (actionCounts.REUSED_EXISTING > 0) {
              console.log(`   📄 ${actionCounts.REUSED_EXISTING} images were reused (clean filename detection)`);
            }
            if (actionCounts.SKIPPED > 0) {
              console.log(`   ⏭️ ${actionCounts.SKIPPED} images were skipped (no matching products/colors)`);
            }
            if (actionCounts.FAILED > 0) {
              console.log(`   ❌ ${actionCounts.FAILED} images failed to upload`);
            }
                  } else {
            console.log(`   ✅ All selected images were processed successfully`);
          }
          
          if (successCount === 0) {
            console.log(`\n🔍 DIAGNOSIS: No images were imported. Possible reasons:`);
            console.log(`1. No products found matching the style names`);
            console.log(`2. No color variants matching the image colors`);
            console.log(`3. File upload/attachment errors`);
            console.log(`4. No images selected for import`);
          }
          
          // Safety check for errors array
          if (typeof errors !== 'undefined' && errors && Array.isArray(errors) && errors.length > 0) {
            console.log(`\n❌ Errors encountered:`);
            errors.forEach((error, index) => {
              console.log(`${index + 1}. ${error}`);
            });
          }
          
          // STEP 3: Automatically assign variant main images for imported images
          if (successCount > 0) {
            console.log(`\n🎯 STEP 3: Automatically assigning variant main images for ${successCount} imported images...`);
            
            // Add delay to ensure images are fully processed before variant assignment
            console.log(`⏳ Waiting 5 seconds for images to be fully processed before variant assignment...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            console.log(`✅ Delay complete - proceeding with variant assignment`);
            
            // Get unique product IDs from successfully imported images that were attached to products
            const affectedProductIds = new Set();
            
            // Add retry mechanism for product search to handle Shopify indexing delays
            const findProductWithRetry = async (productTitle, maxRetries = 3) => {
              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                  console.log(`🔍 Searching for product "${productTitle}" (attempt ${attempt}/${maxRetries})`);
                  
                  const productSearchQuery = await admin.graphql(`
                    query ($query: String!) {
                      products(first: 10, query: $query) {
                        edges {
                          node {
                            id
                            title
                          }
                        }
                      }
                    }
                  `, {
                    variables: { query: `title:"${productTitle}"` }
                  });
                  
                  const searchResult = await productSearchQuery.json();
                  const foundProducts = searchResult.data?.products?.edges || [];
                  
                  for (const edge of foundProducts) {
                    if (edge.node.title === productTitle) {
                      console.log(`✅ Found product ID for variant assignment: ${edge.node.id} (${productTitle}) on attempt ${attempt}`);
                      return edge.node.id;
                    }
                  }
                  
                  if (attempt < maxRetries) {
                    console.log(`⏳ Product "${productTitle}" not found yet, waiting 2 seconds before retry...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  } else {
                    console.warn(`⚠️ Could not find product "${productTitle}" after ${maxRetries} attempts`);
                  }
                } catch (searchError) {
                  console.warn(`⚠️ Search error for "${productTitle}" (attempt ${attempt}): ${searchError.message}`);
                  if (attempt < maxRetries) {
                    console.log(`⏳ Waiting 2 seconds before retry...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  }
                }
              }
              return null;
            };
            
            for (const [fname, log] of imageProcessingLog.entries()) {
              // Look for images that were successfully processed (any action that resulted in product attachment)
              if ((log.action === 'UPLOADED_NEW' || log.action === 'REUSED_EXISTING' || log.action === 'VERIFIED_COMPLETE') && 
                  log.productTitles && log.attachedToProducts > 0) {
                
                console.log(`📋 Processing ${fname} (${log.action}): attached to ${log.attachedToProducts} products`);
                
                // Find the actual product IDs for these products with retry mechanism
                for (const productTitle of log.productTitles) {
                  const productId = await findProductWithRetry(productTitle);
                  if (productId) {
                    affectedProductIds.add(productId);
                  }
                }
              } else {
                console.log(`⏭️ Skipping ${fname} for variant assignment: action=${log.action}, attachedToProducts=${log.attachedToProducts || 0}`);
              }
            }
            
            console.log(`🔍 Found ${affectedProductIds.size} products to process for variant image assignment`);
            
            if (affectedProductIds.size === 0) {
              console.log(`⚠️ No products found for variant assignment - images may not be attached to products yet`);
              console.log(`💡 This could happen if:`);
              console.log(`   1. Images are still being processed`);
              console.log(`   2. No matching products were found during import`);
              console.log(`   3. Product attachment failed`);
              console.log(`📝 Skipping variant assignment - images will be available for manual assignment later`);
            } else {
              // Add a delay to ensure products are fully indexed before variant assignment
              console.log(`⏳ Waiting 3 seconds for Shopify to fully index products before variant assignment...`);
              await new Promise(resolve => setTimeout(resolve, 3000));
              console.log(`🚀 Starting variant image assignment for ${affectedProductIds.size} products...`);
              // Process each affected product for variant image assignment
              for (const productId of affectedProductIds) {
              try {
                console.log(`🔄 Processing variant images for product: ${productId}`);
                
                // Get product details with variants and media
                const productQuery = await admin.graphql(`
                      query {
                    product(id: "${productId}") {
                      id
                      title
                      handle
                      metafields(first: 20) {
                        edges {
                          node {
                            namespace
                            key
                            value
                          }
                        }
                      }
                      variants(first: 50) {
                        edges {
                          node {
                            id
                            title
                            selectedOptions {
                              name
                              value
                            }
                            image {
                              id
                            }
                            metafields(first: 20) {
                              edges {
                                node {
                                  namespace
                                  key
                                  value
                                }
                              }
                            }
                          }
                        }
                      }
                      media(first: 100) {
                            edges {
                              node {
                                id
                                alt
                                ... on MediaImage {
                                  image {
                                    url
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    `);

                const productResponse = await productQuery.json();
                const product = productResponse.data?.product;
                
                if (!product) {
                  console.warn(`⚠️ Could not fetch product details for ${productId}`);
                  continue;
                }
                
                console.log(`📋 Processing product: ${product.title}`);
                
                // Get StyleCode for this product
                const productStyleCodeMetafield = product.metafields.edges.find(edge => 
                  edge.node.key === 'style_code' || edge.node.key === 'stylecode' || edge.node.key === 'StyleCode'
                );
                let productStyleCode = productStyleCodeMetafield?.node.value;
                
                // Extract from title if not in metafields
                if (!productStyleCode) {
                  const titleStyleCodeMatch = product.title.match(/ST[A-Z]{2}\d{3}/);
                  if (titleStyleCodeMatch) {
                    productStyleCode = titleStyleCodeMatch[0];
                  }
                }
                
                console.log(`📝 Product StyleCode: ${productStyleCode || 'NOT FOUND'}`);
                
                // Process ALL variants to assign all available images for each color
                const variants = product.variants.edges.map(edge => edge.node);
                const variantsWithoutImages = variants.filter(variant => !variant.image || !variant.image.id);
                
                console.log(`🔍 Found ${variants.length} total variants (${variantsWithoutImages.length} without images)`);
                console.log(`🎯 Will process ALL variants to assign all available images for each color`);
                
                // Group variants by color to ensure all images for each color get assigned
                const variantsByColor = {};
                for (const variant of variants) {
                  const colorOption = variant.selectedOptions.find(opt => opt.name.toLowerCase() === 'color');
                  if (colorOption) {
                    const colorValue = colorOption.value;
                    if (!variantsByColor[colorValue]) {
                      variantsByColor[colorValue] = [];
                    }
                    variantsByColor[colorValue].push(variant);
                  }
                }
                
                console.log(`🎨 Found ${Object.keys(variantsByColor).length} unique colors:`, Object.keys(variantsByColor));
                
                // Process each color group
                for (const [colorValue, colorVariants] of Object.entries(variantsByColor)) {
                  console.log(`\n🎨 Processing color group: ${colorValue} (${colorVariants.length} variants)`);
                  
                  // Find ALL images for this color
                  const colorImages = [];
                  const productMedia = product.media.edges.map(edge => edge.node);
                  
                  // Extract ColorCode from variant color value
                  const colorCodePatterns = [/C\d+/, /B\d+/, /G\d+/, /R\d+/, /Y\d+/, /P\d+/, /N\d+/, /O\d+/, /W\d+/, /K\d+/];
                  let variantColorCode = null;
                  
                  for (const pattern of colorCodePatterns) {
                    const match = colorValue.match(pattern);
                    if (match) {
                      variantColorCode = match[0];
                      break;
                    }
                  }
                  
                  console.log(`   📝 Color: ${colorValue}, ColorCode: ${variantColorCode || 'NOT FOUND'}`);
                  
                  // Search ALL product media for images matching this color
                  for (const media of productMedia) {
                    if (!media.image) {
                      console.log(`   ⏭️ Skipping media ${media.id} - no image data (still processing?)`);
                      continue;
                    }
                    
                    const altText = media.alt || '';
                    const imageUrl = media.image.url || '';
                    
                    // Check for UUID in filename
                    const hasUuid = imageUrl.includes('-') && imageUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                    if (hasUuid) {
                      console.log(`   ⚠️ Found UUID filename: ${imageUrl}`);
                    }
                    
                    // Skip if image URL is empty or still processing
                    if (!imageUrl || imageUrl.includes('processing') || imageUrl.includes('pending')) {
                      console.log(`   ⏭️ Skipping media ${media.id} - image still processing: ${imageUrl}`);
                      continue;
                    }
                    
                    let isMatch = false;
                    let matchReason = '';
                    
                    // Strategy 1: StyleCode + ColorCode pattern
                    if (productStyleCode && variantColorCode) {
                      const pattern = `${productStyleCode}_${variantColorCode}`;
                      if (altText.includes(pattern) || imageUrl.includes(pattern)) {
                        isMatch = true;
                        matchReason = 'StyleCode_ColorCode pattern';
                      }
                    }
                    
                    // Strategy 2: ColorCode match
                    if (!isMatch && variantColorCode && (altText.includes(variantColorCode) || imageUrl.includes(variantColorCode))) {
                      isMatch = true;
                      matchReason = 'ColorCode match';
                    }
                    
                    // Strategy 3: Color name match
                    if (!isMatch) {
                      const colorName = colorValue.split(' - ')[0].toLowerCase().trim();
                      if (colorName && (altText.toLowerCase().includes(colorName) || imageUrl.toLowerCase().includes(colorName))) {
                        isMatch = true;
                        matchReason = 'Color name match';
                      }
                    }
                    
                    if (isMatch) {
                      colorImages.push({
                        media: media,
                        reason: matchReason,
                        source: 'product media'
                      });
                      console.log(`   ✅ Found image in product media: ${media.id} (${matchReason})`);
                    }
                  }
                  
                  // If no images found in product media, search media library
                  if (colorImages.length === 0) {
                    console.log(`   🔍 No images found in product media, searching media library...`);
                    
                    try {
                      // Try multiple search strategies to find images in media library
                      const searchStrategies = [];
                      
                      if (productStyleCode && variantColorCode) {
                        searchStrategies.push({
                          query: `filename:*${productStyleCode}_${variantColorCode}*`,
                          description: `StyleCode_ColorCode pattern: ${productStyleCode}_${variantColorCode}`
                        });
                      }
                      
                      if (variantColorCode) {
                        searchStrategies.push({
                          query: `filename:*${variantColorCode}*`,
                          description: `ColorCode: ${variantColorCode}`
                        });
                      }
                      
                      const colorName = colorValue.split(' - ')[0].toLowerCase().trim();
                      if (colorName && colorName.length > 2) {
                        searchStrategies.push({
                          query: `filename:*${colorName}*`,
                          description: `Color name: ${colorName}`
                        });
                      }
                      
                      // Also try searching by alt text
                      if (productStyleCode && variantColorCode) {
                        searchStrategies.push({
                          query: `alt:*${productStyleCode}_${variantColorCode}*`,
                          description: `Alt text StyleCode_ColorCode: ${productStyleCode}_${variantColorCode}`
                        });
                      }
                      
                      console.log(`   🔍 Trying ${searchStrategies.length} search strategies in media library`);
                      
                      for (const strategy of searchStrategies) {
                        console.log(`   🔍 Strategy: ${strategy.description}`);
                        console.log(`   🔍 Query: ${strategy.query}`);
                        
                        const libraryMediaQuery = await admin.graphql(`
                          query {
                            files(first: 50, query: "${strategy.query}") {
                              edges {
                                node {
                              id
                              alt
                                  ... on MediaImage {
                                    image {
                                      url
                                    }
                                  }
                                }
                              }
                            }
                          }
                        `);

                        const libraryMediaResponse = await libraryMediaQuery.json();
                        const libraryMedia = libraryMediaResponse.data?.files?.edges?.map(edge => edge.node) || [];
                        
                        console.log(`   📋 Found ${libraryMedia.length} potential matches with this strategy`);
                        
                        // Search ALL library media for matches
                        for (const media of libraryMedia) {
                          if (!media.image) continue;
                          
                          const altText = media.alt || '';
                          const imageUrl = media.image.url || '';
                          const fileName = imageUrl.split('/').pop() || '';
                          let isMatch = false;
                          let matchReason = '';
                          
                          // Check if this is a clean filename (no UUID suffix)
                          const hasUuid = fileName.includes('-') && fileName.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                          const isCleanFilename = !hasUuid;
                          
                          // Strategy 1: StyleCode + ColorCode pattern in filename
                          if (productStyleCode && variantColorCode) {
                            const pattern = `${productStyleCode}_${variantColorCode}`;
                            if (fileName.includes(pattern) || altText.includes(pattern) || imageUrl.includes(pattern)) {
                              isMatch = true;
                              matchReason = `StyleCode_ColorCode pattern ${isCleanFilename ? '(clean)' : '(UUID)'}`;
                            }
                          }
                          
                          // Strategy 2: ColorCode match in filename
                          if (!isMatch && variantColorCode && (fileName.includes(variantColorCode) || altText.includes(variantColorCode) || imageUrl.includes(variantColorCode))) {
                            isMatch = true;
                            matchReason = `ColorCode match ${isCleanFilename ? '(clean)' : '(UUID)'}`;
                          }
                          
                          // Strategy 3: Color name match
                          if (!isMatch) {
                            const colorName = colorValue.split(' - ')[0].toLowerCase().trim();
                            if (colorName && (fileName.toLowerCase().includes(colorName) || altText.toLowerCase().includes(colorName) || imageUrl.toLowerCase().includes(colorName))) {
                              isMatch = true;
                              matchReason = `Color name match ${isCleanFilename ? '(clean)' : '(UUID)'}`;
                            }
                          }
                          
                          if (isMatch) {
                            colorImages.push({
                              media: media,
                              reason: matchReason,
                              source: 'media library'
                            });
                            console.log(`   ✅ Found image in media library: ${media.id} (${matchReason})`);
                          }
                        }
                        
                        // If we found images with this strategy, break out of the search loop
                        if (colorImages.length > 0) {
                          console.log(`   ✅ Found ${colorImages.length} images with strategy: ${strategy.description}`);
                          break;
                        }
                      }
                      
                    } catch (librarySearchError) {
                      console.error(`   ❌ Error searching media library:`, librarySearchError);
                    }
                  }
                  
                  console.log(`   📊 Found ${colorImages.length} total images for color ${colorValue}`);
                  
                  // ATTACH MEDIA LIBRARY IMAGES TO PRODUCT: If we found images in media library, attach them to the product first
                  const mediaLibraryImages = colorImages.filter(img => img.source === 'media library');
                  if (mediaLibraryImages.length > 0) {
                    console.log(`   🔗 Attaching ${mediaLibraryImages.length} media library images to product before variant assignment...`);
                    
                    for (const libraryImage of mediaLibraryImages) {
                      try {
                        console.log(`   📎 Attaching media library image ${libraryImage.media.id} to product ${product.title}`);
                        
                        const attachmentSuccess = await attachExistingMediaToProductWithRetry(
                          admin,
                          product.id,
                          libraryImage.media.id,
                          libraryImage.media.alt || '',
                          3 // Reduced retries for variant assignment
                        );
                        
                        if (attachmentSuccess) {
                          console.log(`   ✅ Successfully attached media library image to product`);
                          // Update the source to indicate it's now in product media
                          libraryImage.source = 'product media (attached)';
                        } else {
                          console.log(`   ❌ Failed to attach media library image to product - will skip variant assignment`);
                          // Remove from colorImages if attachment failed
                          const index = colorImages.indexOf(libraryImage);
                          if (index > -1) {
                            colorImages.splice(index, 1);
                          }
                        }
                      } catch (attachmentError) {
                        console.error(`   ❌ Error attaching media library image:`, attachmentError.message);
                        // Remove from colorImages if attachment failed
                        const index = colorImages.indexOf(libraryImage);
                        if (index > -1) {
                          colorImages.splice(index, 1);
                        }
                      }
                      
                      // Small delay between attachments
                      await new Promise(resolve => setTimeout(resolve, 200));
                    }
                    
                    console.log(`   📊 After attachment: ${colorImages.length} images available for variant assignment`);
                  }
                  
                  if (colorImages.length === 0) {
                    console.warn(`   ❌ No images found for color ${colorValue}`);
                      continue;
                    }
                    
                  // Assign ONLY ONE image per color as variant main image (to variants without existing images)
                  // Additional images will remain in product media library
                  const variantsNeedingImages = colorVariants.filter(variant => !variant.image || !variant.image.id);
                  const variantsWithImages = colorVariants.filter(variant => variant.image && variant.image.id);
                  
                  console.log(`   📋 Color ${colorValue}: ${variantsNeedingImages.length} variants need images, ${variantsWithImages.length} already have images`);
                  console.log(`   📊 Strategy: Assign 1 image as variant main image, leave ${colorImages.length - 1} additional images in product media`);
                  
                  let variantImagesAssigned = 0;
                  
                  // Assign to ALL variants of this color that don't have images
                  if (variantsNeedingImages.length > 0 && colorImages.length > 0) {
                    // Pick the best image for variant assignment (prefer first match)
                    const imageForVariant = colorImages[0];
                    
                    console.log(`   🔄 Assigning main image to ALL ${variantsNeedingImages.length} variants of color ${colorValue} (${imageForVariant.reason})`);
                    console.log(`   📝 Selected image: ${imageForVariant.media.id} from ${imageForVariant.source}`);
                    
                    // Assign the same image to ALL variants of this color that need images
                    for (const targetVariant of variantsNeedingImages) {
                      variantImageResults.variantsProcessed++;
                      
                      console.log(`   🔄 Assigning image to variant ${targetVariant.title}`);
                      
                      // Retry mechanism for variant assignment
                      let assignmentSuccess = false;
                      const maxRetries = 3;
                      
                      for (let retryAttempt = 1; retryAttempt <= maxRetries; retryAttempt++) {
                        try {
                          console.log(`   🔄 Attempt ${retryAttempt}/${maxRetries} to assign image to variant ${targetVariant.title}`);
                          
                          const assignmentResult = await admin.graphql(`
                            mutation productVariantAppendMedia($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) {
                              productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) {
                                productVariants {
                                  id
                                  image {
                                    id
                                    url
                                  }
                                }
                                userErrors {
                                  field
                                  message
                                }
                              }
                            }
                          `, {
                            variables: {
                              productId: productId,
                              variantMedia: [{
                                variantId: targetVariant.id,
                                mediaIds: [imageForVariant.media.id]
                              }]
                            }
                          });

                          const assignmentResponse = await assignmentResult.json();
                          
                          if (assignmentResponse.data?.productVariantAppendMedia?.productVariants?.length > 0) {
                            const updatedVariant = assignmentResponse.data.productVariantAppendMedia.productVariants[0];
                            if (updatedVariant.image?.id) {
                              console.log(`   ✅ Successfully assigned main image to variant ${targetVariant.title} (attempt ${retryAttempt})`);
                              variantImageResults.imagesAssigned++;
                              variantImagesAssigned++;
                              assignmentSuccess = true;
                              break;
                            }
                          } else if (assignmentResponse.data?.productVariantAppendMedia?.userErrors?.length > 0) {
                            const userErrors = assignmentResponse.data.productVariantAppendMedia.userErrors;
                            
                            // Check if error is due to media still processing
                            const processingError = userErrors.some(e => 
                              e.message.toLowerCase().includes('processing') || 
                              e.message.toLowerCase().includes('not found') ||
                              e.message.toLowerCase().includes('unavailable')
                            );
                            
                            if (processingError && retryAttempt < maxRetries) {
                              const waitTime = retryAttempt * 2000; // 2s, 4s, 6s
                              console.log(`   ⏳ Media still processing, waiting ${waitTime}ms before retry...`);
                              await new Promise(resolve => setTimeout(resolve, waitTime));
                              continue;
                            }
                            
                            console.warn(`   ⚠️ User errors assigning image to variant ${targetVariant.title}:`, userErrors);
                            // Safety check for variantImageResults.variantErrors array
                            if (variantImageResults && variantImageResults.variantErrors && Array.isArray(variantImageResults.variantErrors)) {
                              variantImageResults.variantErrors.push(`${targetVariant.title}: ${userErrors.map(e => e.message).join(', ')}`);
                            } else {
                              console.error('variantImageResults.variantErrors array is not properly initialized');
                            }
                            break;
                          }
                          
                        } catch (assignError) {
                          console.error(`   ❌ Error assigning image to variant ${targetVariant.title} (attempt ${retryAttempt}):`, assignError);
                          
                          if (retryAttempt < maxRetries) {
                            const waitTime = retryAttempt * 1000;
                            console.log(`   ⏳ Waiting ${waitTime}ms before retry...`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                            continue;
                          }
                          
                          // Safety check for variantImageResults.variantErrors array
                          if (variantImageResults && variantImageResults.variantErrors && Array.isArray(variantImageResults.variantErrors)) {
                            variantImageResults.variantErrors.push(`${targetVariant.title}: ${assignError.message}`);
                          } else {
                            console.error('variantImageResults.variantErrors array is not properly initialized');
                          }
                          break;
                        }
                      }
                      
                      if (!assignmentSuccess) {
                        console.warn(`   ❌ Failed to assign image to variant ${targetVariant.title} after ${maxRetries} attempts`);
                      }
                    }
                  } else if (variantsNeedingImages.length === 0) {
                    console.log(`   ⏭️ All variants for ${colorValue} already have images - skipping variant assignment`);
                  } else {
                    console.log(`   ⏭️ No images found for ${colorValue} - skipping variant assignment`);
                  }
                  
                  // Log the final summary for this color
                  const imagesInProductMedia = colorImages.length;
                  const imagesAssignedToVariants = variantImagesAssigned;
                  const imagesInMediaOnly = imagesInProductMedia - imagesAssignedToVariants;
                  
                  console.log(`   📊 Color ${colorValue} summary:`);
                  console.log(`      📁 Total images in product media: ${imagesInProductMedia}`);
                  console.log(`      🎯 Images assigned as variant main image: ${imagesAssignedToVariants}`);
                  console.log(`      📚 Images remaining in product media library: ${imagesInMediaOnly}`);
                }
                
                // Color-grouped logic implemented above to assign all images for each color
                
              } catch (productError) {
                console.error(`❌ Error processing product ${productId}:`, productError);
                // Safety check for variantImageResults.variantErrors array
                if (variantImageResults && variantImageResults.variantErrors && Array.isArray(variantImageResults.variantErrors)) {
                  variantImageResults.variantErrors.push(`Product ${productId}: ${productError.message}`);
                } else {
                  console.error('variantImageResults.variantErrors array is not properly initialized');
                }
              }
            }
            
            console.log(`\n🎯 Variant Image Assignment Summary:`);
            console.log(`   📊 Variants processed: ${variantImageResults.variantsProcessed}`);
            console.log(`   ✅ Images assigned: ${variantImageResults.imagesAssigned}`);
            console.log(`   ❌ Assignment errors: ${variantImageResults.variantErrors.length}`);
            
            if (variantImageResults.variantErrors.length > 0) {
              console.log(`\n❌ Variant assignment errors:`);
              variantImageResults.variantErrors.slice(0, 10).forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
              });
            }
              } // Close the else block
          }
          
          return json({
            success: true,
            importResult: {
              imported: successCount,
              errors: errorCount,
              skipped: skippedCount,
              total: selectedImages.length,
              errorDetails: errors,
              variantAssignment: variantImageResults
            }
          });
          
        } catch (error) {
          console.error("Import error:", error);
          return json({
            success: false,
            error: error.message
          });
        }
      } else if (action === "assignVariantImages") {
        console.log("🖼️ Starting automatic variant image assignment based on StyleCode and ColorCode...");
        console.log("📦 Processing all products automatically (no product selection required)");
        
        const results = {
          productsProcessed: 0,
          productsSkipped: 0,
          variantsProcessed: 0,
          imagesAssigned: 0,
          variantsDeleted: 0,
          errors: []
        };
        
        try {
          // Step 1: Get all products with variants and their metafields
          console.log("📋 Fetching products with variants...");
          
          // Implement batched processing to avoid query cost limits
          const allProducts = [];
          let hasNextPage = true;
          let cursor = null;
          let batchCount = 0;
          const batchSize = 20; // Reduced batch size to stay under cost limit
          
          while (hasNextPage && batchCount < 10) { // Safety limit of 10 batches (200 products max)
            batchCount++;
            console.log(`📦 Fetching batch ${batchCount} (${batchSize} products)...`);
            
            const productsResponse = await admin.graphql(`
              query ($first: Int!, $after: String) {
                products(first: $first, after: $after) {
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  edges {
                    node {
                      id
                      title
                      handle
                      metafields(first: 20) {
                        edges {
                          node {
                            namespace
                            key
                            value
                          }
                        }
                      }
                      variants(first: 50) {
                        edges {
                          node {
                            id
                            title
                            selectedOptions {
                              name
                              value
                            }
                            image {
                              id
                            }
                            metafields(first: 20) {
                              edges {
                                node {
                                  namespace
                                  key
                                  value
                                }
                              }
                            }
                          }
                        }
                      }
                      media(first: 250) {
                        pageInfo {
                          hasNextPage
                        }
                        edges {
                          node {
                            id
                            alt
                            ... on MediaImage {
                              image {
                                url
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            `, {
              variables: {
                first: batchSize,
                after: cursor
              }
            });

            const productsResult = await productsResponse.json();
            
            if (productsResult.errors) {
              console.error("GraphQL errors:", productsResult.errors);
              throw new Error(`GraphQL error: ${productsResult.errors[0].message}`);
            }
            
            const products = productsResult.data?.products?.edges?.map(edge => edge.node) || [];
            allProducts.push(...products);
            
            // Update pagination info
            const pageInfo = productsResult.data?.products?.pageInfo;
            hasNextPage = pageInfo?.hasNextPage || false;
            cursor = pageInfo?.endCursor;
            
            console.log(`✅ Batch ${batchCount}: Fetched ${products.length} products (total: ${allProducts.length})`);
            
            // Add small delay between batches to be respectful to API
            if (hasNextPage) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          console.log(`📊 Found ${allProducts.length} products total to process`);
          
          // Step 2: Process each product
          for (const product of allProducts) {
            results.productsProcessed++;
            console.log(`\n🔍 Processing product: ${product.title}`);
            
            // Check if this product already has ALL variant images assigned
            const variants = product.variants.edges.map(edge => edge.node);
            const variantsWithImages = variants.filter(variant => variant.image && variant.image.id);
            const variantsWithoutImages = variants.filter(variant => !variant.image || !variant.image.id);
            
            if (variantsWithImages.length === variants.length) {
              console.log(`⏭️ Skipping product "${product.title}" - all ${variants.length} variants already have images assigned`);
              results.productsSkipped++;
              continue;
            }
            
            if (variantsWithImages.length > 0) {
              console.log(`🔄 Processing product "${product.title}" - ${variantsWithImages.length}/${variants.length} variants have images, ${variantsWithoutImages.length} still need images`);
            } else {
              console.log(`🔄 Processing product "${product.title}" - ${variants.length} variants need images`);
            }
            
            // Get StyleCode from multiple sources
            console.log(`🔍 Searching for StyleCode in product: ${product.title}`);
            
            // Method 1: Check product metafields
            const productStyleCodeMetafield = product.metafields.edges.find(edge => 
              edge.node.key === 'style_code' || edge.node.key === 'stylecode' || edge.node.key === 'StyleCode'
            );
            let productStyleCode = productStyleCodeMetafield?.node.value;
            
            // Method 2: Check variant metafields if not found in product
            if (!productStyleCode && variants.length > 0) {
              const firstVariant = variants[0];
              const variantStyleCodeMetafield = firstVariant.metafields?.edges?.find(edge => 
                edge.node.key === 'style_code' || edge.node.key === 'stylecode' || edge.node.key === 'StyleCode'
              );
              productStyleCode = variantStyleCodeMetafield?.node.value;
              if (productStyleCode) {
                console.log(`📝 Found StyleCode in variant metafields: ${productStyleCode}`);
              }
            }
            
            // Method 3: Try to extract StyleCode from product title or handle
            if (!productStyleCode) {
              // Look for Stanley/Stella style codes in title (e.g., "STTU171", "STSU177", etc.)
              const titleStyleCodeMatch = product.title.match(/ST[A-Z]{2}\d{3}/);
              if (titleStyleCodeMatch) {
                productStyleCode = titleStyleCodeMatch[0];
                console.log(`📝 Extracted StyleCode from title: ${productStyleCode}`);
              }
            }
            
            // Method 4: Check if we can infer StyleCode from available images
            if (!productStyleCode) {
              console.log(`🔍 No StyleCode found, checking available images for clues...`);
              const availableMedia = product.media.edges.map(edge => edge.node);
              
              // Look for style codes in image filenames or alt text
              for (const media of availableMedia) {
                if (!media.image) continue;
                
                const imageUrl = media.image.url || '';
                const altText = media.alt || '';
                
                // Check filename for style code pattern
                const filenameStyleMatch = imageUrl.match(/ST[A-Z]{2}\d{3}/);
                const altStyleMatch = altText.match(/ST[A-Z]{2}\d{3}/);
                
                if (filenameStyleMatch || altStyleMatch) {
                  productStyleCode = filenameStyleMatch?.[0] || altStyleMatch?.[0];
                  console.log(`📝 Inferred StyleCode from image: ${productStyleCode}`);
                  break;
                }
              }
            }
            
            // Even if no StyleCode is found, we can still process variants using alt text matching
            // This is the key difference from the original logic - we don't skip products without StyleCode
            if (!productStyleCode) {
              console.log(`📝 No StyleCode found for product "${product.title}" - will use alt text matching only`);
            } else {
              console.log(`📝 Product StyleCode: ${productStyleCode}`);
            }
            
            // Process each variant
            for (const variantEdge of product.variants.edges) {
              const variant = variantEdge.node;
              results.variantsProcessed++;
              
              // Skip variants that already have images
              if (variant.image && variant.image.id) {
                console.log(`⏭️ Skipping variant ${variant.title} - already has image assigned`);
                continue;
              }
              
              // Get color information from variant
              const colorOption = variant.selectedOptions.find(opt => opt.name.toLowerCase() === 'color');
              
              if (!colorOption) {
                console.warn(`   ⚠️ Skipping variant ${variant.title} - missing color option`);
                continue;
              }
              
              const colorValue = colorOption.value;
              console.log(`\n   🎨 Processing variant: ${variant.title} (${colorValue})`);
              
              // Extract ColorCode from variant color value (e.g., "Bubble Pink - C129" -> "C129")
              // Improved: Handle multiple color code patterns
              const colorCodePatterns = [
                /C\d+/,    // Standard: C001, C129, etc.
                /B\d+/,    // Burgundy codes: B001, B129, etc.
                /G\d+/,    // Green codes: G001, G129, etc.
                /R\d+/,    // Red codes: R001, R129, etc.
                /Y\d+/,    // Yellow codes: Y001, Y129, etc.
                /P\d+/,    // Purple codes: P001, P129, etc.
                /N\d+/,    // Navy codes: N001, N129, etc.
                /O\d+/,    // Orange codes: O001, O129, etc.
                /W\d+/,    // White codes: W001, W129, etc.
                /K\d+/,    // Black codes: K001, K129, etc.
                /\b\d{3,4}\b/ // Fallback: any 3-4 digit number
              ];
              
              let variantColorCode = null;
              for (const pattern of colorCodePatterns) {
                const match = colorValue.match(pattern);
                if (match) {
                  variantColorCode = match[0];
                  break;
                }
              }
              
              // Also try to extract color code from the end of the color value
              if (!variantColorCode) {
                const parts = colorValue.split(' - ');
                if (parts.length > 1) {
                  const lastPart = parts[parts.length - 1].trim();
                  if (lastPart.length >= 3 && lastPart.length <= 6) {
                    variantColorCode = lastPart;
                  }
                }
              }
              
                          console.log(`   📝 Variant ColorCode: ${variantColorCode || 'NOT FOUND'}`);
            console.log(`   📝 Original color value: "${colorValue}"`);
            
            // Continue processing even if no color code is found - we can still match by color name
            console.log(`   🔄 Processing variant ${variant.title} - will try all matching strategies`);
              
              // Look for image in product media that matches the color
              const availableMedia = product.media.edges.map(edge => edge.node);
              let matchingImage = null;
              
              // Enhanced matching strategy with multiple approaches
              const matchingStrategies = [
                // Strategy 1: Exact StyleCode + ColorCode pattern matching
                {
                  name: 'StyleCode_ColorCode pattern',
                  matcher: (media) => {
                    if (!productStyleCode || !variantColorCode) return false;
                    
                const cacheKey = `${productStyleCode}_${variantColorCode}`;
                    const altText = media.alt || '';
                    const imageUrl = media.image?.url || '';
                    
                    return altText.includes(cacheKey) || imageUrl.includes(cacheKey);
                  }
                },
                
                // Strategy 2: ColorCode in filename or alt text
                {
                  name: 'ColorCode match',
                  matcher: (media) => {
                    if (!variantColorCode) return false;
                  
                  const altText = media.alt || '';
                    const imageUrl = media.image?.url || '';
                    
                    // Check various formats: _C001, C001_, C001.jpg, etc.
                    const patterns = [
                      new RegExp(`_${variantColorCode}[\\.\\s_]`),
                      new RegExp(`${variantColorCode}[\\.\\s_]`),
                      new RegExp(`_${variantColorCode}$`),
                      new RegExp(`${variantColorCode}$`)
                    ];
                    
                    return patterns.some(pattern => 
                      pattern.test(altText) || pattern.test(imageUrl)
                    );
                  }
                },
                
                // Strategy 3: Color name matching (improved)
                {
                  name: 'Color name match',
                  matcher: (media) => {
                    const altText = (media.alt || '').toLowerCase();
                    const imageUrl = (media.image?.url || '').toLowerCase();
                    
                    // Extract color name from variant (e.g., "Burgundy - C048" -> "burgundy")
                    const colorName = colorValue.split(' - ')[0].toLowerCase().trim();
                    
                    // Check if alt text or URL contains the color name
                    const altContainsColor = altText.includes(colorName);
                    const urlContainsColor = imageUrl.includes(colorName);
                    
                    // Also check reverse (color name contains alt text)
                    const colorContainsAlt = colorName.includes(altText) && altText.length > 2;
                    
                    return altContainsColor || urlContainsColor || colorContainsAlt;
                  }
                },
                
                // Strategy 4: Partial color name matching
                {
                  name: 'Partial color name match',
                  matcher: (media) => {
                    const altText = (media.alt || '').toLowerCase();
                    const imageUrl = (media.image?.url || '').toLowerCase();
                    
                    // Extract color name and create variations
                    const colorName = colorValue.split(' - ')[0].toLowerCase().trim();
                    const colorWords = colorName.split(' ');
                    
                    // Check if any word from the color name appears in alt text or URL
                    return colorWords.some(word => {
                      if (word.length < 3) return false; // Skip short words
                      return altText.includes(word) || imageUrl.includes(word);
                    });
                  }
                },
                
                                 // Strategy 5: Fuzzy matching for common color variations
                 {
                   name: 'Fuzzy color match',
                   matcher: (media) => {
                     const altText = (media.alt || '').toLowerCase();
                     const imageUrl = (media.image?.url || '').toLowerCase();
                     const colorName = colorValue.split(' - ')[0].toLowerCase().trim();
                     
                     // Common color variations
                     const colorVariations = {
                       'burgundy': ['bordeaux', 'wine', 'maroon', 'crimson'],
                       'navy': ['darkblue', 'dark blue', 'midnight'],
                       'grey': ['gray', 'silver'],
                       'black': ['noir', 'dark'],
                       'white': ['blanc', 'cream', 'ivory'],
                       'yellow': ['gold', 'amber'],
                       'purple': ['violet', 'magenta'],
                       'orange': ['coral', 'peach'],
                       'green': ['lime', 'olive', 'forest'],
                       'red': ['crimson', 'cherry', 'ruby'],
                       'blue': ['azure', 'royal', 'sky'],
                       'pink': ['rose', 'blush', 'magenta']
                     };
                     
                     // Check if any variation matches
                     const variations = colorVariations[colorName] || [];
                     return variations.some(variation => 
                       altText.includes(variation) || imageUrl.includes(variation)
                     );
                   }
                 },
                 
                 // Strategy 6: Exact color name match (no code required)
                 {
                   name: 'Exact color name only',
                   matcher: (media) => {
                     const altText = (media.alt || '').toLowerCase();
                     const colorName = colorValue.split(' - ')[0].toLowerCase().trim();
                     
                     // Look for exact color name match in alt text
                     return altText === colorName || altText === colorName.replace(/\s+/g, '');
                   }
                 },
                 
                 // Strategy 7: Single word color match for simple cases
                 {
                   name: 'Single word color match',
                   matcher: (media) => {
                     const altText = (media.alt || '').toLowerCase().trim();
                     const colorName = colorValue.split(' - ')[0].toLowerCase().trim();
                     
                     // If both are single words and match exactly
                     if (!altText.includes(' ') && !colorName.includes(' ')) {
                       return altText === colorName;
                     }
                     
                     // If alt text is just the color name (common case)
                     if (altText === colorName) {
                       return true;
                     }
                     
                     return false;
                   }
                 }
              ];
              
              // Try each matching strategy
              for (const strategy of matchingStrategies) {
                console.log(`   🔍 Trying strategy: ${strategy.name}`);
                
                for (const media of availableMedia) {
                  if (!media.image) continue;
                  
                  if (strategy.matcher(media)) {
                    console.log(`   ✅ Found matching image via ${strategy.name}: "${media.alt}" (${media.id})`);
                    matchingImage = {
                      id: media.id,
                      alt: media.alt,
                      url: media.image.url
                    };
                    break;
                  }
                }
                
                if (matchingImage) break;
              }
              
              // Enhanced debugging: show what images are available
              if (!matchingImage) {
                console.log(`   📋 Available images for debugging:`);
                availableMedia.slice(0, 10).forEach((media, index) => {
                  if (media.image) {
                    console.log(`      ${index + 1}. Alt: "${media.alt || 'NO ALT'}" | URL: ${media.image.url.substring(0, 80)}...`);
                  }
                });
                
                const patternInfo = productStyleCode && variantColorCode ? ` for ${productStyleCode}_${variantColorCode}` : '';
                console.warn(`   ❌ No image found${patternInfo} using any matching strategy`);
                // Safety check for results.errors array
                if (results && results.errors && Array.isArray(results.errors)) {
                  results.errors.push(`Variant ${variant.title} (${colorValue}) - no matching image found${patternInfo}`);
                } else if (typeof globalThis !== 'undefined' && globalThis.errors && Array.isArray(globalThis.errors)) {
                  globalThis.errors.push(`Variant ${variant.title} (${colorValue}) - no matching image found${patternInfo}`);
                } else {
                  console.error('Results errors array is not properly initialized in variant assignment');
                }
                continue;
              }
              
              console.log(`   ✅ Found matching image: "${matchingImage.alt}" (ID: ${matchingImage.id})`);
              
                              // Try to assign the image to the variant using GraphQL
                try {
                  console.log(`   🔄 Attempting to assign image to variant using GraphQL...`);
                  
                  // Try direct productVariantUpdate first (most reliable method)
                  try {
                    const variantUpdateResponse = await admin.graphql(`
                      mutation productVariantUpdate($input: ProductVariantInput!) {
                        productVariantUpdate(input: $input) {
                          productVariant {
                            id
                            image {
                              id
                              url
                            }
                          }
                          userErrors {
                            field
                            message
                          }
                        }
                      }
                    `, {
                      variables: {
                        input: {
                          id: variant.id,
                          imageId: matchingImage.id
                        }
                      }
                    });

                    const variantResult = await variantUpdateResponse.json();
                    
                    if (variantResult.errors) {
                      console.log(`⚠️ Direct variant update GraphQL errors:`, variantResult.errors);
                    } else if (variantResult.data?.productVariantUpdate?.userErrors?.length > 0) {
                      console.log(`⚠️ Direct variant update user errors:`, variantResult.data.productVariantUpdate.userErrors);
                    } else if (variantResult.data?.productVariantUpdate?.productVariant?.image?.id) {
                      const updatedVariant = variantResult.data.productVariantUpdate.productVariant;
                      console.log(`✅ SUCCESS: Variant image assigned via direct productVariantUpdate`);
                      console.log(`   🎯 Assigned image ID: ${updatedVariant.image.id}`);
                      results.imagesAssigned++;
                      continue; // Skip the complex assignImageToVariant function
                    }
                  } catch (directError) {
                    console.log(`⚠️ Direct variant update failed:`, directError.message);
                  }
                  
                  // Fallback to the complex assignImageToVariant function
                  const assignmentResult = await assignImageToVariant(admin, product.id, variant.id, matchingImage);
                  if (assignmentResult && assignmentResult.success) {
                    console.log(`   ✅ SUCCESS: Variant image assigned automatically via ${assignmentResult.method}`);
                    if (assignmentResult.imageId) {
                      console.log(`   🎯 Assigned image ID: ${assignmentResult.imageId}`);
                    }
                    results.imagesAssigned++;
                  } else {
                    console.error(`   ❌ Failed to assign image to variant ${variant.title} - ${assignmentResult?.error || 'Unknown error'}`);
                    // Safety check for results.errors array
                    if (results && results.errors && Array.isArray(results.errors)) {
                      results.errors.push(`Failed to assign image to variant ${variant.title} - ${assignmentResult?.error || 'GraphQL assignment failed'}`);
                    } else if (typeof globalThis !== 'undefined' && globalThis.errors && Array.isArray(globalThis.errors)) {
                      globalThis.errors.push(`Failed to assign image to variant ${variant.title} - ${assignmentResult?.error || 'GraphQL assignment failed'}`);
                    } else {
                      console.error('Results errors array is not properly initialized in variant assignment failure');
                    }
                  }
                } catch (error) {
                  console.error(`   ❌ Error assigning image to variant ${variant.title}:`, error);
                  // Safety check for results.errors array
                  if (results && results.errors && Array.isArray(results.errors)) {
                    results.errors.push(`Error assigning image to variant ${variant.title}: ${error.message}`);
                  } else if (typeof globalThis !== 'undefined' && globalThis.errors && Array.isArray(globalThis.errors)) {
                    globalThis.errors.push(`Error assigning image to variant ${variant.title}: ${error.message}`);
                  } else {
                    console.error('Results errors array is not properly initialized in variant assignment error');
                  }
                }
            }
          }

          let message = `Automatic variant image processing complete! Processed ${results.productsProcessed} products, skipped ${results.productsSkipped} products (all variants already have images), processed ${results.variantsProcessed} variants.`;
          if (results.imagesAssigned > 0) {
            message += ` ✅ ${results.imagesAssigned} images assigned automatically.`;
          }

          return json({
            success: true,
            message: message,
            results: {
              ...results,
              errors: results.errors.slice(0, 20) // Limit errors in response
            },
            summary: {
              productsProcessed: results.productsProcessed,
              productsSkipped: results.productsSkipped,
              variantsProcessed: results.variantsProcessed,
              imagesAssigned: results.imagesAssigned,
              variantsDeleted: results.variantsDeleted,
              errorCount: results.errors.length
            }
          });

        } catch (error) {
          console.error("Automatic variant image assignment error:", error);
          // Safety check for results.errors array
          if (results && results.errors && Array.isArray(results.errors)) {
            results.errors.push(`Variant assignment process failed: ${error.message}`);
          } else if (typeof globalThis !== 'undefined' && globalThis.errors && Array.isArray(globalThis.errors)) {
            globalThis.errors.push(`Variant assignment process failed: ${error.message}`);
          } else {
            console.error('Results errors array is not properly initialized in variant assignment process error');
          }
          return json({
            success: false,
            message: `Automatic variant image assignment failed: ${error.message}`,
            results: results
          });
        }
      }
    } catch (error) {
      console.log('❌ Action error:', error);
      return json({ error: error.message }, { status: 500 });
    }
  } catch (error) {
    console.log('❌ Action error:', error);
    return json({ error: error.message }, { status: 500 });
  }
};

// Helper function to describe photo codes
function getPhotoCodeDescription(photoCode) {
  if (!photoCode || photoCode.length !== 4) return 'Unknown';
  
  const type = photoCode[0] === 'P' ? 'Packshot' : 
               photoCode[0] === 'S' ? 'Studio' : 
               photoCode[0] === 'D' ? 'Duo' : 'Unknown';
  
  const view = photoCode[1] === 'F' ? 'Front' : 
               photoCode[1] === 'B' ? 'Back' : 
               photoCode[1] === 'S' ? 'Side' : 'Unknown';
  
  const detail = photoCode[2] === 'M' ? 'Main' : 
                 photoCode[2] === 'D' ? 'Detail' : 'Unknown';
  
  const sequence = photoCode[3];
  
  return `${type} ${view} ${detail} ${sequence}`;
}

// Helper function to attach existing media to a product with retry logic
async function attachExistingMediaToProductWithRetry(admin, targetProductId, sourceMediaId, altText, maxRetries = 5) {
  // Initial wait to give files time to be ready
  console.log(`⏳ Initial wait for media to be ready before attachment...`);
  await new Promise(resolve => setTimeout(resolve, 3000)); // Initial 3 second wait
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 Attempt ${attempt}/${maxRetries} to attach media ${sourceMediaId} to product ${targetProductId}`);
    
    try {
      const attachResult = await admin.graphql(`
        mutation fileUpdate($files: [FileUpdateInput!]!) {
          fileUpdate(files: $files) {
            files {
              id
              alt
              fileStatus
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          files: [
            {
              id: sourceMediaId,
              referencesToAdd: [targetProductId]
            }
          ]
        }
      });

      const attachResponse = await attachResult.json();
      
      if (attachResponse.errors) {
        console.error('GraphQL errors when attaching media:', attachResponse.errors);
        if (attempt >= maxRetries) {
          return false;
        }
        continue;
      }
      
      if (!attachResponse.data || !attachResponse.data.fileUpdate) {
        console.error('Invalid response structure when attaching media:', attachResponse);
        if (attempt >= maxRetries) {
          return false;
        }
        continue;
      }
      
      if (attachResponse.data.fileUpdate.userErrors.length > 0) {
        const userErrors = attachResponse.data.fileUpdate.userErrors;
        
        // Check for "already attached" error (should be treated as success)
        const alreadyAttachedError = userErrors.some(e => e.message.toLowerCase().includes('already'));
        if (alreadyAttachedError) {
          console.log('💡 Media already attached - treating as success');
          return true;
        }
        
        // Check for "processing" or "Non-ready files" errors (should retry)
        const processingError = userErrors.some(e => 
          e.message.toLowerCase().includes('processing') || 
          e.message.toLowerCase().includes('non-ready files')
        );
        if (processingError && attempt < maxRetries) {
          const waitTime = attempt * 3000; // Longer wait time: 3s, 6s, 9s, 12s, 15s
          console.log(`⏳ Media not ready yet (processing/non-ready), waiting ${waitTime}ms before retry (attempt ${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        console.error('❌ User errors when attaching media:', userErrors);
        return false;
      } else {
        console.log(`✅ Successfully attached existing media ${sourceMediaId} to product ${targetProductId}`);
        const attachedFiles = attachResponse.data.fileUpdate.files || [];
        console.log(`📋 Attached files result:`, attachedFiles.map(f => ({ id: f.id, status: f.fileStatus })));
        return true;
      }
    } catch (error) {
      console.error(`❌ Exception in attach attempt ${attempt}:`, error);
      if (attempt >= maxRetries) {
        return false;
      }
      
      // Wait before retry
      const waitTime = attempt * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  console.log(`❌ Failed to attach media after ${maxRetries} attempts`);
  return false;
}

// Helper function to attach existing media to a product using the proven fileUpdate pattern
async function attachExistingMediaToProduct(admin, targetProductId, sourceMediaId, altText) {
  try {
    console.log(`🔗 attachExistingMediaToProduct called with:`, { targetProductId, sourceMediaId, altText });
    
    // Validate inputs
    if (!admin) {
      console.error('❌ Admin GraphQL client is required');
      return false;
    }
    if (!targetProductId || !sourceMediaId) {
      console.error('❌ Missing required parameters:', { targetProductId, sourceMediaId });
      return false;
    }
    
    // Additional validation
    if (typeof targetProductId !== 'string' || !targetProductId.startsWith('gid://')) {
      console.error('❌ Invalid target product ID format:', targetProductId);
      return false;
    }
    if (typeof sourceMediaId !== 'string' || !sourceMediaId.startsWith('gid://')) {
      console.error('❌ Invalid source media ID format:', sourceMediaId);
      return false;
    }
    
    // Use fileUpdate mutation to add product reference to existing media
    console.log(`🔗 Attempting fileUpdate with variables:`, {
      files: [
        {
          id: sourceMediaId,
          referencesToAdd: [targetProductId]
        }
      ]
    });
    
    const attachResult = await admin.graphql(`
      mutation fileUpdate($files: [FileUpdateInput!]!) {
        fileUpdate(files: $files) {
          files {
            id
            alt
            fileStatus
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        files: [
          {
            id: sourceMediaId,
            referencesToAdd: [targetProductId]
          }
        ]
      }
    });

    const attachResponse = await attachResult.json();
    
    if (attachResponse.errors) {
      console.error('GraphQL errors when attaching media to product:', attachResponse.errors);
      console.error('Query variables:', { sourceMediaId, targetProductId });
      return false;
    }
    
    if (!attachResponse.data || !attachResponse.data.fileUpdate) {
      console.error('Invalid response structure when attaching media:', attachResponse);
      return false;
    }
    
    if (attachResponse.data.fileUpdate.userErrors.length > 0) {
      const userErrors = attachResponse.data.fileUpdate.userErrors;
      console.error('❌ User errors when attaching media:', userErrors);
      console.error('Failed attachment details:', { sourceMediaId, targetProductId, altText });
      
      // Check for common error patterns
      const commonErrors = userErrors.map(error => {
        if (error.message.includes('already')) {
          return `${error.message} (This might actually be a success - media already attached)`;
        }
        if (error.message.includes('processing')) {
          return `${error.message} (Media might still be processing, try again later)`;
        }
        if (error.message.includes('not found')) {
          return `${error.message} (Media or product not found)`;
        }
        return error.message;
      });
      
      console.error('📊 Interpreted errors:', commonErrors);
      
      // If error is "already attached", we should consider this a success
      const alreadyAttachedError = userErrors.some(e => e.message.toLowerCase().includes('already'));
      if (alreadyAttachedError) {
        console.log('💡 Treating "already attached" as success');
        return true;
      }
      
      return false;
    } else {
      console.log(`✅ Successfully attached existing media ${sourceMediaId} to product ${targetProductId}`);
      const attachedFiles = attachResponse.data.fileUpdate.files || [];
      console.log(`📋 Attached files result:`, attachedFiles.map(f => ({ id: f.id, status: f.fileStatus })));
      
      // Additional validation - check if we got back the expected file
      const expectedFile = attachedFiles.find(f => f.id === sourceMediaId);
      if (expectedFile) {
        console.log(`🎯 Confirmed: Media ${sourceMediaId} is now attached (status: ${expectedFile.fileStatus})`);
      } else {
        console.warn(`⚠️ Warning: Expected media ${sourceMediaId} not found in response files`);
      }
      
      return true;
    }
  } catch (error) {
    console.error('❌ Exception in attachExistingMediaToProduct:', error);
    console.error('Error details:', { targetProductId, sourceMediaId, altText });
    console.error('Error stack:', error.stack);
    return false;
  }
}

// Helper function to assign an image to a specific variant
async function assignImageToVariant(admin, productId, variantId, mediaObject) {
  try {
    const mediaId = mediaObject.id;
    const imageUrl = mediaObject.image?.url || mediaObject.url;
    
    console.log(`🔗 Attempting to assign image to variant via GraphQL`);
    console.log(`🔗 Product: ${productId}`);
    console.log(`🔗 Variant: ${variantId}`);
    console.log(`🔗 Media: ${mediaId}`);
    console.log(`🔗 Image URL: ${imageUrl}`);
    
    // Try Method 1: productVariantAppendMedia (the correct approach)
    console.log(`🔄 Method 1: Trying productVariantAppendMedia...`);
    
    try {
      const appendMediaResponse = await admin.graphql(`
        mutation productVariantAppendMedia($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) {
          productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) {
            productVariants {
              id
              image {
                id
                url
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          productId: productId,
          variantMedia: [{
            variantId: variantId,
            mediaIds: [mediaId]
          }]
        }
      });

      const appendResult = await appendMediaResponse.json();
      
      if (appendResult.errors) {
        console.log(`⚠️ Method 1 GraphQL errors:`, appendResult.errors);
      } else if (appendResult.data?.productVariantAppendMedia?.userErrors?.length > 0) {
        console.log(`⚠️ Method 1 user errors:`, appendResult.data.productVariantAppendMedia.userErrors);
      } else if (appendResult.data?.productVariantAppendMedia?.productVariants?.length > 0) {
        const updatedVariant = appendResult.data.productVariantAppendMedia.productVariants[0];
        if (updatedVariant.image?.id) {
          console.log(`✅ Method 1 SUCCESS: Variant image assigned via productVariantAppendMedia`);
          console.log(`   Updated variant image: ${updatedVariant.image.id}`);
          return { success: true, method: 'productVariantAppendMedia', imageId: updatedVariant.image.id };
        }
      }
    } catch (appendError) {
      console.log(`⚠️ Method 1 failed:`, appendError.message);
    }

    // Try Method 2: productVariantsBulkUpdate with media parameter
    console.log(`🔄 Method 2: Trying productVariantsBulkUpdate with media...`);
    
    try {
      const bulkUpdateResponse = await admin.graphql(`
        mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
              image {
                id
                url
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          productId: productId,
          variants: [{
            id: variantId,
            imageId: mediaId // Use the media ID directly
          }]
        }
      });

      const bulkResult = await bulkUpdateResponse.json();
      
      if (bulkResult.errors) {
        console.log(`⚠️ Method 2 GraphQL errors:`, bulkResult.errors);
      } else if (bulkResult.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
        console.log(`⚠️ Method 2 user errors:`, bulkResult.data.productVariantsBulkUpdate.userErrors);
      } else if (bulkResult.data?.productVariantsBulkUpdate?.productVariants?.length > 0) {
        const updatedVariant = bulkResult.data.productVariantsBulkUpdate.productVariants[0];
        if (updatedVariant.image?.id) {
          console.log(`✅ Method 2 SUCCESS: Variant image assigned via productVariantsBulkUpdate`);
          console.log(`   Updated variant image: ${updatedVariant.image.id}`);
          return { success: true, method: 'productVariantsBulkUpdate', imageId: updatedVariant.image.id };
        }
      }
    } catch (bulkError) {
      console.log(`⚠️ Method 2 failed:`, bulkError.message);
    }

    // Try Method 3: productVariantUpdate (single variant update)
    console.log(`🔄 Method 3: Trying productVariantUpdate...`);
    
    try {
      const variantUpdateResponse = await admin.graphql(`
        mutation productVariantUpdate($input: ProductVariantInput!) {
          productVariantUpdate(input: $input) {
            productVariant {
              id
              image {
                id
                url
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          input: {
            id: variantId,
            imageId: mediaId
          }
        }
      });

      const variantResult = await variantUpdateResponse.json();
      
      if (variantResult.errors) {
        console.log(`⚠️ Method 3 GraphQL errors:`, variantResult.errors);
      } else if (variantResult.data?.productVariantUpdate?.userErrors?.length > 0) {
        console.log(`⚠️ Method 3 user errors:`, variantResult.data.productVariantUpdate.userErrors);
      } else if (variantResult.data?.productVariantUpdate?.productVariant?.image?.id) {
        const updatedVariant = variantResult.data.productVariantUpdate.productVariant;
        console.log(`✅ Method 3 SUCCESS: Variant image assigned via productVariantUpdate`);
        console.log(`   Updated variant image: ${updatedVariant.image.id}`);
        return { success: true, method: 'productVariantUpdate', imageId: updatedVariant.image.id };
      }
    } catch (variantError) {
      console.log(`⚠️ Method 3 failed:`, variantError.message);
    }

    // If all GraphQL methods fail, create detailed mapping for manual assignment
    console.log(`⚠️ All GraphQL methods failed - creating mapping for manual assignment`);
    
    return { success: false, method: 'all_methods_failed', error: 'No GraphQL method succeeded' };
  } catch (error) {
    console.error(`❌ Error in assignImageToVariant:`, error);
    return { success: false, method: 'exception', error: error.message };
  }
}

export default function ImagesApiPage() {
  const { shop } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const app = useAppBridge();
  
  const [styleNames, setStyleNames] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  const [selectedStyleName, setSelectedStyleName] = useState("All");
  const [selectedColor, setSelectedColor] = useState("All");
  const [selectedColorCode, setSelectedColorCode] = useState("All");
  const [selectedPhotoTypeCode, setSelectedPhotoTypeCode] = useState("All");
  const [selectedPhotoStyle, setSelectedPhotoStyle] = useState("All");
  const [selectedPhotoShootCode, setSelectedPhotoShootCode] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Image processing states
  const [uploading, setUploading] = useState(false);
  const [removingVariants, setRemovingVariants] = useState(false);
  
  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [importStartTime, setImportStartTime] = useState(null);
  const progressTimerRef = useRef(null);
  
  // Get unique values from API data with caching
  const getUniqueValues = useCallback((field) => {
    if (!images || !images.length) return [];
    return [...new Set(images.map(row => row[field]).filter(Boolean))].sort();
  }, [images]);

  // Cache dropdown options using useMemo for better performance
  const cachedDropdownOptions = useMemo(() => {
    if (!images || !images.length) {
      return {
        colorOptions: [{ label: "All", value: "All" }],
        colorCodeOptions: [{ label: "All", value: "All" }],
        photoTypeCodeOptions: [{ label: "All", value: "All" }],
        photoStyleOptions: [{ label: "All", value: "All" }],
        photoShootCodeOptions: [{ label: "All", value: "All" }]
      };
    }

    console.log('🔄 Recalculating dropdown options from', images.length, 'images');
    
    return {
      colorOptions: [
        { label: "All", value: "All" },
        ...getUniqueValues("Color").map(value => ({ label: value, value }))
      ],
      colorCodeOptions: [
        { label: "All", value: "All" },
        ...getUniqueValues("ColorCode").map(value => ({ label: value, value }))
      ],
      photoTypeCodeOptions: [
        { label: "All", value: "All" },
        ...getUniqueValues("PhotoTypeCode").map(value => ({ label: value, value }))
      ],
      photoStyleOptions: [
        { label: "All", value: "All" },
        ...getUniqueValues("PhotoStyle").map(value => ({ label: value, value }))
      ],
      photoShootCodeOptions: [
        { label: "All", value: "All" },
        ...getUniqueValues("PhotoShootCode").map(value => ({ label: value, value }))
      ]
    };
  }, [images, getUniqueValues]);

  // Cache filtered data for better performance
  const filteredData = useMemo(() => {
    if (!images || !images.length) return [];
    
    console.log('🔄 Filtering', images.length, 'images with current filter selections');
    
    return images.filter(row => {
      const matchesStyleName = selectedStyleName === "All" || row.StyleName === selectedStyleName;
      const matchesColor = selectedColor === "All" || row.Color === selectedColor;
      const matchesColorCode = selectedColorCode === "All" || row.ColorCode === selectedColorCode;
      const matchesPhotoTypeCode = selectedPhotoTypeCode === "All" || row.PhotoTypeCode === selectedPhotoTypeCode;
      const matchesPhotoStyle = selectedPhotoStyle === "All" || row.PhotoStyle === selectedPhotoStyle;
      const matchesPhotoShootCode = selectedPhotoShootCode === "All" || row.PhotoShootCode === selectedPhotoShootCode;
      
      // Search functionality - search across multiple fields
      const matchesSearch = !searchQuery || [
        row.StyleName,
        row.Color,
        row.ColorCode,
        row.FName,
        row.PhotoTypeCode,
        row.PhotoStyle,
        row.PhotoShootCode
      ].some(field => 
        field && field.toString().toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      return matchesStyleName && matchesColor && matchesColorCode && matchesPhotoTypeCode && matchesPhotoStyle && matchesPhotoShootCode && matchesSearch;
    });
  }, [images, selectedStyleName, selectedColor, selectedColorCode, selectedPhotoTypeCode, selectedPhotoStyle, selectedPhotoShootCode, searchQuery]);

  // Cache paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredData.length / itemsPerPage);
  }, [filteredData.length, itemsPerPage]);

  // Handle image selection
  const handleImageSelect = useCallback((imageId, isSelected) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(imageId);
      } else {
        newSet.delete(imageId);
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const allIds = filteredData.map(row => row.FName);
    setSelectedImages(new Set(allIds));
  }, [filteredData]);

  // Handle deselect all
  const handleDeselectAll = useCallback(() => {
    setSelectedImages(new Set());
  }, []);

  // Handle clear all filters
  const handleClearAllFilters = useCallback(() => {
    setSelectedStyleName("All");
    setSelectedColor("All");
    setSelectedColorCode("All");
    setSelectedPhotoTypeCode("All");
    setSelectedPhotoStyle("All");
    setSelectedPhotoShootCode("All");
    setSearchQuery("");
    setSelectedImages(new Set());
    setCurrentPage(1);
  }, []);

  // Handle import selected images
  const handleImportSelected = useCallback(() => {
    if (selectedImages.size === 0) {
      setError("Please select at least one image to import");
      return;
    }
    
    setLoading(true);
    setError(null);
    setImportStartTime(Date.now());
    
    // Start the progress modal timer (30 seconds)
    progressTimerRef.current = setTimeout(() => {
      setShowProgressModal(true);
    }, 30000); // 30 seconds
    
    const formData = new FormData();
    formData.append("action", "importSelectedImages");
    formData.append("selectedImages", JSON.stringify(Array.from(selectedImages)));
    
    submit(formData, { method: "post" });
  }, [selectedImages, submit]);

  // Handle load style names
  const handleLoadStyleNames = useCallback(() => {
    setLoading(true);
    setError(null);
    setImages([]);
    setSelectedImages(new Set());
    setCurrentPage(1);
    
    const formData = new FormData();
    formData.append("action", "loadStyleNames");
    
    submit(formData, { method: "post" });
  }, [submit]);

  // Handle load images for selected style
  const handleLoadImagesForStyle = useCallback(() => {
    if (selectedStyleName === "All" && styleNames.length === 0) {
      setError("Please load style names first");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSelectedImages(new Set());
    setCurrentPage(1);
    
    const formData = new FormData();
    formData.append("action", "loadImagesForStyle");
    formData.append("styleName", selectedStyleName);
    
    submit(formData, { method: "post" });
  }, [selectedStyleName, styleNames.length, submit]);

  // Handle action data changes
  useEffect(() => {
    if (actionData) {
      setLoading(false);
      
      // Clear the progress modal timer when import completes
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      
      // Reset import timing
      setImportStartTime(null);
      
      if (actionData.success) {
        if (actionData.styleNames) {
          setStyleNames(actionData.styleNames);
          console.log('Loaded style names:', actionData.styleNames);
        }
        if (actionData.images) {
          setImages(actionData.images);
          console.log('Loaded images:', actionData.images.length);
        }
        if (actionData.importResult) {
          console.log('Import result:', actionData.importResult);
          // Could show success message here
        }
        if (actionData.message && actionData.results) {
          console.log('Variant image assignment result:', actionData.message);
          console.log('Variant assignment summary:', actionData.summary);
          // Could show success message here
        }
      } else {
        setError(actionData.error || actionData.message);
        console.error('Action error:', actionData.error || actionData.message);
      }
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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStyleName, selectedColor, selectedColorCode, selectedPhotoTypeCode, selectedPhotoStyle, selectedPhotoShootCode, searchQuery]);

  // Style name options (cached)
  const styleNameOptions = useMemo(() => [
    { label: "All", value: "All" },
    ...styleNames.map(value => ({ label: value, value }))
  ], [styleNames]);

  // Use cached dropdown options
  const {
    colorOptions,
    colorCodeOptions,
    photoTypeCodeOptions,
    photoStyleOptions,
    photoShootCodeOptions
  } = cachedDropdownOptions;



  return (
    <Page>
      <TitleBar title="Images API" />
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ border: '2px solid #000000', borderRadius: '8px', padding: '16px' }}>
            <BlockStack gap="500">
              <InlineStack align="space-between">
                <Text variant="headingLg">📸 Stanley/Stella Images API Import</Text>
              </InlineStack>
              <Box paddingBlockStart="200">
                <Text variant="bodyMd" as="p" color="subdued">
                  Import product images with intelligent duplicate detection and automatic variant assignment. The system uploads images from URLs, reuses existing files to prevent duplicates, attaches them to matching products, and automatically assigns them as variant main images in one seamless action.
                </Text>
              </Box>
                {styleNames.length === 0 && (
                  <button
                    disabled={loading}
                    onClick={handleLoadStyleNames}
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
                      boxSizing: 'border-box',
                      marginTop: '32px'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.backgroundColor = '#047857';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.target.style.backgroundColor = '#059669';
                      }
                    }}
                  >
                    {loading ? (
                      <>
                        <Spinner size="small" />
                        Loading...
                      </>
                    ) : (
                      "Load Style Names"
                    )}
                  </button>
                )}
              
              {error && (
                <Banner status="critical">
                  <p>Error: {error}</p>
                </Banner>
              )}
              
              {actionData?.success && actionData?.message && actionData?.results && (
                <Banner status="success">
                  <p>{actionData.message}</p>
                  {actionData.summary && (
                    <p>
                      Summary: {actionData.summary.productsProcessed} products processed, 
                      {actionData.summary.productsSkipped} skipped, 
                      {actionData.summary.variantsProcessed} variants processed, 
                      {actionData.summary.imagesAssigned} images assigned
                    </p>
                  )}
                </Banner>
              )}
              
              {actionData?.success && actionData?.importResult && (
                <Banner status="success">
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="semibold">
                      ✅ Import Complete! {actionData.importResult.imported} images processed successfully
                    </Text>
                    <Text variant="bodyMd">
                      📊 Summary: {actionData.importResult.imported} processed, {actionData.importResult.errors} errors, {actionData.importResult.skipped} skipped
                    </Text>
                    <Text variant="bodyMd">
                      🔗 Images attached to products with proper references and ready for variant assignment
                    </Text>
                    {actionData.importResult.variantAssignment && (
                      <Text variant="bodyMd">
                        🎯 Variant Images: {actionData.importResult.variantAssignment.imagesAssigned} images assigned to variants automatically
                      </Text>
                    )}
                  </BlockStack>
                </Banner>
              )}
              
              {styleNames.length > 0 && (
                <>
                  <InlineStack gap="400">
                    <div style={{ width: '300px' }}>
                      <Select 
                        label="Style Name" 
                        options={styleNameOptions} 
                        value={selectedStyleName} 
                        onChange={setSelectedStyleName} 
                      />
                    </div>
                  </InlineStack>
                  
                  <button
                    disabled={loading}
                    onClick={handleLoadImagesForStyle}
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
                      if (!loading) {
                        e.target.style.backgroundColor = '#047857';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.target.style.backgroundColor = '#059669';
                      }
                    }}
                  >
                    {loading ? (
                      <>
                        <Spinner size="small" />
                        Loading...
                      </>
                    ) : (
                      "Load Images"
                    )}
                  </button>
                  
                  {images.length > 0 && (
                    <>
                      <InlineStack gap="400">
                        <Select label="Color" options={colorOptions} value={selectedColor} onChange={setSelectedColor} />
                        <Select label="Color Code" options={colorCodeOptions} value={selectedColorCode} onChange={setSelectedColorCode} />
                        <Select label="Photo Type Code" options={photoTypeCodeOptions} value={selectedPhotoTypeCode} onChange={setSelectedPhotoTypeCode} />
                        <Select label="Photo Style" options={photoStyleOptions} value={selectedPhotoStyle} onChange={setSelectedPhotoStyle} />
                        <Select label="Photo Shoot Code" options={photoShootCodeOptions} value={selectedPhotoShootCode} onChange={setSelectedPhotoShootCode} />
                      </InlineStack>
                      
                      {(searchQuery || selectedStyleName !== "All" || selectedColor !== "All" || selectedColorCode !== "All" || selectedPhotoTypeCode !== "All" || selectedPhotoStyle !== "All" || selectedPhotoShootCode !== "All") && (
                        <Box padding="400" background="bg-surface-info" borderRadius="200">
                          <InlineStack align="space-between">
                            <Text variant="bodyMd">
                              🔍 Showing {filteredData.length} of {images.length} images
                              {searchQuery && (
                                <span> matching "{searchQuery}"</span>
                              )}
                            </Text>
                            <Button size="slim" variant="tertiary" onClick={handleClearAllFilters}>
                              Clear All Filters
                            </Button>
                          </InlineStack>
                        </Box>
                      )}
                      
                      <Divider />
                      
                      {filteredData.length > 0 && (
                        <>
                          <InlineStack gap="200" align="space-between">
                            <Text variant="bodyMd">
                              Selected: {selectedImages.size} of {filteredData.length} images
                            </Text>
                            <InlineStack gap="200">
                              <Button size="slim" onClick={handleSelectAll}>
                                Select All
                              </Button>
                              <Button size="slim" variant="tertiary" onClick={handleDeselectAll}>
                                Deselect All
                              </Button>
                            </InlineStack>
                          </InlineStack>
                          
                          <DataTable
                            columnContentTypes={["text", "text", "text", "text", "text", "text", "text", "text", "text", "text"]}
                            headings={["Select", "Image", "File Name", "Style Name", "Color", "Color Code", "Photo Type Code", "Photo Style", "Photo Shoot Code", "Image Source"]}
                            rows={paginatedData.map(row => [
                              <input
                                type="checkbox"
                                checked={selectedImages.has(row.FName)}
                                onChange={(e) => handleImageSelect(row.FName, e.target.checked)}
                              />,
                              row.HTMLPath ? <img src={row.HTMLPath} alt={row.FName} style={{ width: 60, height: 60, objectFit: 'cover' }} /> : "",
                              row.FName,
                              row.StyleName,
                              row.Color,
                              row.ColorCode,
                              row.PhotoTypeCode,
                              row.PhotoStyle,
                              row.PhotoShootCode,
                              row.ImageSource || 'MainPicture'
                            ])}
                          />
                          
                          {totalPages > 1 && (
                            <InlineStack gap="200" align="center">
                              <Button
                                size="slim"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                              >
                                Previous
                              </Button>
                              <Text variant="bodyMd">
                                Page {currentPage} of {totalPages}
                              </Text>
                              <Button
                                size="slim"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                              >
                                Next
                              </Button>
                            </InlineStack>
                          )}
                          
                          {selectedImages.size > 0 && (
                            <InlineStack gap="200" align="center">
                              <button
                                onClick={handleImportSelected}
                                disabled={loading}
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
                                  if (!loading) {
                                    e.target.style.backgroundColor = '#047857';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!loading) {
                                    e.target.style.backgroundColor = '#059669';
                                  }
                                }}
                              >
                                {loading ? (
                                  <>
                                    <Spinner size="small" />
                                    Importing...
                                  </>
                                ) : (
                                  `Import Selected (${selectedImages.size})`
                                )}
                              </button>
                            </InlineStack>
                          )}
                        </>
                      )}
                      
                      {filteredData.length === 0 && (
                        <Box padding="400">
                          <Text>No images found for the selected filters.</Text>
                        </Box>
                      )}
                    </>
                  )}
                </>
              )}
              
              {styleNames.length === 0 && !loading && !error && (
                <Box padding="400">
                  <Text>Click "Load Style Names" to get available styles from the Stanley/Stella API.</Text>
                </Box>
              )}
            </BlockStack>
            </div>
          </Card>
        </Layout.Section>
        
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
               Follow progress on Media Library page, refresh every now and then. When all images appear then the import is ready and finished.
            </Text>
            <Text variant="bodySm" tone="subdued">
              The import process can take several minutes depending on the number of images and their size. 
               New images will appear in your Shopify media library as they are processed.
            </Text>
            <InlineStack align="end">
              <button
                onClick={() => {
                  window.open(`https://${shop}/admin/content/files?selectedView=all`, '_blank');
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