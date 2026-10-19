const fs = require('fs');
const path = require('path');
const sharp = require('c:/Users/Darya Pr/Desktop/sasbovmarket/node_modules/sharp');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const productsPath = path.join(__dirname, 'data', 'products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

console.log(`Extracting images for ${products.length} products to uploads/ folder...`);

(async () => {
  for (let pIdx = 0; pIdx < products.length; pIdx++) {
    const p = products[pIdx];
    const safeId = (p.id || `prod_${pIdx}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Process main image
    if (p.image && p.image.startsWith('data:image/')) {
      const match = p.image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const ext = 'jpg';
        const filename = `${safeId}_main.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        const buffer = Buffer.from(match[2], 'base64');
        
        await sharp(buffer)
          .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82, progressive: true })
          .toFile(filePath);
          
        p.image = `/uploads/${filename}`;
        console.log(`  [${pIdx}] Main image saved: ${filename}`);
      }
    }
    
    // Process gallery images
    if (Array.isArray(p.images)) {
      for (let i = 0; i < p.images.length; i++) {
        const img = p.images[i];
        if (img && img.startsWith('data:image/')) {
          const match = img.match(/^data:image\/(\w+);base64,(.+)$/);
          if (match) {
            const ext = 'jpg';
            const filename = `${safeId}_gallery_${i}.${ext}`;
            const filePath = path.join(uploadsDir, filename);
            const buffer = Buffer.from(match[2], 'base64');
            
            await sharp(buffer)
              .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 82, progressive: true })
              .toFile(filePath);
              
            p.images[i] = `/uploads/${filename}`;
            console.log(`  [${pIdx}] Gallery image ${i} saved: ${filename}`);
          }
        }
      }
    }
    
    // Make sure p.image matches p.images[0] if present
    if (p.images && p.images.length > 0 && (!p.image || p.image.startsWith('data:'))) {
      p.image = p.images[0];
    }
  }
  
  // Save updated lightweight products.json
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), 'utf8');
  const newSizeKb = Math.round(Buffer.byteLength(JSON.stringify(products), 'utf8') / 1024);
  console.log(`\n✅ Done! products.json size dropped to ${newSizeKb} KB!`);
  
  // Also sync to Redis
  const env = fs.readFileSync('.env.development.local', 'utf8');
  const m = env.match(/REDIS_URL="?([^"\r\n]+)"?/);
  if (m) {
    const { createClient } = require('c:/Users/Darya Pr/Desktop/sasbovmarket/node_modules/redis');
    const client = createClient({ url: m[1].trim() });
    await client.connect();
    await client.set('sasbov_market_products_v1', JSON.stringify(products));
    console.log('✅ Updated Redis with file-based URLs! Redis is now ultralight!');
    await client.quit();
  }
})();
