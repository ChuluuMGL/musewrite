/**
 * AI-Writer 认证中间件
 * 支持 API Key 认证
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AuthMiddleware {
  constructor(keysFile = null) {
    this.keysFile = keysFile || path.join(__dirname, '..', 'config', 'api-keys.json');
    this.keys = this.loadKeys();
  }

  loadKeys() {
    if (fs.existsSync(this.keysFile)) {
      return JSON.parse(fs.readFileSync(this.keysFile, 'utf-8'));
    }
    return { keys: [] };
  }

  saveKeys() {
    const dir = path.dirname(this.keysFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.keysFile, JSON.stringify(this.keys, null, 2));
  }

  generateKey(name, permissions = ['read', 'write']) {
    const key = `sk_${crypto.randomBytes(16).toString('hex')}`;
    this.keys.keys.push({ key, name, permissions, createdAt: new Date().toISOString(), lastUsed: null, requestCount: 0 });
    this.saveKeys();
    return { key, name, permissions };
  }

  validateKey(apiKey) {
    if (!apiKey) return { valid: false, error: 'Missing API Key' };
    const keyEntry = this.keys.keys.find(k => k.key === apiKey);
    if (!keyEntry) return { valid: false, error: 'Invalid API Key' };
    keyEntry.lastUsed = new Date().toISOString();
    keyEntry.requestCount++;
    this.saveKeys();
    return { valid: true, permissions: keyEntry.permissions, name: keyEntry.name };
  }

  validateRequest(req, res) {
    const apiKey = req.headers['x-api-key'] || req.headers['X-Api-Key'];
    const validation = this.validateKey(apiKey);
    if (!validation.valid) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Unauthorized', message: validation.error }));
      return false;
    }
    req.user = { name: validation.name, permissions: validation.permissions };
    return true;
  }

  listKeys() {
    return this.keys.keys.map(k => ({ name: k.name, key: `${k.key.substring(0, 8)  }...`, permissions: k.permissions, createdAt: k.createdAt, lastUsed: k.lastUsed, requestCount: k.requestCount }));
  }

  revokeKey(key) {
    const index = this.keys.keys.findIndex(k => k.key === key);
    if (index !== -1) { this.keys.keys.splice(index, 1); this.saveKeys(); return true; }
    return false;
  }
}

module.exports = AuthMiddleware;
