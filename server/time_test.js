const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({ id: 1, role: 'ADMIN', companyId: 1 }, "supersecret_dev_key");

const endpoints = [
  '/dashboard/summary',
  '/dashboard/daily-closings',
  '/dashboard/performance',
  '/dashboard/performance/branches-history',
  '/dashboard/financials',
  '/dashboard/agents',
  '/dashboard/closers',
  '/dashboard/history'
];

async function measure(path) {
  const start = Date.now();
  return new Promise((resolve) => {
    http.get(`http://localhost:3001${path}`, { headers: { Authorization: `Bearer ${token}` } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`${path} took ${Date.now() - start}ms (status: ${res.statusCode}, size: ${data.length})`);
        resolve();
      });
    }).on('error', (err) => {
      console.log(`${path} error:`, err.message);
      resolve();
    });
  });
}

async function run() {
  for (const ep of endpoints) {
    await measure(ep);
  }
}
run();
