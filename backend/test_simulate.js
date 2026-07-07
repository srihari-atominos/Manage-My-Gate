import mongoose from 'mongoose';
import paymentService from './src/features/payment/payment.service.js';

// Load models and listeners
import './src/features/amenityBooking/amenityBooking.model.js';
import './src/features/payment/payment.model.js';
import './src/features/amenityBooking/amenityBooking.listeners.js';

async function testSimulate() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
    console.log('Connected to DB');
    const db = mongoose.connection.db;
    
    // Find a pending payment
    const paymentDoc = await db.collection('payments').findOne({ status: 'pending' });
    if (!paymentDoc) {
      console.log('No pending payment found');
      process.exit(0);
    }
    
    console.log('Simulating success for payment:', paymentDoc._id.toString());
    await paymentService.simulatePaymentCallback(paymentDoc._id.toString(), true, null);
    
    // Wait a little for async listeners to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const updatedBooking = await db.collection('amenitybookings').findOne({ _id: paymentDoc.referenceId });
    console.log('Updated booking status:', updatedBooking?.status);
    console.log('Updated booking QR:', updatedBooking?.qrStatus);
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testSimulate();
