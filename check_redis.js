const fs = require('fs');
const { createClient } = require('redis');

const env = fs.readFileSync('.env.development.local', 'utf8');
const match = env.match(/REDIS_URL=["']?([^"'\r\n]+)/);

if (!match) {
  console.log('No REDIS_URL in .env.development.local');
  process.exit(1);
}

(async () => {
  const client = createClient({ url: match[1].trim() });
  await client.connect();
  const keys = await client.keys('*');
  console.log('Redis keys found:', keys);
  
  for (const k of keys) {
    const val = await client.get(k);
    if (!val) {
      console.log(`Key ${k} is empty`);
      continue;
    }
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        console.log(`Key "${k}" -> Array of ${parsed.length} items`);
        console.log(`   Sample IDs:`, parsed.slice(0, 5).map(p => p.id || p.name));
      } else {
        console.log(`Key "${k}" -> Object/Other (length: ${val.length})`);
      }
    } catch (e) {
      console.log(`Key "${k}" -> String (length: ${val.length})`);
    }
  }
  
  await client.disconnect();
})();
