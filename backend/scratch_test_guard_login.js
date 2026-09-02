import mongoose from 'mongoose';
import authService from './src/features/auth/auth.services.js';
import { signToken } from './src/features/auth/token.utils.js';

async function testLogin() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
    
    const loginData = {
      login: 'guard123@enterprise.com',
      password: 'Password@123'
    };
    
    const result = await authService.login(loginData, { ip: '127.0.0.1', userAgent: 'test' });
    console.log('Login result user payload:', JSON.stringify(result.user, null, 2));
    console.log('Available workspaces:', JSON.stringify(result.availableWorkspaces, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    mongoose.disconnect();
  }
}
testLogin();
