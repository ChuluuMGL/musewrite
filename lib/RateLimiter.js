/**
 * AI-Writer 速率限制中间件
 */

class RateLimiter {
  constructor(options = {}) {
    this.requestsPerMinute = options.requestsPerMinute || 60;
    this.requestsPerHour = options.requestsPerHour || 1000;
    this.buckets = new Map();
    setInterval(() => this.cleanup(), options.cleanupInterval || 60000);
  }

  checkLimit(identifier) {
    const now = Date.now();
    const bucket = this.getBucket(identifier, now);
    const minuteRequests = bucket.requests.filter((t) => t > now - 60000).length;
    if (minuteRequests >= this.requestsPerMinute) {
      return {
        allowed: false,
        reason: 'rate_limit_minute',
        retryAfter: Math.ceil(
          (bucket.requests[minuteRequests - this.requestsPerMinute] + 60000 - now) / 1000
        )
      };
    }
    const hourRequests = bucket.requests.filter((t) => t > now - 3600000).length;
    if (hourRequests >= this.requestsPerHour) {
      return {
        allowed: false,
        reason: 'rate_limit_hour',
        retryAfter: Math.ceil(
          (bucket.requests[hourRequests - this.requestsPerHour] + 3600000 - now) / 1000
        )
      };
    }
    bucket.requests.push(now);
    return {allowed: true};
  }

  getBucket(identifier, now) {
    if (!this.buckets.has(identifier)) this.buckets.set(identifier, {requests: [], createdAt: now});
    const bucket = this.buckets.get(identifier);
    bucket.requests = bucket.requests.filter((t) => t > now - 3600000);
    return bucket;
  }

  cleanup() {
    const now = Date.now();
    for (const [identifier, bucket] of this.buckets.entries()) {
      if (
        bucket.requests.length === 0 ||
        bucket.requests[bucket.requests.length - 1] < now - 3600000
      )
        this.buckets.delete(identifier);
    }
  }

  middleware(req, res) {
    const identifier = req.user?.name || req.ip || 'anonymous';
    const result = this.checkLimit(identifier);
    if (!result.allowed) {
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': result.retryAfter.toString()
      });
      res.end(
        JSON.stringify({
          success: false,
          error: 'Too Many Requests',
          message: result.reason === 'rate_limit_minute' ? '分钟请求数超限' : '小时请求数超限',
          retryAfter: result.retryAfter
        })
      );
      return false;
    }
    return true;
  }
}

module.exports = RateLimiter;
