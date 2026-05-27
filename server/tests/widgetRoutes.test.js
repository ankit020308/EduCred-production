import express from 'express';
import request from 'supertest';

process.env.CLIENT_URL = 'https://educred.in';
process.env.SERVER_URL = 'https://evil.com"; alert(1)//';
process.env.BUILD_HASH = 'build-123';

const { default: widgetRoutes } = await import('../routes/widgetRoutes.js');

function makeApp() {
  const app = express();
  app.use('/api/widget', widgetRoutes);
  return app;
}

describe('widget route hardening', () => {
  it('JSON-escapes env URLs so generated widget JavaScript remains syntactically valid', async () => {
    const res = await request(makeApp()).get('/api/widget/verify.js?v=build-123');

    expect(res.status).toBe(200);
    expect(res.text).toContain('var API_BASE="https://evil.com\\"; alert(1)//";');
    expect(() => new Function(res.text)).not.toThrow();
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers['x-educred-widget-version']).toBe('build-123');
  });

  it('does not apply long-lived caching to unversioned widget URLs', async () => {
    const res = await request(makeApp()).get('/api/widget/verify.js');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-cache');
  });
});
