const axios = require('axios');

async function testPost() {
  const tokenResponse = await axios.post('http://localhost:3000/api/v1/auth/login', {
    phone: '9876543210',
    otp: '123456',
  });
  const token = tokenResponse.data.data.token;
  
  const payload = {
    passType: 'CAB',
    isPrivate: false,
    visitorDetails: {
      name: 'KAVYA CUSTOM CABS Driver'
    },
    vehicleDetails: {
      vendor: 'KAVYA CUSTOM CABS',
      number: 'UNKNOWN',
      vehicleType: 'CAB'
    },
    purpose: 'CAB Pre-Approval via KAVYA CUSTOM CABS',
    validity: {
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString()
    },
    usageLimit: {
      maxUses: 1
    }
  };

  try {
    const res = await axios.post('http://localhost:3000/api/v1/visitor/passes', payload, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

testPost();
