import axios from 'axios';

async function test() {
  try {
    // You might need a token, but let's see if the endpoint is protected
    const res = await axios.post('http://localhost:5000/api/crm/inquiries', {
      customerName: 'Test Customer',
      organizationName: 'Test Org',
      unitCount: 10,
      contactEmail: 'test@example.com',
      contactPhone: '1234567890',
      originSource: 'MANUAL',
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}
test();
