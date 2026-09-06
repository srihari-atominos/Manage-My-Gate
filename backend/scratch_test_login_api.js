import fetch from 'node-fetch';

async function testLogin() {
  const response = await fetch('http://localhost:5002/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: 'kayal@test.com',
      password: 'Password@123'
    })
  });
  
  const data = await response.json();
  console.log(response.status, data);
}

testLogin();
