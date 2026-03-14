/**
 * API Integration Tests
 */

const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..', '..');

describe('API Integration', () => {
  let server;
  let serverAddress;

  beforeAll((done) => {
    // Mock server for testing
    const express = require('express');
    const app = express();
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({status: 'ok'});
    });

    // Generate endpoint
    app.post('/api/v1/generate', (req, res) => {
      res.json({
        success: true,
        draft: {
          title: 'Test Title',
          content: 'Test Content',
          tags: ['test']
        }
      });
    });

    server = app.listen(0, () => {
      serverAddress = `http://localhost:${server.address().port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Health Check', () => {
    test('should return ok status', (done) => {
      http.get(`${serverAddress}/health`, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const result = JSON.parse(data);
          expect(result.status).toBe('ok');
          done();
        });
      });
    });
  });

  describe('Generate API', () => {
    test('should generate content', (done) => {
      const postData = JSON.stringify({
        source: 'Test source content',
        platform: 'xiaohongshu'
      });

      const url = new URL(`${serverAddress}/api/v1/generate`);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const result = JSON.parse(data);
          expect(result.success).toBe(true);
          expect(result.draft).toBeDefined();
          done();
        });
      });

      req.write(postData);
      req.end();
    });
  });
});
