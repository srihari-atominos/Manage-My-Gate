import mongoose from 'mongoose';

async function clearBookings() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate?retryWrites=false');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    const bookingResult = await db.collection('amenitybookings').deleteMany({});
    console.log(`Deleted ${bookingResult.deletedCount} bookings.`);

    const walletResult = await db.collection('wallettransactions').deleteMany({
      type: 'Booking Payment'
    });
    console.log(`Deleted ${walletResult.deletedCount} booking-related wallet transactions.`);

    console.log('Successfully cleared all bookings.');
  } catch (error) {
    console.error('Error clearing bookings:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

clearBookings();
