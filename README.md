# Sky Pro Shopify Import Tool

A simple Node.js tool to import products from Sky Pro XML feeds to Shopify, including Finnish translations.

## Features

- 📦 Import products from English XML feed to Shopify
- 🌍 Import Finnish translations to Shopify Translate & Adapt
- 🔄 Update existing products or create new ones
- 📊 Detailed import reporting and error handling
- ⚡ Rate limiting to avoid API throttling
- 🎯 Product matching by code for accurate translations

## Prerequisites

- Node.js (v14 or higher)
- Shopify store with API access
- Shopify API access token with product and translation permissions

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `env.example`:
   ```bash
   cp env.example .env
   ```

4. Configure your Shopify credentials in `.env`:
   ```env
   SHOPIFY_SHOP_URL=your-shop.myshopify.com
   SHOPIFY_ACCESS_TOKEN=your_access_token_here
   SHOPIFY_API_VERSION=2024-01
   ```

## Shopify API Setup

1. Go to your Shopify admin panel
2. Navigate to **Apps** → **Develop apps**
3. Create a new app or use an existing one
4. Configure the following API permissions:
   - **Products**: Read and write access
   - **Translations**: Read and write access
5. Generate an access token
6. Add the token to your `.env` file

## Usage

### Import Products Only
```bash
node index.js products
# or
node index.js import
```

### Import Translations Only
```bash
node index.js translations
# or
node index.js translate
```

### Update Translations (New Script)
```bash
# Update all translations
node update-translations.js

# Dry run to see what would be updated
node update-translations.js --dry-run

# Update only specific categories
node update-translations.js --categories="Shopping Bags,Headwear"

# Limit number of products to process
node update-translations.js --limit=10

# Force update existing translations
node update-translations.js --force-update

# Show help
node update-translations.js --help
```

### Import Everything (Products + Translations)
```bash
node index.js all
```

### Show Help
```bash
node index.js help
```

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SHOPIFY_SHOP_URL` | Your Shopify shop URL | Required |
| `SHOPIFY_ACCESS_TOKEN` | Your Shopify API access token | Required |
| `SHOPIFY_API_VERSION` | Shopify API version | `2024-01` |
| `ENGLISH_FEED_URL` | English XML feed URL | `https://www.skypro.fi/tuotteet/products-en.xml` |
| `FINNISH_FEED_URL` | Finnish XML feed URL | `https://www.skypro.fi/tuotteet/products.xml` |
| `MAX_PRODUCTS` | Limit products for testing | No limit |

### Testing with Limited Products

To test with only a few products, set `MAX_PRODUCTS` in your `.env`:

```env
MAX_PRODUCTS=5
```

## How It Works

### Product Import Process

1. **Fetch XML Data**: Downloads and parses the English XML feed
2. **Parse Products**: Extracts product information including:
   - Basic info (title, description, brand)
   - Variants (colors, sizes, pricing, stock)
   - Images and categories
   - Metafields (product code, size table, etc.)
3. **Convert to Shopify Format**: Transforms XML data to Shopify API format
4. **Check for Existing**: Looks for existing products by handle
5. **Create or Update**: Creates new products or updates existing ones
6. **Rate Limiting**: Adds delays between API calls to avoid throttling

### Translation Import Process

1. **Fetch Finnish XML**: Downloads and parses the Finnish XML feed
2. **Match Products**: Finds corresponding products in Shopify by product code
3. **Import Translations**: Uploads Finnish translations to Shopify Translate & Adapt
4. **Translate Variants**: Also translates variant options (colors, sizes)

### Translation Update Process (New)

The `update-translations.js` script provides more advanced translation management:

1. **Fetch Finnish XML**: Downloads and parses the Finnish XML feed from `FINNISH_FEED_URL`
2. **Get Shopify Products**: Retrieves all existing products from Shopify
3. **Filter by Categories**: Optionally filters products by category tags
4. **Match by Product Code**: Finds corresponding Finnish data using product codes
5. **Check Existing Translations**: Determines if Finnish translation already exists
6. **Create or Update**: Creates new translations or updates existing ones
7. **Rate Limiting**: Includes delays to avoid API throttling

**Key Features:**
- **Dry Run Mode**: Test without making changes
- **Category Filtering**: Process only specific product categories
- **Limit Processing**: Control number of products processed
- **Force Update**: Override existing translations
- **Detailed Reporting**: Shows success, skipped, and error counts

## Data Mapping

### Product Fields

| XML Field | Shopify Field | Notes |
|-----------|---------------|-------|
| `title` | `title` | Product name |
| `description` | `body_html` | Formatted as HTML |
| `brand` | `vendor` | Brand name |
| `code` | `metafields.product_code` | Product code for matching |
| `sizetable` | `metafields.size_table` | Size chart HTML |
| `package` | `metafields.package_size` | Package information |

### Variant Fields

| XML Field | Shopify Field | Notes |
|-----------|---------------|-------|
| `color_name` | `option1` | Color option |
| `size` | `option2` | Size option |
| `recommended_retail_price` | `price` | Product price |
| `code` | `sku` | Stock keeping unit |
| `free_stock` | `inventory_quantity` | Available stock |

### Translation Fields

| English Field | Finnish Field | Shopify Translation |
|---------------|---------------|-------------------|
| `title` | `title` | `title` (fi) |
| `description` | `description` | `body_html` (fi) |
| `color_name` | `color_name` | `option1` (fi) |

## Error Handling

The tool includes comprehensive error handling:

- **Network Errors**: Retries and continues with next product
- **API Rate Limiting**: Automatic delays between requests
- **Missing Data**: Skips products with incomplete information
- **Translation Mismatches**: Reports products without Finnish translations
- **Detailed Logging**: Shows progress and error details

## Troubleshooting

### Common Issues

**"Missing Shopify configuration"**
- Check your `.env` file has the correct credentials
- Verify your Shopify shop URL format

**"API rate limit exceeded"**
- The tool includes automatic rate limiting
- If you still get errors, increase delays in the code

**"Product not found for translation"**
- Products need to be imported first before translations
- Check that product codes match between feeds

**"Translation already exists"**
- The tool will update existing translations
- This is normal behavior

### Debug Mode

To see more detailed logging, you can modify the console.log statements in the code or add:

```javascript
console.log('Debug:', data);
```

## File Structure

```
sky-pro-import/
├── config/
│   └── shopify.js          # Shopify API configuration
├── utils/
│   └── xml-parser.js       # XML parsing utilities
├── import-products.js       # Product import logic
├── import-translations.js   # Translation import logic
├── index.js                # Main entry point
├── package.json            # Dependencies and scripts
├── env.example             # Environment variables template
└── README.md              # This file
```

## Contributing

This is a simple import tool, but if you need modifications:

1. Fork the repository
2. Make your changes
3. Test with a small number of products first
4. Submit a pull request

## License

MIT License - feel free to use and modify as needed.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify your Shopify API permissions
3. Test with `MAX_PRODUCTS=1` first
4. Check the console output for detailed error messages 