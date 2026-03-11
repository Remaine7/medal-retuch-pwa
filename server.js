const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Простое хранилище баланса токенов по IP (для демо)
const balances = {};
function getClientId(req) {
  // Для локальной разработки достаточно IP
  return req.socket.remoteAddress || 'default';
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    if (!body) return callback({});
    try {
      const json = JSON.parse(body);
      callback(json);
    } catch {
      callback({});
    }
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const { pathname } = parsedUrl;

  // API токенов
  if (pathname === '/api/tokens' && req.method === 'GET') {
    const id = getClientId(req);
    const balance = balances[id] ?? 0;
    return sendJson(res, 200, { balance });
  }

  if ((pathname === '/api/tokens/buy' || pathname === '/api/tokens/consume') && req.method === 'POST') {
    return parseBody(req, body => {
      const id = getClientId(req);
      const amount = Number(body?.amount) || (pathname === '/api/tokens/consume' ? 1 : 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        return sendJson(res, 400, { error: 'amount must be > 0' });
      }
      const current = balances[id] ?? 0;

      if (pathname === '/api/tokens/buy') {
        const balance = current + amount;
        balances[id] = balance;
        return sendJson(res, 200, { balance });
      }

      // consume
      if (current < amount) {
        return sendJson(res, 400, { error: 'NO_TOKENS', balance: current });
      }
      const balance = current - amount;
      balances[id] = balance;
      return sendJson(res, 200, { balance });
    });
  }

  // Статика
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const map = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.json': 'application/json; charset=utf-8'
    };
    const type = map[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Gran-Color server running on http://localhost:${PORT}`);
});

