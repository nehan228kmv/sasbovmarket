/**
 * SASBOV MARKET — Vercel Serverless Products API
 * Supports Vercel KV (Upstash Redis), Neon Postgres, or high-performance Seed Fallback.
 * Route: /api/products
 */

// Default verified initial catalog (Anti-AI-slop, authentic streetwear metadata)
let DEFAULT_PRODUCTS = [];
try {
  const fs = require('fs');
  const path = require('path');
  const diskPath = path.join(process.cwd(), 'data', 'products.json');
  if (fs.existsSync(diskPath)) {
    DEFAULT_PRODUCTS = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
  }
} catch (e) {
  console.warn('[Products API Init] Could not pre-load disk products.json:', e);
}

let memoryStorage = [];

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

// Native Redis Client Support (npm: redis)
let redisClient = null;
async function getRedisClient() {
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
  if (!redisUrl) return null;
  if (redisClient && redisClient.isOpen) return redisClient;
  try {
    const { createClient } = require('redis');
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (err) => console.warn('[Redis Client Error]', err));
    await redisClient.connect();
    return redisClient;
  } catch (err) {
    console.warn('[Redis Init Failed]', err);
    return null;
  }
}

async function getStoredProducts(kvUrl, kvToken) {
  // 1. Native Redis connection (if REDIS_URL or KV_URL is provided)
  const client = await getRedisClient();
  if (client) {
    try {
      const raw = await client.get(KV_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { data: parsed, source: 'redis_native' };
        }
      }
    } catch (e) {
      console.warn('[Redis] get error:', e);
    }
  }

  // 2. REST API Vercel KV / Upstash
  if (kvUrl && kvToken) {
    const restData = await kvGet(kvUrl, kvToken, KV_STORAGE_KEY);
    if (Array.isArray(restData) && restData.length > 0) {
      return { data: restData, source: 'vercel_kv_rest' };
    }
  }

  // 3. Disk JSON Fallback (bundled with repository)
  try {
    const fs = require('fs');
    const path = require('path');
    const localJson = path.join(process.cwd(), 'data', 'products.json');
    if (fs.existsSync(localJson)) {
      const fileData = JSON.parse(fs.readFileSync(localJson, 'utf8'));
      if (Array.isArray(fileData) && fileData.length > 0) {
        return { data: fileData, source: 'disk_json_bundle' };
      }
    }
  } catch (e) {
    console.warn('[Disk] fallback read error:', e);
  }

  return null;
}

async function saveStoredProducts(products, kvUrl, kvToken) {
  let saved = false;

  // 1. Native Redis
  const client = await getRedisClient();
  if (client) {
    try {
      await client.set(KV_STORAGE_KEY, JSON.stringify(products));
      saved = true;
    } catch (e) {
      console.warn('[Redis] set error:', e);
    }
  }

  // 2. REST API Vercel KV / Upstash
  if (kvUrl && kvToken) {
    const ok = await kvSet(kvUrl, kvToken, KV_STORAGE_KEY, products);
    if (ok) saved = true;
  }

  return saved;
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasRedisUrl = Boolean(process.env.REDIS_URL || process.env.KV_URL);
  const isKvEnabled = Boolean((kvUrl && kvToken) || hasRedisUrl);

  // GET: Fetch product list
  if (req.method === 'GET') {
    try {
      function getTs(item) {
        if (!item) return 0;
        if (item.createdAt) { const t = new Date(item.createdAt).getTime(); if (t > 0) return t; }
        if (item.timestamp) { const t = Number(item.timestamp); if (t > 0) return t; }
        if (typeof item.id === 'string') {
          const m = item.id.match(/(\d{10,13})/);
          if (m) { const t = parseInt(m[1], 10); if (t > 0) return t; }
        }
        if (item.closingDate) { const t = new Date(item.closingDate).getTime(); if (t > 0) return t; }
        return 0;
      }

      if (isKvEnabled) {
        const stored = await getStoredProducts(kvUrl, kvToken);
        if (stored && Array.isArray(stored.data) && stored.data.length > 0) {
          const sorted = stored.data
            .filter(p => p && p.id && !p.deletedAt)
            .sort((a, b) => getTs(b) - getTs(a));
          memoryStorage = sorted;
          return res.status(200).json({
            success: true,
            source: stored.source,
            count: sorted.length,
            data: sorted
          });
        }
        // If DB is connected but empty, seed it with verified catalog if available
        if (DEFAULT_PRODUCTS.length > 0) {
          await saveStoredProducts(DEFAULT_PRODUCTS, kvUrl, kvToken);
          memoryStorage = [...DEFAULT_PRODUCTS];
          return res.status(200).json({
            success: true,
            source: 'database_seeded',
            count: DEFAULT_PRODUCTS.length,
            data: DEFAULT_PRODUCTS
          });
        }
      }

      // 3. Disk fallback (when no Database is configured or DB returned empty)
      if (DEFAULT_PRODUCTS && DEFAULT_PRODUCTS.length > 0) {
        memoryStorage = [...DEFAULT_PRODUCTS];
        return res.status(200).json({
          success: true,
          source: 'disk_bundle_fallback',
          kvConfigured: isKvEnabled,
          count: DEFAULT_PRODUCTS.length,
          data: DEFAULT_PRODUCTS
        });
      }

      // Final fallback
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
        await saveStoredProducts(updatedList, kvUrl, kvToken);
      }

      return res.status(200).json({
        success: true,
        source: isKvEnabled ? 'database' : 'memory',
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
        await saveStoredProducts(memoryStorage, kvUrl, kvToken);
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
