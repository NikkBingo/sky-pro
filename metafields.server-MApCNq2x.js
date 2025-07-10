function log(level, message, data = null) {
  if (level === "error") {
    console.error(`[METAFIELDS] ${message}`, data);
  } else if (level === "warn") {
    console.warn(`[METAFIELDS] ${message}`, data);
  } else {
    console.log(`[METAFIELDS] ${message}`, data);
  }
}
function truncateForLog(data, maxLength = 200) {
  if (typeof data === "string" && data.length > maxLength) {
    return data.substring(0, maxLength) + "...";
  }
  return data;
}
const FIELD_MAPPING = {
  // === PRODUCT METAFIELDS (stanley_stella namespace) ===
  // Core product information
  "LongDescription": { target: "product_metafield", namespace: "stanley_stella", type: "multi_line_text_field", key: "longdescription" },
  "LanguageCode": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "languagecode" },
  "StyleCode": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "stylecode" },
  "Type": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "type" },
  "Category": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "category" },
  "Gender": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "gender" },
  "Fit": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "fit" },
  "Neckline": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "neckline" },
  "Sleeve": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "sleeve" },
  // Care instructions
  "ShortNote": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "shortnote" },
  // CSV shows single_line_text_field
  "Bleaching": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "bleaching" },
  "Washing": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "washing" },
  "Cleaning": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "cleaning" },
  "Drying": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "drying" },
  "Ironing": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "ironing" },
  // Technical specifications
  "Gauge": { target: "product_metafield", namespace: "stanley_stella", type: "number_integer", key: "gauge" },
  "PiecesPerBox": { target: "product_metafield", namespace: "stanley_stella", type: "number_integer", key: "piecesperbox" },
  "PiecesPerPolybag": { target: "product_metafield", namespace: "stanley_stella", type: "number_integer", key: "piecesperpolybag" },
  // Certifications and sustainability (MOVED TO VARIANT - these vary by color/size)
  "GOTS": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "gots" },
  "OCS100": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "ocs100" },
  "OCSBlended": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "ocsblended" },
  "OEKOTexRecycled": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "oekotexrecycled" },
  "CarbonNeutral": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "carbonneutral" },
  "FSC": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "fsc" },
  "REACH": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "reach" },
  "GRS100poly": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "grs100poly" },
  "GOTS85": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "gots85" },
  // Product lifecycle
  "SKU_Start_Date": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "sku_start_date" },
  "Published": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "published" },
  "StylePublished": { target: "product_metafield", namespace: "stanley_stella", type: "boolean", key: "stylepublished" },
  "StyleSegment": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "stylesegment" },
  "ProductLifecycle": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "productlifecycle" },
  "CountryOfOrigin": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "countryoforigin" },
  // Category codes
  "CategoryCode": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "categorycode" },
  "TypeCode": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "typecode" },
  // ID fields (MOVED TO VARIANT - these are more specific identifiers)
  "FitID": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "fitid" },
  "GenderID": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "genderid" },
  "CategoryID": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "categoryid" },
  "TypeID": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "typeid" },
  "NecklineID": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "necklineid" },
  "SleeveID": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "sleeveid" },
  // Sequence and status (MOVED TO VARIANT - these vary by variant)
  "SequenceStyle": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "sequencestyle" },
  "NewStyle": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "newstyle" },
  "NewProduct": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "newproduct" },
  "NewItem": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "newitem" },
  // Composition and construction (MOVED TO VARIANT - these can vary by variant)
  "LiningComposition": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "liningcomposition" },
  "LiningConstruction": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "liningconstruction" },
  "PaddingComposition": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "paddingcomposition" },
  "LiningFinishing": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "liningfinishing" },
  // Certification URLs and PDFs (MOVED TO VARIANT - these can vary by color/material)
  "VEGAN_URL": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "url", key: "vegan_url" },
  "VEGANAlternateLogoText": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "veganalternatelogotext" },
  "VEGANCertificatePDF": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "url", key: "vegancertificatepdf" },
  "Fairwear_URL": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "url", key: "fairwear_url" },
  "FairwearAlternateLogoText": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "fairwearalternatelogotext" },
  "FairwearCertificatePDF": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "url", key: "fairwearcertificatepdf" },
  "OEKOTexLogoURL": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "url", key: "oekotexlogourl" },
  "OEKOTexCertificatePDF": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "url", key: "oekotexcertificatepdf" },
  "EcoClassLogoURL": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "url", key: "ecoclasslogourl" },
  "EcoClassAlternateLogoText": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "ecoclassalternatelogotext" },
  "EcoClassCertificatePDF": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "url", key: "ecoclasscertificatepdf" },
  // Notes
  "LongNote": { target: "product_metafield", namespace: "stanley_stella", type: "multi_line_text_field", key: "longnote" },
  // CSV shows boolean, string
  "StyleNotice": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "stylenotice" },
  // === VARIANT METAFIELDS (stanley_stella_variant namespace) ===
  // Variant identification
  "B2BSKUREF": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "b2bskuref" },
  "ColorCode": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "colorcode" },
  "SizeCodeNavision": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "sizecodenavision" },
  "SizeCode": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "sizecode" },
  "Color": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "color" },
  "ColorGroup": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "colorgroup" },
  // Inventory and pricing
  "Stock": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "stock" },
  "WeightPerUnit": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "weightperunit" },
  // Dimensions (CSV shows string, number - use number_decimal for consistency)
  "HalfChest": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "halfchest" },
  "BodyLength": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "bodylength" },
  "SleeveLength": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "sleevelength" },
  "Width": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "width" },
  "Length": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "length" },
  "StrapLength": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "straplength" },
  "Waist": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "waist" },
  "Tight": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "tight" },
  "TotalLegLength": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "totalleglength" },
  "Height": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "height" },
  "Circumference": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "circumference" },
  // Trade information
  "HSCode": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "hscode" },
  // Pricing tiers (EUR) - CSV shows number
  "Price<10 EUR": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "price_10_eur" },
  "Price>10 EUR": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "price_10_eur" },
  "Price>50 EUR": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "price_50_eur" },
  "Price>100 EUR": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "price_100_eur" },
  "Price>250 EUR": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "price_250_eur" },
  "Price>500 EUR": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "price_500_eur" },
  "Price>1000 EUR": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "price_1000_eur" },
  "Small Brand EUR": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "small_brand_eur" },
  "Medium Brand EUR": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "medium_brand_eur" },
  // Pricing tiers (GBP) - CSV shows number
  "Price<10 GBP": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "price_10_gbp" },
  "Price>10 GBP": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "price_10_gbp" },
  "Price>50 GBP": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "price_50_gbp" },
  "Price>100 GBP": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "price_100_gbp" },
  "Price>250 GBP": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "price_250_gbp" },
  "Price>500 GBP": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "price_500_gbp" },
  "Price>1000 GBP": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "price_1000_gbp" },
  "Small Brand GBP": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "small_brand_gbp" },
  "Medium Brand GBP": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_decimal", key: "medium_brand_gbp" },
  // Status and sequence - CSV shows number
  "NewColor": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "newcolor" },
  "NewSize": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "newsize" },
  "ColorSequence": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "colorsequence" },
  "ColorGroupSequence": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "colorgroupsequence" },
  "SizeSequence": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "number_integer", key: "sizesequence" },
  // Material specifications - CSV shows all as single_line_text_field
  "Thickness": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "thickness" },
  // CSV shows single_line_text_field
  "ShellWeight": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "shellweight" },
  // CSV shows single_line_text_field
  "PaddingWeight": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "paddingweight" },
  // CSV shows single_line_text_field
  "LiningWeight": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "liningweight" },
  // CSV shows single_line_text_field
  "Layer4Weight": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "layer4weight" },
  // CSV shows single_line_text_field
  "Layer5Weight": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "layer5weight" },
  // CSV shows single_line_text_field
  // Care and certifications
  "WashInstructions": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "washinstructions" },
  "PublishedNewCollection": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "publishednewcollection" },
  // CSV shows single_line_text_field
  "StylePublishedNewCollection": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "stylepublishednewcollection" },
  // CSV shows single_line_text_field
  "CertificationTriman": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "certificationtriman" },
  // CSV shows single_line_text_field
  "OEKOTexOrganic": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "oekotexorganic" },
  // CSV shows single_line_text_field
  "OEKOTexAlternateLogoText": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "oekotexalternatelogotext" },
  // Sustainability certifications (variant level) - CSV shows single_line_text_field
  "GOTSConversion": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "gotsconversion" },
  "OEKOTexOrganicBags": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "oekotexorganicbags" },
  "OEKOtexOrganicBeanies": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "oekotexorganicbeanies" },
  "VEGAN": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "vegan" },
  // CSV shows single_line_text_field
  "Fairwear": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "fairwear" },
  // CSV shows single_line_text_field
  // Material composition and construction
  "CompositionList": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "compositionlist" },
  "ConstructionList": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "constructionlist" },
  "FinishList": { target: "variant_metafield", namespace: "stanley_stella_variant", type: "single_line_text_field", key: "finishlist" }
  // === PRODUCT GROUPING METAFIELDS (for split products) ===
  // Product grouping metafields are created separately by createProductGroupingMetafields function
  // "product_grouping_option_1": { target: "product_metafield", namespace: "stanley_stella", type: "metaobject_reference", key: "product_grouping_option_1" },
  // "product_grouping_option_1_value": { target: "product_metafield", namespace: "stanley_stella", type: "single_line_text_field", key: "product_grouping_option_1_value" }
};
const EXCLUDED_FIELDS = [
  "StyleName",
  "ShortDescription",
  "Weight",
  // Core Shopify fields
  "MainPicture",
  // Image already exists in product, shows as [object Object]
  "WashInstructionsAdditions",
  "Washinstructionsadditions",
  "SundryList",
  // Low data coverage (include both variations)
  "K3EUR",
  "K15EUR",
  "K30EUR",
  "K50EUR",
  "K100EUR",
  // Empty fields
  "K3GBP",
  "K15GBP",
  "K30GBP",
  "K50GBP",
  "K100GBP",
  // Empty fields
  "GRS100nyl",
  "GRS99poly",
  "GRS87poly",
  "GRS80cttn20poly",
  "GRS60nyl40poly",
  "GRS51poly",
  "GRS50cttn",
  "GRS42cttn",
  "GOTS80",
  // Empty fields
  "PaddingConstruction",
  "PaddingFinishing",
  // Empty fields
  "Layer4Name",
  "Layer4Composition",
  "Layer4Construction",
  "Layer4Finishing",
  // Empty fields
  "Layer5Name",
  "Layer5Composition",
  "Layer5Construction",
  "Layer5Finishing",
  // Empty fields
  "Specifications",
  "specifications"
  // Empty field (include both variations)
];
function getField(obj, logicalKey) {
  const direct = obj[logicalKey];
  if (direct !== void 0) return direct;
  const keys = [logicalKey, logicalKey.toLowerCase(), logicalKey.toUpperCase()];
  for (const key of keys) {
    if (obj[key] !== void 0) return obj[key];
  }
  return void 0;
}
function processField(productMetafields, variantMetafields, fieldKey, fieldValue, isProductGrouping = false) {
  log("info", `🔍 processField: ${fieldKey} = "${truncateForLog(String(fieldValue))}" (type: ${typeof fieldValue}, length: ${String(fieldValue).length})`);
  log("info", `🔍 PROCESSFIELD ENTRY: ${fieldKey} = "${truncateForLog(String(fieldValue))}" (${typeof fieldValue})`);
  const fieldMapping = FIELD_MAPPING[fieldKey];
  if (fieldMapping && fieldMapping.target === "product_metafield") {
    log("info", `🚨 FOUND PRODUCT METAFIELD: ${fieldKey} -> ${fieldMapping.namespace}.${fieldMapping.key}`);
  }
  let finalValue;
  if (fieldValue !== null && fieldValue !== void 0 && typeof fieldValue === "object") {
    log("info", `🔧 📦 OBJECT VALUE detected for ${fieldKey}:`, fieldValue);
    if (Array.isArray(fieldValue)) {
      finalValue = fieldValue.join(", ");
      log("info", `🔧 📦 Array converted to string: "${truncateForLog(finalValue)}"`);
    } else if (fieldValue.url || fieldValue.URL) {
      finalValue = fieldValue.url || fieldValue.URL;
      log("info", `🔧 📦 Object URL extracted: "${truncateForLog(finalValue)}"`);
    } else if (fieldValue.src) {
      finalValue = fieldValue.src;
      log("info", `🔧 📦 Object src extracted: "${truncateForLog(finalValue)}"`);
    } else {
      try {
        finalValue = JSON.stringify(fieldValue);
        log("info", `🔧 📦 Object stringified: "${truncateForLog(finalValue)}"`);
      } catch {
        finalValue = String(fieldValue);
        log("info", `🔧 📦 Object fallback string: "${truncateForLog(finalValue)}"`);
      }
    }
  } else if (fieldValue === null || fieldValue === void 0) {
    if (fieldMapping) {
      switch (fieldMapping.type) {
        case "number_decimal":
          finalValue = 0;
          break;
        case "number_integer":
          finalValue = 0;
          break;
        case "boolean":
          finalValue = false;
          break;
        case "url":
          log("info", `🔧 🌐 URL is null/undefined, skipping metafield creation to avoid validation errors`);
          return;
        case "single_line_text_field":
        case "multi_line_text_field":
          finalValue = "N/A";
          break;
        default:
          finalValue = "N/A";
          break;
      }
    } else {
      finalValue = "N/A";
    }
    log("info", `🔧 📝 CONVERTING null/undefined to default value for ${fieldKey}: ${finalValue} (${typeof finalValue})`);
  } else {
    if (fieldMapping) {
      switch (fieldMapping.type) {
        case "boolean":
          const boolStr = String(fieldValue).toLowerCase().trim();
          finalValue = boolStr === "true" || boolStr === "1" || boolStr === "yes";
          break;
        case "number_integer":
          const intValue = parseInt(String(fieldValue), 10);
          finalValue = isNaN(intValue) ? 0 : intValue;
          break;
        case "number_decimal":
          const floatValue = parseFloat(String(fieldValue));
          finalValue = isNaN(floatValue) ? 0 : floatValue;
          break;
        case "url":
          let urlValue = String(fieldValue).trim();
          log("info", `🔧 🌐 URL processing: "${urlValue}" (original: ${fieldValue})`);
          if (urlValue === "" || urlValue === "null" || urlValue === "undefined") {
            log("info", `🔧 🌐 URL is empty, skipping metafield creation to avoid validation errors`);
            return;
          } else if (urlValue.startsWith("http://") || urlValue.startsWith("https://")) {
            finalValue = urlValue;
            log("info", `🔧 🌐 URL kept as valid: "${truncateForLog(urlValue)}"`);
          } else {
            finalValue = urlValue;
            log("info", `🔧 🌐 URL kept as non-URL value: "${urlValue}"`);
          }
          break;
        case "json":
          try {
            JSON.parse(String(fieldValue));
            finalValue = String(fieldValue);
          } catch {
            finalValue = "{}";
          }
          break;
        case "multi_line_text_field":
          const multiLineValue = String(fieldValue).trim();
          finalValue = multiLineValue === "" ? "N/A" : multiLineValue;
          break;
        case "single_line_text_field":
          const singleLineValue = String(fieldValue).trim().replace(/\n/g, " ").replace(/\r/g, " ").replace(/\t/g, " ");
          finalValue = singleLineValue === "" ? "N/A" : singleLineValue;
          break;
        default:
          const stringValue = String(fieldValue).trim();
          finalValue = stringValue === "" ? "N/A" : stringValue;
      }
    } else {
      const stringValue = String(fieldValue).trim();
      finalValue = stringValue === "" ? "N/A" : stringValue;
    }
  }
  log("info", `🔍 CONVERTED VALUE: ${fieldKey} = "${truncateForLog(String(finalValue))}" (final type: ${typeof finalValue})`);
  log("info", `🔍 FINAL VALUE for ${fieldKey}: ${typeof finalValue === "string" ? `"${truncateForLog(finalValue)}"` : finalValue} (${typeof finalValue})`);
  if (fieldMapping) {
    log("info", `📝 CREATING metafield: ${fieldMapping.namespace}.${fieldMapping.key} (value: "${finalValue}" - ${typeof finalValue})`);
    if (fieldMapping.namespace === "stanley_stella" && ["ecoclasslogourl", "fairwear_url", "vegan_url"].includes(fieldMapping.key)) {
      log("info", `📝 CREATING watched metafield: ${fieldMapping.namespace}.${fieldMapping.key} = "${finalValue}" (${typeof finalValue})`);
    }
    const metafield = {
      namespace: fieldMapping.namespace,
      key: fieldMapping.key,
      type: fieldMapping.type,
      // Use the correct type from CSV mapping
      value: finalValue
      // Use the properly typed value
    };
    log("info", `🔍 FINAL METAFIELD: ${metafield.namespace}.${metafield.key} = ${typeof metafield.value === "string" ? `"${truncateForLog(metafield.value)}"` : metafield.value} (type: ${metafield.type})`);
    if (fieldMapping.target === "product_metafield") {
      productMetafields.push(metafield);
      const isUrlMetafield = metafield.key.includes("url") || metafield.key.includes("logo");
      if (isUrlMetafield) {
        log("info", `✅ Added PRODUCT URL metafield: ${metafield.namespace}.${metafield.key} = "${truncateForLog(metafield.value)}"`);
      } else {
        log("info", `✅ Added PRODUCT metafield: ${metafield.namespace}.${metafield.key} = "${truncateForLog(metafield.value)}"`);
      }
    } else if (fieldMapping.target === "variant_metafield") {
      variantMetafields.push(metafield);
      const isUrlMetafield = metafield.key.includes("url") || metafield.key.includes("logo");
      if (isUrlMetafield) {
        log("info", `✅ Added VARIANT URL metafield: ${metafield.namespace}.${metafield.key} = "${truncateForLog(metafield.value)}"`);
      } else {
        log("info", `✅ Added VARIANT metafield: ${metafield.namespace}.${metafield.key} = "${truncateForLog(metafield.value)}"`);
      }
    }
  } else {
    log("info", `⚠️ No mapping found for field: ${fieldKey} (value: ${typeof finalValue === "string" ? `"${truncateForLog(finalValue)}"` : finalValue})`);
  }
}
function processItemMetafields(item, isSplitProduct = false, productGroupingInfo = null) {
  console.log("🚨🚨🚨 PROCESSITEMMETAFIELDS CALLED! 🚨🚨🚨");
  console.log("🚨 Item keys:", Object.keys(item).slice(0, 20));
  const longDescVariations = ["LongDescription", "longdescription", "LONGDESCRIPTION", "long_description", "Long_Description"];
  log("info", "🔍 ENHANCED DEBUG: Checking for LongDescription field variations...");
  longDescVariations.forEach((variation) => {
    if (item.hasOwnProperty(variation)) {
      log("info", `🔍 ✅ Found LongDescription variation "${variation}": "${truncateForLog(String(item[variation]))}"`);
    } else {
      log("info", `🔍 ❌ LongDescription variation "${variation}" NOT found in item data`);
    }
  });
  const descriptionFields = Object.keys(item).filter(
    (key) => key.toLowerCase().includes("description") || key.toLowerCase().includes("desc")
  );
  log("info", `🔍 ENHANCED DEBUG: Found ${descriptionFields.length} fields containing "description" or "desc":`);
  descriptionFields.forEach((field) => {
    log("info", `🔍   "${field}": "${truncateForLog(String(item[field]))}"`);
  });
  debugDescriptionFields(item);
  const productMetafields = [];
  const variantMetafields = [];
  log("info", `🚨🚨🚨 PROCESSITEMMETAFIELDS FUNCTION CALLED 🚨🚨🚨`);
  log("info", `🔧 Processing metafields for item with ${Object.keys(item).length} fields (isSplitProduct: ${isSplitProduct})`);
  log("info", `🔍 Item keys: ${Object.keys(item).slice(0, 20).join(", ")}${Object.keys(item).length > 20 ? "..." : ""}`);
  const firstVariant = item.Variants && item.Variants.length > 0 ? item.Variants[0] : null;
  const productMetafieldFields = Object.keys(FIELD_MAPPING).filter((field) => FIELD_MAPPING[field].target === "product_metafield");
  const variantMetafieldFields = Object.keys(FIELD_MAPPING).filter((field) => FIELD_MAPPING[field].target === "variant_metafield");
  log("info", `🔧 Processing ${productMetafieldFields.length} product metafields and ${variantMetafieldFields.length} variant metafields`);
  const unmappedDescriptionFields = Object.keys(item).filter((key) => {
    const isDescriptionField = key.toLowerCase().includes("description") || key.toLowerCase().includes("desc");
    const isNotMapped = !FIELD_MAPPING[key];
    const isNotExcluded = !EXCLUDED_FIELDS.includes(key);
    return isDescriptionField && isNotMapped && isNotExcluded;
  });
  if (unmappedDescriptionFields.length > 0) {
    log("info", `🔧 AUTO-MAPPING: Found ${unmappedDescriptionFields.length} unmapped description fields, mapping to LongDescription`);
    unmappedDescriptionFields.forEach((field) => {
      log("info", `🔧 AUTO-MAPPING: "${field}" -> LongDescription metafield`);
      const fieldValue = getField(item, field);
      if (fieldValue !== void 0 && fieldValue !== null) {
        processField(productMetafields, variantMetafields, "LongDescription", fieldValue);
        log("info", `🔧 AUTO-MAPPED: "${field}" value "${truncateForLog(String(fieldValue))}" -> LongDescription metafield`);
      }
    });
  }
  for (const fieldKey of productMetafieldFields) {
    FIELD_MAPPING[fieldKey];
    const isProductGroupingField = fieldKey === "product_grouping_option_1" || fieldKey === "product_grouping_option_1_value";
    if (isProductGroupingField && !isSplitProduct) {
      log("info", `🚫 Skipping product grouping field: ${fieldKey} (not a split product)`);
      continue;
    }
    if (isProductGroupingField && isSplitProduct && productGroupingInfo) {
      if (fieldKey === "product_grouping_option_1" && productGroupingInfo.metaobjectId) {
        processField(productMetafields, variantMetafields, fieldKey, productGroupingInfo.metaobjectId, true);
        continue;
      } else if (fieldKey === "product_grouping_option_1_value" && productGroupingInfo.size) {
        processField(productMetafields, variantMetafields, fieldKey, productGroupingInfo.size, true);
        continue;
      }
    }
    log("info", `🔍 Processing regular product field: ${fieldKey}`);
    let fieldValue = getField(item, fieldKey);
    if (fieldValue === void 0 && firstVariant) {
      fieldValue = getField(firstVariant, fieldKey);
    }
    log("info", `🔍 Field value for ${fieldKey}: "${fieldValue}" (${typeof fieldValue})`);
    processField(productMetafields, variantMetafields, fieldKey, fieldValue);
  }
  for (const fieldKey of variantMetafieldFields) {
    FIELD_MAPPING[fieldKey];
    let fieldValue = getField(item, fieldKey);
    if (fieldValue === void 0 && firstVariant) {
      fieldValue = getField(firstVariant, fieldKey);
    }
    processField(productMetafields, variantMetafields, fieldKey, fieldValue);
  }
  log("info", `📊 Processed ${productMetafields.length} product metafields and ${variantMetafields.length} variant metafields`);
  const longDescMetafield = productMetafields.find((mf) => mf.key === "longdescription");
  if (longDescMetafield) {
    log("info", `✅ LongDescription metafield created: ${longDescMetafield.namespace}.${longDescMetafield.key} = "${truncateForLog(String(longDescMetafield.value))}"`);
  } else {
    log("warn", `⚠️ LongDescription metafield was NOT created - no matching field found in item data`);
    log("warn", `⚠️ Available item fields: ${Object.keys(item).join(", ")}`);
  }
  return {
    productMetafields,
    variantMetafields
  };
}
function processVariantMetafields(variant, originalVariants) {
  const variantMetafields = [];
  log("info", `🔧 Processing variant metafields for variant with ${Object.keys(variant).length} fields`);
  log("info", `🔍 Variant data sample:`, {
    ColorCode: variant.ColorCode,
    SizeCode: variant.SizeCode,
    Color: variant.Color,
    Stock: variant.Stock,
    WeightPerUnit: variant.WeightPerUnit
  });
  for (const [fieldKey, fieldValue] of Object.entries(variant)) {
    const fieldMapping = FIELD_MAPPING[fieldKey];
    if (fieldMapping && fieldMapping.target === "variant_metafield") {
      log("info", `🔍 VARIANT FIELD: Processing ${fieldKey} = "${truncateForLog(String(fieldValue))}" (${typeof fieldValue}) -> ${fieldMapping.namespace}.${fieldMapping.key} (${fieldMapping.type})`);
      processField([], variantMetafields, fieldKey, fieldValue);
    }
  }
  for (const [fieldKey, fieldValue] of Object.entries(variant)) {
    const fieldMapping = FIELD_MAPPING[fieldKey];
    if (!fieldMapping && !EXCLUDED_FIELDS.includes(fieldKey)) {
      const variantLikeKeywords = ["color", "size", "sku", "stock", "price", "weight", "dimension", "chest", "length", "waist", "tight", "leg", "height", "circumference"];
      const isVariantLevel = variantLikeKeywords.some((keyword) => fieldKey.toLowerCase().includes(keyword));
      if (isVariantLevel) {
        log("info", `🔄 Processing unmapped variant field: ${fieldKey} = "${truncateForLog(String(fieldValue))}"`);
        processField([], variantMetafields, fieldKey, fieldValue);
      }
    }
  }
  log("info", `📊 Processed ${variantMetafields.length} variant metafields`);
  if (variantMetafields.length > 0) {
    log("info", `📋 First 3 variant metafields for this variant:`);
    variantMetafields.slice(0, 3).forEach((mf, index) => {
      log("info", `📋   ${index + 1}. ${mf.namespace}.${mf.key} (${mf.type}) = "${truncateForLog(mf.value)}"`);
    });
  } else {
    log("warn", `⚠️ No variant metafields created for this variant`);
  }
  return variantMetafields;
}
function createProductGroupingMetafields(metaobjectId, sizeValue) {
  const groupingMetafields = [];
  log("info", `🔗 Creating product grouping metafields: metaobjectId=${metaobjectId}, sizeValue=${sizeValue}`);
  if (metaobjectId && metaobjectId !== "N/A" && metaobjectId !== "undefined" && metaobjectId !== "null") {
    log("info", `🔗 Adding metaobject reference: ${metaobjectId}`);
    const groupingMetafield = {
      namespace: "stanley_stella",
      key: "product_grouping_option_1",
      type: "metaobject_reference",
      // Use proper metaobject reference type
      value: metaobjectId
      // Store the metaobject entry ID as reference
    };
    groupingMetafields.push(groupingMetafield);
    log("info", `🔗 Added product grouping metafield as metaobject reference: ${metaobjectId}`);
  } else {
    log("warn", `⚠️ No valid metaobjectId provided for product grouping: ${metaobjectId}`);
  }
  if (sizeValue) {
    log("info", `🔗 Adding size value: ${sizeValue}`);
    const sizeMetafield = {
      namespace: "stanley_stella",
      key: "product_grouping_option_1_value",
      type: "single_line_text_field",
      value: sizeValue
    };
    groupingMetafields.push(sizeMetafield);
    log("info", `🔗 Added product grouping size metafield: ${sizeValue}`);
  } else {
    log("warn", `⚠️ No sizeValue provided for product grouping`);
  }
  log("info", `🔗 Created ${groupingMetafields.length} product grouping metafields`);
  return groupingMetafields;
}
async function recreateMetafieldDefinition(admin, namespace, key, newType, ownerType) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  try {
    const findRes = await admin.graphql(
      `query ($namespace: String!, $key: String!, $ownerType: MetafieldOwnerType!) {
        metafieldDefinitions(first: 50, namespace: $namespace, key: $key, ownerType: $ownerType) {
          edges {
            node {
              id
              namespace
              key
              type {
                name
              }
              ownerType
            }
          }
        }
      }`,
      {
        variables: {
          namespace,
          key,
          ownerType
        }
      }
    );
    const findJson = await findRes.json();
    const existingDef = (_d = (_c = (_b = (_a = findJson.data) == null ? void 0 : _a.metafieldDefinitions) == null ? void 0 : _b.edges) == null ? void 0 : _c[0]) == null ? void 0 : _d.node;
    if (!existingDef) {
      log("info", `📋 No existing definition found for ${namespace}.${key}, will create new one`);
      return false;
    }
    const currentType = existingDef.type.name;
    if (currentType === newType) {
      log("info", `✅ Definition ${namespace}.${key} already has correct type: ${newType}`);
      return true;
    }
    log("info", `🔧 Recreating metafield definition ${namespace}.${key} from ${currentType} to ${newType}`);
    const deleteRes = await admin.graphql(
      `mutation ($id: ID!) {
        metafieldDefinitionDelete(id: $id) {
          deletedDefinitionId
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          id: existingDef.id
        }
      }
    );
    const deleteJson = await deleteRes.json();
    const deleteErrors = ((_f = (_e = deleteJson.data) == null ? void 0 : _e.metafieldDefinitionDelete) == null ? void 0 : _f.userErrors) || [];
    if (deleteErrors.length > 0) {
      log("error", `❌ Error deleting metafield definition ${namespace}.${key}:`, deleteErrors);
      return false;
    }
    log("info", `✅ Deleted old metafield definition: ${namespace}.${key}`);
    const createRes = await admin.graphql(
      `mutation ($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
            namespace
            key
            type {
              name
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
          definition: {
            namespace,
            key,
            type: newType,
            ownerType,
            name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
            description: `Stanley/Stella ${key} field (recreated with correct type)`
          }
        }
      }
    );
    const createJson = await createRes.json();
    const createErrors = ((_h = (_g = createJson.data) == null ? void 0 : _g.metafieldDefinitionCreate) == null ? void 0 : _h.userErrors) || [];
    if (createErrors.length > 0) {
      log("error", `❌ Error creating new metafield definition ${namespace}.${key}:`, createErrors);
      return false;
    }
    log("info", `✅ Successfully recreated metafield definition ${namespace}.${key} with type ${newType}`);
    return true;
  } catch (error) {
    log("error", `❌ Error recreating metafield definition ${namespace}.${key}:`, error);
    return false;
  }
}
async function ensureMetafieldDefinitions(admin, metafields, ownerType = "PRODUCT") {
  const definitions = /* @__PURE__ */ new Map();
  const keyMapping = /* @__PURE__ */ new Map();
  const results = {
    created: 0,
    existing: 0,
    errors: [],
    keyMapping
    // Return the key mappings for updating metafields
  };
  metafields.forEach((mf) => {
    const key = `${mf.namespace}.${mf.key}`;
    if (!definitions.has(key)) {
      definitions.set(key, {
        namespace: mf.namespace,
        key: mf.key,
        type: mf.type,
        ownerType
      });
      keyMapping.set(`${mf.namespace}.${mf.key}`, mf.key);
    }
  });
  const definitionPromises = Array.from(definitions.values()).map(async (def) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
      const existingRes = await admin.graphql(
        `query ($namespace: String!, $key: String!, $ownerType: MetafieldOwnerType!) {
          metafieldDefinitions(first: 50, namespace: $namespace, key: $key, ownerType: $ownerType) {
            edges {
              node {
                id
                namespace
                key
                type {
                  name
                }
              }
            }
          }
        }`,
        {
          variables: {
            namespace: def.namespace,
            key: def.key,
            ownerType: def.ownerType
          }
        }
      );
      const existingJson = await existingRes.json();
      const existingDef = (_d = (_c = (_b = (_a = existingJson.data) == null ? void 0 : _a.metafieldDefinitions) == null ? void 0 : _b.edges) == null ? void 0 : _c[0]) == null ? void 0 : _d.node;
      if (existingDef) {
        const currentType = existingDef.type.name;
        if (currentType === def.type) {
          log("info", `✅ Metafield definition already exists with correct type: ${def.namespace}.${def.key} (${currentType})`);
          results.existing++;
          return;
        } else {
          log("info", `🔧 Metafield definition exists but has wrong type: ${def.namespace}.${def.key} (${currentType} -> ${def.type})`);
          log("info", `🔄 Attempting to recreate definition with correct type...`);
          const recreateSuccess = await recreateMetafieldDefinition(admin, def.namespace, def.key, def.type, def.ownerType);
          if (recreateSuccess) {
            log("info", `✅ Recreated metafield definition: ${def.namespace}.${def.key} (${currentType} -> ${def.type})`);
            results.created++;
            return;
          } else {
            log("warn", `⚠️ Could not recreate existing definition ${def.namespace}.${def.key}`);
            const versionedKey = `${def.key}_v2`;
            log("info", `🔄 Trying versioned key: ${def.namespace}.${versionedKey}`);
            try {
              const versionedRes = await admin.graphql(
                `mutation ($definition: MetafieldDefinitionInput!) {
                   metafieldDefinitionCreate(definition: $definition) {
                     createdDefinition {
                       id
                       namespace
                       key
                       type {
                         name
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
                    definition: {
                      namespace: def.namespace,
                      key: versionedKey,
                      type: def.type,
                      ownerType: def.ownerType,
                      name: `${def.key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} V2`,
                      description: `Stanley/Stella ${def.key} field (corrected type version)`
                    }
                  }
                }
              );
              const versionedJson = await versionedRes.json();
              const versionedErrors = ((_f = (_e = versionedJson.data) == null ? void 0 : _e.metafieldDefinitionCreate) == null ? void 0 : _f.userErrors) || [];
              if (versionedErrors.length === 0) {
                log("info", `✅ Created versioned metafield definition: ${def.namespace}.${versionedKey} (${def.type})`);
                keyMapping.set(`${def.namespace}.${def.key}`, versionedKey);
                results.created++;
                return;
              } else {
                log("error", `❌ Error creating versioned definition:`, versionedErrors);
              }
            } catch (versionedError) {
              log("error", `❌ Error creating versioned definition:`, versionedError);
            }
            log("warn", `⚠️ All strategies failed for ${def.namespace}.${def.key}, will use existing definition with string values`);
            keyMapping.set(`${def.namespace}.${def.key}`, `${def.key}_as_text`);
            results.existing++;
            return;
          }
        }
      }
      const res = await admin.graphql(
        `mutation ($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
              id
              namespace
              key
              type {
                name
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
            definition: {
              namespace: def.namespace,
              key: def.key,
              type: def.type,
              ownerType: def.ownerType,
              name: def.key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
            }
          }
        }
      );
      const json = await res.json();
      const errors = ((_h = (_g = json.data) == null ? void 0 : _g.metafieldDefinitionCreate) == null ? void 0 : _h.userErrors) || [];
      if (errors.length > 0) {
        const alreadyExistsError = errors.find((err) => err.message.includes("already exists") || err.message.includes("taken") || err.message.includes("in use"));
        if (alreadyExistsError) {
          log("info", `✅ Metafield definition already exists: ${def.namespace}.${def.key}`);
          results.existing++;
        } else {
          log("error", `❌ Error creating metafield definition ${def.namespace}.${def.key}:`, errors);
          results.errors.push(...errors.map((e) => `${def.namespace}.${def.key}: ${e.message}`));
        }
      } else {
        log("info", `✅ Created metafield definition: ${def.namespace}.${def.key}`);
        results.created++;
      }
    } catch (error) {
      log("error", `❌ Error creating metafield definition ${def.namespace}.${def.key}:`, error);
      results.errors.push(`${def.namespace}.${def.key}: ${error.message}`);
    }
  });
  await Promise.all(definitionPromises);
  return results;
}
async function ensureAllMetafieldDefinitions(admin) {
  console.log("🚨🚨🚨 CRITICAL: ensureAllMetafieldDefinitions function called! 🚨🚨🚨");
  log("info", "🔧 PHASE 1: Creating ALL metafield definitions with correct types from CSV mapping...");
  const results = {
    created: 0,
    existing: 0,
    errors: []
  };
  const correctMapping = FIELD_MAPPING;
  const productMetafields = [];
  const variantMetafields = [];
  const sortedFieldEntries = Object.entries(correctMapping).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [fieldKey, mapping] of sortedFieldEntries) {
    if (EXCLUDED_FIELDS.includes(fieldKey) || EXCLUDED_FIELDS.some((excluded) => excluded.toLowerCase() === fieldKey.toLowerCase())) {
      log("info", `🚫 Skipping excluded field: ${fieldKey}`);
      continue;
    }
    if (fieldKey === "product_grouping_option_1" || fieldKey === "product_grouping_option_1_value") {
      log("info", `🚫 Skipping product grouping field: ${fieldKey} (will be created separately)`);
      continue;
    }
    const metafieldDef = {
      namespace: mapping.namespace,
      key: mapping.key,
      type: mapping.type,
      // Use the correct type from CSV mapping
      name: fieldKey.replace(/([A-Z])/g, " $1").trim(),
      // Convert camelCase to readable name
      description: `Stanley/Stella ${fieldKey} field (${mapping.type})`
    };
    if (mapping.target === "product_metafield") {
      productMetafields.push(metafieldDef);
      log("info", `📝 Will create PRODUCT metafield definition: ${mapping.namespace}.${mapping.key} (${mapping.type}) for field ${fieldKey}`);
    } else {
      variantMetafields.push(metafieldDef);
      log("info", `📝 Will create VARIANT metafield definition: ${mapping.namespace}.${mapping.key} (${mapping.type}) for field ${fieldKey}`);
    }
  }
  log("info", `🔧 SUMMARY: Will create ${productMetafields.length} product + ${variantMetafields.length} variant = ${productMetafields.length + variantMetafields.length} total metafield definitions with correct types`);
  const stanleyProductCount = productMetafields.filter((def) => def.namespace === "stanley_stella").length;
  log("info", `🚨 STANLEY_STELLA PRODUCT DEFINITIONS: ${stanleyProductCount} (should be 63)`);
  log("info", `🔧 Creating ${productMetafields.length} product metafield definitions...`);
  const productResult = await ensureMetafieldDefinitions(admin, productMetafields, "PRODUCT");
  if (productResult) {
    results.created += productResult.created || 0;
    results.existing += productResult.existing || 0;
    results.errors.push(...productResult.errors || []);
  }
  log("info", `🔧 Creating ${variantMetafields.length} variant metafield definitions...`);
  const variantResult = await ensureMetafieldDefinitions(admin, variantMetafields, "PRODUCTVARIANT");
  if (variantResult) {
    results.created += variantResult.created || 0;
    results.existing += variantResult.existing || 0;
    results.errors.push(...variantResult.errors || []);
  }
  log("info", `⏭️ Skipping product grouping metafield definitions (will be created after products and metaobjects)`);
  log("info", `✅ PHASE 1 COMPLETE: All metafield definitions processed with correct types: ${results.created} created, ${results.existing} existing, ${results.errors.length} errors`);
  log("info", `📊 VERIFICATION: Created definitions for ${productMetafields.length} product metafields (${stanleyProductCount} stanley_stella) with correct types`);
  log("info", `📊 VERIFICATION: Created definitions for ${variantMetafields.length} variant metafields with correct types`);
  return results;
}
async function createMetafields(admin, metafields, ownerId, ownerType = "PRODUCT") {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  if (metafields.length === 0) {
    log("info", `⚠️ No metafields to create for ${ownerType}: ${ownerId}`);
    return { created: 0, errors: [] };
  }
  log("info", `🔧 Creating ${metafields.length} ${ownerType.toLowerCase()} metafields for: ${ownerId}`);
  log("info", `🔧 Using correct types from CSV mapping for each metafield...`);
  const adjustedMetafields = metafields.map((metafield) => {
    return {
      ...metafield,
      // Keep original type and value as specified in CSV
      originalValue: metafield.value
      // Preserve original for debugging
    };
  }).sort((a, b) => {
    const keyA = `${a.namespace}.${a.key}`;
    const keyB = `${b.namespace}.${b.key}`;
    return keyA.localeCompare(keyB);
  });
  const productMetafieldsCount = adjustedMetafields.filter((m) => m.namespace === "stanley_stella").length;
  const variantMetafieldsCount = adjustedMetafields.filter((m) => m.namespace === "stanley_stella_variant").length;
  log("info", `📊 Metafield distribution: ${productMetafieldsCount} product + ${variantMetafieldsCount} variant = ${adjustedMetafields.length} total`);
  log("info", `📝 First 10 metafields (alphabetical):`);
  adjustedMetafields.slice(0, 10).forEach((metafield, index) => {
    log("info", `📝   ${index + 1}. ${metafield.namespace}.${metafield.key} = "${truncateForLog(String(metafield.value), 50)}"`);
  });
  const urlMetafields = adjustedMetafields.filter(
    (mf) => mf.key.includes("url") || mf.key.includes("logo") || ["fairwear_url", "vegan_url", "ecoclasslogourl", "oekotexlogourl"].includes(mf.key)
  );
  log("info", `📝 🌐 URL metafields found (${urlMetafields.length}):`);
  urlMetafields.forEach((metafield, index) => {
    log("info", `📝 🌐   ${index + 1}. ${metafield.namespace}.${metafield.key} (${metafield.type}) = "${truncateForLog(String(metafield.value), 80)}"`);
  });
  const typesSample = adjustedMetafields.reduce((acc, mf) => {
    if (!acc[mf.type]) acc[mf.type] = [];
    if (acc[mf.type].length < 3) {
      acc[mf.type].push(`${mf.namespace}.${mf.key}`);
    }
    return acc;
  }, {});
  log("info", `📝 🎯 METAFIELD TYPES BEING USED:`);
  Object.entries(typesSample).forEach(([type, fields]) => {
    log("info", `📝 🎯   ${type}: ${fields.join(", ")}${fields.length >= 3 ? " ..." : ""}`);
  });
  const errors = [];
  let created = 0;
  const batchSize = 25;
  const batches = [];
  for (let i = 0; i < adjustedMetafields.length; i += batchSize) {
    batches.push(adjustedMetafields.slice(i, i + batchSize));
  }
  log("info", `📦 Processing ${adjustedMetafields.length} metafields in ${batches.length} batches of ${batchSize}`);
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    log("info", `📦 Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} metafields`);
    if (batchIndex > 0) {
      const delay = Math.min(500 + batchIndex * 200, 2e3);
      log("info", `⏳ Waiting ${delay}ms before batch ${batchIndex + 1}...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const maxRetries = 3;
    let retries = 0;
    while (retries <= maxRetries) {
      try {
        const metafieldInputs = batch.map((mf) => {
          let validatedValue = String(mf.value);
          switch (mf.type) {
            case "url":
              if (validatedValue && !validatedValue.startsWith("http://") && !validatedValue.startsWith("https://") && validatedValue !== "N/A") {
                log("warn", `⚠️ URL field ${mf.namespace}.${mf.key} has non-URL value: "${validatedValue}"`);
              }
              break;
            case "number_integer":
              if (validatedValue && isNaN(parseInt(validatedValue))) {
                log("warn", `⚠️ Integer field ${mf.namespace}.${mf.key} has non-integer value: "${validatedValue}"`);
              }
              break;
            case "number_decimal":
              if (validatedValue && isNaN(parseFloat(validatedValue))) {
                log("warn", `⚠️ Decimal field ${mf.namespace}.${mf.key} has non-decimal value: "${validatedValue}"`);
              }
              break;
            case "boolean":
              if (validatedValue && !["true", "false"].includes(validatedValue.toLowerCase())) {
                log("warn", `⚠️ Boolean field ${mf.namespace}.${mf.key} has non-boolean value: "${validatedValue}"`);
              }
              break;
          }
          return {
            namespace: mf.namespace,
            key: mf.key,
            type: mf.type,
            value: validatedValue,
            ownerId
          };
        });
        log("info", `📋 Batch ${batchIndex + 1} metafields being sent to GraphQL:`);
        batch.slice(0, 3).forEach((mf, idx) => {
          const input = metafieldInputs[idx];
          log("info", `📋   ${idx + 1}. ${input.namespace}.${input.key} (${input.type}) = "${truncateForLog(input.value)}" [original: ${typeof mf.value} "${truncateForLog(String(mf.value))}"]`);
        });
        const urlInputs = metafieldInputs.filter(
          (input) => input.key.includes("url") || input.key.includes("logo")
        );
        if (urlInputs.length > 0) {
          log("info", `📋 🌐 URL metafields in this batch (${urlInputs.length}):`);
          urlInputs.forEach((input, idx) => {
            log("info", `📋 🌐   ${idx + 1}. ${input.namespace}.${input.key} (${input.type}) = "${truncateForLog(input.value, 80)}"`);
          });
        }
        const mfRes = await admin.graphql(
          `mutation ($metafields: [MetafieldsSetInput!]!) { 
            metafieldsSet(metafields: $metafields) { 
              metafields { id key namespace value }
              userErrors { field message code } 
            } 
          }`,
          { variables: { metafields: metafieldInputs } }
        );
        const mfJson = await mfRes.json();
        log("info", `📡 GraphQL response for batch ${batchIndex + 1}:`, {
          hasData: !!mfJson.data,
          hasErrors: !!mfJson.errors,
          userErrorsCount: ((_c = (_b = (_a = mfJson.data) == null ? void 0 : _a.metafieldsSet) == null ? void 0 : _b.userErrors) == null ? void 0 : _c.length) || 0,
          metafieldsCount: ((_f = (_e = (_d = mfJson.data) == null ? void 0 : _d.metafieldsSet) == null ? void 0 : _e.metafields) == null ? void 0 : _f.length) || 0
        });
        if ((_i = (_h = (_g = mfJson.data) == null ? void 0 : _g.metafieldsSet) == null ? void 0 : _h.userErrors) == null ? void 0 : _i.length) {
          const batchErrors = mfJson.data.metafieldsSet.userErrors;
          log("error", `❌ ${ownerType} metafield errors in batch ${batchIndex + 1}:`, batchErrors);
          batchErrors.forEach((error, errorIndex) => {
            let metafieldIndex = errorIndex;
            if (error.field && error.field.length > 1 && typeof error.field[1] === "number") {
              metafieldIndex = error.field[1];
            } else if (error.field && error.field.length > 1 && typeof error.field[1] === "string") {
              const match = error.field[1].match(/(\d+)/);
              if (match) metafieldIndex = parseInt(match[1]);
            }
            const failedMetafield = batch[metafieldIndex];
            const failedInput = metafieldInputs[metafieldIndex];
            if (failedMetafield && failedInput) {
              log("error", `❌ Error for metafield ${failedMetafield.namespace}.${failedMetafield.key}:`);
              log("error", `    Type: ${failedInput.type}`);
              log("error", `    Value: "${truncateForLog(failedInput.value)}" (sent as string)`);
              log("error", `    Original Value: ${failedMetafield.value} (${typeof failedMetafield.value})`);
              log("error", `    Error: ${error.message}`);
              log("error", `    Error Code: ${error.code || "N/A"}`);
              log("error", `    Error Field: ${JSON.stringify(error.field)}`);
            } else {
              log("error", `❌ Error (no metafield found): ${error.message}`);
            }
          });
          errors.push(...batchErrors);
        } else if (mfJson.errors) {
          log("error", `❌ GraphQL errors in ${ownerType.toLowerCase()} metafield batch ${batchIndex + 1}:`, mfJson.errors);
          errors.push(...mfJson.errors);
        } else {
          const processedMetafields = ((_k = (_j = mfJson.data) == null ? void 0 : _j.metafieldsSet) == null ? void 0 : _k.metafields) || [];
          created += processedMetafields.length;
          log("info", `✅ Successfully processed ${processedMetafields.length} ${ownerType.toLowerCase()} metafields in batch ${batchIndex + 1}`);
          log("info", `📋 Processed metafields:`, processedMetafields.map((mf) => `${mf.namespace}.${mf.key} = ${truncateForLog(mf.value)}`));
          if (processedMetafields.length < batch.length) {
            log("warn", `⚠️ Expected ${batch.length} metafields but only processed ${processedMetafields.length} in batch ${batchIndex + 1}`);
          }
        }
        break;
      } catch (error) {
        if (error.message.includes("Throttled") && retries < maxRetries) {
          retries++;
          const backoffDelay = Math.pow(2, retries) * 1e3;
          log("warn", `⚠️ Throttled on batch ${batchIndex + 1}, retry ${retries}/${maxRetries} in ${backoffDelay}ms`);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        } else {
          log("error", `❌ Error creating ${ownerType.toLowerCase()} metafields batch ${batchIndex + 1}:`, error);
          errors.push(`Batch ${batchIndex + 1} error: ${error.message}`);
          break;
        }
      }
    }
    if (retries > maxRetries) {
      log("error", `❌ Exhausted retries for batch ${batchIndex + 1}, skipping`);
      errors.push(`Batch ${batchIndex + 1}: Exhausted retries due to throttling`);
    }
  }
  log("info", `✅ Completed metafield creation: ${created} created, ${errors.length} errors`);
  return {
    created,
    errors
  };
}
async function ensureProductGroupingMetafieldDefinitionsAfterProducts(admin) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
  console.log("🚨🚨🚨 CRITICAL: ensureProductGroupingMetafieldDefinitionsAfterProducts function called! 🚨🚨🚨");
  log("info", "🔗 Creating product grouping metafield definitions AFTER products and metaobjects exist...");
  const results = {
    created: 0,
    existing: 0,
    errors: []
  };
  try {
    log("info", "🚨 DEBUG: Ensuring Product Grouping Option 1 Entries metaobject definition exists...");
    const ensureDefRes = await admin.graphql(
      `mutation {
        metaobjectDefinitionCreate(definition: {
          type: "product_grouping_option_1_entries"
          name: "Product Grouping Option 1 Entries"
          displayNameKey: "grouping_name"
          fieldDefinitions: [
            {
              key: "grouping_name"
              name: "Grouping Name"
              type: "single_line_text_field"
              required: true
              description: "The name of the product grouping (e.g., style name)"
            }
            {
              key: "product_grouping"
              name: "Product Grouping"
              type: "list.product_reference"
              description: "List of products that belong to this grouping"
            }
          ]
        }) {
          metaobjectDefinition {
            id
            type
            name
            displayNameKey
            fieldDefinitions {
              key
              name
              type {
                name
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`
    );
    const ensureDefJson = await ensureDefRes.json();
    const defErrors = ((_b = (_a = ensureDefJson.data) == null ? void 0 : _a.metaobjectDefinitionCreate) == null ? void 0 : _b.userErrors) || [];
    let metaobjectDefinitionId = null;
    if (defErrors.length > 0) {
      const alreadyExistsError = defErrors.find((err) => err.message.includes("already exists") || err.message.includes("taken"));
      if (alreadyExistsError) {
        log("info", `✅ Product Grouping Option 1 Entries metaobject definition already exists`);
        const existingDefRes = await admin.graphql(
          `query {
            metaobjectDefinitions(first: 50) {
              edges {
                node {
                  id
                  type
                  name
                }
              }
            }
          }`
        );
        const existingDefJson = await existingDefRes.json();
        const allMetaobjectDefs = ((_d = (_c = existingDefJson.data) == null ? void 0 : _c.metaobjectDefinitions) == null ? void 0 : _d.edges) || [];
        const existingDef = (_e = allMetaobjectDefs.find(
          (edge) => edge.node.type === "product_grouping_option_1_entries"
        )) == null ? void 0 : _e.node;
        if (existingDef) {
          metaobjectDefinitionId = existingDef.id;
          log("info", `✅ Found existing metaobject definition ID: ${metaobjectDefinitionId}`);
        } else {
          log("error", `❌ Could not find existing metaobject definition for type: product_grouping_option_1_entries`);
          results.errors.push("Could not find existing metaobject definition for product_grouping_option_1_entries");
          return results;
        }
      } else {
        log("error", `❌ Error creating metaobject definition:`, defErrors);
        results.errors.push(...defErrors.map((e) => `Metaobject definition error: ${e.message}`));
        return results;
      }
    } else {
      metaobjectDefinitionId = (_h = (_g = (_f = ensureDefJson.data) == null ? void 0 : _f.metaobjectDefinitionCreate) == null ? void 0 : _g.metaobjectDefinition) == null ? void 0 : _h.id;
      log("info", `✅ Created Product Grouping Option 1 Entries metaobject definition with ID: ${metaobjectDefinitionId}`);
    }
    if (!metaobjectDefinitionId) {
      log("error", `❌ No metaobject definition ID available`);
      results.errors.push("No metaobject definition ID available");
      return results;
    }
    log("info", `🚨 DEBUG: Checking existing metafield definitions for product grouping...`);
    const checkExistingRes = await admin.graphql(
      `query {
        metafieldDefinitions(first: 50, namespace: "stanley_stella", ownerType: PRODUCT) {
          edges {
            node {
              id
              namespace
              key
              type {
                name
              }
            }
          }
        }
      }`
    );
    const checkExistingJson = await checkExistingRes.json();
    const existingDefs = ((_j = (_i = checkExistingJson.data) == null ? void 0 : _i.metafieldDefinitions) == null ? void 0 : _j.edges) || [];
    const existingKeys = new Set(existingDefs.map((edge) => edge.node.key));
    const existingProductGroupingDefs = existingDefs.filter((edge) => edge.node.key === "product_grouping_option_1");
    if (existingProductGroupingDefs.length > 0) {
      const existingDef = existingProductGroupingDefs[0];
      const currentType = existingDef.node.type.name;
      if (currentType === "metaobject_reference") {
        log("info", `✅ Existing product_grouping_option_1 definition already has correct type: ${currentType}`);
      } else {
        log("info", `🔧 Found existing product_grouping_option_1 definition with wrong type: ${currentType}, attempting to delete...`);
        const deleteRes = await admin.graphql(
          `mutation ($id: ID!) {
            metafieldDefinitionDelete(id: $id) {
              deletedDefinitionId
              userErrors {
                field
                message
              }
            }
          }`,
          { variables: { id: existingDef.node.id } }
        );
        const deleteJson = await deleteRes.json();
        const deleteErrors = ((_l = (_k = deleteJson.data) == null ? void 0 : _k.metafieldDefinitionDelete) == null ? void 0 : _l.userErrors) || [];
        if (deleteErrors.length > 0) {
          log("warn", `⚠️ Could not delete existing product_grouping_option_1 definition (may be in use): ${deleteErrors[0].message}`);
        } else {
          log("info", `✅ Deleted existing product_grouping_option_1 definition with wrong type: ${currentType}`);
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        }
      }
    }
    const shouldCreateRefDef = existingProductGroupingDefs.length === 0 || existingProductGroupingDefs[0].node.type.name !== "metaobject_reference";
    if (shouldCreateRefDef) {
      log("info", `🔧 Creating product_grouping_option_1 metafield definition as metaobject_reference...`);
      log("info", `🔧 Creating metafield definition with metaobjectDefinitionId: ${metaobjectDefinitionId}`);
      const createRefDefRes = await admin.graphql(
        `mutation {
        metafieldDefinitionCreate(definition: {
          namespace: "stanley_stella"
          key: "product_grouping_option_1"
          name: "Product Grouping Option 1"
          description: "Product Grouping Option 1 (references Product Grouping Option 1 Entries metaobject for split products)"
          type: "metaobject_reference"
          ownerType: PRODUCT
          validations: [
            {
              name: "metaobject_definition_id"
              value: "${metaobjectDefinitionId}"
            }
          ]
        }) {
          createdDefinition {
            id
            namespace
            key
            type {
              name
            }
          }
          userErrors {
            field
            message
          }
        }
      }`
      );
      const createRefDefJson = await createRefDefRes.json();
      const refDefErrors = ((_n = (_m = createRefDefJson.data) == null ? void 0 : _m.metafieldDefinitionCreate) == null ? void 0 : _n.userErrors) || [];
      if (refDefErrors.length > 0) {
        const alreadyExistsError = refDefErrors.find((err) => err.message.includes("already exists") || err.message.includes("taken"));
        if (alreadyExistsError) {
          log("info", `✅ Product grouping option 1 metafield definition already exists`);
          results.existing++;
        } else {
          log("error", `❌ Error creating product grouping metafield definition:`, refDefErrors);
          results.errors.push(...refDefErrors.map((e) => `Product grouping metafield definition error: ${e.message}`));
        }
      } else {
        log("info", `✅ Created product grouping option 1 metafield definition as metaobject_reference`);
        results.created++;
      }
    } else {
      log("info", `✅ Product grouping option 1 metafield definition already exists with correct type`);
      results.existing++;
    }
    if (!existingKeys.has("product_grouping_option_1_value")) {
      log("info", `🔧 Creating product_grouping_option_1_value metafield definition...`);
      const createValueDefRes = await admin.graphql(
        `mutation {
          metafieldDefinitionCreate(definition: {
            namespace: "stanley_stella"
            key: "product_grouping_option_1_value"
            name: "Product Grouping Option 1 Value"
            description: "Value for Product Grouping Option 1 (typically the size for split products)"
            type: "single_line_text_field"
            ownerType: PRODUCT
          }) {
            createdDefinition {
              id
              namespace
              key
              type {
                name
              }
            }
            userErrors {
              field
              message
            }
          }
        }`
      );
      const createValueDefJson = await createValueDefRes.json();
      const valueDefErrors = ((_p = (_o = createValueDefJson.data) == null ? void 0 : _o.metafieldDefinitionCreate) == null ? void 0 : _p.userErrors) || [];
      if (valueDefErrors.length > 0) {
        const alreadyExistsError = valueDefErrors.find((err) => err.message.includes("already exists") || err.message.includes("taken"));
        if (alreadyExistsError) {
          log("info", `✅ Product grouping option 1 value metafield definition already exists`);
          results.existing++;
        } else {
          log("error", `❌ Error creating product grouping value metafield definition:`, valueDefErrors);
          results.errors.push(...valueDefErrors.map((e) => `Product grouping value metafield definition error: ${e.message}`));
        }
      } else {
        log("info", `✅ Created product grouping option 1 value metafield definition`);
        results.created++;
      }
    } else {
      log("info", `✅ Product grouping option 1 value metafield definition already exists`);
      results.existing++;
    }
  } catch (error) {
    log("error", `❌ Error in product grouping metafield definition creation:`, error);
    results.errors.push(`Product grouping setup error: ${error.message}`);
  }
  return results;
}
async function ensureProductGroupingMetaobject(admin, styleName) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  try {
    log("info", `🔧 Ensuring Product Grouping Option 1 Entries metaobject definition exists`);
    const ensureDefRes = await admin.graphql(
      `mutation {
        metaobjectDefinitionCreate(definition: {
          type: "product_grouping_option_1_entries"
          name: "Product Grouping Option 1 Entries"
          displayNameKey: "grouping_name"
          fieldDefinitions: [
            {
              key: "grouping_name"
              name: "Grouping Name"
              type: "single_line_text_field"
              required: true
              description: "The name of the product grouping (e.g., style name)"
            }
            {
              key: "product_grouping"
              name: "Product Grouping"
              type: "list.product_reference"
              description: "List of products that belong to this grouping"
            }
          ]
        }) {
          metaobjectDefinition {
            id
            type
            name
            displayNameKey
            fieldDefinitions {
              key
              name
              type {
                name
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`
    );
    const ensureDefJson = await ensureDefRes.json();
    const defErrors = ((_b = (_a = ensureDefJson.data) == null ? void 0 : _a.metaobjectDefinitionCreate) == null ? void 0 : _b.userErrors) || [];
    if (defErrors.length > 0) {
      const alreadyExistsError = defErrors.find((err) => err.message.includes("already exists") || err.message.includes("taken"));
      if (alreadyExistsError) {
        log("info", `✅ Product Grouping Option 1 Entries metaobject definition already exists`);
      } else {
        log("error", `❌ Error creating metaobject definition:`, defErrors);
      }
    } else {
      log("info", `✅ Created Product Grouping Option 1 Entries metaobject definition`);
    }
    const groupingName = styleName && styleName.trim() !== "" ? styleName : "Unknown_Style";
    log("info", `🔍 Looking for existing Product Grouping Option 1 Entry for: ${groupingName} (original styleName: "${styleName}")`);
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
    const existingGrouping = (_e = (_d = (_c = existingGroupingJson.data) == null ? void 0 : _c.metaobjects) == null ? void 0 : _d.edges) == null ? void 0 : _e.find(
      (edge) => edge.node.fields.find((field) => field.key === "grouping_name" && field.value === groupingName)
    );
    if (existingGrouping) {
      log("info", `✅ Found existing Product Grouping Option 1 Entry: ${groupingName} (${existingGrouping.node.id})`);
      return existingGrouping.node;
    }
    log("info", `🔧 Creating new Product Grouping Option 1 Entry for: ${groupingName}`);
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
    const groupingErrs = ((_g = (_f = createGroupingJson.data) == null ? void 0 : _f.metaobjectCreate) == null ? void 0 : _g.userErrors) || [];
    if (groupingErrs.length) {
      log("error", "Product Grouping Option 1 Entries creation errors", groupingErrs);
      return null;
    }
    const metaobject = (_i = (_h = createGroupingJson.data) == null ? void 0 : _h.metaobjectCreate) == null ? void 0 : _i.metaobject;
    if (metaobject) {
      log("info", `✅ Created Product Grouping Option 1 Entry: ${groupingName} (${metaobject.id})`);
      return metaobject;
    }
    return null;
  } catch (error) {
    log("error", `❌ Error creating/finding Product Grouping Option 1 Entry:`, error);
    return null;
  }
}
async function updateProductGroupingWithProducts(admin, metaobjectId, productIds) {
  var _a, _b, _c, _d, _e;
  try {
    log("info", `🔗 Updating Product Grouping metaobject ${metaobjectId} with ${productIds.length} product references`);
    if (!metaobjectId) {
      log("error", "❌ updateProductGroupingWithProducts: metaobjectId is required");
      return false;
    }
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      log("error", "❌ updateProductGroupingWithProducts: productIds must be a non-empty array");
      return false;
    }
    const getCurrentRes = await admin.graphql(
      `query ($id: ID!) {
        metaobject(id: $id) {
          id
          fields {
            key
            value
          }
        }
      }`,
      { variables: { id: metaobjectId } }
    );
    const getCurrentJson = await getCurrentRes.json();
    const currentMetaobject = (_a = getCurrentJson.data) == null ? void 0 : _a.metaobject;
    if (!currentMetaobject) {
      log("error", `❌ Could not find metaobject with ID: ${metaobjectId}`);
      return false;
    }
    const groupingNameField = currentMetaobject.fields.find((field) => field.key === "grouping_name");
    const groupingName = groupingNameField ? groupingNameField.value : "Unknown Group";
    log("info", `🔗 Current metaobject: ${currentMetaobject.id}`);
    log("info", `🔗 Grouping name: ${groupingName}`);
    log("info", `🔗 Product IDs to add: ${productIds.join(", ")}`);
    log("info", `🔗 Using metaobjectUpdate mutation with proper MetaobjectUpdateInput format`);
    const metaobjectInput = {
      fields: [
        {
          key: "grouping_name",
          value: groupingName
        },
        {
          key: "product_grouping",
          value: JSON.stringify(productIds)
          // Use JSON array for list.product_reference fields
        }
      ]
    };
    log("info", `🔗 Metaobject input:`, metaobjectInput);
    const updateRes = await admin.graphql(
      `mutation ($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
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
          id: metaobjectId,
          metaobject: metaobjectInput
        }
      }
    );
    const updateJson = await updateRes.json();
    log("info", `🔗 GraphQL response status: ${updateRes.status}`);
    log("info", `🔗 Full GraphQL response:`, updateJson);
    const updateErrors = ((_c = (_b = updateJson.data) == null ? void 0 : _b.metaobjectUpdate) == null ? void 0 : _c.userErrors) || [];
    const updatedMetaobject = (_e = (_d = updateJson.data) == null ? void 0 : _d.metaobjectUpdate) == null ? void 0 : _e.metaobject;
    if (updateErrors.length > 0) {
      log("error", `❌ GraphQL user errors:`, updateErrors);
      return false;
    }
    if (updatedMetaobject) {
      log("info", `✅ Successfully updated Product Grouping metaobject: ${updatedMetaobject.id}`);
      log("info", `🔗 Updated fields:`, updatedMetaobject.fields);
      return true;
    } else {
      log("error", `❌ No metaobject returned in update response`);
      log("error", `❌ Full response data:`, updateJson.data);
      return false;
    }
  } catch (error) {
    log("error", `❌ Exception in updateProductGroupingWithProducts:`, error);
    log("error", `❌ Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return false;
  }
}
function debugFieldMapping() {
  const totalMappings = Object.keys(FIELD_MAPPING).length;
  const productMappings = Object.values(FIELD_MAPPING).filter((m) => m.target === "product_metafield").length;
  const variantMappings = Object.values(FIELD_MAPPING).filter((m) => m.target === "variant_metafield").length;
  log("info", `🔍 Field mapping debug: ${totalMappings} total mappings (${productMappings} product, ${variantMappings} variant)`);
  log("info", `🔍 First 10 mapped fields: ${Object.keys(FIELD_MAPPING).slice(0, 10).join(", ")}`);
  log("info", `🔍 Excluded fields: ${EXCLUDED_FIELDS.join(", ")}`);
}
function debugApiDataStructure(item) {
  log("info", "🔍 =================================");
  log("info", "🔍 API DATA STRUCTURE ANALYSIS");
  log("info", "🔍 =================================");
  const itemFields = Object.keys(item);
  const mappedFields = Object.keys(FIELD_MAPPING);
  const excludedFields = EXCLUDED_FIELDS;
  const exactMatches = itemFields.filter((field) => mappedFields.includes(field));
  const excludedMatches = itemFields.filter((field) => excludedFields.includes(field));
  const unmappedFields = itemFields.filter(
    (field) => !mappedFields.includes(field) && !excludedFields.includes(field)
  );
  log("info", `📊 SUMMARY:`);
  log("info", `   Total API fields: ${itemFields.length}`);
  log("info", `   Exact mapping matches: ${exactMatches.length}`);
  log("info", `   Excluded fields found: ${excludedMatches.length}`);
  log("info", `   Unmapped fields: ${unmappedFields.length}`);
  log("info", `✅ EXACT MATCHES (${exactMatches.length}):`);
  exactMatches.forEach((field) => {
    const mapping = FIELD_MAPPING[field];
    const value = item[field];
    log("info", `   ${field} -> ${mapping.target} (${mapping.namespace}.${mapping.key}) = ${truncateForLog(String(value))}`);
  });
  if (excludedMatches.length > 0) {
    log("info", `🚫 EXCLUDED FIELDS FOUND (${excludedMatches.length}):`);
    excludedMatches.slice(0, 10).forEach((field) => {
      log("info", `   ${field} = ${truncateForLog(String(item[field]))}`);
    });
  }
  if (unmappedFields.length > 0) {
    log("info", `❓ UNMAPPED FIELDS (${unmappedFields.length}):`);
    unmappedFields.slice(0, 15).forEach((field) => {
      log("info", `   ${field} = ${truncateForLog(String(item[field]))}`);
    });
    if (unmappedFields.length > 15) {
      log("info", `   ... and ${unmappedFields.length - 15} more unmapped fields`);
    }
  }
  log("info", "🔍 =================================");
  return {
    totalFields: itemFields.length,
    exactMatches: exactMatches.length,
    excludedMatches: excludedMatches.length,
    unmappedFields: unmappedFields.length,
    matchedFieldNames: exactMatches,
    unmappedFieldNames: unmappedFields.slice(0, 20)
  };
}
function debugItemStructure(item) {
  log("info", `🔍 ITEM STRUCTURE DEBUG:`);
  log("info", `🔍 Item has ${Object.keys(item).length} total fields`);
  const productMappings = Object.entries(FIELD_MAPPING).filter(([key, mapping]) => mapping.target === "product_metafield");
  log("info", `🔍 Expected ${productMappings.length} product metafield mappings`);
  let foundProductFields = 0;
  let missingProductFields = 0;
  log("info", `🔍 Checking product metafield mappings against item data:`);
  for (const [fieldKey, mapping] of productMappings.slice(0, 10)) {
    if (item.hasOwnProperty(fieldKey)) {
      foundProductFields++;
      const value = item[fieldKey];
      log("info", `🔍   ✅ ${fieldKey}: "${truncateForLog(String(value))}" (${typeof value}) -> ${mapping.namespace}.${mapping.key}`);
    } else {
      missingProductFields++;
      log("info", `🔍   ❌ ${fieldKey}: MISSING from item data`);
    }
  }
  log("info", `🔍 Product field summary: ${foundProductFields} found, ${missingProductFields} missing (of first 10 checked)`);
  if (item.Variants && Array.isArray(item.Variants)) {
    log("info", `🔍 Item has Variants array with ${item.Variants.length} variants`);
    if (item.Variants.length > 0) {
      const firstVariant = item.Variants[0];
      log("info", `🔍 First variant keys: ${Object.keys(firstVariant).slice(0, 10).join(", ")}`);
    }
  } else {
    log("info", `🔍 Item does NOT have Variants array`);
  }
  log("info", `🔍 All item keys: ${Object.keys(item).join(", ")}`);
  return {
    totalFields: Object.keys(item).length,
    foundProductFields,
    missingProductFields,
    hasVariants: !!(item.Variants && Array.isArray(item.Variants))
  };
}
function debugDescriptionFields(item) {
  log("info", "🔍 =================================");
  log("info", "🔍 DESCRIPTION FIELDS ANALYSIS");
  log("info", "🔍 =================================");
  const allFields = Object.keys(item);
  const descriptionFields = allFields.filter(
    (key) => key.toLowerCase().includes("description") || key.toLowerCase().includes("desc") || key.toLowerCase().includes("long") || key.toLowerCase().includes("detail")
  );
  log("info", `📊 Total fields in item: ${allFields.length}`);
  log("info", `📊 Description-related fields found: ${descriptionFields.length}`);
  if (descriptionFields.length > 0) {
    log("info", "📋 Description fields and their values:");
    descriptionFields.forEach((field) => {
      const value = item[field];
      log("info", `   "${field}": "${truncateForLog(String(value), 100)}" (${typeof value})`);
    });
  } else {
    log("warn", "⚠️ No description-related fields found in item data");
    log("info", "📋 All available fields:");
    allFields.slice(0, 20).forEach((field) => {
      const value = item[field];
      log("info", `   "${field}": "${truncateForLog(String(value), 50)}" (${typeof value})`);
    });
    if (allFields.length > 20) {
      log("info", `   ... and ${allFields.length - 20} more fields`);
    }
  }
  log("info", "🔍 =================================");
  return {
    totalFields: allFields.length,
    descriptionFields: descriptionFields.length,
    descriptionFieldNames: descriptionFields,
    allFieldNames: allFields
  };
}
function countStanleyProductMetafields() {
  const stanleyProductFields = Object.entries(FIELD_MAPPING).filter(
    ([key, mapping]) => mapping.target === "product_metafield" && mapping.namespace === "stanley_stella"
  );
  log("info", `🔍 STANLEY_STELLA PRODUCT METAFIELD COUNT: ${stanleyProductFields.length}`);
  log("info", `🔍 Stanley product fields: ${stanleyProductFields.map(([key]) => key).join(", ")}`);
  return stanleyProductFields.length;
}
async function fixProductGroupingReferences(admin, metaobjectId = null) {
  var _a, _b;
  try {
    log("info", "🔧 Starting fixProductGroupingReferences...");
    if (metaobjectId) {
      return await fixSingleProductGrouping(admin, metaobjectId);
    }
    log("info", "🔍 Finding all Product Grouping metaobjects...");
    const metaobjectsRes = await admin.graphql(`
      query {
        metaobjects(type: "product_grouping_option_1_entries", first: 50) {
          edges {
            node {
              id
              handle
              fields {
                key
                value
              }
            }
          }
        }
      }
    `);
    const metaobjectsJson = await metaobjectsRes.json();
    const metaobjects = ((_b = (_a = metaobjectsJson.data) == null ? void 0 : _a.metaobjects) == null ? void 0 : _b.edges) || [];
    log("info", `🔍 Found ${metaobjects.length} Product Grouping metaobjects`);
    const results = {
      totalChecked: 0,
      fixed: 0,
      errors: [],
      details: []
    };
    for (const edge of metaobjects) {
      const metaobject = edge.node;
      results.totalChecked++;
      try {
        const fixed = await fixSingleProductGrouping(admin, metaobject.id);
        if (fixed) {
          results.fixed++;
          results.details.push(`✅ Fixed: ${metaobject.id}`);
        } else {
          results.details.push(`⏭️ Skipped: ${metaobject.id} (no fix needed or failed)`);
        }
      } catch (error) {
        log("error", `❌ Error fixing metaobject ${metaobject.id}:`, error);
        results.errors.push(`Error fixing ${metaobject.id}: ${error.message}`);
      }
    }
    log("info", `🔧 Fix complete: ${results.fixed}/${results.totalChecked} metaobjects fixed`);
    return results;
  } catch (error) {
    log("error", "❌ Error in fixProductGroupingReferences:", error);
    throw error;
  }
}
async function fixSingleProductGrouping(admin, metaobjectId) {
  var _a, _b, _c, _d;
  try {
    log("info", `🔧 Checking metaobject ${metaobjectId}...`);
    const metaobjectRes = await admin.graphql(`
      query ($id: ID!) {
        metaobject(id: $id) {
          id
          handle
          fields {
            key
            value
          }
        }
      }
    `, { variables: { id: metaobjectId } });
    const metaobjectJson = await metaobjectRes.json();
    const metaobject = (_a = metaobjectJson.data) == null ? void 0 : _a.metaobject;
    if (!metaobject) {
      log("error", `❌ Metaobject not found: ${metaobjectId}`);
      return false;
    }
    const existingFields = metaobject.fields.map((field) => field.key);
    log("info", `🔍 ${metaobjectId}: existing fields: ${existingFields.join(", ")}`);
    const productGroupingField = metaobject.fields.find((field) => field.key === "product_grouping");
    const groupingNameField = metaobject.fields.find((field) => field.key === "grouping_name");
    if (!productGroupingField) {
      log("error", `❌ ${metaobjectId}: Missing "product_grouping" field in metaobject definition`);
      log("error", `❌ Available fields: ${existingFields.join(", ")}`);
      log("error", `❌ SOLUTION: Go to the Metaobjects page and run "Complete Setup" to recreate the definition with the correct "product_grouping" field`);
      return false;
    }
    const currentProductGrouping = productGroupingField ? productGroupingField.value : null;
    const groupingName = groupingNameField ? groupingNameField.value : "Unknown";
    log("info", `🔍 ${metaobjectId}: grouping_name="${groupingName}", product_grouping="${currentProductGrouping}"`);
    const needsFix = !currentProductGrouping || currentProductGrouping === "" || currentProductGrouping === "[]" || currentProductGrouping === "null";
    if (!needsFix) {
      log("info", `⏭️ ${metaobjectId}: product_grouping field already has data, skipping`);
      return false;
    }
    log("info", `🔍 Finding products that reference metaobject ${metaobjectId}...`);
    const productsRes = await admin.graphql(`
      query {
        products(first: 250) {
          edges {
            node {
              id
              title
              metafields(first: 50, namespace: "stanley_stella") {
                edges {
                  node {
                    id
                    key
                    value
                    type
                  }
                }
              }
            }
          }
        }
      }
    `);
    const productsJson = await productsRes.json();
    const products = ((_c = (_b = productsJson.data) == null ? void 0 : _b.products) == null ? void 0 : _c.edges) || [];
    const referencingProducts = [];
    for (const productEdge of products) {
      const product = productEdge.node;
      const metafields = ((_d = product.metafields) == null ? void 0 : _d.edges) || [];
      for (const metafieldEdge of metafields) {
        const metafield = metafieldEdge.node;
        if (metafield.key === "product_grouping_option_1" && metafield.type === "metaobject_reference" && metafield.value === metaobjectId) {
          referencingProducts.push(product.id);
          log("info", `🔗 Found referencing product: ${product.title} (${product.id})`);
          break;
        }
      }
    }
    if (referencingProducts.length === 0) {
      log("info", `⚠️ ${metaobjectId}: No products found that reference this metaobject`);
      return false;
    }
    log("info", `🔧 ${metaobjectId}: Found ${referencingProducts.length} referencing products, updating...`);
    const success = await updateProductGroupingWithProducts(admin, metaobjectId, referencingProducts);
    if (success) {
      log("info", `✅ ${metaobjectId}: Successfully fixed product_grouping field with ${referencingProducts.length} products`);
      return true;
    } else {
      log("error", `❌ ${metaobjectId}: Failed to update product_grouping field`);
      return false;
    }
  } catch (error) {
    log("error", `❌ Error in fixSingleProductGrouping for ${metaobjectId}:`, error);
    throw error;
  }
}
export {
  EXCLUDED_FIELDS,
  FIELD_MAPPING,
  countStanleyProductMetafields,
  createMetafields,
  createProductGroupingMetafields,
  debugApiDataStructure,
  debugDescriptionFields,
  debugFieldMapping,
  debugItemStructure,
  ensureAllMetafieldDefinitions,
  ensureMetafieldDefinitions,
  ensureProductGroupingMetafieldDefinitionsAfterProducts,
  ensureProductGroupingMetaobject,
  fixProductGroupingReferences,
  processItemMetafields,
  processVariantMetafields,
  updateProductGroupingWithProducts
};
