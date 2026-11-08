/**
 * SASBOV MARKET — Bulk Photo Ingestion Pipeline
 * Automatically detects, classifies, groups angles, compresses to 3:4 WebP/JPG,
 * and adds new streetwear products to data/products.json.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT_DIR = path.resolve(__dirname, '..');
const IMPORT_DIR = path.join(ROOT_DIR, 'uploads', 'import_500');
const OUTPUT_DIR = path.join(ROOT_DIR, 'uploads', 'catalog');
const PRODUCTS_FILE = path.join(ROOT_DIR, 'data', 'products.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Brand recognition patterns from filename or tags
const BRAND_RULES = [
  { match: /(chrome\s*hearts|ch\b|cross\s*patch)/i, brand: 'Chrome Hearts', category: 'accessories' },
  { match: /(rick\s*owens|geobasket|ramones|drkshdw)/i, brand: 'Rick Owens', category: 'shoes' },
  { match: /(mihara|yasuhiro|mmy|peterson|hank|baker|wayne)/i, brand: 'Maison Mihara Yasuhiro', category: 'shoes' },
  { match: /(bape|bathing\s*ape|bapesta|shark)/i, brand: 'BAPE', category: 'hoodies' },
  { match: /(denim\s*tears|cotton\s*wreath)/i, brand: 'Denim Tears', category: 'pants' },
  { match: /(corteiz|crts|alcatraz)/i, brand: 'Corteiz', category: 'hoodies' },
  { match: /(hellstar|capsule)/i, brand: 'Hellstar', category: 'tshirts' },
  { match: /(sp5der|spider|young\s*thug|555555)/i, brand: 'Sp5der', category: 'hoodies' },
  { match: /(gallery\s*dept|josue\s*thomas)/i, brand: 'Gallery Dept.', category: 'pants' },
  { match: /(arcteryx|arc'teryx|alpha\s*sv|beta\s*lt)/i, brand: "Arc'teryx", category: 'jackets' },
  { match: /(stussy|stüssy|8\s*ball)/i, brand: 'Stüssy', category: 'tshirts' },
  { match: /(vetements|demna)/i, brand: 'Vetements', category: 'hoodies' },
  { match: /(balenciaga|track|triple\s*s|defender)/i, brand: 'Balenciaga', category: 'shoes' },
  { match: /(travis|cactus\s*jack|jordan\s*1)/i, brand: 'Air Jordan x Travis Scott', category: 'shoes' },
  { match: /(kith|ronnie\s*fieg)/i, brand: 'Kith', category: 'hoodies' },
  { match: /(kapital|bone|skeleton)/i, brand: 'Kapital', category: 'pants' }
];

// Category detection from filename
const CATEGORY_RULES = [
  { match: /(shoe|sneaker|кроссов|кед|бутсы|ботин|bapesta|ramones|geobasket|peterson|hank)/i, category: 'shoes', weight: 1.5 },
  { match: /(hoodie|худи|толстов|zip|зип|свитшот|sweatshirt)/i, category: 'hoodies', weight: 0.9 },
  { match: /(tee|t-shirt|футбол|лонг|longsleeve)/i, category: 'tshirts', weight: 0.4 },
  { match: /(pant|jean|джинс|брюк|штаны|sweatpants|cargo|карго)/i, category: 'pants', weight: 0.8 },
  { match: /(jacket|куртк|пуховик|ветров|down|puffer|coat|пальто)/i, category: 'jackets', weight: 1.8 },
  { match: /(cap|кепк|шапк|beanie|bag|сумк|backpack|рюкзак|belt|ремень|ring|кольцо|chain|цепь|очки)/i, category: 'accessories', weight: 0.3 }
];

async function scanAndProcess(targetFolder = IMPORT_DIR) {
  console.log(`\n========================================`);
  console.log(`SASBOV BATCH INGESTION: Scanning ${targetFolder}`);
  console.log(`========================================\n`);

  if (!fs.existsSync(targetFolder)) {
    console.error(`Target folder does not exist: ${targetFolder}`);
    return;
  }

  const files = fs.readdirSync(targetFolder);
  const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
  const imageFiles = files.filter(f => imageExtensions.has(path.extname(f).toLowerCase()));

  console.log(`Found ${imageFiles.length} images to analyze.`);

  if (imageFiles.length === 0) {
    console.log(`\nFolder is currently empty. Drop your photos into:`);
    console.log(`-> ${targetFolder}\n`);
    return;
  }

  // Load existing products
  let products = [];
  if (fs.existsSync(PRODUCTS_FILE)) {
    try {
      products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    } catch (e) {
      console.error('Error reading products.json:', e);
      return;
    }
  }

  console.log(`Existing catalog has ${products.length} products.`);

  // Group images by item key (e.g. prefix before underscore/dash or consecutive numbering)
  const groups = new Map();

  for (const filename of imageFiles) {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    
    // Grouping strategy:
    // If name is "bape_01.jpg", "bape_02.jpg" -> group "bape"
    // If name is "photo_1_front.jpg" -> group "photo_1"
    const groupKey = base.replace(/([_-]?(front|back|tag|sole|side|zoom|detail|[0-9]+))$/i, '').trim() || base;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(filename);
  }

  console.log(`Detected ${groups.size} distinct product items across ${imageFiles.length} photos.\n`);

  let newItemsCount = 0;
  let nextIdNum = products.reduce((max, p) => {
    const m = String(p.id).match(/(\d+)/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 100) + 1;

  for (const [groupKey, fileList] of groups.entries()) {
    console.log(`Processing Item [${groupKey}] with ${fileList.length} photo(s)...`);

    // Detect brand & category
    let detectedBrand = 'SASBOV SELECT';
    let detectedCat = 'hoodies';
    let detectedWeight = 0.9;

    for (const rule of BRAND_RULES) {
      if (rule.match.test(groupKey)) {
        detectedBrand = rule.brand;
        detectedCat = rule.category;
        break;
      }
    }

    for (const rule of CATEGORY_RULES) {
      if (rule.match.test(groupKey)) {
        detectedCat = rule.category;
        detectedWeight = rule.weight;
        break;
      }
    }

    // Process and optimize images to 3:4 aspect ratio (600x800)
    const processedImages = [];
    for (let i = 0; i < fileList.length; i++) {
      const srcFile = path.join(targetFolder, fileList[i]);
      const outFilename = `item_${nextIdNum}_${i + 1}.webp`;
      const outPath = path.join(OUTPUT_DIR, outFilename);

      try {
        await sharp(srcFile)
          .rotate() // Auto-orient according to EXIF
          .resize(600, 800, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 85 })
          .toFile(outPath);

        processedImages.push(`/uploads/catalog/${outFilename}`);
      } catch (err) {
        console.warn(`  Warning: Could not process ${fileList[i]}: ${err.message}`);
        // Fallback: copy original if sharp fails
        const fallbackFilename = `item_${nextIdNum}_${i + 1}${path.extname(fileList[i])}`;
        fs.copyFileSync(srcFile, path.join(OUTPUT_DIR, fallbackFilename));
        processedImages.push(`/uploads/catalog/${fallbackFilename}`);
      }
    }

    if (processedImages.length === 0) continue;

    // Pricing calculation based on category
    const defaultPrices = {
      shoes: 22500,
      hoodies: 16800,
      tshirts: 8900,
      pants: 18500,
      jackets: 28900,
      accessories: 9500
    };
    const rubPrice = defaultPrices[detectedCat] || 15000;
    const cnyPrice = Math.round(rubPrice / 12.77);

    // Format human readable title
    const cleanTitle = groupKey
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    const newItem = {
      id: `sasbov-${nextIdNum}`,
      brand: detectedBrand,
      title: `${detectedBrand} ${cleanTitle}`,
      category: detectedCat,
      price: rubPrice,
      originalPrice: Math.round(rubPrice * 1.25),
      currency: 'RUB',
      cnyPrice: cnyPrice,
      region: 'china',
      stock: 'preorder',
      condition: '9/10 EXCELLENT',
      sizes: detectedCat === 'shoes' ? ['41 EU', '42 EU', '43 EU', '44 EU'] : ['S', 'M', 'L', 'XL'],
      images: processedImages,
      coverImage: processedImages[0],
      description: `Оригинальный айтем ${detectedBrand}. Экспертный легитчек на складе в Азии, полный комплект с бирками. Доставка 7–10 дней СДЭК до двери или примерка в шоуруме на Невском 110В.`,
      tags: [detectedBrand.toLowerCase(), detectedCat, 'streetwear', 'archive'],
      featured: false,
      createdAt: new Date().toISOString()
    };

    products.push(newItem);
    newItemsCount++;
    nextIdNum++;
  }

  // Save updated catalog
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
  console.log(`\nSUCCESS: Added ${newItemsCount} new items to data/products.json.`);
  console.log(`Total products in catalog now: ${products.length}.`);
}

// Check arguments or default to IMPORT_DIR
const customDir = process.argv[2];
scanAndProcess(customDir ? path.resolve(customDir) : IMPORT_DIR);

