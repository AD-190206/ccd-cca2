const test = require('node:test');
const assert = require('node:assert');
const app = require('../app');

let server;
let base;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(() => server.close());

test('GET /health returns ok', async () => {
  const res = await fetch(`${base}/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, 'ok');
});

test('GET /api/info returns app info', async () => {
  const res = await fetch(`${base}/api/info`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body.version);
  assert.ok(body.hostname);
});

test('GET / serves the home page', async () => {
  const res = await fetch(`${base}/`);
  assert.strictEqual(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('CCA 2 Demo App'));
});
