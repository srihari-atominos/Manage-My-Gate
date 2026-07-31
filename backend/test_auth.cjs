const jwt = require('jsonwebtoken');
const fs = require('fs');
const http = require('http');

// load env
const envPath = '.env';
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    envVars[key.trim()] = values.join('=').trim();
  }
});

const token = jwt.sign({ id: '6a47a721444a6291458e2371' }, envVars.JWT_SECRET, { expiresIn: '1h' });

const options = {
  hostname: 'localhost',
  port: 5002,
  path: '/api/villas/bulk-upload/template',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token,
    'x-organization-id': '6a620b0b74726e631b7294bb' // from user's logs
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.on('data', chunk => {
    console.log(`BODY: ${chunk.toString()}`);
  });
  res.on('end', () => {
    console.log('No more data in response.');
  });
});

req.on('error', e => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
