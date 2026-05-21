const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from the root .env.local
// __dirname is d:\Websites\nextblock-monorepo\tools\scripts
const envPath = path.resolve(__dirname, '../../.env.local');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('\x1b[31m%s\x1b[0m', 'Error: .env.local not found at root.');
  process.exit(1);
}

const CRON_SECRET = process.env.CRON_SECRET;
const NEXT_PUBLIC_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:4200';

if (process.env.NEXT_PUBLIC_IS_SANDBOX !== 'true') {
  console.error(
    '\x1b[31m%s\x1b[0m',
    'Refusing to trigger sandbox reset because NEXT_PUBLIC_IS_SANDBOX is not true.',
  );
  process.exit(1);
}

if (!CRON_SECRET) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: CRON_SECRET is not set in .env.local');
  process.exit(1);
}

const url = new URL('/api/cron/reset-sandbox', NEXT_PUBLIC_URL);

console.log('\x1b[36m%s\x1b[0m', `🚀 Triggering Sandbox Reset at ${url.href}...`);

const options = {
  hostname: url.hostname,
  port: url.port,
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`
  }
};

const requestClient = url.protocol === 'https:' ? https : http;
const req = requestClient.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('\x1b[32m%s\x1b[0m', '✅ Sandbox Reset Initiated Successfully.');
      try {
        const json = JSON.parse(data);
        if (json.success) {
          console.log('\x1b[32m%s\x1b[0m', `Summary: ${json.message}`);
        } else {
          console.log('\x1b[33m%s\x1b[0m', `Status: ${data}`);
        }
      } catch {
        console.log(`Status: ${data}`);
      }
    } else {
      console.error('\x1b[31m%s\x1b[0m', `❌ Reset Failed (Status ${res.statusCode})`);
      console.error(`Response: ${data}`);
    }
  });
});

req.on('error', (e) => {
  console.error('\x1b[31m%s\x1b[0m', `❌ Request Error: ${e.message}`);
  if (e.code === 'ECONNREFUSED') {
    console.error('\x1b[33m%s\x1b[0m', '💡 Is your Next.js server running (npm run dev)?');
  }
});

req.end();
