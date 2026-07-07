import mongoose from 'mongoose';
import { paymentEventEmitter, PAYMENT_SUCCESS } from './src/features/payment/payment.events.js';

// Load models and listeners
import './src/features/amenityBooking/amenityBooking.model.js';
import './src/features/payment/payment.model.js';
import './src/features/amenityBooking/amenityBooking.listeners.js';
import './src/features/wallet/wallet.service.js'; // To trigger wallet update

async function testSimulate() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
    console.log('Connected to DB');
    const db = mongoose.connection.db;
    
    // Find a payment that succeeded but its corresponding booking is still pending
    const booking = await db.collection('amenitybookings').findOne({ status: 'pending' });
    if (!booking) {
      console.log('No pending booking found');
      process.exit(0);
    }
    
    const paymentDoc = await db.collection('payments').findOne({ referenceId: booking._id });
    if (!paymentDoc) {
      console.log('No payment found for booking');
      process.exit(0);
    }
    
    // Create a Mongoose document instance to pass to the event emitter
    const Payment = mongoose.model('Payment');
    const paymentModelInst = new Payment(paymentDoc);
    paymentModelInst.isNew = false;
    
    console.log('Simulating PAYMENT_SUCCESS emission for booking:', booking._id.toString());
    paymentEventEmitter.emit(PAYMENT_SUCCESS, paymentModelInst);
    
    // Wait a little for async listeners to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const updatedBooking = await db.collection('amenitybookings').findOne({ _id: booking._id });
    console.log('Updated booking status:', updatedBooking?.status);
    console.log('Updated booking QR:', updatedBooking?.qrStatus);
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testSimulate();
