import mongoose from 'mongoose';
import QRCode from 'qrcode';

async function testQR() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
    console.log('Connected to DB');
    const db = mongoose.connection.db;
    
    // Find a pending booking
    const booking = await db.collection('amenitybookings').findOne({ status: 'pending' });
    if (!booking) {
      console.log('No pending booking found');
      process.exit(0);
    }
    
    console.log('Found booking:', booking._id);
    
    const generateBookingId = () => `BKG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const bookingIdStr = booking.bookingId || generateBookingId();
    
    const qrData = JSON.stringify({ 
      bookingId: booking._id, 
      displayId: bookingIdStr, 
      userId: booking.userId, 
      amenityId: booking.amenityId 
    });
    
    console.log('QR Data:', qrData);
    
    const qrCodeUrl = await QRCode.toDataURL(qrData);
    console.log('QR Code URL generated (first 50 chars):', qrCodeUrl.substring(0, 50));
    
    // Test the update
    const result = await db.collection('amenitybookings').findOneAndUpdate(
      { _id: booking._id, orgId: booking.orgId },
      { 
        $set: {
          status: 'confirmed',
          paymentStatus: 'success',
          bookingId: bookingIdStr,
          qrCode: qrCodeUrl,
          qrStatus: 'active',
          qrGeneratedAt: new Date(),
          qrExpiresAt: new Date(`${booking.bookingDate}T${booking.endTime}`)
        }
      },
      { returnDocument: 'after' }
    );
    
    console.log('Update result status:', result?.status);
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testQR();
