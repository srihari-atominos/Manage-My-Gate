import http from 'http';

const data = JSON.stringify({
  token: '5c21b5eb386fb2e3f677e3d7774f265409dc0bf7046e65f1605c67ac4a2cdd1a',
  password: 'Password@123'
});

const options = {
  hostname: 'localhost',
  port: 5002,
  path: '/api/auth/accept-invite',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
