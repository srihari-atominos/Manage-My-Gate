const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
  const db = mongoose.connection.db;

  try {
    const authService = (await import('./src/features/auth/auth.services.js')).default;
    const user = await db.collection('users').findOne({ email: 'guard123@enterprise.com' });
    
    if (user) {
      const { tokenPayload, permissions } = await authService.getScopedTokenPayload(user);
      console.log('Roles:', tokenPayload.roles);
      console.log('Permissions:', permissions);
    } else {
      console.log('User not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

run();
