/**
 * AI-Writer 请求 ID 中间件（幂等性）
 */

const crypto = require('crypto');

class RequestIdMiddleware {
  constructor(windowMs = 300000) {
    this.windowMs = windowMs;
    this.requests = new Map();
    setInterval(() => this.cleanup(), windowMs);
  }

  generateId() {
    return `req_${crypto.randomBytes(8).toString('hex')}`;
  }
  calculateFingerprint(body) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(body));
    return hash.digest('hex').substring(0, 16);
  }

  checkDuplicate(requestId, body) {
    if (!requestId) return {duplicate: false};
    const fingerprint = this.calculateFingerprint(body);
    const key = `${requestId}:${fingerprint}`;
    if (this.requests.has(key)) {
      const original = this.requests.get(key);
      return {
        duplicate: true,
        originalRequestId: requestId,
        originalResponse: original.response,
        createdAt: original.createdAt
      };
    }
    return {duplicate: false};
  }

  recordRequest(requestId, body, response) {
    const fingerprint = this.calculateFingerprint(body);
    const key = `${requestId}:${fingerprint}`;
    this.requests.set(key, {requestId, body, response, createdAt: Date.now()});
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now - record.createdAt > this.windowMs) this.requests.delete(key);
    }
  }

  middleware(req, _res) {
    const requestId = req.headers['x-request-id'] || this.generateId();
    req.requestId = requestId;
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const duplicate = this.checkDuplicate(requestId, parsed);
          req.isDuplicate = duplicate.duplicate;
          req.originalResponse = duplicate.originalResponse;
        } catch (_e) {
          req.isDuplicate = false;
        }
      });
    }
    return true;
  }
}

module.exports = RequestIdMiddleware;
