const test = require('node:test');
const assert = require('node:assert');
const app = require('../app');
const store = require('../store');

let server;
let base;

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(() => server.close());
test.beforeEach(() => store.reset(true));

test('GET /health returns ok', async () => {
  const r = await call('GET', '/health');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.status, 'ok');
});

test('GET /api/info returns app info', async () => {
  const r = await call('GET', '/api/info');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.version);
  assert.ok(r.body.hostname);
});

test('GET / serves the home page', async () => {
  const res = await fetch(`${base}/`);
  assert.strictEqual(res.status, 200);
  assert.ok((await res.text()).includes('Task Tracker'));
});

test('GET /api/tasks lists seeded tasks', async () => {
  const r = await call('GET', '/api/tasks');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.length, 3);
});

test('POST /api/tasks creates a task', async () => {
  const r = await call('POST', '/api/tasks', { title: '  Write report  ', priority: 'high' });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.title, 'Write report');
  assert.strictEqual(r.body.priority, 'high');
  assert.strictEqual(r.body.done, false);
});

test('POST /api/tasks defaults priority to medium', async () => {
  const r = await call('POST', '/api/tasks', { title: 'Default priority' });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.priority, 'medium');
});

test('POST /api/tasks rejects empty title', async () => {
  const r = await call('POST', '/api/tasks', { title: '   ' });
  assert.strictEqual(r.status, 400);
});

test('POST /api/tasks rejects invalid priority', async () => {
  const r = await call('POST', '/api/tasks', { title: 'x', priority: 'urgent' });
  assert.strictEqual(r.status, 400);
});

test('PATCH marks a task done and filters work', async () => {
  const r = await call('PATCH', '/api/tasks/1', { done: true });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.done, true);

  const done = await call('GET', '/api/tasks?status=done');
  assert.strictEqual(done.body.length, 1);
  const active = await call('GET', '/api/tasks?status=active');
  assert.strictEqual(active.body.length, 2);
});

test('PATCH on missing task returns 404', async () => {
  const r = await call('PATCH', '/api/tasks/999', { done: true });
  assert.strictEqual(r.status, 404);
});

test('DELETE removes a task', async () => {
  const r = await call('DELETE', '/api/tasks/1');
  assert.strictEqual(r.status, 204);
  const list = await call('GET', '/api/tasks');
  assert.strictEqual(list.body.length, 2);
});

test('GET /api/stats returns counts', async () => {
  await call('PATCH', '/api/tasks/1', { done: true });
  const r = await call('GET', '/api/stats');
  assert.deepStrictEqual(r.body, { total: 3, done: 1, active: 2 });
});

test('invalid status filter returns 400', async () => {
  const r = await call('GET', '/api/tasks?status=bogus');
  assert.strictEqual(r.status, 400);
});

test('home page includes the theme toggle', async () => {
  const res = await fetch(`${base}/`);
  assert.ok((await res.text()).includes('theme-toggle'));
});
