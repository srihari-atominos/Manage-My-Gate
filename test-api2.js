import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://localhost:5001/api/v1/amenities', {
        name: 'Test Amenity 2',
        type: 'Event Space',
        location: 'Rooftop',
        description: 'Test description',
        capacity: 50,
        status: 'active',
        maxBookingsPerUserPerSlot: 2,
        pricing: { pricingType: 'hourly', baseRate: 500, securityDeposit: 0 },
        bookingRules: {
          openTime: '08:00',
          closeTime: '21:00',
          slotDurationMinutes: 60,
          bufferTimeMinutes: 0,
          advanceBookingDays: 7,
          isCancellationEnabled: false,
          cancellationRefundRules: [],
        },
        openDays: [0, 1, 2, 3, 4, 5, 6],
        images: [],
    });
    console.log(res.data);
  } catch (err) {
    console.log(err.response ? err.response.data : err.message);
  }
}
test();
