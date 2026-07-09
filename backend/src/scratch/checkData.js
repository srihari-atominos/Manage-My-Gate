async function testApi() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
      login: 'naveen12rvb2022@gmail.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginRes.json();
    console.log('Login Response:', loginData);
    if (!loginData.data || !loginData.data.token) {
      console.log('Failed to login. Exiting.');
      return;
    }
    const token = loginData.data.token;
    const orgId = loginData.data.user.orgId;

    const complaintsRes = await fetch('http://localhost:5000/api/complaints', {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-organization-id': orgId
      }
    });

    const complaintsData = await complaintsRes.json();
    console.log('Complaints Response:', JSON.stringify(complaintsData, null, 2));
    if (complaintsData.data && complaintsData.data.complaints) {
      console.log(`Fetched ${complaintsData.data.complaints.length} complaints.`);
      for (const c of complaintsData.data.complaints) {
        console.log(`- ${c.complaintNumber} | isBroadcast: ${c.isBroadcast} | broadcastTechnicianIds:`, c.broadcastTechnicianIds);
      }
    }
  } catch (error) {
    console.error('API Error:', error.message);
  }
}

testApi();
