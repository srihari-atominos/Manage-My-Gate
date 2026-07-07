import express from 'express';
import { createAmenityRules } from './src/features/amenity/amenity.validateRules.js';
import { validationResult } from 'express-validator';

const app = express();
app.use(express.json());

app.post('/test', createAmenityRules, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  res.json({ success: true });
});

const reqBody = {
  name: 'Test',
  type: 'Event Space',
  location: '123',
  description: '',
  capacity: 50,
  pricing: { pricingType: 'hourly', baseRate: 500, securityDeposit: 0 },
  images: [],
  bookingRules: { openTime: '08:00', closeTime: '21:00', slotDurationMinutes: 60, bufferTimeMinutes: 0, maxBookingsPerUserPerDay: 1, advanceBookingDays: 7 },
  openDays: [0, 1, 2, 3, 4, 5, 6],
  status: 'active'
};

import fetch from 'node-fetch';

const server = app.listen(0, async () => {
  const port = server.address().port;
  try {
    const response = await fetch(`http://localhost:${port}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    });
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    server.close();
  }
});
