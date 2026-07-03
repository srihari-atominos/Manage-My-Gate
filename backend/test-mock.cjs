const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  
  const originalStartSession = mongoose.startSession;
  mongoose.startSession = async function() {
    const session = await originalStartSession.apply(mongoose, arguments);
    
    // Check if we are connected to a standalone server
    // A standalone server topology type is usually 'Single'
    const topologyType = mongoose.connection.getClient().topology.description.type;
    const isStandalone = topologyType === 'Single' || topologyType === 'Unknown';

    if (isStandalone) {
      // Mock the transaction methods
      session.startTransaction = () => { console.log('Mocked startTransaction'); };
      session.commitTransaction = async () => { console.log('Mocked commitTransaction'); };
      session.abortTransaction = async () => { console.log('Mocked abortTransaction'); };
    }
    
    return session;
  };

  const session = await mongoose.startSession();
  session.startTransaction();
  
  await mongoose.connection.db.collection('users').insertOne({ name: 'test' }, { session });
  
  await session.commitTransaction();
  session.endSession();
  
  console.log('Success!');
  process.exit(0);
}

test().catch(console.error);
