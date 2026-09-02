import http from 'http';

const email = 'guard123@enterprise.com';
const password = 'Password@123';

const postData = JSON.stringify({ login: email, password });

const req = http.request({
  hostname: 'localhost',
  port: 5002,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const response = JSON.parse(body);
    if (!response.data || !response.data.token) {
      console.log('Login failed:', response);
      return;
    }
    
    const token = response.data.token;
    console.log('Token generated');
    
    // Now make the Walk-in request
    const walkInPayload = JSON.stringify({
      orgId: '6a6efd60f62f21f2b26eb9a0',
      guardId: response.data.user.id || response.data.user._id,
      residentId: '6a5e0e34535fb0914c15b6d5', 
      entryType: 'WALK_IN',
      snapshot: {
        visitorName: 'Rahul',
        idProofNumber: '',
        vehicleNumber: ''
      },
      phone: '7864534234'
    });
    
    const req2 = http.request({
      hostname: 'localhost',
      port: 5002,
      path: '/api/v1/visitor-log/walk-in',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': walkInPayload.length
      }
    }, res2 => {
      let body2 = '';
      res2.on('data', d => body2 += d);
      res2.on('end', () => console.log('Status:', res2.statusCode, 'Body:', body2));
    });
    
    req2.write(walkInPayload);
    req2.end();
  });
});

req.write(postData);
req.end();
