/**
 * SASBOV MARKET — Vercel Serverless Health & Diagnostics API
 * Route: /api/health
 */

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const isKvEnabled = Boolean(kvUrl);

  res.status(200).json({
    status: 'ONLINE',
    project: 'sasbovmarket',
    version: '1.0.0',
    nodeVersion: process.version,
    database: {
      type: isKvEnabled ? 'Vercel KV / Upstash Redis' : 'Memory Fallback (Seed Catalog)',
      connected: isKvEnabled
    },
    cloudEdge: process.env.VERCEL_REGION || 'local',
    timestamp: new Date().toISOString()
  });
};
