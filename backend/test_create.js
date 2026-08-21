import axios from 'axios';

async function testCreate() {
  try {
    const res = await axios.post('http://localhost:5002/api/visitor-pass', {
      orgId: "6a6efd60f62f21f2b26eb9a0",
      createdById: "6a5e1141535fb0914c15b746",
      passType: "CAB",
      visitorDetails: {
          name: "OLA Driver"
      },
      purpose: "Cab / Taxi Service - OLA",
      validity: {
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
      },
      vehicleDetails: {
        vehicleNo: "MH1234",
        vehicleType: "CAB",
        vendor: "OLA"
      },
      usageLimit: {
        maxUses: 1
      }
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.log("Error:", err.response?.data || err.message);
  }
}
testCreate();
