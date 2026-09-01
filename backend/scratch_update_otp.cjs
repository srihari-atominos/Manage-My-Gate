const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // or bcryptjs depending on the project
(async () => {
  try {
    const hash = await require('bcrypt').hash('123456', 10);
    await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
    await mongoose.connection.db.collection('otps').updateOne(
      { identifier: '7418747098' },
      { $set: { code: hash, attempts: 0 } }
    );
    console.log('OTP updated to 123456');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
