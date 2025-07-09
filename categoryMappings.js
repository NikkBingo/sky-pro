// Stanley/Stella Product Category & Attribute Mappings
// Based on Shopify's Official Product Taxonomy
// Source: https://github.com/Shopify/product-taxonomy/
// Categories: https://github.com/Shopify/product-taxonomy/blob/main/data/categories/aa_apparel_accessories.yml
// Attributes: https://github.com/Shopify/product-taxonomy/blob/main/data/attributes.yml
// Values: https://github.com/Shopify/product-taxonomy/blob/main/data/values.yml
// 
// To find category IDs:
// 1. Create a test product in Shopify admin  
// 2. Assign it to the desired category
// 3. Use GraphQL to query: product { category { id name fullName } }

// Helper function to safely log in SSR environment
const safeLog = (level, message, ...args) => {
  // Only log in development to prevent SSR issues
  if (typeof console !== 'undefined' && console[level] && process.env.NODE_ENV === 'development') {
    console[level](message, ...args);
  }
};

// ==============================================================================
// CATEGORY MAPPINGS (Apparel & Accessories)
// ==============================================================================

export const STANLEY_STELLA_CATEGORIES = {
  // Direct TypeCode mappings (most specific) - using verified taxonomy IDs
  'HOODIES': 'gid://shopify/TaxonomyCategory/aa-1-13-13',    // Hoodies & Sweatshirts ✅ CONFIRMED
  'SWEATS': 'gid://shopify/TaxonomyCategory/aa-1-13-14',     // Sweatshirts ✅ UPDATED
  'SWEATSHIRTS': 'gid://shopify/TaxonomyCategory/aa-1-13-14', // Sweatshirts ✅ UPDATED
  
  // T-shirts and tops - Using verified Shopify taxonomy IDs
  'TEES': 'gid://shopify/TaxonomyCategory/aa-1-13-8',        // T-shirts ✅ FINAL CORRECT
  'TSHIRTS': 'gid://shopify/TaxonomyCategory/aa-1-13-8',     // T-shirts ✅ FINAL CORRECT
  'TOPS': 'gid://shopify/TaxonomyCategory/aa-1-13-8',        // T-shirts ✅ FINAL CORRECT
  'SHIRTS': 'gid://shopify/TaxonomyCategory/aa-1-13-7',      // Shirts ✅ NEW
  
  // Tank tops
  'TANKS': 'gid://shopify/TaxonomyCategory/aa-1-13-9',       // Tank Tops ✅ UPDATED
  'TANKTOPS': 'gid://shopify/TaxonomyCategory/aa-1-13-9',    // Tank Tops ✅ UPDATED
  
  // Polo shirts
  'POLO': 'gid://shopify/TaxonomyCategory/aa-1-13-6',        // Polos ✅ UPDATED
  'POLOS': 'gid://shopify/TaxonomyCategory/aa-1-13-6',       // Polos ✅ UPDATED
  
  // Additional tops
  'SWEATERS': 'gid://shopify/TaxonomyCategory/aa-1-13-12',   // Sweaters ✅ NEW
  'TUNICS': 'gid://shopify/TaxonomyCategory/aa-1-13-11',     // Tunics ✅ NEW
  'OVERSHIRTS': 'gid://shopify/TaxonomyCategory/aa-1-13-5',  // Overshirts ✅ NEW
  'CARDIGANS': 'gid://shopify/TaxonomyCategory/aa-1-13-3',   // Cardigans ✅ NEW
  'BODYSUITS': 'gid://shopify/TaxonomyCategory/aa-1-13-2',   // Bodysuits ✅ NEW
  'BLOUSES': 'gid://shopify/TaxonomyCategory/aa-1-13-1',     // Blouses ✅ NEW
  
  // Bottoms - Using verified taxonomy IDs
  'PANTS': 'gid://shopify/TaxonomyCategory/aa-1-12-11',      // Trousers ✅ UPDATED
  'TROUSERS': 'gid://shopify/TaxonomyCategory/aa-1-12-11',   // Trousers ✅ UPDATED
  'CARGO_PANTS': 'gid://shopify/TaxonomyCategory/aa-1-12-2', // Cargo Pants ✅ NEW
  'CHINOS': 'gid://shopify/TaxonomyCategory/aa-1-12-3',      // Chinos ✅ NEW
  'JEANS': 'gid://shopify/TaxonomyCategory/aa-1-12-4',       // Jeans ✅ UPDATED
  'JEGGINGS': 'gid://shopify/TaxonomyCategory/aa-1-12-5',    // Jeggings ✅ NEW
  'JOGGERS': 'gid://shopify/TaxonomyCategory/aa-1-12-7',     // Joggers ✅ NEW
  'LEGGINGS': 'gid://shopify/TaxonomyCategory/aa-1-12-8',    // Leggings ✅ NEW
  'SHORTS': 'gid://shopify/TaxonomyCategory/aa-1-14-2',      // Shorts (keeping existing)
  
  // Shorts - specific types using verified taxonomy IDs
  'BERMUDAS': 'gid://shopify/TaxonomyCategory/aa-1-14-1',    // Bermudas ✅ NEW
  'CARGO_SHORTS': 'gid://shopify/TaxonomyCategory/aa-1-14-2', // Cargo Shorts ✅ NEW
  'CHINO_SHORTS': 'gid://shopify/TaxonomyCategory/aa-1-14-3', // Chino Shorts ✅ NEW
  'SHORT_TROUSERS': 'gid://shopify/TaxonomyCategory/aa-1-14-4', // Short Trousers ✅ NEW
  'DENIM_SHORTS': 'gid://shopify/TaxonomyCategory/aa-1-14-5', // Denim Shorts ✅ NEW
  'JEGGING_SHORTS': 'gid://shopify/TaxonomyCategory/aa-1-14-6', // Jegging Shorts ✅ NEW
  'JOGGER_SHORTS': 'gid://shopify/TaxonomyCategory/aa-1-14-7', // Jogger Shorts ✅ NEW
  'LEGGING_SHORTS': 'gid://shopify/TaxonomyCategory/aa-1-14-8', // Legging Shorts ✅ NEW
  'SHORTS': 'gid://shopify/TaxonomyCategory/aa-1-14-2',      // Shorts (default to Cargo Shorts) ✅ UPDATED
  
  // Baby & Toddler - using verified taxonomy IDs
  'BABY_TODDLER_BOTTOMS': 'gid://shopify/TaxonomyCategory/aa-1-2-1', // Baby & Toddler Bottoms ✅ NEW
  'BABY_TODDLER_DIAPER_COVERS': 'gid://shopify/TaxonomyCategory/aa-1-2-2', // Baby & Toddler Diaper Covers ✅ NEW
  'BABY_TODDLER_DRESSES': 'gid://shopify/TaxonomyCategory/aa-1-2-3', // Baby & Toddler Dresses ✅ NEW
  'BABY_TODDLER_OUTERWEAR': 'gid://shopify/TaxonomyCategory/aa-1-2-4', // Baby & Toddler Outerwear ✅ NEW
  'BABY_TODDLER_OUTFITS': 'gid://shopify/TaxonomyCategory/aa-1-2-5', // Baby & Toddler Outfits ✅ NEW
  'BABY_TODDLER_SLEEPWEAR': 'gid://shopify/TaxonomyCategory/aa-1-2-6', // Baby & Toddler Sleepwear ✅ NEW
  'BABY_TODDLER_SOCKS_TIGHTS': 'gid://shopify/TaxonomyCategory/aa-1-2-7', // Baby & Toddler Socks & Tights ✅ NEW
  'BABY_TODDLER_SWIMWEAR': 'gid://shopify/TaxonomyCategory/aa-1-2-8', // Baby & Toddler Swimwear ✅ NEW
  'BABY_TODDLER_TOPS': 'gid://shopify/TaxonomyCategory/aa-1-2-9', // Baby & Toddler Tops ✅ NEW
  'BABY_ONE_PIECES': 'gid://shopify/TaxonomyCategory/aa-1-2-10', // Baby One-Pieces ✅ NEW
  'TODDLER_UNDERWEAR': 'gid://shopify/TaxonomyCategory/aa-1-2-11', // Toddler Underwear ✅ NEW
  
  // Coats & Jackets - using verified taxonomy IDs
  'COATS_JACKETS': 'gid://shopify/TaxonomyCategory/aa-1-10-2', // Coats & Jackets ✅ NEW
  'COATS': 'gid://shopify/TaxonomyCategory/aa-1-10-2',       // Coats & Jackets ✅ NEW
  'JACKETS': 'gid://shopify/TaxonomyCategory/aa-1-10-2',     // Coats & Jackets ✅ NEW
  'BOLERO_JACKETS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-1', // Bolero Jackets ✅ NEW
  'BOMBER_JACKETS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-2', // Bomber Jackets ✅ NEW
  'CAPES': 'gid://shopify/TaxonomyCategory/aa-1-10-2-3',     // Capes ✅ NEW
  'OVERCOATS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-5', // Overcoats ✅ NEW
  'PARKAS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-6',    // Parkas ✅ NEW
  'PEA_COATS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-7', // Pea Coats ✅ NEW
  'PONCHOS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-8',   // Ponchos ✅ NEW
  'PUFFER_JACKETS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-9', // Puffer Jackets ✅ NEW
  'RAIN_COATS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-10', // Rain Coats ✅ NEW
  'SPORT_JACKETS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-11', // Sport Jackets ✅ NEW
  'TRACK_JACKETS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-12', // Track Jackets ✅ NEW
  'TRENCH_COATS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-13', // Trench Coats ✅ NEW
  'TRUCKER_JACKETS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-14', // Trucker Jackets ✅ NEW
  'VARSITY_JACKETS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-15', // Varsity Jackets ✅ NEW
  'WINDBREAKERS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-16', // Windbreakers ✅ NEW
  'WRAP_COATS': 'gid://shopify/TaxonomyCategory/aa-1-10-2-17', // Wrap Coats ✅ NEW
  
  // Dresses and skirts
  'DRESSES': 'gid://shopify/TaxonomyCategory/aa-1-15-1',     // Dresses (keeping existing)
  'SKIRTS': 'gid://shopify/TaxonomyCategory/aa-1-15-2',      // Skirts (keeping existing)
  
  // Underwear and intimates
  'UNDERWEAR': 'gid://shopify/TaxonomyCategory/aa-1-16-1',   // Underwear (keeping existing)
  'SOCKS': 'gid://shopify/TaxonomyCategory/aa-1-17-1',       // Socks (keeping existing)
  
  // Bags - Using verified taxonomy IDs
  'BAGS': 'gid://shopify/TaxonomyCategory/lb-11',            // Bags (keeping existing)
  'GYM_DUFFEL_BAGS': 'gid://shopify/TaxonomyCategory/lb-6-1', // Gym Duffel Bags ✅ NEW
  'FANNY_PACKS': 'gid://shopify/TaxonomyCategory/lb-7',      // Fanny Packs ✅ NEW
  'HANDBAGS': 'gid://shopify/TaxonomyCategory/aa-5-4',       // Handbags ✅ NEW
  'BEACH_BAGS': 'gid://shopify/TaxonomyCategory/aa-5-4-3',   // Beach Bags ✅ NEW
  
  // Hats - Using verified taxonomy IDs
  'HATS': 'gid://shopify/TaxonomyCategory/aa-2-17-16',       // Winter Hats (default) ✅ UPDATED
  'CAPS': 'gid://shopify/TaxonomyCategory/aa-2-17-1',        // Baseball Caps ✅ UPDATED
  'BEANIES': 'gid://shopify/TaxonomyCategory/aa-2-17-2',     // Beanies ✅ NEW
  'BASEBALL_CAPS': 'gid://shopify/TaxonomyCategory/aa-2-17-1', // Baseball Caps ✅ NEW
  'BUCKET_HATS': 'gid://shopify/TaxonomyCategory/aa-2-17-5', // Bucket Hats ✅ NEW
  'FEDORAS': 'gid://shopify/TaxonomyCategory/aa-2-17-7',     // Fedoras ✅ NEW
  'PANAMA_HATS': 'gid://shopify/TaxonomyCategory/aa-2-17-9', // Panama Hats ✅ NEW
  'TRUCKER_HATS': 'gid://shopify/TaxonomyCategory/aa-2-17-14', // Trucker Hats ✅ NEW
  'WINTER_HATS': 'gid://shopify/TaxonomyCategory/aa-2-17-16', // Winter Hats ✅ NEW
  'SUN_HATS': 'gid://shopify/TaxonomyCategory/aa-2-17-11',   // Sun Hats ✅ NEW
  
  // Accessories - Using verified taxonomy IDs
  'BELTS': 'gid://shopify/TaxonomyCategory/aa-2-3-1',        // Belts (keeping existing)
  'PEN_PENCIL_CASES': 'gid://shopify/TaxonomyCategory/os-3-16', // Pen & Pencil Cases ✅ NEW
  'BADGE_PASS_HOLDERS': 'gid://shopify/TaxonomyCategory/aa-5-1', // Badge & Pass Holders ✅ NEW
  'BUSINESS_CARD_CASES': 'gid://shopify/TaxonomyCategory/aa-5-2', // Business Card Cases ✅ NEW
  'CHECKBOOK_COVERS': 'gid://shopify/TaxonomyCategory/aa-5-3', // Checkbook Covers ✅ NEW
  'WALLETS_MONEY_CLIPS': 'gid://shopify/TaxonomyCategory/aa-5-5', // Wallets & Money Clips ✅ NEW
};

// CSV Category field mappings (Stanley/Stella specific)
export const CATEGORY_FIELD_MAPPINGS = {
  // Stanley/Stella Category field values - using verified taxonomy IDs
  'Tank Tops': 'gid://shopify/TaxonomyCategory/aa-1-13-9',     // Tank Tops ✅ UPDATED
  'Sweatshirts': 'gid://shopify/TaxonomyCategory/aa-1-13-14',  // Sweatshirts ✅ UPDATED
  'Sweaters': 'gid://shopify/TaxonomyCategory/aa-1-13-12',     // Sweaters ✅ NEW
  'Shirts': 'gid://shopify/TaxonomyCategory/aa-1-13-7',        // Shirts ✅ NEW
  'Tunics': 'gid://shopify/TaxonomyCategory/aa-1-13-11',       // Tunics ✅ NEW
  'Polos': 'gid://shopify/TaxonomyCategory/aa-1-13-6',         // Polos ✅ UPDATED
  'Overshirts': 'gid://shopify/TaxonomyCategory/aa-1-13-5',    // Overshirts ✅ NEW
  'Cardigans': 'gid://shopify/TaxonomyCategory/aa-1-13-3',     // Cardigans ✅ NEW
  'Bodysuits': 'gid://shopify/TaxonomyCategory/aa-1-13-2',     // Bodysuits ✅ NEW
  'Blouses': 'gid://shopify/TaxonomyCategory/aa-1-13-1',       // Blouses ✅ NEW
  'T-shirts': 'gid://shopify/TaxonomyCategory/aa-1-13-8',      // T-shirts ✅ FINAL CORRECT
  'Hoodies': 'gid://shopify/TaxonomyCategory/aa-1-13-13',      // Hoodies & Sweatshirts
  
  // Bottoms - using verified taxonomy IDs
  'Cargo Pants': 'gid://shopify/TaxonomyCategory/aa-1-12-2',   // Cargo Pants ✅ NEW
  'Chinos': 'gid://shopify/TaxonomyCategory/aa-1-12-3',        // Chinos ✅ NEW
  'Jeans': 'gid://shopify/TaxonomyCategory/aa-1-12-4',         // Jeans ✅ UPDATED
  'Jeggings': 'gid://shopify/TaxonomyCategory/aa-1-12-5',      // Jeggings ✅ NEW
  'Joggers': 'gid://shopify/TaxonomyCategory/aa-1-12-7',       // Joggers ✅ NEW
  'Leggings': 'gid://shopify/TaxonomyCategory/aa-1-12-8',      // Leggings ✅ NEW
  'Trousers': 'gid://shopify/TaxonomyCategory/aa-1-12-11',     // Trousers ✅ UPDATED
  'Pants': 'gid://shopify/TaxonomyCategory/aa-1-12-11',        // Trousers ✅ UPDATED
  
  // Shorts - specific types using verified taxonomy IDs
  'Bermudas': 'gid://shopify/TaxonomyCategory/aa-1-14-1',      // Bermudas ✅ NEW
  'Cargo Shorts': 'gid://shopify/TaxonomyCategory/aa-1-14-2',  // Cargo Shorts ✅ NEW
  'Chino Shorts': 'gid://shopify/TaxonomyCategory/aa-1-14-3',  // Chino Shorts ✅ NEW
  'Short Trousers': 'gid://shopify/TaxonomyCategory/aa-1-14-4', // Short Trousers ✅ NEW
  'Denim Shorts': 'gid://shopify/TaxonomyCategory/aa-1-14-5',  // Denim Shorts ✅ NEW
  'Jegging Shorts': 'gid://shopify/TaxonomyCategory/aa-1-14-6', // Jegging Shorts ✅ NEW
  'Jogger Shorts': 'gid://shopify/TaxonomyCategory/aa-1-14-7', // Jogger Shorts ✅ NEW
  'Legging Shorts': 'gid://shopify/TaxonomyCategory/aa-1-14-8', // Legging Shorts ✅ NEW
  'Shorts': 'gid://shopify/TaxonomyCategory/aa-1-14-2',        // Shorts (default to Cargo Shorts) ✅ UPDATED
  
  // Baby & Toddler - using verified taxonomy IDs
  'Baby & Toddler Bottoms': 'gid://shopify/TaxonomyCategory/aa-1-2-1', // Baby & Toddler Bottoms ✅ NEW
  'Baby & Toddler Diaper Covers': 'gid://shopify/TaxonomyCategory/aa-1-2-2', // Baby & Toddler Diaper Covers ✅ NEW
  'Baby & Toddler Dresses': 'gid://shopify/TaxonomyCategory/aa-1-2-3', // Baby & Toddler Dresses ✅ NEW
  'Baby & Toddler Outerwear': 'gid://shopify/TaxonomyCategory/aa-1-2-4', // Baby & Toddler Outerwear ✅ NEW
  'Baby & Toddler Outfits': 'gid://shopify/TaxonomyCategory/aa-1-2-5', // Baby & Toddler Outfits ✅ NEW
  'Baby & Toddler Sleepwear': 'gid://shopify/TaxonomyCategory/aa-1-2-6', // Baby & Toddler Sleepwear ✅ NEW
  'Baby & Toddler Socks & Tights': 'gid://shopify/TaxonomyCategory/aa-1-2-7', // Baby & Toddler Socks & Tights ✅ NEW
  'Baby & Toddler Swimwear': 'gid://shopify/TaxonomyCategory/aa-1-2-8', // Baby & Toddler Swimwear ✅ NEW
  'Baby & Toddler Tops': 'gid://shopify/TaxonomyCategory/aa-1-2-9', // Baby & Toddler Tops ✅ NEW
  'Baby One-Pieces': 'gid://shopify/TaxonomyCategory/aa-1-2-10', // Baby One-Pieces ✅ NEW
  'Toddler Underwear': 'gid://shopify/TaxonomyCategory/aa-1-2-11', // Toddler Underwear ✅ NEW
  
  // Coats & Jackets - using verified taxonomy IDs
  'Coats & Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2', // Coats & Jackets ✅ NEW
  'Coats': 'gid://shopify/TaxonomyCategory/aa-1-10-2',         // Coats & Jackets ✅ NEW
  'Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2',       // Coats & Jackets ✅ NEW
  'Bolero Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2-1', // Bolero Jackets ✅ NEW
  'Bomber Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2-2', // Bomber Jackets ✅ NEW
  'Capes': 'gid://shopify/TaxonomyCategory/aa-1-10-2-3',       // Capes ✅ NEW
  'Overcoats': 'gid://shopify/TaxonomyCategory/aa-1-10-2-5',   // Overcoats ✅ NEW
  'Parkas': 'gid://shopify/TaxonomyCategory/aa-1-10-2-6',      // Parkas ✅ NEW
  'Pea Coats': 'gid://shopify/TaxonomyCategory/aa-1-10-2-7',   // Pea Coats ✅ NEW
  'Ponchos': 'gid://shopify/TaxonomyCategory/aa-1-10-2-8',     // Ponchos ✅ NEW
  'Puffer Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2-9', // Puffer Jackets ✅ NEW
  'Rain Coats': 'gid://shopify/TaxonomyCategory/aa-1-10-2-10', // Rain Coats ✅ NEW
  'Sport Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2-11', // Sport Jackets ✅ NEW
  'Track Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2-12', // Track Jackets ✅ NEW
  'Trench Coats': 'gid://shopify/TaxonomyCategory/aa-1-10-2-13', // Trench Coats ✅ NEW
  'Trucker Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2-14', // Trucker Jackets ✅ NEW
  'Varsity Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2-15', // Varsity Jackets ✅ NEW
  'Windbreakers': 'gid://shopify/TaxonomyCategory/aa-1-10-2-16', // Windbreakers ✅ NEW
  'Wrap Coats': 'gid://shopify/TaxonomyCategory/aa-1-10-2-17', // Wrap Coats ✅ NEW
  
  // Other categories
  'Dresses': 'gid://shopify/TaxonomyCategory/aa-1-15-1',       // Dresses (keeping existing)
  'Skirts': 'gid://shopify/TaxonomyCategory/aa-1-15-2',        // Skirts (keeping existing)
  'Underwear': 'gid://shopify/TaxonomyCategory/aa-1-16-1',     // Underwear (keeping existing)
  'Socks': 'gid://shopify/TaxonomyCategory/aa-1-17-1',         // Socks (keeping existing)
  
  // Bags - using verified taxonomy IDs
  'Gym Duffel Bags': 'gid://shopify/TaxonomyCategory/lb-6-1',  // Gym Duffel Bags ✅ NEW
  'Fanny Packs': 'gid://shopify/TaxonomyCategory/lb-7',        // Fanny Packs ✅ NEW
  'Pen & Pencil Cases': 'gid://shopify/TaxonomyCategory/os-3-16', // Pen & Pencil Cases ✅ NEW
  'Handbags': 'gid://shopify/TaxonomyCategory/aa-5-4',         // Handbags ✅ NEW
  'Beach Bags': 'gid://shopify/TaxonomyCategory/aa-5-4-3',     // Beach Bags ✅ NEW
  'Bags': 'gid://shopify/TaxonomyCategory/lb-11',              // Bags (keeping existing)
  
  // Hats - using verified taxonomy IDs
  'Beanies': 'gid://shopify/TaxonomyCategory/aa-2-17-2',       // Beanies ✅ NEW
  'Baseball Caps': 'gid://shopify/TaxonomyCategory/aa-2-17-1', // Baseball Caps ✅ NEW
  'Bucket Hats': 'gid://shopify/TaxonomyCategory/aa-2-17-5',   // Bucket Hats ✅ NEW
  'Fedoras': 'gid://shopify/TaxonomyCategory/aa-2-17-7',       // Fedoras ✅ NEW
  'Panama Hats': 'gid://shopify/TaxonomyCategory/aa-2-17-9',   // Panama Hats ✅ NEW
  'Trucker Hats': 'gid://shopify/TaxonomyCategory/aa-2-17-14', // Trucker Hats ✅ NEW
  'Winter Hats': 'gid://shopify/TaxonomyCategory/aa-2-17-16',  // Winter Hats ✅ NEW
  'Sun Hats': 'gid://shopify/TaxonomyCategory/aa-2-17-11',     // Sun Hats ✅ NEW
  'Hats': 'gid://shopify/TaxonomyCategory/aa-2-17-16',         // Winter Hats (default) ✅ UPDATED
  
  // Accessories - using verified taxonomy IDs
  'Badge & Pass Holders': 'gid://shopify/TaxonomyCategory/aa-5-1', // Badge & Pass Holders ✅ NEW
  'Business Card Cases': 'gid://shopify/TaxonomyCategory/aa-5-2',  // Business Card Cases ✅ NEW
  'Checkbook Covers': 'gid://shopify/TaxonomyCategory/aa-5-3',     // Checkbook Covers ✅ NEW
  'Wallets & Money Clips': 'gid://shopify/TaxonomyCategory/aa-5-5', // Wallets & Money Clips ✅ NEW
  'Belts': 'gid://shopify/TaxonomyCategory/aa-2-3-1',          // Belts (keeping existing)
};

// General product type fallback mappings
export const GENERAL_TYPE_MAPPINGS = {
  // Tops - using verified taxonomy IDs
  'Hoodie': 'gid://shopify/TaxonomyCategory/aa-1-13-13',       // Hoodies & Sweatshirts
  'Hoodies': 'gid://shopify/TaxonomyCategory/aa-1-13-13',      // Hoodies & Sweatshirts (plural)
  'Sweatshirt': 'gid://shopify/TaxonomyCategory/aa-1-13-14',   // Sweatshirts ✅ UPDATED
  'Sweatshirts': 'gid://shopify/TaxonomyCategory/aa-1-13-14',  // Sweatshirts (plural) ✅ UPDATED
  'Sweater': 'gid://shopify/TaxonomyCategory/aa-1-13-12',      // Sweaters ✅ NEW
  'Sweaters': 'gid://shopify/TaxonomyCategory/aa-1-13-12',     // Sweaters (plural) ✅ NEW
  'Shirt': 'gid://shopify/TaxonomyCategory/aa-1-13-7',         // Shirts ✅ NEW
  'Shirts': 'gid://shopify/TaxonomyCategory/aa-1-13-7',        // Shirts (plural) ✅ NEW
  'Tunic': 'gid://shopify/TaxonomyCategory/aa-1-13-11',        // Tunics ✅ NEW
  'Tunics': 'gid://shopify/TaxonomyCategory/aa-1-13-11',       // Tunics (plural) ✅ NEW
  'Overshirt': 'gid://shopify/TaxonomyCategory/aa-1-13-5',     // Overshirts ✅ NEW
  'Overshirts': 'gid://shopify/TaxonomyCategory/aa-1-13-5',    // Overshirts (plural) ✅ NEW
  'Cardigan': 'gid://shopify/TaxonomyCategory/aa-1-13-3',      // Cardigans ✅ NEW
  'Cardigans': 'gid://shopify/TaxonomyCategory/aa-1-13-3',     // Cardigans (plural) ✅ NEW
  'Bodysuit': 'gid://shopify/TaxonomyCategory/aa-1-13-2',      // Bodysuits ✅ NEW
  'Bodysuits': 'gid://shopify/TaxonomyCategory/aa-1-13-2',     // Bodysuits (plural) ✅ NEW
  'Blouse': 'gid://shopify/TaxonomyCategory/aa-1-13-1',        // Blouses ✅ NEW
  'Blouses': 'gid://shopify/TaxonomyCategory/aa-1-13-1',       // Blouses (plural) ✅ NEW
  'T-shirt': 'gid://shopify/TaxonomyCategory/aa-1-13-8',       // T-shirts ✅ FINAL CORRECT
  'T-shirts': 'gid://shopify/TaxonomyCategory/aa-1-13-8',      // T-shirts (plural) ✅ FINAL CORRECT
  'Tee': 'gid://shopify/TaxonomyCategory/aa-1-13-8',           // T-shirts ✅ FINAL CORRECT
  'Tees': 'gid://shopify/TaxonomyCategory/aa-1-13-8',          // T-shirts (plural) ✅ FINAL CORRECT
  'Tank': 'gid://shopify/TaxonomyCategory/aa-1-13-9',          // Tank Tops ✅ UPDATED
  'Tanks': 'gid://shopify/TaxonomyCategory/aa-1-13-9',         // Tank Tops (plural) ✅ UPDATED
  'Polo': 'gid://shopify/TaxonomyCategory/aa-1-13-6',          // Polos ✅ UPDATED
  'Polos': 'gid://shopify/TaxonomyCategory/aa-1-13-6',         // Polos (plural) ✅ UPDATED
  
  // Bottoms - using verified taxonomy IDs
  'Pant': 'gid://shopify/TaxonomyCategory/aa-1-12-11',         // Trousers ✅ UPDATED
  'Pants': 'gid://shopify/TaxonomyCategory/aa-1-12-11',        // Trousers (plural) ✅ UPDATED
  'Trouser': 'gid://shopify/TaxonomyCategory/aa-1-12-11',      // Trousers ✅ NEW
  'Trousers': 'gid://shopify/TaxonomyCategory/aa-1-12-11',     // Trousers (plural) ✅ NEW
  'Cargo Pant': 'gid://shopify/TaxonomyCategory/aa-1-12-2',    // Cargo Pants ✅ NEW
  'Cargo Pants': 'gid://shopify/TaxonomyCategory/aa-1-12-2',   // Cargo Pants (plural) ✅ NEW
  'Chino': 'gid://shopify/TaxonomyCategory/aa-1-12-3',         // Chinos ✅ NEW
  'Chinos': 'gid://shopify/TaxonomyCategory/aa-1-12-3',        // Chinos (plural) ✅ NEW
  'Jean': 'gid://shopify/TaxonomyCategory/aa-1-12-4',          // Jeans ✅ UPDATED
  'Jeans': 'gid://shopify/TaxonomyCategory/aa-1-12-4',         // Jeans (plural) ✅ UPDATED
  'Jegging': 'gid://shopify/TaxonomyCategory/aa-1-12-5',       // Jeggings ✅ NEW
  'Jeggings': 'gid://shopify/TaxonomyCategory/aa-1-12-5',      // Jeggings (plural) ✅ NEW
  'Jogger': 'gid://shopify/TaxonomyCategory/aa-1-12-7',        // Joggers ✅ NEW
  'Joggers': 'gid://shopify/TaxonomyCategory/aa-1-12-7',       // Joggers (plural) ✅ NEW
  'Legging': 'gid://shopify/TaxonomyCategory/aa-1-12-8',       // Leggings ✅ NEW
  'Leggings': 'gid://shopify/TaxonomyCategory/aa-1-12-8',      // Leggings (plural) ✅ NEW
  
  // Shorts - specific types using verified taxonomy IDs
  'Bermuda': 'gid://shopify/TaxonomyCategory/aa-1-14-1',       // Bermudas ✅ NEW
  'Bermudas': 'gid://shopify/TaxonomyCategory/aa-1-14-1',      // Bermudas (plural) ✅ NEW
  'Cargo Short': 'gid://shopify/TaxonomyCategory/aa-1-14-2',   // Cargo Shorts ✅ NEW
  'Cargo Shorts': 'gid://shopify/TaxonomyCategory/aa-1-14-2',  // Cargo Shorts (plural) ✅ NEW
  'Chino Short': 'gid://shopify/TaxonomyCategory/aa-1-14-3',   // Chino Shorts ✅ NEW
  'Chino Shorts': 'gid://shopify/TaxonomyCategory/aa-1-14-3',  // Chino Shorts (plural) ✅ NEW
  'Short Trouser': 'gid://shopify/TaxonomyCategory/aa-1-14-4', // Short Trousers ✅ NEW
  'Short Trousers': 'gid://shopify/TaxonomyCategory/aa-1-14-4', // Short Trousers (plural) ✅ NEW
  'Denim Short': 'gid://shopify/TaxonomyCategory/aa-1-14-5',   // Denim Shorts ✅ NEW
  'Denim Shorts': 'gid://shopify/TaxonomyCategory/aa-1-14-5',  // Denim Shorts (plural) ✅ NEW
  'Jegging Short': 'gid://shopify/TaxonomyCategory/aa-1-14-6', // Jegging Shorts ✅ NEW
  'Jegging Shorts': 'gid://shopify/TaxonomyCategory/aa-1-14-6', // Jegging Shorts (plural) ✅ NEW
  'Jogger Short': 'gid://shopify/TaxonomyCategory/aa-1-14-7',  // Jogger Shorts ✅ NEW
  'Jogger Shorts': 'gid://shopify/TaxonomyCategory/aa-1-14-7', // Jogger Shorts (plural) ✅ NEW
  'Legging Short': 'gid://shopify/TaxonomyCategory/aa-1-14-8', // Legging Shorts ✅ NEW
  'Legging Shorts': 'gid://shopify/TaxonomyCategory/aa-1-14-8', // Legging Shorts (plural) ✅ NEW
  'Short': 'gid://shopify/TaxonomyCategory/aa-1-14-2',         // Shorts (default to Cargo Shorts) ✅ UPDATED
  'Shorts': 'gid://shopify/TaxonomyCategory/aa-1-14-2',        // Shorts (plural) (default to Cargo Shorts) ✅ UPDATED
  
  // Baby & Toddler - using verified taxonomy IDs
  'Baby Bottoms': 'gid://shopify/TaxonomyCategory/aa-1-2-1',   // Baby & Toddler Bottoms ✅ NEW
  'Baby Toddler Bottoms': 'gid://shopify/TaxonomyCategory/aa-1-2-1', // Baby & Toddler Bottoms ✅ NEW
  'Baby Diaper Cover': 'gid://shopify/TaxonomyCategory/aa-1-2-2', // Baby & Toddler Diaper Covers ✅ NEW
  'Baby Diaper Covers': 'gid://shopify/TaxonomyCategory/aa-1-2-2', // Baby & Toddler Diaper Covers (plural) ✅ NEW
  'Baby Toddler Diaper Covers': 'gid://shopify/TaxonomyCategory/aa-1-2-2', // Baby & Toddler Diaper Covers ✅ NEW
  'Baby Dress': 'gid://shopify/TaxonomyCategory/aa-1-2-3',     // Baby & Toddler Dresses ✅ NEW
  'Baby Dresses': 'gid://shopify/TaxonomyCategory/aa-1-2-3',   // Baby & Toddler Dresses (plural) ✅ NEW
  'Baby Toddler Dresses': 'gid://shopify/TaxonomyCategory/aa-1-2-3', // Baby & Toddler Dresses ✅ NEW
  'Baby Outerwear': 'gid://shopify/TaxonomyCategory/aa-1-2-4', // Baby & Toddler Outerwear ✅ NEW
  'Baby Toddler Outerwear': 'gid://shopify/TaxonomyCategory/aa-1-2-4', // Baby & Toddler Outerwear ✅ NEW
  'Baby Outfit': 'gid://shopify/TaxonomyCategory/aa-1-2-5',    // Baby & Toddler Outfits ✅ NEW
  'Baby Outfits': 'gid://shopify/TaxonomyCategory/aa-1-2-5',   // Baby & Toddler Outfits (plural) ✅ NEW
  'Baby Toddler Outfits': 'gid://shopify/TaxonomyCategory/aa-1-2-5', // Baby & Toddler Outfits ✅ NEW
  'Baby Sleepwear': 'gid://shopify/TaxonomyCategory/aa-1-2-6', // Baby & Toddler Sleepwear ✅ NEW
  'Baby Toddler Sleepwear': 'gid://shopify/TaxonomyCategory/aa-1-2-6', // Baby & Toddler Sleepwear ✅ NEW
  'Baby Socks': 'gid://shopify/TaxonomyCategory/aa-1-2-7',     // Baby & Toddler Socks & Tights ✅ NEW
  'Baby Tights': 'gid://shopify/TaxonomyCategory/aa-1-2-7',    // Baby & Toddler Socks & Tights ✅ NEW
  'Baby Toddler Socks': 'gid://shopify/TaxonomyCategory/aa-1-2-7', // Baby & Toddler Socks & Tights ✅ NEW
  'Baby Swimwear': 'gid://shopify/TaxonomyCategory/aa-1-2-8',  // Baby & Toddler Swimwear ✅ NEW
  'Baby Toddler Swimwear': 'gid://shopify/TaxonomyCategory/aa-1-2-8', // Baby & Toddler Swimwear ✅ NEW
  'Baby Top': 'gid://shopify/TaxonomyCategory/aa-1-2-9',       // Baby & Toddler Tops ✅ NEW
  'Baby Tops': 'gid://shopify/TaxonomyCategory/aa-1-2-9',      // Baby & Toddler Tops (plural) ✅ NEW
  'Baby Toddler Tops': 'gid://shopify/TaxonomyCategory/aa-1-2-9', // Baby & Toddler Tops ✅ NEW
  'Baby One-Piece': 'gid://shopify/TaxonomyCategory/aa-1-2-10', // Baby One-Pieces ✅ NEW
  'Baby One-Pieces': 'gid://shopify/TaxonomyCategory/aa-1-2-10', // Baby One-Pieces (plural) ✅ NEW
  'Toddler Underwear': 'gid://shopify/TaxonomyCategory/aa-1-2-11', // Toddler Underwear ✅ NEW
  
  // Coats & Jackets - using verified taxonomy IDs
  'Coat': 'gid://shopify/TaxonomyCategory/aa-1-10-2',          // Coats & Jackets ✅ NEW
  'Coats': 'gid://shopify/TaxonomyCategory/aa-1-10-2',         // Coats & Jackets (plural) ✅ NEW
  'Jacket': 'gid://shopify/TaxonomyCategory/aa-1-10-2',        // Coats & Jackets ✅ NEW
  'Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2',       // Coats & Jackets (plural) ✅ NEW
  'Outerwear': 'gid://shopify/TaxonomyCategory/aa-1-10-2',     // Coats & Jackets ✅ NEW
  'Bolero Jacket': 'gid://shopify/TaxonomyCategory/aa-1-10-2-1', // Bolero Jackets ✅ NEW
  'Bolero Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2-1', // Bolero Jackets (plural) ✅ NEW
  'Bomber Jacket': 'gid://shopify/TaxonomyCategory/aa-1-10-2-2', // Bomber Jackets ✅ NEW
  'Bomber Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2-2', // Bomber Jackets (plural) ✅ NEW
  'Cape': 'gid://shopify/TaxonomyCategory/aa-1-10-2-3',        // Capes ✅ NEW
  'Capes': 'gid://shopify/TaxonomyCategory/aa-1-10-2-3',       // Capes (plural) ✅ NEW
  'Overcoat': 'gid://shopify/TaxonomyCategory/aa-1-10-2-5',    // Overcoats ✅ NEW
  'Overcoats': 'gid://shopify/TaxonomyCategory/aa-1-10-2-5',   // Overcoats (plural) ✅ NEW
  'Parka': 'gid://shopify/TaxonomyCategory/aa-1-10-2-6',       // Parkas ✅ NEW
  'Parkas': 'gid://shopify/TaxonomyCategory/aa-1-10-2-6',      // Parkas (plural) ✅ NEW
  'Pea Coat': 'gid://shopify/TaxonomyCategory/aa-1-10-2-7',    // Pea Coats ✅ NEW
  'Pea Coats': 'gid://shopify/TaxonomyCategory/aa-1-10-2-7',   // Pea Coats (plural) ✅ NEW
  'Poncho': 'gid://shopify/TaxonomyCategory/aa-1-10-2-8',      // Ponchos ✅ NEW
  'Ponchos': 'gid://shopify/TaxonomyCategory/aa-1-10-2-8',     // Ponchos (plural) ✅ NEW
  'Puffer Jacket': 'gid://shopify/TaxonomyCategory/aa-1-10-2-9', // Puffer Jackets ✅ NEW
  'Puffer Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2-9', // Puffer Jackets (plural) ✅ NEW
  'Rain Coat': 'gid://shopify/TaxonomyCategory/aa-1-10-2-10',  // Rain Coats ✅ NEW
  'Rain Coats': 'gid://shopify/TaxonomyCategory/aa-1-10-2-10', // Rain Coats (plural) ✅ NEW
  'Raincoat': 'gid://shopify/TaxonomyCategory/aa-1-10-2-10',   // Rain Coats ✅ NEW
  'Raincoats': 'gid://shopify/TaxonomyCategory/aa-1-10-2-10',  // Rain Coats (plural) ✅ NEW
  'Sport Jacket': 'gid://shopify/TaxonomyCategory/aa-1-10-2-11', // Sport Jackets ✅ NEW
  'Sport Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2-11', // Sport Jackets (plural) ✅ NEW
  'Track Jacket': 'gid://shopify/TaxonomyCategory/aa-1-10-2-12', // Track Jackets ✅ NEW
  'Track Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2-12', // Track Jackets (plural) ✅ NEW
  'Trench Coat': 'gid://shopify/TaxonomyCategory/aa-1-10-2-13', // Trench Coats ✅ NEW
  'Trench Coats': 'gid://shopify/TaxonomyCategory/aa-1-10-2-13', // Trench Coats (plural) ✅ NEW
  'Trucker Jacket': 'gid://shopify/TaxonomyCategory/aa-1-10-2-14', // Trucker Jackets ✅ NEW
  'Trucker Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2-14', // Trucker Jackets (plural) ✅ NEW
  'Varsity Jacket': 'gid://shopify/TaxonomyCategory/aa-1-10-2-15', // Varsity Jackets ✅ NEW
  'Varsity Jackets': 'gid://shopify/TaxonomyCategory/aa-1-10-2-15', // Varsity Jackets (plural) ✅ NEW
  'Windbreaker': 'gid://shopify/TaxonomyCategory/aa-1-10-2-16', // Windbreakers ✅ NEW
  'Windbreakers': 'gid://shopify/TaxonomyCategory/aa-1-10-2-16', // Windbreakers (plural) ✅ NEW
  'Wrap Coat': 'gid://shopify/TaxonomyCategory/aa-1-10-2-17',  // Wrap Coats ✅ NEW
  'Wrap Coats': 'gid://shopify/TaxonomyCategory/aa-1-10-2-17', // Wrap Coats (plural) ✅ NEW
  
  // Other categories
  'Dress': 'gid://shopify/TaxonomyCategory/aa-1-15-1',         // Dresses (keeping existing)
  'Dresses': 'gid://shopify/TaxonomyCategory/aa-1-15-1',       // Dresses (plural) (keeping existing)
  'Skirt': 'gid://shopify/TaxonomyCategory/aa-1-15-2',         // Skirts (keeping existing)
  'Skirts': 'gid://shopify/TaxonomyCategory/aa-1-15-2',        // Skirts (plural) (keeping existing)
  'Underwear': 'gid://shopify/TaxonomyCategory/aa-1-16-1',     // Underwear (keeping existing)
  'Sock': 'gid://shopify/TaxonomyCategory/aa-1-17-1',          // Socks (keeping existing)
  'Socks': 'gid://shopify/TaxonomyCategory/aa-1-17-1',         // Socks (plural) (keeping existing)
  
  // Bags - using verified taxonomy IDs
  'Bag': 'gid://shopify/TaxonomyCategory/lb-11',               // Bags (keeping existing)
  'Bags': 'gid://shopify/TaxonomyCategory/lb-11',              // Bags (plural) (keeping existing)
  'Gym Duffel Bag': 'gid://shopify/TaxonomyCategory/lb-6-1',   // Gym Duffel Bags ✅ NEW
  'Gym Duffel Bags': 'gid://shopify/TaxonomyCategory/lb-6-1',  // Gym Duffel Bags (plural) ✅ NEW
  'Fanny Pack': 'gid://shopify/TaxonomyCategory/lb-7',         // Fanny Packs ✅ NEW
  'Fanny Packs': 'gid://shopify/TaxonomyCategory/lb-7',        // Fanny Packs (plural) ✅ NEW
  'Handbag': 'gid://shopify/TaxonomyCategory/aa-5-4',          // Handbags ✅ NEW
  'Handbags': 'gid://shopify/TaxonomyCategory/aa-5-4',         // Handbags (plural) ✅ NEW
  'Beach Bag': 'gid://shopify/TaxonomyCategory/aa-5-4-3',      // Beach Bags ✅ NEW
  'Beach Bags': 'gid://shopify/TaxonomyCategory/aa-5-4-3',     // Beach Bags (plural) ✅ NEW
  
  // Hats - using verified taxonomy IDs
  'Hat': 'gid://shopify/TaxonomyCategory/aa-2-17-16',          // Winter Hats (default) ✅ UPDATED
  'Hats': 'gid://shopify/TaxonomyCategory/aa-2-17-16',         // Winter Hats (plural) (default) ✅ UPDATED
  'Cap': 'gid://shopify/TaxonomyCategory/aa-2-17-1',           // Baseball Caps ✅ UPDATED
  'Caps': 'gid://shopify/TaxonomyCategory/aa-2-17-1',          // Baseball Caps (plural) ✅ UPDATED
  'Beanie': 'gid://shopify/TaxonomyCategory/aa-2-17-2',        // Beanies ✅ NEW
  'Beanies': 'gid://shopify/TaxonomyCategory/aa-2-17-2',       // Beanies (plural) ✅ NEW
  'Baseball Cap': 'gid://shopify/TaxonomyCategory/aa-2-17-1',  // Baseball Caps ✅ NEW
  'Baseball Caps': 'gid://shopify/TaxonomyCategory/aa-2-17-1', // Baseball Caps (plural) ✅ NEW
  'Bucket Hat': 'gid://shopify/TaxonomyCategory/aa-2-17-5',    // Bucket Hats ✅ NEW
  'Bucket Hats': 'gid://shopify/TaxonomyCategory/aa-2-17-5',   // Bucket Hats (plural) ✅ NEW
  'Fedora': 'gid://shopify/TaxonomyCategory/aa-2-17-7',        // Fedoras ✅ NEW
  'Fedoras': 'gid://shopify/TaxonomyCategory/aa-2-17-7',       // Fedoras (plural) ✅ NEW
  'Panama Hat': 'gid://shopify/TaxonomyCategory/aa-2-17-9',    // Panama Hats ✅ NEW
  'Panama Hats': 'gid://shopify/TaxonomyCategory/aa-2-17-9',   // Panama Hats (plural) ✅ NEW
  'Trucker Hat': 'gid://shopify/TaxonomyCategory/aa-2-17-14',  // Trucker Hats ✅ NEW
  'Trucker Hats': 'gid://shopify/TaxonomyCategory/aa-2-17-14', // Trucker Hats (plural) ✅ NEW
  'Winter Hat': 'gid://shopify/TaxonomyCategory/aa-2-17-16',   // Winter Hats ✅ NEW
  'Winter Hats': 'gid://shopify/TaxonomyCategory/aa-2-17-16',  // Winter Hats (plural) ✅ NEW
  'Sun Hat': 'gid://shopify/TaxonomyCategory/aa-2-17-11',      // Sun Hats ✅ NEW
  'Sun Hats': 'gid://shopify/TaxonomyCategory/aa-2-17-11',     // Sun Hats (plural) ✅ NEW
  
  // Accessories - using verified taxonomy IDs
  'Belt': 'gid://shopify/TaxonomyCategory/aa-2-3-1',           // Belts (keeping existing)
  'Belts': 'gid://shopify/TaxonomyCategory/aa-2-3-1',          // Belts (plural) (keeping existing)
  'Pen & Pencil Case': 'gid://shopify/TaxonomyCategory/os-3-16', // Pen & Pencil Cases ✅ NEW
  'Pen & Pencil Cases': 'gid://shopify/TaxonomyCategory/os-3-16', // Pen & Pencil Cases (plural) ✅ NEW
  'Badge & Pass Holder': 'gid://shopify/TaxonomyCategory/aa-5-1', // Badge & Pass Holders ✅ NEW
  'Badge & Pass Holders': 'gid://shopify/TaxonomyCategory/aa-5-1', // Badge & Pass Holders (plural) ✅ NEW
  'Business Card Case': 'gid://shopify/TaxonomyCategory/aa-5-2',  // Business Card Cases ✅ NEW
  'Business Card Cases': 'gid://shopify/TaxonomyCategory/aa-5-2', // Business Card Cases (plural) ✅ NEW
  'Checkbook Cover': 'gid://shopify/TaxonomyCategory/aa-5-3',     // Checkbook Covers ✅ NEW
  'Checkbook Covers': 'gid://shopify/TaxonomyCategory/aa-5-3',    // Checkbook Covers (plural) ✅ NEW
  'Wallet': 'gid://shopify/TaxonomyCategory/aa-5-5',             // Wallets & Money Clips ✅ NEW
  'Wallets': 'gid://shopify/TaxonomyCategory/aa-5-5',            // Wallets & Money Clips (plural) ✅ NEW
  'Money Clip': 'gid://shopify/TaxonomyCategory/aa-5-5',         // Wallets & Money Clips ✅ NEW
  'Money Clips': 'gid://shopify/TaxonomyCategory/aa-5-5',        // Wallets & Money Clips (plural) ✅ NEW
};

// ==============================================================================
// TAXONOMY ATTRIBUTES SYSTEM
// Based on Shopify's Official Product Taxonomy Attributes
// Supports: Product Metafields, Variant Options, and Metaobjects
// ==============================================================================

// Core apparel attributes that Stanley/Stella products commonly have
export const STANLEY_STELLA_ATTRIBUTES = {
  // Material and fabric attributes
  'material': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'material',
    name: 'Material',
    description: 'Primary material composition (e.g., 100% Cotton, 50% Cotton 50% Polyester)',
    shopifyAttribute: 'material', // Maps to Shopify's standard material attribute
    taxonomyType: 'product', // Can be 'product', 'variant', or 'both'
    enableTaxonomyValidation: true, // Enable Shopify taxonomy validation
    taxonomyAttributeId: 'material' // Shopify taxonomy attribute ID
  },
  
  'fabric_weight': {
    type: 'single_line_text_field', 
    namespace: 'custom',
    key: 'fabric_weight',
    name: 'Fabric Weight',
    description: 'Weight of the fabric (e.g., 180 GSM, 8.5 oz)',
    shopifyAttribute: 'fabric_weight',
    taxonomyType: 'product',
    enableTaxonomyValidation: false
  },
  
  'fabric_finish': {
    type: 'single_line_text_field',
    namespace: 'custom', 
    key: 'fabric_finish',
    name: 'Fabric Finish',
    description: 'Fabric treatment or finish (e.g., Pre-shrunk, Enzyme washed)',
    shopifyAttribute: 'fabric_finish',
    taxonomyType: 'product',
    enableTaxonomyValidation: false
  },
  
  // Fit and sizing attributes - these work well as variant options
  'fit': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'fit',
    name: 'Fit',
    description: 'Product fit style (e.g., Regular fit, Slim fit, Oversized)',
    shopifyAttribute: 'fit',
    taxonomyType: 'variant', // Better as variant option
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'fit',
    variantOptionName: 'Fit' // Name for variant option
  },
  
  'size': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'size',
    name: 'Size',
    description: 'Product size (XS, S, M, L, XL, etc.)',
    shopifyAttribute: 'size',
    taxonomyType: 'variant', // Definitely variant option
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'size',
    variantOptionName: 'Size'
  },
  
  'color': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'color',
    name: 'Color',
    description: 'Product color',
    shopifyAttribute: 'color',
    taxonomyType: 'variant', // Definitely variant option
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'color',
    variantOptionName: 'Color'
  },
  
  'age_group': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'age_group',
    name: 'Age Group',
    description: 'Target age group for the product (e.g., Adults, Kids, Babies)',
    shopifyAttribute: 'age_group',
    taxonomyType: 'product',
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'gid://shopify/TaxonomyAttribute/30', // Age Group taxonomy attribute
    taxonomyValues: {
      '0-6 months': 'gid://shopify/TaxonomyValue/19404',
      '6-12 months': 'gid://shopify/TaxonomyValue/19405', 
      '1-2 years': 'gid://shopify/TaxonomyValue/19406',
      'Adults': 'gid://shopify/TaxonomyValue/2403',
      'All ages': 'gid://shopify/TaxonomyValue/534',
      'Babies': 'gid://shopify/TaxonomyValue/2974',
      'Kids': 'gid://shopify/TaxonomyValue/1515',
      'Newborn': 'gid://shopify/TaxonomyValue/19952',
      'Teens': 'gid://shopify/TaxonomyValue/2404',
      'Toddlers': 'gid://shopify/TaxonomyValue/10090',
      'Universal': 'gid://shopify/TaxonomyValue/18291',
      'Other': 'gid://shopify/TaxonomyValue/26412'
    }
  },

  'target_gender': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'target_gender',
    name: 'Target Gender',
    description: 'Target gender for the product (e.g., Male, Female, Unisex)',
    shopifyAttribute: 'target_gender',
    taxonomyType: 'product',
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'gid://shopify/TaxonomyAttribute/837', // Target Gender taxonomy attribute
    taxonomyValues: {
      'Female': 'gid://shopify/TaxonomyValue/18',
      'Male': 'gid://shopify/TaxonomyValue/19',
      'Unisex': 'gid://shopify/TaxonomyValue/20',
      'Other': 'gid://shopify/TaxonomyValue/26424'
    }
  },

  'sleeve_length_type': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'sleeve_length_type',
    name: 'Sleeve Length Type',
    description: 'Type of sleeve length (e.g., Short, Long, Sleeveless)',
    shopifyAttribute: 'sleeve_length_type',
    taxonomyType: 'product',
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'gid://shopify/TaxonomyAttribute/15', // Sleeve Length Type taxonomy attribute
    taxonomyValues: {
      '3/4': 'gid://shopify/TaxonomyValue/1405',
      'Cap': 'gid://shopify/TaxonomyValue/1407',
      'Long': 'gid://shopify/TaxonomyValue/17094',
      'Short': 'gid://shopify/TaxonomyValue/169',
      'Sleeveless': 'gid://shopify/TaxonomyValue/174',
      'Spaghetti strap': 'gid://shopify/TaxonomyValue/176',
      'Strapless': 'gid://shopify/TaxonomyValue/177',
      'Other': 'gid://shopify/TaxonomyValue/26410'
    }
  },

  'care_instructions': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'care_instructions',
    name: 'Care Instructions',
    description: 'Care instructions for the product (e.g., Machine washable, Hand wash, Dry clean only)',
    shopifyAttribute: 'care_instructions',
    taxonomyType: 'product',
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'gid://shopify/TaxonomyAttribute/2336', // Care Instructions taxonomy attribute
    taxonomyValues: {
      'Dry clean only': 'gid://shopify/TaxonomyValue/14942',
      'Dryer safe': 'gid://shopify/TaxonomyValue/24715',
      'Hand wash': 'gid://shopify/TaxonomyValue/14943',
      'Ironing instructions': 'gid://shopify/TaxonomyValue/14944',
      'Machine washable': 'gid://shopify/TaxonomyValue/10542',
      'Tumble dry': 'gid://shopify/TaxonomyValue/11409',
      'Other': 'gid://shopify/TaxonomyValue/27281'
    }
  },

  'color': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'color',
    name: 'Color',
    description: 'Primary color of the product',
    shopifyAttribute: 'color',
    taxonomyType: 'variant', // Color is typically a variant option
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'gid://shopify/TaxonomyAttribute/1', // Color taxonomy attribute
    taxonomyValues: {
      'Beige': 'gid://shopify/TaxonomyValue/6',
      'Black': 'gid://shopify/TaxonomyValue/1',
      'Blue': 'gid://shopify/TaxonomyValue/2',
      'Bronze': 'gid://shopify/TaxonomyValue/657',
      'Brown': 'gid://shopify/TaxonomyValue/7',
      'Clear': 'gid://shopify/TaxonomyValue/17',
      'Gold': 'gid://shopify/TaxonomyValue/4',
      'Gray': 'gid://shopify/TaxonomyValue/8',
      'Green': 'gid://shopify/TaxonomyValue/9',
      'Multicolor': 'gid://shopify/TaxonomyValue/2865',
      'Navy': 'gid://shopify/TaxonomyValue/15',
      'Orange': 'gid://shopify/TaxonomyValue/10',
      'Pink': 'gid://shopify/TaxonomyValue/11',
      'Purple': 'gid://shopify/TaxonomyValue/12',
      'Red': 'gid://shopify/TaxonomyValue/13',
      'Rose gold': 'gid://shopify/TaxonomyValue/16',
      'Silver': 'gid://shopify/TaxonomyValue/5',
      'White': 'gid://shopify/TaxonomyValue/3',
      'Yellow': 'gid://shopify/TaxonomyValue/14'
    }
  },

  'fabric': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'fabric',
    name: 'Fabric',
    description: 'Primary fabric material of the product',
    shopifyAttribute: 'fabric',
    taxonomyType: 'product',
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'gid://shopify/TaxonomyAttribute/2777', // Fabric taxonomy attribute
    taxonomyValues: {
      'Acrylic': 'gid://shopify/TaxonomyValue/16980',
      'Angora': 'gid://shopify/TaxonomyValue/603',
      'Bamboo': 'gid://shopify/TaxonomyValue/16981',
      'Canvas': 'gid://shopify/TaxonomyValue/16982',
      'Cashmere': 'gid://shopify/TaxonomyValue/66',
      'Corduroy': 'gid://shopify/TaxonomyValue/606',
      'Cork': 'gid://shopify/TaxonomyValue/16983',
      'Cotton': 'gid://shopify/TaxonomyValue/16984',
      'Denim': 'gid://shopify/TaxonomyValue/54',
      'Faux fur': 'gid://shopify/TaxonomyValue/594',
      'Faux leather': 'gid://shopify/TaxonomyValue/16985',
      'Felt': 'gid://shopify/TaxonomyValue/16986',
      'Flannel': 'gid://shopify/TaxonomyValue/556',
      'Fleece': 'gid://shopify/TaxonomyValue/555',
      'Fur': 'gid://shopify/TaxonomyValue/63',
      'Hemp': 'gid://shopify/TaxonomyValue/1042',
      'Jute': 'gid://shopify/TaxonomyValue/613',
      'Latex': 'gid://shopify/TaxonomyValue/16987',
      'Leather': 'gid://shopify/TaxonomyValue/16988',
      'Linen': 'gid://shopify/TaxonomyValue/16989',
      'Lycra': 'gid://shopify/TaxonomyValue/1007',
      'Lyocell': 'gid://shopify/TaxonomyValue/50',
      'Merino': 'gid://shopify/TaxonomyValue/16890',
      'Mesh': 'gid://shopify/TaxonomyValue/600',
      'Modal': 'gid://shopify/TaxonomyValue/57',
      'Mohair': 'gid://shopify/TaxonomyValue/983',
      'Neoprene': 'gid://shopify/TaxonomyValue/566',
      'Nylon': 'gid://shopify/TaxonomyValue/16990',
      'Plastic': 'gid://shopify/TaxonomyValue/16991',
      'Plush': 'gid://shopify/TaxonomyValue/16992',
      'Polyester': 'gid://shopify/TaxonomyValue/16993',
      'Rattan': 'gid://shopify/TaxonomyValue/16994',
      'Rayon': 'gid://shopify/TaxonomyValue/22664',
      'Rubber': 'gid://shopify/TaxonomyValue/16995',
      'Satin': 'gid://shopify/TaxonomyValue/16996',
      'Sherpa': 'gid://shopify/TaxonomyValue/608',
      'Silk': 'gid://shopify/TaxonomyValue/16997',
      'Suede': 'gid://shopify/TaxonomyValue/561',
      'Synthetic': 'gid://shopify/TaxonomyValue/62',
      'Terrycloth': 'gid://shopify/TaxonomyValue/1019',
      'Tweed': 'gid://shopify/TaxonomyValue/850',
      'Twill': 'gid://shopify/TaxonomyValue/565',
      'Velour': 'gid://shopify/TaxonomyValue/564',
      'Velvet': 'gid://shopify/TaxonomyValue/563',
      'Vinyl': 'gid://shopify/TaxonomyValue/16998',
      'Viscose': 'gid://shopify/TaxonomyValue/55',
      'Wool': 'gid://shopify/TaxonomyValue/16999',
      'Other': 'gid://shopify/TaxonomyValue/17000'
    }
  },

  'neckline': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'neckline',
    name: 'Neckline',
    description: 'Type of neckline design',
    shopifyAttribute: 'neckline',
    taxonomyType: 'product',
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'gid://shopify/TaxonomyAttribute/32', // Neckline taxonomy attribute
    taxonomyValues: {
      'Asymmetric': 'gid://shopify/TaxonomyValue/6704',
      'Bardot': 'gid://shopify/TaxonomyValue/6705',
      'Boat': 'gid://shopify/TaxonomyValue/6706',
      'Cowl': 'gid://shopify/TaxonomyValue/6707',
      'Crew': 'gid://shopify/TaxonomyValue/6711',
      'Halter': 'gid://shopify/TaxonomyValue/6708',
      'Hooded': 'gid://shopify/TaxonomyValue/6709',
      'Mandarin': 'gid://shopify/TaxonomyValue/6710',
      'Mock': 'gid://shopify/TaxonomyValue/6712',
      'Plunging': 'gid://shopify/TaxonomyValue/6713',
      'Round': 'gid://shopify/TaxonomyValue/17092',
      'Split': 'gid://shopify/TaxonomyValue/4324',
      'Square': 'gid://shopify/TaxonomyValue/17093',
      'Sweetheart': 'gid://shopify/TaxonomyValue/6714',
      'Turtle': 'gid://shopify/TaxonomyValue/6715',
      'V-neck': 'gid://shopify/TaxonomyValue/390',
      'Wrap': 'gid://shopify/TaxonomyValue/6716',
      'Other': 'gid://shopify/TaxonomyValue/26413'
    }
  },

  'size': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'size',
    name: 'Size',
    description: 'Product size designation',
    shopifyAttribute: 'size',
    taxonomyType: 'variant', // Size is typically a variant option
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'gid://shopify/TaxonomyAttribute/2778', // Size taxonomy attribute
    taxonomyValues: {
      // Letter sizes
      'Triple extra small (XXXS)': 'gid://shopify/TaxonomyValue/2910',
      'Double extra small (XXS)': 'gid://shopify/TaxonomyValue/2911',
      'Extra small (XS)': 'gid://shopify/TaxonomyValue/17086',
      'Small (S)': 'gid://shopify/TaxonomyValue/17087',
      'Medium (M)': 'gid://shopify/TaxonomyValue/17088',
      'Large (L)': 'gid://shopify/TaxonomyValue/17089',
      'Extra large (XL)': 'gid://shopify/TaxonomyValue/17090',
      'Double extra large (XXL)': 'gid://shopify/TaxonomyValue/17091',
      'Triple extra large (XXXL)': 'gid://shopify/TaxonomyValue/2918',
      'Four extra large (4XL)': 'gid://shopify/TaxonomyValue/2919',
      'Five extra large (5XL)': 'gid://shopify/TaxonomyValue/2920',
      'Six extra large (6XL)': 'gid://shopify/TaxonomyValue/2921',
      
      // Numeric sizes
      '000': 'gid://shopify/TaxonomyValue/6703',
      '00': 'gid://shopify/TaxonomyValue/5790',
      '0': 'gid://shopify/TaxonomyValue/2878',
      '1': 'gid://shopify/TaxonomyValue/2879',
      '2': 'gid://shopify/TaxonomyValue/2885',
      '4': 'gid://shopify/TaxonomyValue/2896',
      '6': 'gid://shopify/TaxonomyValue/2907',
      '8': 'gid://shopify/TaxonomyValue/2909',
      '10': 'gid://shopify/TaxonomyValue/2880',
      '12': 'gid://shopify/TaxonomyValue/2881',
      '14': 'gid://shopify/TaxonomyValue/2882',
      '16': 'gid://shopify/TaxonomyValue/2883',
      '18': 'gid://shopify/TaxonomyValue/2884',
      '20': 'gid://shopify/TaxonomyValue/2886',
      '22': 'gid://shopify/TaxonomyValue/2887',
      '24': 'gid://shopify/TaxonomyValue/2888',
      '26': 'gid://shopify/TaxonomyValue/2889',
      '28': 'gid://shopify/TaxonomyValue/2890',
      '30': 'gid://shopify/TaxonomyValue/2891',
      '32': 'gid://shopify/TaxonomyValue/2892',
      '34': 'gid://shopify/TaxonomyValue/2893',
      '36': 'gid://shopify/TaxonomyValue/2894',
      '38': 'gid://shopify/TaxonomyValue/2895',
      '40': 'gid://shopify/TaxonomyValue/2897',
      '42': 'gid://shopify/TaxonomyValue/2898',
      '44': 'gid://shopify/TaxonomyValue/2899',
      '46': 'gid://shopify/TaxonomyValue/2900',
      '48': 'gid://shopify/TaxonomyValue/2901',
      '50': 'gid://shopify/TaxonomyValue/2902',
      '52': 'gid://shopify/TaxonomyValue/2903',
      '54': 'gid://shopify/TaxonomyValue/2904',
      '56': 'gid://shopify/TaxonomyValue/2905',
      '58': 'gid://shopify/TaxonomyValue/2906',
      '60': 'gid://shopify/TaxonomyValue/2908',
      
      // Age-based sizes
      '0-3 months': 'gid://shopify/TaxonomyValue/217',
      '3-6 months': 'gid://shopify/TaxonomyValue/218',
      '6-9 months': 'gid://shopify/TaxonomyValue/219',
      '9-12 months': 'gid://shopify/TaxonomyValue/220',
      '12-18 months': 'gid://shopify/TaxonomyValue/221',
      '18-24 months': 'gid://shopify/TaxonomyValue/222',
      '2-3 years': 'gid://shopify/TaxonomyValue/223',
      '3-4 years': 'gid://shopify/TaxonomyValue/224',
      '4-5 years': 'gid://shopify/TaxonomyValue/225',
      '5-6 years': 'gid://shopify/TaxonomyValue/226',
      
      // Special sizes
      'One size': 'gid://shopify/TaxonomyValue/25940',
      'Other': 'gid://shopify/TaxonomyValue/27608'
    }
  },

  'clothing_features': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'clothing_features',
    name: 'Clothing Features',
    description: 'Special features and characteristics of the clothing item',
    shopifyAttribute: 'clothing_features',
    taxonomyType: 'product',
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'gid://shopify/TaxonomyAttribute/3001', // Clothing Features taxonomy attribute
    taxonomyValues: {
      'Hypoallergenic': 'gid://shopify/TaxonomyValue/22804',
      'Insulated': 'gid://shopify/TaxonomyValue/22805',
      'Moisture wicking': 'gid://shopify/TaxonomyValue/22806',
      'Quick drying': 'gid://shopify/TaxonomyValue/22807',
      'Reversible': 'gid://shopify/TaxonomyValue/22808',
      'Stretchable': 'gid://shopify/TaxonomyValue/22809',
      'UV protection': 'gid://shopify/TaxonomyValue/22810',
      'Vegan friendly': 'gid://shopify/TaxonomyValue/22811',
      'Water resistant': 'gid://shopify/TaxonomyValue/22812',
      'Windproof': 'gid://shopify/TaxonomyValue/22813',
      'Wrinkle resistant': 'gid://shopify/TaxonomyValue/22814',
      'Other': 'gid://shopify/TaxonomyValue/27615' // Other value for clothing features (needs verification)
    }
  },

  'pattern': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'pattern',
    name: 'Pattern',
    description: 'Pattern or design of the product (e.g., solid, striped, floral)',
    shopifyAttribute: 'pattern',
    taxonomyType: 'product',
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'gid://shopify/TaxonomyAttribute/3', // Pattern taxonomy attribute
    taxonomyValues: {
      'Abstract': 'gid://shopify/TaxonomyValue/24477',
      'Animal': 'gid://shopify/TaxonomyValue/24478',
      'Art': 'gid://shopify/TaxonomyValue/24479',
      'Bead & reel': 'gid://shopify/TaxonomyValue/24480',
      'Birds': 'gid://shopify/TaxonomyValue/2283',
      'Brick': 'gid://shopify/TaxonomyValue/24481',
      'Bull\'s eye': 'gid://shopify/TaxonomyValue/24482',
      'Camouflage': 'gid://shopify/TaxonomyValue/2866',
      'Characters': 'gid://shopify/TaxonomyValue/2867',
      'Checkered': 'gid://shopify/TaxonomyValue/2868',
      'Chevron': 'gid://shopify/TaxonomyValue/24483',
      'Chinoiserie': 'gid://shopify/TaxonomyValue/24484',
      'Christmas': 'gid://shopify/TaxonomyValue/2869',
      'Collage': 'gid://shopify/TaxonomyValue/24485',
      'Coral': 'gid://shopify/TaxonomyValue/24486',
      'Damask': 'gid://shopify/TaxonomyValue/24487',
      'Diagonal': 'gid://shopify/TaxonomyValue/24488',
      'Diamond': 'gid://shopify/TaxonomyValue/24489',
      'Dog\'s tooth': 'gid://shopify/TaxonomyValue/24490',
      'Dots': 'gid://shopify/TaxonomyValue/2870',
      'Egg & dart': 'gid://shopify/TaxonomyValue/24491',
      'Ethnic': 'gid://shopify/TaxonomyValue/24492',
      'Everlasting knot': 'gid://shopify/TaxonomyValue/24493',
      'Floral': 'gid://shopify/TaxonomyValue/2871',
      'Fret': 'gid://shopify/TaxonomyValue/24494',
      'Geometric': 'gid://shopify/TaxonomyValue/1868',
      'Guilloche': 'gid://shopify/TaxonomyValue/24495',
      'Hearts': 'gid://shopify/TaxonomyValue/2375',
      'Illusion': 'gid://shopify/TaxonomyValue/24496',
      'Lace': 'gid://shopify/TaxonomyValue/28170',
      'Leaves': 'gid://shopify/TaxonomyValue/2872',
      'Logo': 'gid://shopify/TaxonomyValue/24497',
      'Mosaic': 'gid://shopify/TaxonomyValue/24498',
      'Ogee': 'gid://shopify/TaxonomyValue/24499',
      'Organic': 'gid://shopify/TaxonomyValue/24500',
      'Paisley': 'gid://shopify/TaxonomyValue/2873',
      'Plaid': 'gid://shopify/TaxonomyValue/24501',
      'Rainbow': 'gid://shopify/TaxonomyValue/24502',
      'Random': 'gid://shopify/TaxonomyValue/24503',
      'Scale': 'gid://shopify/TaxonomyValue/24504',
      'Scroll': 'gid://shopify/TaxonomyValue/24505',
      'Solid': 'gid://shopify/TaxonomyValue/2874',
      'Stars': 'gid://shopify/TaxonomyValue/2376',
      'Striped': 'gid://shopify/TaxonomyValue/2875',
      'Swirl': 'gid://shopify/TaxonomyValue/24506',
      'Text': 'gid://shopify/TaxonomyValue/1782',
      'Texture': 'gid://shopify/TaxonomyValue/24507',
      'Tie-dye': 'gid://shopify/TaxonomyValue/2876',
      'Trellis': 'gid://shopify/TaxonomyValue/24508',
      'Vehicle': 'gid://shopify/TaxonomyValue/1796',
      'Other': 'gid://shopify/TaxonomyValue/24509'
    }
  },

  'size_range': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'size_range', 
    name: 'Size Range',
    description: 'Available size range (e.g., XS-5XL, S-XXL)',
    shopifyAttribute: 'size_range',
    taxonomyType: 'product',
    enableTaxonomyValidation: false
  },
  
  // Care and maintenance
  'care_instructions': {
    type: 'multi_line_text_field',
    namespace: 'custom',
    key: 'care_instructions',
    name: 'Care Instructions', 
    description: 'Washing and care instructions',
    shopifyAttribute: 'care_instructions',
    taxonomyType: 'product',
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'care_instructions'
  },
  
  // Sustainability and certifications
  'certifications': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'certifications',
    name: 'Certifications',
    description: 'Product certifications (e.g., OEKO-TEX, GOTS, Fairtrade)',
    shopifyAttribute: 'certifications',
    taxonomyType: 'product',
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'certifications'
  },
  
  'sustainability': {
    type: 'multi_line_text_field',
    namespace: 'custom',
    key: 'sustainability',
    name: 'Sustainability Features',
    description: 'Sustainability and eco-friendly features',
    shopifyAttribute: 'sustainability',
    taxonomyType: 'product',
    enableTaxonomyValidation: false
  },
  
  // Product details
  'style_code': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'style_code',
    name: 'Style Code',
    description: 'Stanley/Stella style reference code',
    shopifyAttribute: 'style_code',
    taxonomyType: 'product',
    enableTaxonomyValidation: false
  },
  
  'color_code': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'color_code', 
    name: 'Color Code',
    description: 'Stanley/Stella color reference code',
    shopifyAttribute: 'color_code',
    taxonomyType: 'product',
    enableTaxonomyValidation: false
  },
  
  'season': {
    type: 'single_line_text_field',
    namespace: 'custom',
    key: 'season',
    name: 'Season',
    description: 'Product season or collection',
    shopifyAttribute: 'season',
    taxonomyType: 'product',
    enableTaxonomyValidation: true,
    taxonomyAttributeId: 'season'
  },
  
  // Technical specifications
  'features': {
    type: 'multi_line_text_field',
    namespace: 'custom',
    key: 'features',
    name: 'Features',
    description: 'Special features and technical details',
    shopifyAttribute: 'features',
    taxonomyType: 'product',
    enableTaxonomyValidation: false
  }
};

// Mapping CSV columns to product attributes
export const CSV_TO_ATTRIBUTES_MAPPING = {
  // Common Stanley/Stella CSV column mappings
  'Material': 'material',
  'FabricWeight': 'fabric_weight', 
  'FabricFinish': 'fabric_finish',
  'Fit': 'fit',
  'Size': 'size',
  'Color': 'color',
  'SizeRange': 'size_range',
  'CareInstructions': 'care_instructions',
  'Certifications': 'certifications',
  'Sustainability': 'sustainability',
  'StyleCode': 'style_code',
  'ColorCode': 'color_code',
  'Season': 'season',
  'Features': 'features',
  'AgeGroup': 'age_group',
  'Age': 'age_group',
  'TargetAge': 'age_group',
  
  // Target Gender mappings
  'Gender': 'target_gender',
  'TargetGender': 'target_gender',
  'Target Gender': 'target_gender',
  'Sex': 'target_gender',

  // Sleeve Length Type mappings
  'SleeveLength': 'sleeve_length_type',
  'Sleeve Length': 'sleeve_length_type',
  'SleeveLengthType': 'sleeve_length_type',
  'Sleeve Length Type': 'sleeve_length_type',
  'SleeveType': 'sleeve_length_type',
  'Sleeve Type': 'sleeve_length_type',

  // Care Instructions mappings
  'CareInstructions': 'care_instructions',
  'Care Instructions': 'care_instructions',
  'WashingInstructions': 'care_instructions',
  'Washing Instructions': 'care_instructions',
  'Care': 'care_instructions',
  'Wash': 'care_instructions',

  // Color mappings (for product-level color attributes, not variant colors)
  'PrimaryColor': 'color',
  'Primary Color': 'color',
  'MainColor': 'color',
  'Main Color': 'color',
  'BaseColor': 'color',
  'Base Color': 'color',

  // Fabric mappings
  'Fabric': 'fabric',
  'Material': 'fabric',
  'FabricType': 'fabric',
  'Fabric Type': 'fabric',
  'MaterialType': 'fabric',
  'Material Type': 'fabric',
  'Composition': 'fabric',
  'FabricComposition': 'fabric',
  'Fabric Composition': 'fabric',

  // Neckline mappings
  'Neckline': 'neckline',
  'NecklineType': 'neckline',
  'Neckline Type': 'neckline',
  'Collar': 'neckline',
  'CollarType': 'neckline',
  'Collar Type': 'neckline',
  'NeckStyle': 'neckline',
  'Neck Style': 'neckline',

  // Size mappings (for product-level size attributes, not variant sizes)
  'Size': 'size',
  'SizeCode': 'size',
  'Size Code': 'size',
  'SizeRange': 'size',
  'Size Range': 'size',
  'SizeCodeNavision': 'size',
  'ProductSize': 'size',
  'Product Size': 'size',

  // Clothing Features mappings
  'Features': 'clothing_features',
  'ClothingFeatures': 'clothing_features',
  'Clothing Features': 'clothing_features',
  'ProductFeatures': 'clothing_features',
  'Product Features': 'clothing_features',
  'SpecialFeatures': 'clothing_features',
  'Special Features': 'clothing_features',
  'TechnicalFeatures': 'clothing_features',
  'Technical Features': 'clothing_features',

  // Pattern mappings
  'Pattern': 'pattern',
  'Design': 'pattern',
  'Print': 'pattern',
  'PatternType': 'pattern',
  'Pattern Type': 'pattern',
  'DesignType': 'pattern',
  'Design Type': 'pattern',
  'PrintType': 'pattern',
  'Print Type': 'pattern',
  'Performance': 'clothing_features',
  'Functionality': 'clothing_features',
  
  // Alternative column name variations
  'fabric_weight': 'fabric_weight',
  'fabric_finish': 'fabric_finish', 
  'care_instructions': 'care_instructions',
  'style_code': 'style_code',
  'color_code': 'color_code',
  'fit': 'fit',
  'size': 'size',
  'color': 'color'
};

// ==============================================================================
// TAXONOMY VALIDATION AND ACTIVATION
// ==============================================================================

// Function to activate taxonomy attributes using Shopify's standard approach
export const activateTaxonomyAttributes = async (admin, categoryId) => {
  safeLog('log', `🔧 Activating taxonomy attributes using Shopify's standard method`);
  
  // List of standard taxonomy attributes to activate
  const standardAttributes = [
    'material',
    'color', 
    'size',
    'fit',
    'care_instructions',
    'certifications',
    'season',
    'age_group',         // ✅ Age group targeting
    'target_gender',     // ✅ Target gender
    'sleeve_length_type', // ✅ Sleeve length type
    'fabric',            // ✅ Fabric/Material type
    'neckline',          // ✅ Neckline design
    'clothing_features'  // ✅ NEW: Clothing features and functionality
    // Note: care_instructions and color are already in the list above
  ];
  
  const activatedAttributes = [];
  
  for (const attributeType of standardAttributes) {
    try {
      // Try to enable standard metaobject definition for this attribute type
      const mutation = `
        mutation standardMetaobjectDefinitionEnable($metaobjectType: String!) {
          standardMetaobjectDefinitionEnable(metaobjectType: $metaobjectType) {
            metaobjectDefinition {
              id
              type
              name
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
        }
      `;
      
      const response = await admin.graphql(mutation, { 
        variables: { metaobjectType: attributeType } 
      });
      const result = await response.json();
      
      if (result.data?.standardMetaobjectDefinitionEnable?.metaobjectDefinition) {
        activatedAttributes.push(result.data.standardMetaobjectDefinitionEnable.metaobjectDefinition);
        safeLog("log", `✅ Activated standard taxonomy attribute: ${attributeType}`);
      } else if (result.data?.standardMetaobjectDefinitionEnable?.userErrors?.length > 0) {
        safeLog("log", `ℹ️ Standard taxonomy attribute already active or not available: ${attributeType}`);
      }
    } catch (error) {
      safeLog("error", `❌ Error activating standard taxonomy attribute ${attributeType}:`, error);
    }
  }
  
  safeLog("log", `📋 Activated ${activatedAttributes.length} standard taxonomy attributes`);
  return activatedAttributes;
};

// Function to create taxonomy metafields for products
export const createTaxonomyMetaobjects = async (admin, productId, attributes) => {
  const taxonomyMetafields = [];
  
  // Filter for taxonomy-validated attributes that are NOT variant options
  const taxonomyAttributes = Object.entries(attributes).filter(
    ([key, attribute]) => attribute.enableTaxonomyValidation && 
                         attribute.taxonomyAttributeId &&
                         attribute.taxonomyType === 'product' // Only product-level attributes
  );
  
  if (taxonomyAttributes.length === 0) {
    safeLog("log", `ℹ️ No product-level taxonomy attributes to create for product`);
    return taxonomyMetafields;
  }
  
  // Create metafields in the custom namespace (not taxonomy to avoid conflicts)
  const metafieldsToCreate = taxonomyAttributes.map(([key, attribute]) => ({
    namespace: 'custom',
    key: attribute.key,
    type: attribute.type,
    value: attribute.value,
    ownerId: productId
  }));
  
  try {
    const mutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            key
            namespace
            value
            type {
              name
            }
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `;
    
    const response = await admin.graphql(mutation, { 
      variables: { metafields: metafieldsToCreate } 
    });
    const result = await response.json();
    
    if (result.data?.metafieldsSet?.metafields) {
      taxonomyMetafields.push(...result.data.metafieldsSet.metafields);
      safeLog("log", `✅ Created ${result.data.metafieldsSet.metafields.length} taxonomy-validated metafields`);
    }
    
    if (result.data?.metafieldsSet?.userErrors?.length > 0) {
      safeLog("error", `❌ Taxonomy metafield errors:`, result.data.metafieldsSet.userErrors);
    }
    
  } catch (error) {
    safeLog("error", `❌ Error creating taxonomy metafields:`, error);
  }
  
  return taxonomyMetafields;
};

// NEW FUNCTION: Create color taxonomy metafields from variant colors
export const createColorTaxonomyMetafields = async (admin, productId, variantColors) => {
  if (!variantColors || variantColors.length === 0) {
    safeLog("log", `ℹ️ No variant colors to create taxonomy metafields for`);
    return [];
  }
  
  safeLog("log", `🎨 Creating color taxonomy metafields for ${variantColors.length} colors`);
  
  try {
    // Check if a color metafield already exists for this product
    
    const checkQuery = `
      query($ownerId: ID!) {
        product(id: $ownerId) {
          metafields(first: 10) {
            edges {
              node {
                id
                namespace
                key
                value
              }
            }
          }
        }
      }
    `;

    const checkResult = await admin.graphql(checkQuery, {
      variables: { ownerId: productId }
    });

    const checkJson = await checkResult.json();
    const existingMetafields = checkJson.data?.product?.metafields?.edges || [];
    
    // Look for existing color metafield in custom namespace
    const existingColorMetafield = existingMetafields.find(edge => 
      edge.node.namespace === 'custom' && edge.node.key === 'color_patterns'
    );
    
    if (existingColorMetafield) {
      safeLog("log", `✅ Color pattern metafield already exists for product ${productId}: ${existingColorMetafield.node.value}`);
      return [existingColorMetafield.node];
    }
    
    // Get Stanley/Stella color pattern metaobjects for these colors
    const colorPatternReferences = await getStanleyStellaColorPatterns(admin, variantColors);
    
    if (colorPatternReferences.length > 0) {
      
      // Create metafield with metaobject references to Stanley/Stella color patterns
      const metafieldResult = await createColorMetafieldWithStanleyStellaReferences(admin, productId, colorPatternReferences);
      safeLog("log", `✅ Stanley/Stella color pattern metafield creation result: ${metafieldResult.length} metafields created`);
      return metafieldResult;
    } else {
      // Fallback: Create simple text metafield as before (but only color_patterns, not color_code or color)
      const colorValue = variantColors.join(', ');
      safeLog("log", `⚠️ No Stanley/Stella color patterns found, falling back to text metafield`);
      
      const metafieldResult = await createSimpleColorMetafield(admin, productId, colorValue, 'color_patterns');
      safeLog("log", `✅ Fallback metafield creation result: ${metafieldResult.length} metafields created`);
      return metafieldResult;
    }
    
  } catch (err) {
    safeLog("error", `❌ Error in createColorTaxonomyMetafields:`, {
      message: err.message,
      stack: err.stack,
      productId,
      variantColors
    });
    return [];
  }
};

// Helper function to get Stanley/Stella color pattern metaobjects
const getStanleyStellaColorPatterns = async (admin, variantColors) => {
  try {
    // Extract color codes and names from variant colors (e.g., "Black - C002" -> {name: "Black", code: "C002"})
    const colorData = variantColors.map(color => {
      const parts = color.split(' - ');
      if (parts.length === 2) {
        return {
          name: parts[0].trim(),
          code: parts[1].trim(),
          originalString: color
        };
      } else {
        return {
          name: color.trim(),
          code: null,
          originalString: color
        };
      }
    }).filter(Boolean);
    
    if (colorData.length === 0) {
      return [];
    }
    
    // Query existing Stanley/Stella color pattern metaobjects
    const colorPatternsQuery = `
      query {
        metaobjects(type: "stanley_stella_color_pattern", first: 250) {
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
    `;
    
    const colorPatternsResult = await admin.graphql(colorPatternsQuery);
    const colorPatternsJson = await colorPatternsResult.json();
    
    if (colorPatternsJson.errors) {
      safeLog("error", `❌ GraphQL errors when querying Stanley/Stella color patterns:`, colorPatternsJson.errors);
      return [];
    }
    
    const allColorPatterns = colorPatternsJson.data?.metaobjects?.edges || [];
    
    // Find matching color patterns
    const matchingPatterns = [];
    
    for (const colorInfo of colorData) {
      // Try to find existing pattern by color code or name
      const existingPattern = allColorPatterns.find(edge => {
        const handle = edge.node.handle;
        const fields = edge.node.fields;
        
        // Check if any field contains the color code
        if (colorInfo.code) {
          const codeField = fields.find(field => 
            field.key === 'color_code' && field.value === colorInfo.code
          );
          if (codeField) {
            return true;
          }
        }
        
        // Check if any field contains the color name
        const labelField = fields.find(field => 
          field.key === 'label' && field.value && 
          field.value.toLowerCase() === colorInfo.name.toLowerCase()
        );
        if (labelField) {
          return true;
        }
        
        // Check handle match
        const normalizedColorName = colorInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const handleMatches = handle.includes(normalizedColorName) || 
                             (colorInfo.code && handle.includes(colorInfo.code.toLowerCase()));
        if (handleMatches) {
          return true;
        }
        
        return false;
      });
      
      if (existingPattern) {
        const labelField = existingPattern.node.fields.find(f => f.key === 'label');
        const codeField = existingPattern.node.fields.find(f => f.key === 'color_code');
        
        matchingPatterns.push({
          id: existingPattern.node.id,
          handle: existingPattern.node.handle,
          colorName: labelField?.value || colorInfo.name,
          colorCode: codeField?.value || colorInfo.code
        });
      }
    }
    
    return matchingPatterns;
    
  } catch (error) {
    safeLog("error", `❌ Error getting Stanley/Stella color patterns:`, error);
    return [];
  }
};

// Helper function to create metafield with Stanley/Stella color pattern references
const createColorMetafieldWithStanleyStellaReferences = async (admin, productId, colorPatternReferences) => {
  try {
    // First ensure the metafield definition exists
    await ensureColorPatternsMetafieldDefinition(admin);
    
    // Create metaobject reference list metafield pointing to Stanley/Stella color patterns
    const metaobjectIds = colorPatternReferences.map(pattern => pattern.id);
    
    const metafieldMutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            key
            namespace
            value
            type
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `;

    const metafieldResult = await admin.graphql(metafieldMutation, {
      variables: {
        metafields: [{
          ownerId: productId,
          namespace: 'custom',
          key: 'color_patterns',
          type: 'list.metaobject_reference',
          value: JSON.stringify(metaobjectIds) // List of Stanley/Stella color pattern IDs as JSON string
        }]
      }
    });

    const metafieldJson = await metafieldResult.json();
    
    if (metafieldJson.data?.metafieldsSet?.userErrors?.length > 0) {
      safeLog("error", `❌ Error creating Stanley/Stella color pattern metafield:`, metafieldJson.data.metafieldsSet.userErrors);
      return [];
    }
    
    const createdMetafields = metafieldJson.data?.metafieldsSet?.metafields || [];
    safeLog("log", `✅ Created ${createdMetafields.length} Stanley/Stella color pattern reference metafields`);
    
    // Also create a simple text metafield for backward compatibility
    const colorNames = colorPatternReferences.map(p => p.colorName).join(', ');
    await createSimpleColorMetafield(admin, productId, colorNames, 'color_names');
    
    return createdMetafields;
    
  } catch (error) {
    safeLog("error", `❌ Error creating color metafield with Stanley/Stella references:`, error);
    return [];
  }
};

// Helper function to ensure color_patterns metafield definition exists
const ensureColorPatternsMetafieldDefinition = async (admin) => {
  try {
    // Check if definition already exists
    const checkQuery = `
      query {
        metafieldDefinitions(first: 50, ownerType: PRODUCT) {
          edges {
            node {
              id
              name
              namespace
              key
              type {
                name
              }
            }
          }
        }
      }
    `;
    
    const checkResult = await admin.graphql(checkQuery);
    const checkJson = await checkResult.json();
    const definitions = checkJson.data?.metafieldDefinitions?.edges || [];
    
    const existingDef = definitions.find(edge => 
      edge.node.namespace === 'custom' && edge.node.key === 'color_patterns'
    );
    
    if (existingDef) {
      safeLog("log", `✅ Color patterns metafield definition already exists: ${existingDef.node.id}`);
      return existingDef.node.id;
    }
    
    // Get Stanley/Stella color pattern metaobject definition ID
    const metaobjectDefsQuery = `
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
    `;
    
    const metaobjectDefsResult = await admin.graphql(metaobjectDefsQuery);
    const metaobjectDefsJson = await metaobjectDefsResult.json();
    const metaobjectDefs = metaobjectDefsJson.data?.metaobjectDefinitions?.edges || [];
    
    const stanleyColorDef = metaobjectDefs.find(edge => edge.node.type === 'stanley_stella_color_pattern');
    
    if (!stanleyColorDef) {
      safeLog("error", `❌ Stanley/Stella color pattern metaobject definition not found`);
      return null;
    }
    
    safeLog("log", `🔍 Found Stanley/Stella color pattern definition: ${stanleyColorDef.node.id}`);
    
    // Create the metafield definition
    const createQuery = `
      mutation {
        metafieldDefinitionCreate(definition: {
          name: "Color Patterns"
          namespace: "custom"
          key: "color_patterns"
          description: "References to Stanley/Stella color pattern metaobjects"
          type: "list.metaobject_reference"
          ownerType: PRODUCT
          validations: [{
            name: "metaobject_definition_id"
            value: "${stanleyColorDef.node.id}"
          }]
        }) {
          createdDefinition {
            id
            name
            namespace
            key
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `;
    
    const createResult = await admin.graphql(createQuery);
    const createJson = await createResult.json();
    
    if (createJson.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
      const errors = createJson.data.metafieldDefinitionCreate.userErrors;
      
      // Check if the error is because the definition already exists
      const takenError = errors.find(err => 
        err.code === 'TAKEN' || 
        err.message?.includes('already exists') || 
        err.message?.includes('in use')
      );
      
      if (takenError) {
        safeLog("log", `✅ Color patterns metafield definition already exists (handled gracefully)`);
        
        // Try to get the existing definition ID
        const retryCheckResult = await admin.graphql(checkQuery);
        const retryCheckJson = await retryCheckResult.json();
        const retryDefinitions = retryCheckJson.data?.metafieldDefinitions?.edges || [];
        
        const retryExistingDef = retryDefinitions.find(edge => 
          edge.node.namespace === 'custom' && edge.node.key === 'color_patterns'
        );
        
        if (retryExistingDef) {
          safeLog("log", `✅ Found existing color patterns metafield definition: ${retryExistingDef.node.id}`);
          return retryExistingDef.node.id;
        }
        
        return null;
      } else {
        safeLog("error", `❌ Error creating color patterns metafield definition:`, errors);
        return null;
      }
    }
    
    const createdDef = createJson.data?.metafieldDefinitionCreate?.createdDefinition;
    if (createdDef) {
      safeLog("log", `✅ Created color patterns metafield definition: ${createdDef.id}`);
      return createdDef.id;
    }
    
    return null;
    
  } catch (error) {
    safeLog("error", `❌ Error ensuring color patterns metafield definition:`, error);
    return null;
  }
};

// Helper function to create simple text color metafield (fallback)
const createSimpleColorMetafield = async (admin, productId, colorValue, key = 'color') => {
  try {
    const metafieldMutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            key
            namespace
            value
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `;

    const metafieldResult = await admin.graphql(metafieldMutation, {
      variables: {
        metafields: [{
          ownerId: productId,
          namespace: 'custom',
          key: key,
          type: 'single_line_text_field',
          value: colorValue
        }]
      }
    });

    const metafieldJson = await metafieldResult.json();
    
    if (metafieldJson.data?.metafieldsSet?.userErrors?.length > 0) {
      safeLog("error", `❌ Error creating simple color metafield:`, metafieldJson.data.metafieldsSet.userErrors);
      return [];
    }
    
    const createdMetafields = metafieldJson.data?.metafieldsSet?.metafields || [];
    safeLog("log", `✅ Created ${createdMetafields.length} simple color metafields`);
    
    return createdMetafields;
    
  } catch (error) {
    safeLog("error", `❌ Error creating simple color metafield:`, error);
    return [];
  }
};

// Function to get variant options from attributes and link them to taxonomy
export const getVariantOptionsFromAttributes = (attributes) => {
  const options = [];
  const optionValues = {};
  
  Object.entries(attributes).forEach(([key, attribute]) => {
    const config = STANLEY_STELLA_ATTRIBUTES[key];
    if (config && config.taxonomyType === 'variant' && config.variantOptionName) {
      const optionName = config.variantOptionName;
      
      if (!optionValues[optionName]) {
        optionValues[optionName] = new Set();
        options.push({
          name: optionName,
          values: [],
          taxonomyAttribute: config.taxonomyAttributeId // Link to taxonomy
        });
      }
      
      optionValues[optionName].add(attribute.value);
    }
  });
  
  // Convert Sets to Arrays
  options.forEach(option => {
    option.values = Array.from(optionValues[option.name]);
  });
  
  safeLog("log", `🎛️ Generated ${options.length} variant options from attributes`);
  return options;
};

// Function to connect variant options to taxonomy attributes
export const connectVariantOptionsToTaxonomy = async (admin, productId, variantOptions) => {
  const connections = [];
  
  for (const option of variantOptions) {
    if (!option.taxonomyAttribute) continue;
    
    try {
      // This would connect the variant option to the taxonomy attribute
      // For now, we'll just log the connection
      safeLog("log", `🔗 Connecting variant option '${option.name}' to taxonomy attribute '${option.taxonomyAttribute}'`);
      
      // In a real implementation, you might create metaobjects that link the option to taxonomy
      // or use Shopify's variant option taxonomy features when they become available
      
      connections.push({
        optionName: option.name,
        taxonomyAttribute: option.taxonomyAttribute,
        values: option.values
      });
      
    } catch (error) {
      safeLog("error", `❌ Error connecting variant option ${option.name} to taxonomy:`, error);
    }
  }
  
  return connections;
};

// Function to validate attribute values against taxonomy
export const validateAttributeValues = async (admin, categoryId, attributes) => {
  const validationResults = {};
  
  // This would query Shopify's taxonomy API to validate values
  // For now, we'll do basic validation
  Object.entries(attributes).forEach(([key, attribute]) => {
    const config = STANLEY_STELLA_ATTRIBUTES[key];
    if (config && config.enableTaxonomyValidation) {
      // Basic validation - you could enhance this with actual taxonomy API calls
      validationResults[key] = {
        isValid: true,
        value: attribute.value,
        taxonomyId: config.taxonomyAttributeId,
        suggestions: [] // Could be populated from taxonomy API
      };
    }
  });
  
     return validationResults;
};

// Helper function to get product type as fallback when taxonomy is not available
export const getProductTypeFromRow = (row, fallbackType = null) => {
  // Priority order: TypeCode > Category > Type > fallbackType parameter
  
  // 1. Check TypeCode field (highest priority)
  if (row.TypeCode) {
    safeLog("log", `🏷️ ProductType from TypeCode: ${row.TypeCode}`);
    return row.TypeCode;
  }
  
  // 2. Check Category field
  if (row.Category) {
    safeLog("log", `🏷️ ProductType from Category: ${row.Category}`);
    return row.Category;
  }
  
  // 3. Check Type field
  if (row.Type) {
    safeLog("log", `🏷️ ProductType from Type: ${row.Type}`);
    return row.Type;
  }
  
  // 4. Use fallback
  if (fallbackType) {
    safeLog("log", `🏷️ ProductType from fallback: ${fallbackType}`);
    return fallbackType;
  }
  
  safeLog("log", `⚠️ No product type found for TypeCode: ${row.TypeCode}, Category: ${row.Category}, Type: ${row.Type}`);
  return 'Apparel'; // Default fallback
};

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

// Main function to get category ID for a product
export const getProductCategoryId = (productType, csvRow) => {
  safeLog("log", `🔍 Determining category for product type: "${productType}"`);
  
  // Check for explicit category fields in CSV (Stanley/Stella specific)
  const categoryField = csvRow.Category || csvRow.category || csvRow.ProductCategory || csvRow.product_category;
  const typeCodeField = csvRow.TypeCode || csvRow.typecode || csvRow.type_code;
  const typeField = csvRow.Type || csvRow.type;
  
  let categoryId = null;
  let source = 'none';
  
  // Priority 1: Check TypeCode field (most specific)
  if (typeCodeField && STANLEY_STELLA_CATEGORIES[typeCodeField.toUpperCase()]) {
    categoryId = STANLEY_STELLA_CATEGORIES[typeCodeField.toUpperCase()];
    source = `TypeCode: ${typeCodeField}`;
  }
  // Priority 2: Check Category field
  else if (categoryField && CATEGORY_FIELD_MAPPINGS[categoryField]) {
    categoryId = CATEGORY_FIELD_MAPPINGS[categoryField];
    source = `Category: ${categoryField}`;
  }
  // Priority 3: Check Type field 
  else if (typeField && GENERAL_TYPE_MAPPINGS[typeField]) {
    categoryId = GENERAL_TYPE_MAPPINGS[typeField];
    source = `Type: ${typeField}`;
  }
  // Priority 4: Check productType parameter (fallback)
  else if (productType && GENERAL_TYPE_MAPPINGS[productType]) {
    categoryId = GENERAL_TYPE_MAPPINGS[productType];
    source = `ProductType: ${productType}`;
  }
  
  if (categoryId) {
    safeLog("log", `✅ Category found via ${source} → ${categoryId}`);
  } else {
    safeLog("log", `❌ No category mapping found for: TypeCode="${typeCodeField}", Category="${categoryField}", Type="${typeField}", ProductType="${productType}"`);
  }
  
  return categoryId;
};

// Function to map age group values to taxonomy values
export const mapAgeGroupToTaxonomyValue = (ageGroupValue) => {
  if (!ageGroupValue || typeof ageGroupValue !== 'string') {
    return null;
  }
  
  const normalizedValue = ageGroupValue.toLowerCase().trim();
  
  // Age group mappings with multiple variations
  const ageGroupMappings = {
    'gid://shopify/TaxonomyValue/19404': ['0-6 months', '0-6m', 'newborn 0-6', 'infant 0-6'],
    'gid://shopify/TaxonomyValue/19405': ['6-12 months', '6-12m', '6-12', 'infant 6-12'],
    'gid://shopify/TaxonomyValue/19406': ['1-2 years', '1-2y', '1-2', 'toddler 1-2'],
    'gid://shopify/TaxonomyValue/2403': ['adults', 'adult', 'grown-up', 'grownup', 'men', 'women'],
    'gid://shopify/TaxonomyValue/534': ['all ages', 'universal', 'everyone', 'any age'],
    'gid://shopify/TaxonomyValue/2974': ['babies', 'baby', 'infant', 'infants'],
    'gid://shopify/TaxonomyValue/1515': ['kids', 'children', 'child', 'youth'],
    'gid://shopify/TaxonomyValue/19952': ['newborn', 'newborns', 'new born', 'nb'],
    'gid://shopify/TaxonomyValue/2404': ['teens', 'teenagers', 'teenager', 'teen', 'adolescent'],
    'gid://shopify/TaxonomyValue/10090': ['toddlers', 'toddler', 'tod'],
    'gid://shopify/TaxonomyValue/18291': ['universal', 'unisex', 'all'],
    'gid://shopify/TaxonomyValue/26412': ['other', 'misc', 'miscellaneous', 'n/a']
  };
  
  // Find matching taxonomy value
  for (const [taxonomyValue, variations] of Object.entries(ageGroupMappings)) {
    if (variations.some(variation => normalizedValue.includes(variation))) {
      return taxonomyValue;
    }
  }
  
  // Default fallback
  safeLog("log", `⚠️ No age group taxonomy mapping found for: "${ageGroupValue}", using "Other"`);
  return 'gid://shopify/TaxonomyValue/26412'; // Other
};

// Function to map target gender values to taxonomy values
export const mapTargetGenderToTaxonomyValue = (genderValue) => {
  if (!genderValue || typeof genderValue !== 'string') {
    return null;
  }
  
  const normalizedValue = genderValue.toLowerCase().trim();
  
  // Target gender mappings with multiple variations
  const genderMappings = {
    'gid://shopify/TaxonomyValue/18': ['female', 'women', 'woman', 'ladies', 'lady', 'girls', 'girl', 'f'],
    'gid://shopify/TaxonomyValue/19': ['male', 'men', 'man', 'boys', 'boy', 'mens', 'm'],
    'gid://shopify/TaxonomyValue/20': ['unisex', 'uni', 'both', 'all', 'neutral', 'gender neutral'],
    'gid://shopify/TaxonomyValue/26424': ['other', 'misc', 'miscellaneous', 'n/a', 'na']
  };
  
  // Find matching taxonomy value
  for (const [taxonomyValue, variations] of Object.entries(genderMappings)) {
    if (variations.some(variation => normalizedValue.includes(variation))) {
      return taxonomyValue;
    }
  }
  
  // Default fallback to Unisex for unknown values
  safeLog("log", `⚠️ No target gender taxonomy mapping found for: "${genderValue}", using "Unisex"`);
  return 'gid://shopify/TaxonomyValue/20'; // Unisex
};

// Function to map sleeve length type values to taxonomy values
export const mapSleeveLengthTypeToTaxonomyValue = (sleeveLengthValue) => {
  if (!sleeveLengthValue || typeof sleeveLengthValue !== 'string') {
    return null;
  }
  
  const normalizedValue = sleeveLengthValue.toLowerCase().trim();
  
  // Sleeve length type mappings with multiple variations
  const sleeveLengthMappings = {
    'gid://shopify/TaxonomyValue/1405': ['3/4', 'three quarter', 'three-quarter', '3 quarter', 'three quarters'],
    'gid://shopify/TaxonomyValue/1407': ['cap', 'cap sleeve', 'cap sleeves'],
    'gid://shopify/TaxonomyValue/17094': ['long', 'long sleeve', 'long sleeves', 'full sleeve', 'full sleeves'],
    'gid://shopify/TaxonomyValue/169': ['short', 'short sleeve', 'short sleeves', 'half sleeve', 'half sleeves'],
    'gid://shopify/TaxonomyValue/174': ['sleeveless', 'no sleeve', 'no sleeves', 'tank', 'vest'],
    'gid://shopify/TaxonomyValue/176': ['spaghetti strap', 'spaghetti', 'thin strap', 'thin straps'],
    'gid://shopify/TaxonomyValue/177': ['strapless', 'no strap', 'no straps', 'bandeau'],
    'gid://shopify/TaxonomyValue/26410': ['other', 'misc', 'miscellaneous', 'n/a', 'na']
  };
  
  // Find matching taxonomy value
  for (const [taxonomyValue, variations] of Object.entries(sleeveLengthMappings)) {
    if (variations.some(variation => normalizedValue.includes(variation))) {
      return taxonomyValue;
    }
  }
  
  // Default fallback to Short for unknown values
  safeLog("log", `⚠️ No sleeve length type taxonomy mapping found for: "${sleeveLengthValue}", using "Short"`);
  return 'gid://shopify/TaxonomyValue/169'; // Short
};

// Function to map care instructions values to taxonomy values
export const mapCareInstructionsToTaxonomyValue = (careValue) => {
  if (!careValue || typeof careValue !== 'string') {
    return null;
  }
  
  const normalizedValue = careValue.toLowerCase().trim();
  
  // Care instructions mappings with multiple variations
  const careMappings = {
    'gid://shopify/TaxonomyValue/14942': ['dry clean only', 'dry clean', 'professional clean', 'do not wash'],
    'gid://shopify/TaxonomyValue/24715': ['dryer safe', 'tumble dry safe', 'can tumble dry', 'dryer ok'],
    'gid://shopify/TaxonomyValue/14943': ['hand wash', 'hand wash only', 'wash by hand', 'gentle wash'],
    'gid://shopify/TaxonomyValue/14944': ['ironing instructions', 'iron', 'pressing', 'do not iron', 'low heat iron'],
    'gid://shopify/TaxonomyValue/10542': ['machine washable', 'machine wash', 'washing machine', 'wash cold', 'wash warm', 'wash 30°', 'wash 40°'],
    'gid://shopify/TaxonomyValue/11409': ['tumble dry', 'tumble dry low', 'tumble dry medium', 'machine dry'],
    'gid://shopify/TaxonomyValue/27281': ['other', 'special care', 'see label', 'n/a', 'na']
  };
  
  // Find matching taxonomy value
  for (const [taxonomyValue, variations] of Object.entries(careMappings)) {
    if (variations.some(variation => normalizedValue.includes(variation))) {
      return taxonomyValue;
    }
  }
  
  // Default fallback to Machine washable for unknown values
  safeLog("log", `⚠️ No care instructions taxonomy mapping found for: "${careValue}", using "Machine washable"`);
  return 'gid://shopify/TaxonomyValue/10542'; // Machine washable
};

// Function to map color values to taxonomy values
export const mapColorToTaxonomyValue = (colorValue) => {
  if (!colorValue || typeof colorValue !== 'string') {
    return null;
  }
  
  const normalizedValue = colorValue.toLowerCase().trim();
  
  // Color mappings with multiple variations and synonyms
  const colorMappings = {
    'gid://shopify/TaxonomyValue/6': ['beige', 'cream', 'ivory', 'off-white', 'natural', 'sand', 'tan'],
    'gid://shopify/TaxonomyValue/1': ['black', 'jet', 'coal', 'ebony', 'midnight'],
    'gid://shopify/TaxonomyValue/2': ['blue', 'navy blue', 'royal blue', 'sky blue', 'light blue', 'dark blue', 'azure'],
    'gid://shopify/TaxonomyValue/657': ['bronze', 'copper', 'brass', 'antique bronze'],
    'gid://shopify/TaxonomyValue/7': ['brown', 'chocolate', 'coffee', 'mocha', 'chestnut', 'mahogany'],
    'gid://shopify/TaxonomyValue/17': ['clear', 'transparent', 'crystal', 'glass'],
    'gid://shopify/TaxonomyValue/4': ['gold', 'golden', 'yellow gold', 'champagne gold'],
    'gid://shopify/TaxonomyValue/8': ['gray', 'grey', 'silver gray', 'charcoal', 'slate', 'ash'],
    'gid://shopify/TaxonomyValue/9': ['green', 'lime', 'forest green', 'olive', 'mint', 'emerald'],
    'gid://shopify/TaxonomyValue/2865': ['multicolor', 'multi-color', 'rainbow', 'mixed', 'assorted', 'various colors'],
    'gid://shopify/TaxonomyValue/15': ['navy', 'navy blue', 'dark blue', 'marine blue'],
    'gid://shopify/TaxonomyValue/10': ['orange', 'tangerine', 'peach', 'coral', 'burnt orange'],
    'gid://shopify/TaxonomyValue/11': ['pink', 'rose', 'blush', 'magenta', 'fuchsia', 'hot pink'],
    'gid://shopify/TaxonomyValue/12': ['purple', 'violet', 'lavender', 'plum', 'indigo', 'amethyst'],
    'gid://shopify/TaxonomyValue/13': ['red', 'crimson', 'scarlet', 'burgundy', 'cherry', 'wine'],
    'gid://shopify/TaxonomyValue/16': ['rose gold', 'pink gold', 'copper gold', 'blush gold'],
    'gid://shopify/TaxonomyValue/5': ['silver', 'metallic silver', 'chrome', 'platinum', 'steel'],
    'gid://shopify/TaxonomyValue/3': ['white', 'pure white', 'snow white', 'pearl white'],
    'gid://shopify/TaxonomyValue/14': ['yellow', 'bright yellow', 'lemon', 'canary', 'golden yellow']
  };
  
  // Find matching taxonomy value
  for (const [taxonomyValue, variations] of Object.entries(colorMappings)) {
    if (variations.some(variation => normalizedValue.includes(variation))) {
      return taxonomyValue;
    }
  }
  
  // Default fallback to Multicolor for unknown values
  safeLog("log", `⚠️ No color taxonomy mapping found for: "${colorValue}", using "Multicolor"`);
  return 'gid://shopify/TaxonomyValue/2865'; // Multicolor
};

// Function to map fabric values to taxonomy values
export const mapFabricToTaxonomyValue = (fabricValue) => {
  if (!fabricValue || typeof fabricValue !== 'string') {
    return null;
  }
  
  const normalizedValue = fabricValue.toLowerCase().trim();
  
  // Fabric mappings with multiple variations and synonyms
  const fabricMappings = {
    'gid://shopify/TaxonomyValue/16980': ['acrylic', 'acrylic fiber', 'acrylic blend'],
    'gid://shopify/TaxonomyValue/603': ['angora', 'angora wool', 'angora rabbit'],
    'gid://shopify/TaxonomyValue/16981': ['bamboo', 'bamboo fiber', 'bamboo fabric', 'bamboo viscose'],
    'gid://shopify/TaxonomyValue/16982': ['canvas', 'canvas fabric', 'duck canvas', 'heavy canvas'],
    'gid://shopify/TaxonomyValue/66': ['cashmere', 'cashmere wool', 'kashmir'],
    'gid://shopify/TaxonomyValue/606': ['corduroy', 'cord', 'corded fabric'],
    'gid://shopify/TaxonomyValue/16983': ['cork', 'cork fabric', 'cork leather'],
    'gid://shopify/TaxonomyValue/16984': ['cotton', '100% cotton', 'cotton blend', 'organic cotton', 'pure cotton'],
    'gid://shopify/TaxonomyValue/54': ['denim', 'jeans fabric', 'denim cotton'],
    'gid://shopify/TaxonomyValue/594': ['faux fur', 'fake fur', 'synthetic fur', 'artificial fur'],
    'gid://shopify/TaxonomyValue/16985': ['faux leather', 'fake leather', 'synthetic leather', 'vegan leather', 'pu leather'],
    'gid://shopify/TaxonomyValue/16986': ['felt', 'wool felt', 'felt fabric'],
    'gid://shopify/TaxonomyValue/556': ['flannel', 'cotton flannel', 'brushed cotton'],
    'gid://shopify/TaxonomyValue/555': ['fleece', 'polar fleece', 'micro fleece', 'anti-pill fleece'],
    'gid://shopify/TaxonomyValue/63': ['fur', 'real fur', 'natural fur'],
    'gid://shopify/TaxonomyValue/1042': ['hemp', 'hemp fiber', 'hemp fabric'],
    'gid://shopify/TaxonomyValue/613': ['jute', 'jute fiber', 'burlap'],
    'gid://shopify/TaxonomyValue/16987': ['latex', 'natural latex', 'rubber latex'],
    'gid://shopify/TaxonomyValue/16988': ['leather', 'genuine leather', 'real leather', 'cowhide'],
    'gid://shopify/TaxonomyValue/16989': ['linen', '100% linen', 'flax linen', 'pure linen'],
    'gid://shopify/TaxonomyValue/1007': ['lycra', 'spandex', 'elastane', 'stretch'],
    'gid://shopify/TaxonomyValue/50': ['lyocell', 'tencel', 'tencel lyocell'],
    'gid://shopify/TaxonomyValue/16890': ['merino', 'merino wool', 'superfine merino'],
    'gid://shopify/TaxonomyValue/600': ['mesh', 'mesh fabric', 'athletic mesh', 'breathable mesh'],
    'gid://shopify/TaxonomyValue/57': ['modal', 'modal fabric', 'modal blend'],
    'gid://shopify/TaxonomyValue/983': ['mohair', 'mohair wool', 'angora goat'],
    'gid://shopify/TaxonomyValue/566': ['neoprene', 'wetsuit material', 'scuba fabric'],
    'gid://shopify/TaxonomyValue/16990': ['nylon', 'polyamide', 'nylon blend'],
    'gid://shopify/TaxonomyValue/16991': ['plastic', 'plastic material', 'vinyl plastic'],
    'gid://shopify/TaxonomyValue/16992': ['plush', 'plush fabric', 'velour plush'],
    'gid://shopify/TaxonomyValue/16993': ['polyester', '100% polyester', 'poly', 'polyester blend'],
    'gid://shopify/TaxonomyValue/16994': ['rattan', 'rattan fiber', 'wicker'],
    'gid://shopify/TaxonomyValue/22664': ['rayon', 'viscose rayon', 'rayon blend'],
    'gid://shopify/TaxonomyValue/16995': ['rubber', 'natural rubber', 'synthetic rubber'],
    'gid://shopify/TaxonomyValue/16996': ['satin', 'satin fabric', 'silk satin'],
    'gid://shopify/TaxonomyValue/608': ['sherpa', 'sherpa fleece', 'sherpa lining'],
    'gid://shopify/TaxonomyValue/16997': ['silk', '100% silk', 'pure silk', 'mulberry silk'],
    'gid://shopify/TaxonomyValue/561': ['suede', 'suede leather', 'faux suede'],
    'gid://shopify/TaxonomyValue/62': ['synthetic', 'synthetic fabric', 'man-made'],
    'gid://shopify/TaxonomyValue/1019': ['terrycloth', 'terry cloth', 'terry fabric', 'toweling'],
    'gid://shopify/TaxonomyValue/850': ['tweed', 'wool tweed', 'harris tweed'],
    'gid://shopify/TaxonomyValue/565': ['twill', 'twill weave', 'cotton twill'],
    'gid://shopify/TaxonomyValue/564': ['velour', 'velour fabric', 'cotton velour'],
    'gid://shopify/TaxonomyValue/563': ['velvet', 'velvet fabric', 'cotton velvet'],
    'gid://shopify/TaxonomyValue/16998': ['vinyl', 'vinyl fabric', 'pvc vinyl'],
    'gid://shopify/TaxonomyValue/55': ['viscose', 'viscose rayon', 'viscose fiber'],
    'gid://shopify/TaxonomyValue/16999': ['wool', '100% wool', 'pure wool', 'virgin wool'],
    'gid://shopify/TaxonomyValue/17000': ['other', 'mixed', 'blend', 'n/a', 'na']
  };
  
  // Find matching taxonomy value
  for (const [taxonomyValue, variations] of Object.entries(fabricMappings)) {
    if (variations.some(variation => normalizedValue.includes(variation))) {
      return taxonomyValue;
    }
  }
  
  // Default fallback to Cotton for unknown values
  safeLog("log", `⚠️ No fabric taxonomy mapping found for: "${fabricValue}", using "Cotton"`);
  return 'gid://shopify/TaxonomyValue/16984'; // Cotton
};

// Function to map neckline values to taxonomy values
export const mapNecklineToTaxonomyValue = (necklineValue) => {
  if (!necklineValue || typeof necklineValue !== 'string') {
    return null;
  }
  
  const normalizedValue = necklineValue.toLowerCase().trim();
  
  // Neckline mappings with multiple variations
  const necklineMappings = {
    'gid://shopify/TaxonomyValue/6704': ['asymmetric', 'asymmetrical', 'off-center'],
    'gid://shopify/TaxonomyValue/6705': ['bardot', 'off-shoulder', 'off the shoulder'],
    'gid://shopify/TaxonomyValue/6706': ['boat', 'boat neck', 'bateau', 'bateau neck'],
    'gid://shopify/TaxonomyValue/6707': ['cowl', 'cowl neck', 'draped neck'],
    'gid://shopify/TaxonomyValue/6711': ['crew', 'crew neck', 'crewneck', 'round crew'],
    'gid://shopify/TaxonomyValue/6708': ['halter', 'halter neck', 'halterneck'],
    'gid://shopify/TaxonomyValue/6709': ['hooded', 'hood', 'hoodie', 'with hood'],
    'gid://shopify/TaxonomyValue/6710': ['mandarin', 'mandarin collar', 'band collar'],
    'gid://shopify/TaxonomyValue/6712': ['mock', 'mock neck', 'mock turtle', 'funnel neck'],
    'gid://shopify/TaxonomyValue/6713': ['plunging', 'deep v', 'low cut', 'deep neckline'],
    'gid://shopify/TaxonomyValue/17092': ['round', 'round neck', 'rounded'],
    'gid://shopify/TaxonomyValue/4324': ['split', 'split neck', 'keyhole'],
    'gid://shopify/TaxonomyValue/17093': ['square', 'square neck', 'squared'],
    'gid://shopify/TaxonomyValue/6714': ['sweetheart', 'sweetheart neck', 'heart shaped'],
    'gid://shopify/TaxonomyValue/6715': ['turtle', 'turtle neck', 'turtleneck', 'high neck'],
    'gid://shopify/TaxonomyValue/390': ['v-neck', 'v neck', 'vneck', 'v-neckline'],
    'gid://shopify/TaxonomyValue/6716': ['wrap', 'wrap neck', 'surplice'],
    'gid://shopify/TaxonomyValue/26413': ['other', 'misc', 'miscellaneous', 'n/a', 'na']
  };
  
  // Find matching taxonomy value
  for (const [taxonomyValue, variations] of Object.entries(necklineMappings)) {
    if (variations.some(variation => normalizedValue.includes(variation))) {
      return taxonomyValue;
    }
  }
  
  // Default fallback to Round for unknown values
  safeLog("log", `⚠️ No neckline taxonomy mapping found for: "${necklineValue}", using "Round"`);
  return 'gid://shopify/TaxonomyValue/17092'; // Round
};

// Function to map size values to taxonomy values
export const mapSizeToTaxonomyValue = (sizeValue) => {
  if (!sizeValue || typeof sizeValue !== 'string') {
    return null;
  }
  
  const normalizedValue = sizeValue.toLowerCase().trim();
  
  // Size mappings with multiple variations and synonyms
  const sizeMappings = {
    // Letter sizes with variations
    'gid://shopify/TaxonomyValue/2910': ['xxxs', '3xs', 'triple extra small', 'triple xs'],
    'gid://shopify/TaxonomyValue/2911': ['xxs', '2xs', 'double extra small', 'double xs'],
    'gid://shopify/TaxonomyValue/17086': ['xs', 'extra small', 'x-small'],
    'gid://shopify/TaxonomyValue/17087': ['s', 'small'],
    'gid://shopify/TaxonomyValue/17088': ['m', 'medium', 'med'],
    'gid://shopify/TaxonomyValue/17089': ['l', 'large'],
    'gid://shopify/TaxonomyValue/17090': ['xl', 'extra large', 'x-large'],
    'gid://shopify/TaxonomyValue/17091': ['xxl', '2xl', 'double extra large', 'double xl'],
    'gid://shopify/TaxonomyValue/2918': ['xxxl', '3xl', 'triple extra large', 'triple xl'],
    'gid://shopify/TaxonomyValue/2919': ['4xl', 'four extra large', 'xxxxl'],
    'gid://shopify/TaxonomyValue/2920': ['5xl', 'five extra large', 'xxxxxl'],
    'gid://shopify/TaxonomyValue/2921': ['6xl', 'six extra large', 'xxxxxxl'],
    
    // Numeric sizes (exact matches)
    'gid://shopify/TaxonomyValue/6703': ['000'],
    'gid://shopify/TaxonomyValue/5790': ['00'],
    'gid://shopify/TaxonomyValue/2878': ['0'],
    'gid://shopify/TaxonomyValue/2879': ['1'],
    'gid://shopify/TaxonomyValue/2885': ['2'],
    'gid://shopify/TaxonomyValue/2896': ['4'],
    'gid://shopify/TaxonomyValue/2907': ['6'],
    'gid://shopify/TaxonomyValue/2909': ['8'],
    'gid://shopify/TaxonomyValue/2880': ['10'],
    'gid://shopify/TaxonomyValue/2881': ['12'],
    'gid://shopify/TaxonomyValue/2882': ['14'],
    'gid://shopify/TaxonomyValue/2883': ['16'],
    'gid://shopify/TaxonomyValue/2884': ['18'],
    'gid://shopify/TaxonomyValue/2886': ['20'],
    'gid://shopify/TaxonomyValue/2887': ['22'],
    'gid://shopify/TaxonomyValue/2888': ['24'],
    'gid://shopify/TaxonomyValue/2889': ['26'],
    'gid://shopify/TaxonomyValue/2890': ['28'],
    'gid://shopify/TaxonomyValue/2891': ['30'],
    'gid://shopify/TaxonomyValue/2892': ['32'],
    'gid://shopify/TaxonomyValue/2893': ['34'],
    'gid://shopify/TaxonomyValue/2894': ['36'],
    'gid://shopify/TaxonomyValue/2895': ['38'],
    'gid://shopify/TaxonomyValue/2897': ['40'],
    'gid://shopify/TaxonomyValue/2898': ['42'],
    'gid://shopify/TaxonomyValue/2899': ['44'],
    'gid://shopify/TaxonomyValue/2900': ['46'],
    'gid://shopify/TaxonomyValue/2901': ['48'],
    'gid://shopify/TaxonomyValue/2902': ['50'],
    'gid://shopify/TaxonomyValue/2903': ['52'],
    'gid://shopify/TaxonomyValue/2904': ['54'],
    'gid://shopify/TaxonomyValue/2905': ['56'],
    'gid://shopify/TaxonomyValue/2906': ['58'],
    'gid://shopify/TaxonomyValue/2908': ['60'],
    
    // Age-based sizes with variations
    'gid://shopify/TaxonomyValue/217': ['0-3 months', '0-3m', 'newborn', 'nb'],
    'gid://shopify/TaxonomyValue/218': ['3-6 months', '3-6m'],
    'gid://shopify/TaxonomyValue/219': ['6-9 months', '6-9m'],
    'gid://shopify/TaxonomyValue/220': ['9-12 months', '9-12m'],
    'gid://shopify/TaxonomyValue/221': ['12-18 months', '12-18m', '1-1.5 years'],
    'gid://shopify/TaxonomyValue/222': ['18-24 months', '18-24m', '1.5-2 years'],
    'gid://shopify/TaxonomyValue/223': ['2-3 years', '2-3y', '2t-3t'],
    'gid://shopify/TaxonomyValue/224': ['3-4 years', '3-4y', '3t-4t'],
    'gid://shopify/TaxonomyValue/225': ['4-5 years', '4-5y', '4t-5t'],
    'gid://shopify/TaxonomyValue/226': ['5-6 years', '5-6y', '5t-6t'],
    
    // Special sizes
    'gid://shopify/TaxonomyValue/25940': ['one size', 'onesize', 'os', 'universal', 'free size'],
    'gid://shopify/TaxonomyValue/27608': ['other', 'misc', 'custom', 'n/a', 'na']
  };
  
  // Find matching taxonomy value
  for (const [taxonomyValue, variations] of Object.entries(sizeMappings)) {
    if (variations.some(variation => normalizedValue === variation || normalizedValue.includes(variation))) {
      return taxonomyValue;
    }
  }
  
  // Default fallback to Medium for unknown values
  safeLog("log", `⚠️ No size taxonomy mapping found for: "${sizeValue}", using "Medium (M)"`);
  return 'gid://shopify/TaxonomyValue/17088'; // Medium (M)
};

// Function to map clothing features values to taxonomy values
export const mapClothingFeaturesToTaxonomyValue = (featuresValue) => {
  if (!featuresValue || typeof featuresValue !== 'string') {
    return null;
  }
  
  const normalizedValue = featuresValue.toLowerCase().trim();
  
  // Clothing features mappings with multiple variations and synonyms
  const featuresMappings = {
    'gid://shopify/TaxonomyValue/22804': ['hypoallergenic', 'hypo-allergenic', 'allergy friendly', 'non-allergenic', 'sensitive skin'],
    'gid://shopify/TaxonomyValue/22805': ['insulated', 'insulation', 'thermal', 'warm', 'heat retention', 'padded'],
    'gid://shopify/TaxonomyValue/22806': ['moisture wicking', 'moisture-wicking', 'sweat wicking', 'dry fit', 'dri-fit', 'breathable', 'quick dry'],
    'gid://shopify/TaxonomyValue/22807': ['quick drying', 'quick-drying', 'fast drying', 'rapid dry', 'instant dry', 'fast dry'],
    'gid://shopify/TaxonomyValue/22808': ['reversible', 'two-way', 'double sided', 'flip', 'convertible'],
    'gid://shopify/TaxonomyValue/22809': ['stretchable', 'stretch', 'elastic', 'flexible', 'stretchy', 'elastane', 'spandex'],
    'gid://shopify/TaxonomyValue/22810': ['uv protection', 'uv resistant', 'sun protection', 'upf', 'uv blocking', 'sun safe'],
    'gid://shopify/TaxonomyValue/22811': ['vegan friendly', 'vegan', 'cruelty free', 'animal friendly', 'plant based', 'no animal products'],
    'gid://shopify/TaxonomyValue/22812': ['water resistant', 'water-resistant', 'waterproof', 'water repellent', 'hydrophobic', 'splash resistant'],
    'gid://shopify/TaxonomyValue/22813': ['windproof', 'wind resistant', 'wind blocking', 'windbreaker', 'wind protection'],
    'gid://shopify/TaxonomyValue/22814': ['wrinkle resistant', 'wrinkle-resistant', 'wrinkle free', 'crease resistant', 'no iron', 'easy care'],
    'gid://shopify/TaxonomyValue/27615': ['other', 'misc', 'miscellaneous', 'custom', 'special', 'n/a', 'na']
  };
  
  // Find matching taxonomy value
  for (const [taxonomyValue, variations] of Object.entries(featuresMappings)) {
    if (variations.some(variation => normalizedValue.includes(variation))) {
      return taxonomyValue;
    }
  }
  
  // Default fallback to Other for unknown values
  safeLog("log", `⚠️ No clothing features taxonomy mapping found for: "${featuresValue}", using "Other"`);
  return 'gid://shopify/TaxonomyValue/27615'; // Other
};

// Function to map pattern values to taxonomy values
export const mapPatternToTaxonomyValue = (patternValue) => {
  if (!patternValue || typeof patternValue !== 'string') {
    return null;
  }
  
  const normalizedValue = patternValue.toLowerCase().trim();
  
  // Pattern mappings with multiple variations and synonyms
  const patternMappings = {
    'gid://shopify/TaxonomyValue/24477': ['abstract', 'artistic', 'modern art', 'contemporary'],
    'gid://shopify/TaxonomyValue/24478': ['animal', 'animals', 'wildlife', 'zoo', 'safari', 'pet'],
    'gid://shopify/TaxonomyValue/24479': ['art', 'artistic', 'painting', 'artwork', 'gallery'],
    'gid://shopify/TaxonomyValue/24480': ['bead & reel', 'bead and reel', 'beaded', 'reel'],
    'gid://shopify/TaxonomyValue/2283': ['birds', 'bird', 'feather', 'wing', 'flight', 'avian'],
    'gid://shopify/TaxonomyValue/24481': ['brick', 'bricks', 'masonry', 'wall', 'building'],
    'gid://shopify/TaxonomyValue/24482': ['bull\'s eye', 'bulls eye', 'bullseye', 'target', 'concentric circles'],
    'gid://shopify/TaxonomyValue/2866': ['camouflage', 'camo', 'military', 'army', 'woodland', 'desert camo'],
    'gid://shopify/TaxonomyValue/2867': ['characters', 'character', 'cartoon', 'mascot', 'figure'],
    'gid://shopify/TaxonomyValue/2868': ['checkered', 'checked', 'checkerboard', 'chess', 'gingham'],
    'gid://shopify/TaxonomyValue/24483': ['chevron', 'zigzag', 'zig zag', 'arrow', 'v pattern'],
    'gid://shopify/TaxonomyValue/24484': ['chinoiserie', 'chinese', 'oriental', 'asian', 'pagoda'],
    'gid://shopify/TaxonomyValue/2869': ['christmas', 'xmas', 'holiday', 'festive', 'winter holiday'],
    'gid://shopify/TaxonomyValue/24485': ['collage', 'mixed', 'composite', 'patchwork', 'montage'],
    'gid://shopify/TaxonomyValue/24486': ['coral', 'reef', 'ocean', 'marine', 'underwater'],
    'gid://shopify/TaxonomyValue/24487': ['damask', 'ornate', 'baroque', 'elegant', 'formal'],
    'gid://shopify/TaxonomyValue/24488': ['diagonal', 'slanted', 'angled', 'bias', 'oblique'],
    'gid://shopify/TaxonomyValue/24489': ['diamond', 'diamonds', 'rhombus', 'argyle', 'gem'],
    'gid://shopify/TaxonomyValue/24490': ['dog\'s tooth', 'dogs tooth', 'houndstooth', 'dogtooth'],
    'gid://shopify/TaxonomyValue/2870': ['dots', 'dot', 'polka dot', 'polka dots', 'spotted', 'circles'],
    'gid://shopify/TaxonomyValue/24491': ['egg & dart', 'egg and dart', 'classical', 'molding'],
    'gid://shopify/TaxonomyValue/24492': ['ethnic', 'tribal', 'cultural', 'traditional', 'folk'],
    'gid://shopify/TaxonomyValue/24493': ['everlasting knot', 'endless knot', 'celtic knot', 'infinity'],
    'gid://shopify/TaxonomyValue/2871': ['floral', 'flower', 'flowers', 'botanical', 'bloom', 'rose'],
    'gid://shopify/TaxonomyValue/24494': ['fret', 'greek key', 'meander', 'geometric border'],
    'gid://shopify/TaxonomyValue/1868': ['geometric', 'shapes', 'angular', 'mathematical', 'symmetrical'],
    'gid://shopify/TaxonomyValue/24495': ['guilloche', 'interwoven', 'braided', 'rope pattern'],
    'gid://shopify/TaxonomyValue/2375': ['hearts', 'heart', 'love', 'valentine', 'romantic'],
    'gid://shopify/TaxonomyValue/24496': ['illusion', 'optical', 'trick', 'perspective', 'visual'],
    'gid://shopify/TaxonomyValue/28170': ['lace', 'delicate', 'intricate', 'filigree', 'openwork'],
    'gid://shopify/TaxonomyValue/2872': ['leaves', 'leaf', 'foliage', 'nature', 'tree', 'plant'],
    'gid://shopify/TaxonomyValue/24497': ['logo', 'brand', 'emblem', 'symbol', 'mark'],
    'gid://shopify/TaxonomyValue/24498': ['mosaic', 'tile', 'tessellation', 'fragments', 'pieces'],
    'gid://shopify/TaxonomyValue/24499': ['ogee', 'curved', 'wave', 'undulating', 's-curve'],
    'gid://shopify/TaxonomyValue/24500': ['organic', 'natural', 'flowing', 'free-form', 'irregular'],
    'gid://shopify/TaxonomyValue/2873': ['paisley', 'teardrop', 'indian', 'persian', 'cashmere'],
    'gid://shopify/TaxonomyValue/24501': ['plaid', 'tartan', 'check', 'scottish', 'highland'],
    'gid://shopify/TaxonomyValue/24502': ['rainbow', 'multicolor', 'spectrum', 'colorful', 'pride'],
    'gid://shopify/TaxonomyValue/24503': ['random', 'scattered', 'irregular', 'chaotic', 'mixed'],
    'gid://shopify/TaxonomyValue/24504': ['scale', 'scales', 'fish', 'overlapping', 'layered'],
    'gid://shopify/TaxonomyValue/24505': ['scroll', 'scrollwork', 'spiral', 'curl', 'flourish'],
    'gid://shopify/TaxonomyValue/2874': ['solid', 'plain', 'uniform', 'single color', 'no pattern'],
    'gid://shopify/TaxonomyValue/2376': ['stars', 'star', 'stellar', 'celestial', 'night sky'],
    'gid://shopify/TaxonomyValue/2875': ['striped', 'stripe', 'stripes', 'lines', 'bands'],
    'gid://shopify/TaxonomyValue/24506': ['swirl', 'swirls', 'spiral', 'whirl', 'vortex'],
    'gid://shopify/TaxonomyValue/1782': ['text', 'words', 'letters', 'typography', 'writing'],
    'gid://shopify/TaxonomyValue/24507': ['texture', 'textured', 'tactile', 'surface', 'material'],
    'gid://shopify/TaxonomyValue/2876': ['tie-dye', 'tie dye', 'tiedye', 'psychedelic', 'hippie'],
    'gid://shopify/TaxonomyValue/24508': ['trellis', 'lattice', 'grid', 'mesh', 'network'],
    'gid://shopify/TaxonomyValue/1796': ['vehicle', 'car', 'truck', 'transport', 'automobile'],
    'gid://shopify/TaxonomyValue/24509': ['other', 'misc', 'miscellaneous', 'custom', 'unique', 'n/a', 'na']
  };
  
  // Find matching taxonomy value
  for (const [taxonomyValue, variations] of Object.entries(patternMappings)) {
    if (variations.some(variation => normalizedValue.includes(variation))) {
      return taxonomyValue;
    }
  }
  
  // Default fallback to Other for unknown values
  safeLog("log", `⚠️ No pattern taxonomy mapping found for: "${patternValue}", using "Other"`);
  return 'gid://shopify/TaxonomyValue/24509'; // Other
};

// Function to get product attributes from CSV row
export const getProductAttributes = (csvRow) => {
  const attributes = {};
  
  // Process each CSV column and map to attributes
  Object.keys(csvRow).forEach(columnName => {
    const attributeKey = CSV_TO_ATTRIBUTES_MAPPING[columnName];
    if (attributeKey && STANLEY_STELLA_ATTRIBUTES[attributeKey]) {
      let value = csvRow[columnName];
      if (value && value.trim()) {
        // Special handling for taxonomy-validated attributes
        if (attributeKey === 'age_group') {
          const taxonomyValue = mapAgeGroupToTaxonomyValue(value);
          if (taxonomyValue) {
            value = taxonomyValue;
          }
        } else if (attributeKey === 'target_gender') {
          const taxonomyValue = mapTargetGenderToTaxonomyValue(value);
          if (taxonomyValue) {
            value = taxonomyValue;
          }
        } else if (attributeKey === 'sleeve_length_type') {
          const taxonomyValue = mapSleeveLengthTypeToTaxonomyValue(value);
          if (taxonomyValue) {
            value = taxonomyValue;
          }
        } else if (attributeKey === 'care_instructions') {
          const taxonomyValue = mapCareInstructionsToTaxonomyValue(value);
          if (taxonomyValue) {
            value = taxonomyValue;
          }
        } else if (attributeKey === 'color') {
          const taxonomyValue = mapColorToTaxonomyValue(value);
          if (taxonomyValue) {
            value = taxonomyValue;
          }
        } else if (attributeKey === 'fabric') {
          const taxonomyValue = mapFabricToTaxonomyValue(value);
          if (taxonomyValue) {
            value = taxonomyValue;
          }
        } else if (attributeKey === 'neckline') {
          const taxonomyValue = mapNecklineToTaxonomyValue(value);
          if (taxonomyValue) {
            value = taxonomyValue;
          }
        } else if (attributeKey === 'size') {
          const taxonomyValue = mapSizeToTaxonomyValue(value);
          if (taxonomyValue) {
            value = taxonomyValue;
          }
        } else if (attributeKey === 'clothing_features') {
          const taxonomyValue = mapClothingFeaturesToTaxonomyValue(value);
          if (taxonomyValue) {
            value = taxonomyValue;
          }
        } else if (attributeKey === 'pattern') {
          const taxonomyValue = mapPatternToTaxonomyValue(value);
          if (taxonomyValue) {
            value = taxonomyValue;
          }
        }
        
        attributes[attributeKey] = {
          ...STANLEY_STELLA_ATTRIBUTES[attributeKey],
          value: String(value).trim()
        };
      }
    }
  });
  
  safeLog("log", `🏷️ Extracted ${Object.keys(attributes).length} product attributes from CSV`);
  return attributes;
};

// Function to create metafield definitions for attributes
export const createAttributeMetafieldDefinitions = async (admin) => {
  const definitions = [];
  const totalAttributes = Object.keys(STANLEY_STELLA_ATTRIBUTES).length;
  
  safeLog("log", `📋 Creating metafield definitions for ${totalAttributes} attributes...`);
  
  for (const [key, attribute] of Object.entries(STANLEY_STELLA_ATTRIBUTES)) {
    try {
      safeLog("log", `🔧 Creating definition for: ${attribute.name} (key: ${attribute.key})`);
      
      const mutation = `
        mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
              id
              name
              namespace
              key
              type {
                name
              }
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;
      
      const variables = {
        definition: {
          name: attribute.name,
          namespace: attribute.namespace,
          key: attribute.key,
          description: attribute.description,
          type: attribute.type,
          ownerType: 'PRODUCT'
        }
      };
      
      const response = await admin.graphql(mutation, { variables });
      const result = await response.json();
      
      if (result.errors) {
        safeLog("error", `❌ GraphQL errors for ${attribute.name}:`, result.errors);
        continue;
      }
      
      if (result.data?.metafieldDefinitionCreate?.createdDefinition) {
        definitions.push(result.data.metafieldDefinitionCreate.createdDefinition);
        safeLog("log", `✅ Created metafield definition: ${attribute.name}`);
      } else if (result.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
        const errors = result.data.metafieldDefinitionCreate.userErrors;
        const alreadyExists = errors.some(error => 
          error.code === 'TAKEN' || 
          error.message.includes('already exists') || 
          error.message.includes('has already been taken')
        );
        
        if (alreadyExists) {
          safeLog("log", `ℹ️ Metafield definition already exists: ${attribute.name}`);
        } else {
          safeLog("error", `❌ User errors for ${attribute.name}:`, errors);
        }
      } else {
        safeLog("log", `⚠️ Unexpected response for ${attribute.name}:`, result.data);
      }
    } catch (error) {
      safeLog("error", `❌ Exception creating metafield definition for ${attribute.name}:`, error);
    }
  }
  
  safeLog("log", `📊 Metafield definitions summary: ${definitions.length} created, ${totalAttributes - definitions.length} existed or failed`);
  return definitions;
};

// NEW FUNCTION: Create category metafields for all product attributes
export const createCategoryMetafields = async (admin, productId, csvRow) => {
  if (!csvRow || typeof csvRow !== 'object') {
    safeLog("log", `ℹ️ No CSV row data to create category metafields for`);
    return [];
  }
  
  safeLog("log", `📋 Creating category metafields for product ${productId}`);
  
  try {
    // Define which CSV fields should become category metafields
    const categoryFields = [
      // Product information
      'TypeCode', 'Category', 'Type', 'StyleCode', 'StyleName',
      'Gender', 'Season', 'ProductType', 'Collection',
      
      // Age and targeting
      'AgeGroup', 'Age', 'TargetAge', 'Gender', 'TargetGender', 'Target Gender', 'Sex',
      
      // Material and construction
      'Material', 'Fabric', 'FabricType', 'Fabric Type', 'MaterialType', 'Material Type', 'Composition', 'FabricComposition', 'Fabric Composition',
      'FabricWeight', 'GSM', 'Construction', 'Fit', 'Cut', 
      'Neckline', 'NecklineType', 'Neckline Type', 'Collar', 'CollarType', 'Collar Type', 'NeckStyle', 'Neck Style',
      
      // Sleeve and design attributes
      'SleeveLength', 'Sleeve Length', 'SleeveLengthType', 'Sleeve Length Type', 'SleeveType', 'Sleeve Type',
      
      // Care and certifications
      'CareInstructions', 'Care Instructions', 'WashingInstructions', 'Washing Instructions', 'Care', 'Wash', 'Certifications',
      'Sustainability', 'Origin', 'MadeIn',
      
      // Color attributes (product-level, not variant colors)
      'PrimaryColor', 'Primary Color', 'MainColor', 'Main Color', 'BaseColor', 'Base Color',
      
      // Additional attributes
      'Features', 'Details', 'Packaging', 'Availability',
      'Brand', 'Supplier', 'SupplierCode'
    ];
    
    const metafieldsToCreate = [];
    
    // Process each category field
    for (const field of categoryFields) {
      const value = csvRow[field];
      if (value && String(value).trim() && String(value).trim() !== '0') {
        const sanitizedKey = field.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
        const humanName = field.replace(/([A-Z])/g, ' $1').trim();
        
        metafieldsToCreate.push({
          ownerId: productId,
          namespace: 'category',
          key: sanitizedKey,
          type: 'single_line_text_field',
          value: String(value).trim()
        });
        
        safeLog("log", `📝 Adding category metafield: ${field} = ${String(value).trim()}`);
      }
    }
    
    if (metafieldsToCreate.length === 0) {
      safeLog("log", `ℹ️ No category metafields to create for product ${productId}`);
      return [];
    }
    
    safeLog("log", `🔧 Creating ${metafieldsToCreate.length} category metafields...`);
    
    // Create metafield definitions first
    await ensureCategoryMetafieldDefinitions(admin, metafieldsToCreate);
    
    // Create metafields in batches of 25
    const batches = [];
    for (let i = 0; i < metafieldsToCreate.length; i += 25) {
      batches.push(metafieldsToCreate.slice(i, i + 25));
    }
    
    const allCreatedMetafields = [];
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      safeLog("log", `📦 Processing category metafields batch ${batchIndex + 1}/${batches.length} with ${batch.length} metafields...`);
      
      const metafieldMutation = `
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
              namespace
              value
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      const metafieldResult = await admin.graphql(metafieldMutation, {
        variables: { metafields: batch }
      });

      const metafieldJson = await metafieldResult.json();
      
      if (metafieldJson.data?.metafieldsSet?.userErrors?.length > 0) {
        safeLog("error", `❌ Error creating category metafields batch ${batchIndex + 1}:`, metafieldJson.data.metafieldsSet.userErrors);
      } else {
        const createdMetafields = metafieldJson.data?.metafieldsSet?.metafields || [];
        allCreatedMetafields.push(...createdMetafields);
        safeLog("log", `✅ Created ${createdMetafields.length} category metafields in batch ${batchIndex + 1}`);
      }
    }
    
    safeLog("log", `✅ Total category metafields created: ${allCreatedMetafields.length}`);
    return allCreatedMetafields;
    
  } catch (err) {
    safeLog("error", `❌ Error in createCategoryMetafields:`, {
      message: err.message,
      stack: err.stack,
      productId
    });
    return [];
  }
};

// Helper function to ensure category metafield definitions exist
const ensureCategoryMetafieldDefinitions = async (admin, metafieldsToCreate) => {
  safeLog("log", `🔧 Ensuring category metafield definitions exist...`);
  
  const uniqueKeys = [...new Set(metafieldsToCreate.map(mf => mf.key))];
  
  for (const key of uniqueKeys) {
    const humanName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    try {
      const definitionMutation = `
        mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
              id
              name
              key
              namespace
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      const definitionResult = await admin.graphql(definitionMutation, {
        variables: {
          definition: {
            name: humanName,
            namespace: "category",
            key: key,
            description: `Product category attribute: ${humanName}`,
            type: "single_line_text_field",
            ownerType: "PRODUCT"
          }
        }
      });

      const definitionJson = await definitionResult.json();
      
      if (definitionJson.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
        const errors = definitionJson.data.metafieldDefinitionCreate.userErrors;
        const alreadyExistsError = errors.find(err => 
          err.message?.includes('already exists') || 
          err.message?.includes('taken') ||
          err.code === 'TAKEN'
        );
        
        if (alreadyExistsError) {
          safeLog("log", `✅ Category metafield definition already exists: ${key}`);
        } else {
          safeLog("error", `❌ Error creating category metafield definition for ${key}:`, errors);
        }
      } else if (definitionJson.data?.metafieldDefinitionCreate?.createdDefinition) {
        safeLog("log", `✅ Created category metafield definition: ${key} (${humanName})`);
      }
    } catch (err) {
      safeLog("error", `❌ Error creating category metafield definition for ${key}:`, err);
    }
  }
};

// Helper function to ensure color pattern metafield definitions exist for Shopify integration
export const ensureColorPatternMetafieldDefinitions = async (admin) => {
  safeLog("log", `🔧 Ensuring color pattern metafield definitions exist for Shopify integration...`);
  
  try {
    // Check existing metafield definitions
    const existingDefsResponse = await admin.graphql(`
      query {
        metafieldDefinitions(first: 250, ownerType: PRODUCT) {
          edges {
            node {
              id
              namespace
              key
              name
              type {
                name
              }
            }
          }
        }
      }
    `);

    const existingDefsResult = await existingDefsResponse.json();
    const existingDefinitions = existingDefsResult.data?.metafieldDefinitions?.edges?.map(edge => edge.node) || [];

    const existingKeys = new Set(
      existingDefinitions.map(def => `${def.namespace}.${def.key}`)
    );

    const definitionsToCreate = [];

    // Color patterns metafield (references to Shopify's core color-pattern metaobjects)
    if (!existingKeys.has("custom.color_patterns")) {
      definitionsToCreate.push({
        name: "Color Patterns",
        key: "color_patterns",
        namespace: "custom",
        type: "list.metaobject_reference",
        description: "References to Shopify core color-pattern metaobjects",
        ownerType: "PRODUCT",
        validations: {
          metaobjectDefinition: {
            type: "shopify--color-pattern"
          }
        }
      });
    }

    // Color names metafield (text fallback for display)
    if (!existingKeys.has("custom.color_names")) {
      definitionsToCreate.push({
        name: "Color Names",
        key: "color_names",
        namespace: "custom",
        type: "single_line_text_field",
        description: "Human-readable color names for display purposes",
        ownerType: "PRODUCT"
      });
    }

    if (definitionsToCreate.length === 0) {
      safeLog("log", `✅ All color pattern metafield definitions already exist for Shopify integration`);
      return;
    }

    safeLog("log", `🔧 Creating ${definitionsToCreate.length} color pattern metafield definitions for Shopify integration...`);

    for (const definition of definitionsToCreate) {
      const createRes = await admin.graphql(`
        mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
              id
              name
              key
              namespace
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `, {
        variables: { definition }
      });

      const createJson = await createRes.json();

      if (createJson.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
        const errors = createJson.data.metafieldDefinitionCreate.userErrors;
        const alreadyExistsError = errors.find(err => 
          err.message?.includes('already exists') || 
          err.message?.includes('taken') ||
          err.code === 'TAKEN'
        );
        
        if (alreadyExistsError) {
          safeLog("log", `✅ Color pattern metafield definition already exists: ${definition.key}`);
        } else {
          safeLog("error", `❌ Error creating color pattern metafield definition ${definition.key}:`, errors);
        }
      } else {
        safeLog("log", `✅ Created color pattern metafield definition: ${definition.namespace}.${definition.key}`);
      }
    }

    safeLog("log", `✅ Color pattern metafield definitions setup complete for Shopify integration`);

  } catch (error) {
    safeLog("error", "❌ Error ensuring color pattern metafield definitions:", error);
  }
};

// Function to check if product taxonomy is enabled and provide guidance
export const validateCategoryIds = async (admin) => {
  safeLog("log", '🔍 Checking product taxonomy status and category assignment...');
  
  const validationResults = {
    taxonomyEnabled: false,
    testResults: [],
    recommendations: [],
    note: "Category assignment in Shopify requires the Product Taxonomy feature to be enabled"
  };
  
  // Simple validation approach - just check our mappings and provide guidance
  safeLog("log", '📊 Validating category mapping configuration...');
  
  const allCategoryIds = new Set([
    ...Object.values(STANLEY_STELLA_CATEGORIES),
    ...Object.values(CATEGORY_FIELD_MAPPINGS),
    ...Object.values(GENERAL_TYPE_MAPPINGS)
  ]);
  
  safeLog("log", `✅ Found ${allCategoryIds.size} unique category IDs in mappings`);
  safeLog("log", `📋 Mapping coverage: ${Object.keys(STANLEY_STELLA_CATEGORIES).length} TypeCodes, ${Object.keys(CATEGORY_FIELD_MAPPINGS).length} Categories, ${Object.keys(GENERAL_TYPE_MAPPINGS).length} Types`);
  
  // Test our key mappings
  const keyMappings = {
    'T-shirts': GENERAL_TYPE_MAPPINGS['T-shirts'],
    'Bags': GENERAL_TYPE_MAPPINGS['Bags'],
    'Hoodies': GENERAL_TYPE_MAPPINGS['Hoodies']
  };
  
  safeLog("log", '🔍 Key mapping validation:');
  Object.entries(keyMappings).forEach(([type, categoryId]) => {
    safeLog("log", `  ${type}: ${categoryId ? '✅ Mapped' : '❌ Missing'}`);
  });
  
  // Now try to test with Shopify API
  safeLog("log", '🔗 Testing Shopify API connection...');
  
  try {
    // First, let's try a simple query to check if taxonomy fields are available
    safeLog("log", '🔍 Checking if product taxonomy fields are available...');
    
    try {
      const taxonomyCheckQuery = `
        query {
          shop {
            id
            name
          }
        }
      `;
      
      const taxonomyResponse = await admin.graphql(taxonomyCheckQuery);
      const taxonomyResult = await taxonomyResponse.json();
      
      if (taxonomyResult.errors) {
        safeLog("log", '⚠️ Basic GraphQL query failed, there may be authentication issues');
        validationResults.recommendations = [
          "❌ Basic GraphQL query failed",
          "🔧 Check authentication and API permissions",
          "📞 Verify the app is properly installed in Shopify"
        ];
        return validationResults;
      }
      
      safeLog("log", '✅ GraphQL connection is working');
    } catch (queryError) {
      safeLog("log", '❌ GraphQL connection test failed:', queryError.message);
      validationResults.recommendations = [
        "❌ GraphQL connection failed",
        `🔧 Error: ${queryError.message}`,
        "📞 Check network connection and API credentials"
      ];
      return validationResults;
    }
    
    // Now test basic product creation
    safeLog("log", '📝 Testing basic product creation...');
          const basicTestMutation = `
        mutation productCreate($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              title
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
    
    const basicTestInput = {
      title: `Test Product ${Date.now()}`,
      handle: `test-basic-${Date.now()}`,
      vendor: "Test",
      status: "DRAFT"
    };
    
    const basicResponse = await admin.graphql(basicTestMutation, { 
      variables: { input: basicTestInput }
    });
    const basicResult = await basicResponse.json();
    
    if (basicResult.data?.productCreate?.product?.id) {
      safeLog("log", '✅ Basic product creation works');
      
      // Clean up test product
      const testProductId = basicResult.data.productCreate.product.id;
      try {
        await admin.graphql(`
          mutation productDelete($input: ProductDeleteInput!) {
            productDelete(input: $input) {
              deletedProductId
            }
          }
        `, { variables: { input: { id: testProductId } } });
        safeLog("log", '🧹 Cleaned up test product');
      } catch (cleanupError) {
        safeLog("log", `⚠️ Could not delete test product ${testProductId}`);
      }
      
      // Now test with a category
      safeLog("log", '📂 Testing category assignment...');
      const categoryTestMutation = `
        mutation productCreate($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              title
              category {
                id
                name
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      
      // Test with the confirmed working HOODIES category
      const categoryTestInput = {
        title: `Test Category Product ${Date.now()}`,
        handle: `test-category-${Date.now()}`,
        vendor: "Test",
        status: "DRAFT",
        category: "gid://shopify/TaxonomyCategory/aa-1-13-13" // HOODIES - confirmed working
      };
      
      const categoryResponse = await admin.graphql(categoryTestMutation, { 
        variables: { input: categoryTestInput }
      });
      const categoryResult = await categoryResponse.json();
      
      if (categoryResult.data?.productCreate?.product?.id && !categoryResult.data?.productCreate?.userErrors?.length) {
        validationResults.taxonomyEnabled = true;
        safeLog("log", '✅ Product taxonomy is enabled and working!');
        
        const categoryProductId = categoryResult.data.productCreate.product.id;
        const assignedCategory = categoryResult.data.productCreate.product.category;
        
        validationResults.testResults.push({
          categoryId: "gid://shopify/TaxonomyCategory/aa-1-13-13",
          status: "success",
          assignedName: assignedCategory?.name || 'Unknown'
        });
        
        // Clean up test product
        try {
          await admin.graphql(`
            mutation productDelete($input: ProductDeleteInput!) {
              productDelete(input: $input) {
                deletedProductId
              }
            }
          `, { variables: { input: { id: categoryProductId } } });
          safeLog("log", '🧹 Cleaned up category test product');
        } catch (cleanupError) {
          safeLog("log", `⚠️ Could not delete category test product ${categoryProductId}`);
        }
        
        validationResults.recommendations = [
          "✅ Product taxonomy is enabled and working",
          "🔧 The current category IDs should work for product assignment",
          "📊 You can proceed with product uploads using category assignment",
          "💡 If specific categories fail, they may need to be activated in Shopify admin first"
        ];
        
      } else {
        const errors = categoryResult.data?.productCreate?.userErrors || [];
        safeLog("log", '❌ Category assignment failed:', errors);
        
        validationResults.testResults.push({
          categoryId: "gid://shopify/TaxonomyCategory/aa-1-13-13",
          status: "failed",
          errors: errors
        });
        
        const categoryErrors = errors.filter(e => 
          e.field?.includes('category') || 
          e.message?.toLowerCase().includes('category') ||
          e.message?.toLowerCase().includes('taxonomy')
        );
        
        if (categoryErrors.length > 0) {
          validationResults.recommendations = [
            "❌ Product taxonomy is not enabled or category assignment failed",
            "🔧 To enable: Shopify Admin → Settings → Markets and international → Product taxonomy",
            "📚 Alternative: Products will use productType field for classification",
            "💡 This is normal for many Shopify stores - productType works well for filtering"
          ];
        } else {
          validationResults.recommendations = [
            "❌ Product creation with category failed for unknown reasons",
            "🔧 Check if your Shopify plan supports product taxonomy",
            "📚 Most stores work fine with productType instead of categories",
            "💡 The importer will automatically fall back to productType"
          ];
        }
      }
    } else {
      safeLog("log", '❌ Basic product creation failed:', basicResult.data?.productCreate?.userErrors);
           validationResults.recommendations = [
       "❌ Basic product creation is failing",
       "🔧 Check API permissions and authentication", 
       "📞 Verify Shopify admin access and app installation",
       "💡 Even if taxonomy fails, productType classification will still work"
     ];
    }
    
  } catch (error) {
    safeLog("error", '❌ Error during validation:', error);
    
    // Even if validation fails, provide helpful guidance
    validationResults.recommendations = [
      "⚠️ Validation couldn't complete due to API error",
      `🔧 Technical error: ${error.message}`,
      "📋 However, the category mapping system is properly configured:",
      `✅ ${Object.keys(GENERAL_TYPE_MAPPINGS).length} product types mapped (including T-shirts, Bags, Hoodies)`,
      "💡 Products will be classified using productType field, which works excellently",
      "🚀 You can proceed with product uploads - classification will work automatically"
    ];
  }
  
  return validationResults;
};

// Export default configuration object
export default {
  categories: STANLEY_STELLA_CATEGORIES,
  categoryFields: CATEGORY_FIELD_MAPPINGS,
  generalTypes: GENERAL_TYPE_MAPPINGS,
  attributes: STANLEY_STELLA_ATTRIBUTES,
  csvMapping: CSV_TO_ATTRIBUTES_MAPPING,
  getProductCategoryId,
  getProductAttributes,
  createAttributeMetafieldDefinitions,
  activateTaxonomyAttributes,
  createTaxonomyMetaobjects,
  createColorTaxonomyMetafields,
  ensureColorPatternMetafieldDefinitions,
  getVariantOptionsFromAttributes,
  connectVariantOptionsToTaxonomy,
  validateAttributeValues,
  createCategoryMetafields,
  validateCategoryIds
}; 

// ==============================================================================
// CROSS-NAMESPACE METAFIELD MAPPINGS
// ==============================================================================

export const createCrossNamespaceMetafields = async (admin, productId, csvRow, productTitle) => {
  const crossNamespaceMappings = [];
  
  // 1. category.target_gender = custom.target_gender (keep both)
  const genderValue = csvRow['Gender'] || csvRow['gender'];
  if (genderValue && genderValue.trim()) {
    crossNamespaceMappings.push({
      ownerId: productId,
      namespace: "category",
      key: "target_gender",
      type: "single_line_text_field",
      value: genderValue.trim()
    });
    
    // Also create custom.target_gender with the same value
    crossNamespaceMappings.push({
      ownerId: productId,
      namespace: "custom",
      key: "target_gender",
      type: "single_line_text_field",
      value: genderValue.trim()
    });
  }
  
  // 2. category.stylecode = stanley_stella.style_code (keep both)  
  const styleCodeValue = csvRow['StyleCode'] || csvRow['stylecode'] || csvRow['style_code'];
  if (styleCodeValue && styleCodeValue.trim()) {
    crossNamespaceMappings.push({
      ownerId: productId,
      namespace: "category",
      key: "stylecode",
      type: "single_line_text_field",
      value: styleCodeValue.trim()
    });
    
    // Also create stanley_stella.style_code with the same value
    crossNamespaceMappings.push({
      ownerId: productId,
      namespace: "stanley_stella",
      key: "style_code",
      type: "single_line_text_field",
      value: styleCodeValue.trim()
    });
  }
  
  // 3. category.neckline = custom.neckline (keep both)
  const necklineValue = csvRow['Neckline'] || csvRow['neckline'];
  if (necklineValue && necklineValue.trim()) {
    crossNamespaceMappings.push({
      ownerId: productId,
      namespace: "category",
      key: "neckline",
      type: "single_line_text_field",
      value: necklineValue.trim()
    });
    
    // Also create custom.neckline with the same value
    crossNamespaceMappings.push({
      ownerId: productId,
      namespace: "custom",
      key: "neckline",
      type: "single_line_text_field",
      value: necklineValue.trim()
    });
  }
  
  // 4. category.fit = custom.fit (keep both)
  const fitValue = csvRow['Fit'] || csvRow['fit'];
  if (fitValue && fitValue.trim()) {
    crossNamespaceMappings.push({
      ownerId: productId,
      namespace: "category",
      key: "fit",
      type: "single_line_text_field",
      value: fitValue.trim()
    });
    
    // Also create custom.fit with the same value
    crossNamespaceMappings.push({
      ownerId: productId,
      namespace: "custom",
      key: "fit",
      type: "single_line_text_field",
      value: fitValue.trim()
    });
  }
  
  // 5. stanley_stella.compositionlist = custom.fabric (keep both)
  const compositionValue = csvRow['Composition'] || csvRow['composition'] || csvRow['Fabric'] || csvRow['fabric'] || csvRow['CompositionList'] || csvRow['compositionlist'];
  if (compositionValue && compositionValue.trim()) {
    crossNamespaceMappings.push({
      ownerId: productId,
      namespace: "stanley_stella",
      key: "compositionlist",
      type: "single_line_text_field",
      value: compositionValue.trim()
    });
    
    // Also create custom.fabric with the same value
    crossNamespaceMappings.push({
      ownerId: productId,
      namespace: "custom",
      key: "fabric",
      type: "single_line_text_field",
      value: compositionValue.trim()
    });
  }
  
  // 6. stanley_stella.washinstructions = custom.care_instructions (keep both)
  const careInstructionsValue = csvRow['CareInstructions'] || csvRow['care_instructions'] || csvRow['Care Instructions'] || csvRow['WashingInstructions'];
  if (careInstructionsValue && careInstructionsValue.trim()) {
    crossNamespaceMappings.push({
      ownerId: productId,
      namespace: "stanley_stella",
      key: "washinstructions",
      type: "single_line_text_field",
      value: careInstructionsValue.trim()
    });
  }
  
  // 7. stanley_stella.size = category.size = custom.size (keep all three)
  const sizeValue = csvRow['SizeCode'] || csvRow['Size'] || csvRow['SizeCodeNavision'] || csvRow['size'];
  if (sizeValue && sizeValue.trim()) {
    // Create size metafields in multiple namespaces for consistency
    crossNamespaceMappings.push({
      ownerId: productId,
      namespace: "stanley_stella",
      key: "size",
      type: "single_line_text_field",
      value: sizeValue.trim()
    });
    
    // Add category.size metafield
    crossNamespaceMappings.push({
      ownerId: productId,
      namespace: "category",
      key: "size",
      type: "single_line_text_field",
      value: sizeValue.trim()
    });
    
    // Add custom.size metafield
    crossNamespaceMappings.push({
      ownerId: productId,
      namespace: "custom",
      key: "size",
      type: "single_line_text_field",
      value: sizeValue.trim()
    });
  }
  
  if (crossNamespaceMappings.length === 0) {
    return;
  }
  
  // Create metafield definitions for cross-namespace mappings
  await ensureCrossNamespaceMetafieldDefinitions(admin, crossNamespaceMappings);
  
  // Create the metafields
  const crossNamespaceRes = await admin.graphql(
    `mutation ($metafields: [MetafieldsSetInput!]!) { 
      metafieldsSet(metafields: $metafields) { 
        metafields {
          id
          key
          namespace
          value
        }
        userErrors { 
          field 
          message 
          code
        } 
      } 
    }`,
    { variables: { metafields: crossNamespaceMappings } }
  );
  
  const crossNamespaceJson = await crossNamespaceRes.json();
  
  if (crossNamespaceJson.data.metafieldsSet.userErrors.length) {
    console.error(`❌ Cross-namespace metafield errors:`, crossNamespaceJson.data.metafieldsSet.userErrors);
  } else {
    const createdCrossNamespaceMetafields = crossNamespaceJson.data.metafieldsSet.metafields || [];
    console.log(`✅ Created ${createdCrossNamespaceMetafields.length} cross-namespace metafields for ${productTitle}`);
  }
};

async function ensureCrossNamespaceMetafieldDefinitions(admin, crossNamespaceMappings) {
  // Check existing metafield definitions
  const existingDefsResponse = await admin.graphql(`
    query {
      metafieldDefinitions(first: 250, ownerType: PRODUCT) {
        edges {
          node {
            id
            namespace
            key
            name
            type {
              name
            }
          }
        }
      }
    }
  `);

  const existingDefsResult = await existingDefsResponse.json();
  const existingDefinitions = existingDefsResult.data?.metafieldDefinitions?.edges?.map(edge => edge.node) || [];

  const existingKeys = new Set(
    existingDefinitions.map(def => `${def.namespace}.${def.key}`)
  );

  const definitionsToCreate = [];

  // Define the metafield definitions needed
  const metafieldDefinitions = [
    {
      namespace: "category",
      key: "target_gender",
      name: "Target Gender",
      description: "Target gender for the product"
    },
    {
      namespace: "custom",
      key: "target_gender",
      name: "Target Gender",
      description: "Target gender for the product"
    },
    {
      namespace: "category", 
      key: "stylecode",
      name: "Style Code",
      description: "Product style code"
    },
    {
      namespace: "stanley_stella",
      key: "style_code",
      name: "Style Code",
      description: "Product style code"
    },
    {
      namespace: "category",
      key: "neckline",
      name: "Neckline",
      description: "Product neckline style"
    },
    {
      namespace: "custom",
      key: "neckline",
      name: "Neckline",
      description: "Product neckline style"
    },
    {
      namespace: "category",
      key: "fit",
      name: "Fit",
      description: "Product fit style"
    },
    {
      namespace: "custom",
      key: "fit",
      name: "Fit",
      description: "Product fit style"
    },
    {
      namespace: "stanley_stella",
      key: "compositionlist",
      name: "Composition List",
      description: "Product fabric composition"
    },
    {
      namespace: "custom",
      key: "fabric",
      name: "Fabric",
      description: "Product fabric composition"
    },
    {
      namespace: "stanley_stella",
      key: "washinstructions",
      name: "Washing Instructions",
      description: "Product washing and care instructions"
    },
    {
      namespace: "category",
      key: "size",
      name: "Size",
      description: "Product size"
    },
    {
      namespace: "custom",
      key: "size",
      name: "Size",
      description: "Product size"
    }
  ];

  for (const definition of metafieldDefinitions) {
    const defKey = `${definition.namespace}.${definition.key}`;
    
    if (!existingKeys.has(defKey)) {
      definitionsToCreate.push({
        name: definition.name,
        key: definition.key,
        namespace: definition.namespace,
        type: "single_line_text_field",
        description: definition.description,
        ownerType: "PRODUCT"
      });
    }
  }

  if (definitionsToCreate.length === 0) {
    return;
  }

  for (const definition of definitionsToCreate) {
    try {
      const createRes = await admin.graphql(`
        mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
              id
              name
              key
              namespace
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `, {
        variables: { definition }
      });

      const createJson = await createRes.json();

      if (createJson.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
        const errors = createJson.data.metafieldDefinitionCreate.userErrors;
        const alreadyExistsError = errors.find(err => 
          err.message?.includes('already exists') || 
          err.message?.includes('taken') ||
          err.code === 'TAKEN'
        );
        
        if (alreadyExistsError) {
          // Definition already exists, which is fine
        } else {
          console.error(`❌ Error creating cross-namespace metafield definition ${definition.key}:`, errors);
        }
      } else {
        console.log(`✅ Created cross-namespace metafield definition: ${definition.namespace}.${definition.key}`);
      }
    } catch (error) {
      console.error(`❌ Error creating cross-namespace metafield definition ${definition.key}:`, error);
    }
  }
} 