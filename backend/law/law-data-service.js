// Official-law integration boundary.
// The API key is server-side only. No frontend code should import this module.
const https = require('https');

function getLawApiKey() {
  const key = process.env.LAW_API_KEY;
  if (!key) throw new Error('LAW_API_KEY is not configured');
  return key;
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Accept: 'application/json' } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`Law API HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Law API returned non-JSON response')); }
      });
    }).on('error', reject);
  });
}

async function fetchOfficialLaw(url) {
  const key = getLawApiKey();
  const separator = url.includes('?') ? '&' : '?';
  return requestJson(`${url}${separator}OC=${encodeURIComponent(key)}`);
}

module.exports = { fetchOfficialLaw };
