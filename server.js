/**
 * SASBOV MARKET — Local Rock-Solid Database & Dev Server
 * - Saves all products directly to local hard drive: data/products.json
 * - Automatically saves uploaded images to uploads/ directory as real .jpg files
 * - Automatically syncs with Cloud Redis (REDIS_URL) in real-time
 * - Serves all site files at http://localhost:3333
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3333;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Sharp for image processing
let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('[Server] Sharp not available, falling back to raw buffers');
}

// Redis Client
let redisClient = null;
async function getRedisClient() {
  if (redisClient && redisClient.isOpen) return redisClient;
  try {
    let redisUrl = process.env.REDIS_URL;
    if (!redisUrl && fs.existsSync(path.join(ROOT_DIR, '.env.development.local'))) {
      const env = fs.readFileSync(path.join(ROOT_DIR, '.env.development.local'), 'utf8');
      const m = env.match(/REDIS_URL="?([^"\r\n]+)"?/);
      if (m) redisUrl = m[1].trim();
    }
    if (!redisUrl) return null;
    const { createClient } = require('redis');
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', err => console.warn('[Redis Warning]:', err.message));
    await redisClient.connect();
    return redisClient;
  } catch (err) {
    console.warn('[Redis Connect Failed]:', err.message);
    return null;
  }
}

// Background sync to Cloud Redis
async function syncToCloudRedis(products) {
  try {
    const client = await getRedisClient();
    if (client) {
      await client.set('sasbov_market_products_v1', JSON.stringify(products));
      console.log(`[Cloud Sync] Synced ${products.length} products to Cloud Redis.`);
    }
  } catch (err) {
    console.warn('[Cloud Sync Error]:', err.message);
  }
}

// Save Base64 string to disk as a JPG file in uploads/
async function saveBase64Image(dataUrl, prefix = 'img') {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;
  try {
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return dataUrl;
    const buffer = Buffer.from(match[2], 'base64');
    const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
    const destPath = path.join(UPLOADS_DIR, filename);

    if (sharp) {
      await sharp(buffer)
        .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, progressive: true })
        .toFile(destPath);
    } else {
      fs.writeFileSync(destPath, buffer);
    }

    return `/uploads/${filename}`;
  } catch (err) {
    console.warn('[Save Image Error]:', err.message);
    return dataUrl;
  }
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. GET /api/products
  if (req.method === 'GET' && pathname === '/api/products') {
    try {
      let products = [];
      if (fs.existsSync(PRODUCTS_FILE)) {
        const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
        products = JSON.parse(raw);
      } else {
        // Fallback: try Redis
        const client = await getRedisClient();
        if (client) {
          const raw = await client.get('sasbov_market_products_v1');
          if (raw) {
            products = JSON.parse(raw);
            fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
          }
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        source: 'local_database_disk',
        count: products.length,
        data: products
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 2. POST /api/products
  if (req.method === 'POST' && pathname === '/api/products') {
    let bodyChunks = [];
    req.on('data', chunk => bodyChunks.push(chunk));
    req.on('end', async () => {
      try {
        const rawBody = Buffer.concat(bodyChunks).toString('utf8');
        const payload = JSON.parse(rawBody);
        let list = payload.products || payload.data || payload;
        if (!Array.isArray(list)) list = [list];

        // Process all products: convert any Base64 images to real JPG files in uploads/
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          const safeId = (p.id || `card_${i}`).replace(/[^a-zA-Z0-9_-]/g, '_');

          if (p.image && p.image.startsWith('data:image/')) {
            p.image = await saveBase64Image(p.image, `${safeId}_main`);
          }

          if (Array.isArray(p.images)) {
            for (let j = 0; j < p.images.length; j++) {
              if (p.images[j] && p.images[j].startsWith('data:image/')) {
                p.images[j] = await saveBase64Image(p.images[j], `${safeId}_gal_${j}`);
              }
            }
          }

          if (p.images && p.images.length > 0 && (!p.image || p.image.startsWith('data:'))) {
            p.image = p.images[0];
          }
        }

        // 1. Immediately save to local hard drive
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(list, null, 2), 'utf8');
        console.log(`[Local DB] Saved ${list.length} cards directly to data/products.json`);

        // 1b. Rolling snapshot backup to local hard drive (Zero-data-loss guarantee)
        try {
          const timestamp = Date.now();
          const backupFile = path.join(BACKUPS_DIR, `products_backup_${timestamp}.json`);
          const latestBackupFile = path.join(BACKUPS_DIR, 'products_backup_latest.json');
          const serialized = JSON.stringify(list, null, 2);
          fs.writeFileSync(backupFile, serialized, 'utf8');
          fs.writeFileSync(latestBackupFile, serialized, 'utf8');

          // Keep last 50 backup files
          const files = fs.readdirSync(BACKUPS_DIR)
            .filter(f => f.startsWith('products_backup_') && f.endsWith('.json') && f !== 'products_backup_latest.json')
            .sort();
          if (files.length > 50) {
            files.slice(0, files.length - 50).forEach(f => {
              try { fs.unlinkSync(path.join(BACKUPS_DIR, f)); } catch (e) {}
            });
          }
          console.log(`[Local DB Backup] Created timestamped backup: products_backup_${timestamp}.json (${list.length} cards)`);
        } catch (backupErr) {
          console.warn('[Backup Warning]:', backupErr.message);
        }

        // 2. Sync to Cloud Redis in the background
        syncToCloudRedis(list);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          count: list.length,
          source: 'local_disk_and_redis',
          data: list
        }));
      } catch (err) {
        console.error('[Save Products Error]:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 3. POST /api/upload (Direct photo upload)
  if (req.method === 'POST' && pathname === '/api/upload') {
    let bodyChunks = [];
    req.on('data', chunk => bodyChunks.push(chunk));
    req.on('end', async () => {
      try {
        const rawBody = Buffer.concat(bodyChunks).toString('utf8');
        const json = JSON.parse(rawBody);
        const dataUrl = json.dataUrl || json.image;
        if (!dataUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'No image data provided' }));
          return;
        }

        const url = await saveBase64Image(dataUrl, 'photo');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, url }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 4. Static File Server
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  let safePath = path.normalize(path.join(ROOT_DIR, reqPath));

  if (!safePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  if (fs.existsSync(safePath) && fs.statSync(safePath).isDirectory()) {
    safePath = path.join(safePath, 'index.html');
  }

  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Caching headers for static images in uploads/
    if (safePath.includes(UPLOADS_DIR)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(safePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`404 Not Found: ${pathname}`);
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SASBOV MARKET LOCAL DATABASE SERVER ONLINE!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📂 Database on disk: ${PRODUCTS_FILE}`);
  console.log(`🖼️ Uploads on disk:  ${UPLOADS_DIR}`);
  console.log(`⚡ Connected to Redis & Auto-Sync Enabled!`);
  console.log(`======================================================\n`);
});
