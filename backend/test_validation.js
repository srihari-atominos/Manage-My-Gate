import { validationResult } from 'express-validator';
import { createPassRules } from './src/features/visitorPass/visitorPass.validator.js';

const req = {
  body: {
    orgId: "60d21b4667d0d8992e610c99",
    createdById: "60d21b4667d0d8992e610c85",
    passType: "CAB",
    visitorDetails: {
        name: "Kavya Custom Cabs Driver",
        phone: ""
    },
    purpose: "Cab / Taxi Service - KAVYA CUSTOM CABS",
    validity: {
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    },
    vehicleDetails: {
      vehicleNo: "MH1234",
      vehicleType: "CAB",
      vendor: "KAVYA CUSTOM CABS"
    }
  }
};

async function runValidation() {
  for (let validation of createPassRules) {
    await validation(req, {}, () => {});
  }
  const errors = validationResult(req);
  console.log(JSON.stringify(errors.array(), null, 2));
}

runValidation();
