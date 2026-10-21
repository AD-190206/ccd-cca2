const express = require('express');
const os = require('os');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'CCA 2 Demo App',
    version: process.env.APP_VERSION || '1.0.0',
    hostname: os.hostname(),
  });
});

module.exports = app;
