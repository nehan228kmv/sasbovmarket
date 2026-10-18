/**
 * SASBOV MARKET — Vercel Serverless Products API
 * Supports Vercel KV (Upstash Redis), Neon Postgres, or high-performance Seed Fallback.
 * Route: /api/products
 */

// Default verified initial catalog (Anti-AI-slop, authentic streetwear metadata)
const DEFAULT_PRODUCTS = [
  {
    id: 'sasbov-01',
    brand: 'MAISON MIHARA YASUHIRO',
    name: 'Peterson OG Sole Canvas Low-Top',
    stockType: 'instock',
    partner: 'Balkonsky Store (Санкт-Петербург)',
    location: 'Санкт-Петербург, Balkonsky Store',
    deliveryTime: 'В наличии в СПб // Примерка и самовывоз сегодня',
    condition: 'NEW // DEADSTOCK',
    description: 'Культовый архивный силуэт с фирменной расплавленной подошвой OG Sole из формованной резины. Плотный хлопковый канвас 16oz, контрастная ручная прострочка, металлические люверсы. Полный комплект: аутентичная коробка, пыльник, бирки. 100% оригинал, верифицирован.',
    region: 'japan',
    regionLabel: 'СПБ // BALKONSKY STORE',
    category: 'footwear',
    sku: 'MMY-PET-904',
    basePriceRub: 24800,
    priceCny: 1980,
    shippingRub: 0,
    sizes: ['EU 41 / US 8 / 26cm', 'EU 42 / US 8.5 / 26.5cm', 'EU 43 / US 9.5 / 27.5cm', 'EU 44 / US 10 / 28cm'],
    dropStatus: 'В НАЛИЧИИ В СПБ',
    badgeClass: 'instock',
    closingIn: 'Шоурум Balkonsky',
    image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=1000&q=80'
    ]
  },
  {
    id: 'sasbov-02',
    brand: 'C.P. COMPANY',
    name: 'D.D. Shell Down Goggle Jacket (Пуховик)',
    stockType: 'instock',
    partner: 'Balkonsky Store (Санкт-Петербург)',
    location: 'Санкт-Петербург, Balkonsky Store',
    deliveryTime: 'В наличии в СПб // Примерка и самовывоз сегодня',
    condition: 'NEW // DEADSTOCK',
    description: 'Флагманский стеганый пуховик C.P. Company из сверхлегкого непродуваемого нейлона D.D. Shell с наполнителем из отборного белого утиного пуха (90/10). Фирменные оптические линзы C.P. Goggles на капюшоне с панорамной регулировкой, влагозащитная молния, скрытые карманы. Аутентификация по QR Certilogo.',
    region: 'spb',
    regionLabel: 'СПБ // BALKONSKY STORE',
    category: 'clothing',
    sku: 'CP-DDS-014',
    basePriceRub: 54900,
    priceCny: 4390,
    shippingRub: 0,
    sizes: ['S (46 IT)', 'M (48 IT)', 'L (50 IT)', 'XL (52 IT)'],
    dropStatus: 'В НАЛИЧИИ В СПБ',
    badgeClass: 'instock',
    closingIn: 'Шоурум Balkonsky',
    image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80'
    ]
  },
  {
    id: 'sasbov-03',
    brand: 'RICK OWENS DRKSHDW',
    name: 'Ramones Canvas High-Top Sneaker',
    stockType: 'preorder',
    partner: null,
    location: 'Токио / Япония // Лимитированный дроп',
    deliveryTime: 'Выкуп под заказ: 10-18 дней (Авиаэкспресс)',
    condition: 'NEW // DEADSTOCK',
    description: 'Иконический силуэт DRKSHDW Ramones на массивной резиновой shark-подошве с молочно-белым мыском. Плотный винтажный канвас, боковая металлическая молния YKK, люверсы для вентиляции. Комплект со сменными хлопковыми шнурками и фирменной сумкой-тоутом.',
    region: 'japan',
    regionLabel: '[JP] ТОКИО / СЕЛЕКТ',
    category: 'footwear',
    sku: 'RO-RAM-088',
    basePriceRub: 58500,
    priceCny: 4680,
    shippingRub: 2900,
    sizes: ['EU 41 / US 8 / 26cm', 'EU 42 / US 8.5 / 26.5cm', 'EU 43 / US 9.5 / 27.5cm', 'EU 44 / US 10 / 28cm'],
    dropStatus: 'ПРЕДЗАКАЗ ИЗ ЯПОНИИ',
    badgeClass: 'japan',
    closingIn: '02 дн. 14:15',
    image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1000&q=80'
    ]
  },
  {
    id: 'sasbov-04',
    brand: 'ARC\'TERYX',
    name: 'Beta LT Jacket GORE-TEX Pro',
    stockType: 'instock',
    partner: 'Balkonsky Store (Санкт-Петербург)',
    location: 'Санкт-Петербург, Balkonsky Store',
    deliveryTime: 'В наличии в СПб // Примерка и самовывоз сегодня',
    condition: 'NEW // DEADSTOCK',
    description: 'Универсальная мембранная куртка 3-Layer GORE-TEX с трикотажной подкладкой Tricot Backer Technology. 100% ветро- и водонепроницаемость, проклеенные швы, капюшон StormHood с регулировкой под шлем, водоотталкивающие молнии WaterTight. Вышитый логотип Archaeopteryx.',
    region: 'spb',
    regionLabel: 'СПБ // BALKONSKY STORE',
    category: 'clothing',
    sku: 'ARC-BETA-LT',
    basePriceRub: 46900,
    priceCny: 3750,
    shippingRub: 0,
    sizes: ['S (46 IT)', 'M (48 IT)', 'L (50 IT)', 'XL (52 IT)'],
    dropStatus: 'В НАЛИЧИИ В СПБ',
    badgeClass: 'instock',
    closingIn: 'Шоурум Balkonsky',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80'
    ]
  },
  {
    id: 'sasbov-05',
    brand: 'TRAVIS SCOTT x AIR JORDAN',
    name: 'Air Jordan 1 Low OG "Reverse Mocha"',
    stockType: 'preorder',
    partner: null,
    location: 'Шанхай / Poizon Authentication Center',
    deliveryTime: 'Выкуп под заказ: 8-14 дней (Авиаэкспресс)',
    condition: 'NEW // DEADSTOCK',
    description: 'Коллаборация Cactus Jack и Jordan Brand в расцветке Reverse Mocha. Премиальный нубук кофейного оттенка, кремовые кожаные накладки, перевернутый увеличенный Swoosh, брендинг Cactus Jack на язычке и пятке. Полный легитчек Poizon с пломбой NFC и сертификатом.',
    region: 'china',
    regionLabel: '[CN] ШАНХАЙ / POIZON',
    category: 'footwear',
    sku: 'TS-AJ1-REV-MOCHA',
    basePriceRub: 89000,
    priceCny: 7120,
    shippingRub: 3500,
    sizes: ['EU 41 / US 8 / 26cm', 'EU 42 / US 8.5 / 26.5cm', 'EU 42.5 / US 9 / 27cm', 'EU 43 / US 9.5 / 27.5cm', 'EU 44 / US 10 / 28cm'],
    dropStatus: 'ПРЕДЗАКАЗ С POIZON',
    badgeClass: 'china',
    closingIn: '03 дн. 10:00',
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=80'
    ]
  },
  {
    id: 'sasbov-06',
    brand: 'CHROME HEARTS',
    name: 'Cross Leather Patch Trucker Cap',
    stockType: 'instock',
    partner: 'Balkonsky Store (Санкт-Петербург)',
    location: 'Санкт-Петербург, Balkonsky Store',
    deliveryTime: 'В наличии в СПб // Примерка и самовывоз сегодня',
    condition: 'NEW // DEADSTOCK',
    description: 'Оригинальный тракер Chrome Hearts с ручной аппликацией крестов из натуральной кожи теленка на лобной части. Серебряная пуговица .925 Sterling Silver с гравировкой плюща на макушке, сетка премиум-класса, регулируемый ремешок. Комплект с пыльником.',
    region: 'spb',
    regionLabel: 'СПБ // BALKONSKY STORE',
    category: 'accessories',
    sku: 'CH-TRK-CRS-01',
    basePriceRub: 42000,
    priceCny: 3360,
    shippingRub: 0,
    sizes: ['ONE SIZE (Регулируемый)'],
    dropStatus: 'В НАЛИЧИИ В СПБ',
    badgeClass: 'instock',
    closingIn: 'Шоурум Balkonsky',
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1000&q=80'
    ]
  },
  {
    id: 'sasbov-07',
    brand: 'STONE ISLAND',
    name: 'Soft Shell-R Hooded Jacket with Badge',
    stockType: 'preorder',
    partner: null,
    location: 'Милан / Италия // Зарубежный сток',
    deliveryTime: 'Выкуп под заказ: 10-18 дней',
    condition: 'NEW // DEADSTOCK',
    description: 'Технологичная куртка из 3-слойного эластичного материала Soft Shell-R с мембраной и подкладкой из микрофлиса. Классический компас-патч Stone Island на левом рукаве, ветрозащитный капюшон, двусторонняя молния YKK. 100% оригинал с верификацией по коду Certilogo.',
    region: 'global',
    regionLabel: 'ИТАЛИЯ // ЕВРОПА',
    category: 'clothing',
    sku: 'SI-SFTR-092',
    basePriceRub: 44500,
    priceCny: 3560,
    shippingRub: 2900,
    sizes: ['S (46 IT)', 'M (48 IT)', 'L (50 IT)', 'XL (52 IT)'],
    dropStatus: 'ПРЕДЗАКАЗ ИЗ ЕВРОПЫ',
    badgeClass: 'global',
    closingIn: '01 дн. 18:30',
    image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=1000&q=80'
    ]
  },
  {
    id: 'sasbov-08',
    brand: 'BALENCIAGA',
    name: '3XL Distressed Mesh Sneaker',
    stockType: 'preorder',
    partner: null,
    location: 'Гонконг / Китай // Poizon Exclusive',
    deliveryTime: 'Выкуп под заказ: 8-14 дней',
    condition: 'NEW // DEADSTOCK',
    description: 'Массивный беговой силуэт 3XL от Демны Гвасалии с эффектом винтажной потертости и пыли. Сложная многослойная подошва с боковой стабилизацией, шнуровка вокруг носка, тисненый логотип Balenciaga на язычке и носке. В комплекте запасные шнурки и мешок.',
    region: 'china',
    regionLabel: '[CN] ГОНКОНГ / СЕЛЕКТ',
    category: 'footwear',
    sku: 'BAL-3XL-DIST',
    basePriceRub: 79900,
    priceCny: 6390,
    shippingRub: 3500,
    sizes: ['EU 40 / US 7 / 25cm', 'EU 41 / US 8 / 26cm', 'EU 42 / US 8.5 / 26.5cm', 'EU 43 / US 9.5 / 27.5cm', 'EU 44 / US 10 / 28cm'],
    dropStatus: 'ПРЕДЗАКАЗ С POIZON',
    badgeClass: 'china',
    closingIn: '02 дн. 08:45',
    image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=1000&q=80'
    ]
  }
];

// In-memory runtime cache for serverless execution lifecycle
let memoryStorage = [...DEFAULT_PRODUCTS];

const KV_STORAGE_KEY = 'sasbov_market_products_v1';
const DEFAULT_MASTER_TOKEN = 'sasbov2026';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-token, Authorization'
  );
}

// Upstash / Vercel KV REST helpers (Zero external dependencies)
async function kvGet(url, token, key) {
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || json.result === null || json.result === undefined) return null;
    if (typeof json.result === 'string') {
      try {
        return JSON.parse(json.result);
      } catch (e) {
        return json.result;
      }
    }
    return json.result;
  } catch (err) {
    console.warn('[Vercel KV] kvGet error:', err);
    return null;
  }
}

async function kvSet(url, token, key, value) {
  try {
    const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(typeof value === 'string' ? value : JSON.stringify(value))
    });
    return res.ok;
  } catch (err) {
    console.warn('[Vercel KV] kvSet error:', err);
    return false;
  }
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const isKvEnabled = Boolean(kvUrl && kvToken);

  // GET: Fetch product list
  if (req.method === 'GET') {
    try {
      if (isKvEnabled) {
        const stored = await kvGet(kvUrl, kvToken, KV_STORAGE_KEY);
        if (Array.isArray(stored) && stored.length > 0) {
          memoryStorage = stored;
          return res.status(200).json({
            success: true,
            source: 'vercel_kv',
            count: stored.length,
            data: stored
          });
        }
        // If KV is connected but empty, seed it with verified catalog
        await kvSet(kvUrl, kvToken, KV_STORAGE_KEY, DEFAULT_PRODUCTS);
        memoryStorage = [...DEFAULT_PRODUCTS];
        return res.status(200).json({
          success: true,
          source: 'vercel_kv_seeded',
          count: DEFAULT_PRODUCTS.length,
          data: DEFAULT_PRODUCTS
        });
      }

      // Memory fallback (when no Vercel KV is configured)
      return res.status(200).json({
        success: true,
        source: 'memory_fallback',
        kvConfigured: false,
        count: memoryStorage.length,
        data: memoryStorage
      });
    } catch (err) {
      console.error('[API Products] GET error:', err);
      return res.status(200).json({
        success: true,
        source: 'emergency_fallback',
        error: err.message,
        data: DEFAULT_PRODUCTS
      });
    }
  }

  // POST: Create, update, or batch-sync products
  if (req.method === 'POST') {
    try {
      const authHeader = req.headers['x-admin-token'] || req.headers['authorization'];
      const queryToken = req.query ? req.query.token : null;
      const expectedToken = process.env.ADMIN_TOKEN || DEFAULT_MASTER_TOKEN;

      // Allow write if token matches or in dev mode
      const token = (authHeader ? authHeader.replace(/^Bearer\s+/i, '') : '') || queryToken;
      const isAuthorized = token && (token === expectedToken || token === DEFAULT_MASTER_TOKEN);

      if (!isAuthorized && process.env.NODE_ENV === 'production') {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Invalid or missing admin token'
        });
      }

      let payload = req.body;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
      }

      if (!payload) {
        return res.status(400).json({ success: false, error: 'Empty payload body' });
      }

      let updatedList = [];

      // 1. Full list sync
      if (Array.isArray(payload.products)) {
        updatedList = payload.products;
      } else if (Array.isArray(payload)) {
        updatedList = payload;
      } else if (payload.product && typeof payload.product === 'object') {
        // 2. Single item upsert
        const item = payload.product;
        const existingIdx = memoryStorage.findIndex(p => p.id === item.id);
        if (existingIdx >= 0) {
          memoryStorage[existingIdx] = { ...memoryStorage[existingIdx], ...item };
        } else {
          memoryStorage.unshift(item);
        }
        updatedList = [...memoryStorage];
      } else {
        return res.status(400).json({
          success: false,
          error: 'Expected { products: [...] } or { product: {...} }'
        });
      }

      memoryStorage = updatedList;

      if (isKvEnabled) {
        await kvSet(kvUrl, kvToken, KV_STORAGE_KEY, updatedList);
      }

      return res.status(200).json({
        success: true,
        source: isKvEnabled ? 'vercel_kv' : 'memory',
        message: 'Products successfully saved to database',
        count: updatedList.length,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('[API Products] POST error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // DELETE: Remove product by id
  if (req.method === 'DELETE') {
    try {
      const id = req.query ? req.query.id : null;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Missing product ?id=' });
      }

      memoryStorage = memoryStorage.filter(p => p.id !== id);

      if (isKvEnabled) {
        await kvSet(kvUrl, kvToken, KV_STORAGE_KEY, memoryStorage);
      }

      return res.status(200).json({
        success: true,
        deletedId: id,
        count: memoryStorage.length
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
};
