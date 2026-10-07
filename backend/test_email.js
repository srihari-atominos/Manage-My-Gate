
import('./src/features/user/user.listeners.js').then(async () => {
  console.log('Emitting event...');
  const { default: userEvents } = await import('./src/features/user/user.events.js');
  userEvents.emit('USER_INVITED', {
    email: 'test@example.com',
    orgId: '64f7b6b10f1c2b001c1f0b4d', 
    invitationToken: 'testtoken',
    invitationSource: 'WEB',
    villaId: null,
    roleName: 'Resident',
    userId: null,
    inviterId: null,
    isExisting: false,
    isBulk: true,
    rawPassword: 'MySecretPassword123'
  });
  
  setTimeout(() => console.log('Done waiting'), 5000);
}).catch(console.error);

