const express = require('express');
const os = require('os');
const path = require('path');
const store = require('./store');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const startedAt = Date.now();

function validateTitle(title) {
  if (typeof title !== 'string' || title.trim() === '') {
    return 'title is required';
  }
  if (title.trim().length > 100) {
    return 'title must be at most 100 characters';
  }
  return null;
}

function validatePriority(priority) {
  if (!store.PRIORITIES.includes(priority)) {
    return `priority must be one of: ${store.PRIORITIES.join(', ')}`;
  }
  return null;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'Task Tracker',
    version: process.env.APP_VERSION || '1.0.0',
    hostname: os.hostname(),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  });
});

app.get('/api/stats', (req, res) => {
  res.json(store.stats());
});

app.get('/api/tasks', (req, res) => {
  const status = req.query.status || 'all';
  if (!['all', 'active', 'done'].includes(status)) {
    return res.status(400).json({ error: 'status must be all, active or done' });
  }
  res.json(store.list(status));
});

app.post('/api/tasks', (req, res) => {
  const { title, priority } = req.body || {};
  const titleError = validateTitle(title);
  if (titleError) return res.status(400).json({ error: titleError });
  if (priority !== undefined) {
    const pError = validatePriority(priority);
    if (pError) return res.status(400).json({ error: pError });
  }
  const task = store.create({ title: title.trim(), priority });
  res.status(201).json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const task = store.find(Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'task not found' });

  const { title, priority, done } = req.body || {};
  if (title !== undefined) {
    const e = validateTitle(title);
    if (e) return res.status(400).json({ error: e });
    task.title = title.trim();
  }
  if (priority !== undefined) {
    const e = validatePriority(priority);
    if (e) return res.status(400).json({ error: e });
    task.priority = priority;
  }
  if (done !== undefined) {
    if (typeof done !== 'boolean') {
      return res.status(400).json({ error: 'done must be true or false' });
    }
    task.done = done;
  }
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const ok = store.remove(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'task not found' });
  res.status(204).end();
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'not found' });
});

// Handles malformed JSON bodies and other errors
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid JSON body' });
  }
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

module.exports = app;
