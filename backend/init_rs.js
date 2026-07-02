import { MongoClient } from 'mongodb';
async function initRS() {
  const uri = 'mongodb://127.0.0.1:27018/?directConnection=true';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const adminDb = client.db('admin');
    const result = await adminDb.command({ replSetInitiate: {} });
    console.log('Initiated successfully:', result);
  } catch (error) {
    if (error.codeName === 'AlreadyInitialized' || error.message.includes('already initialized')) {
      console.log('Replica set is already initialized.');
    } else {
      console.error('Error initiating replica set:', error);
    }
  } finally {
    await client.close();
  }
}
initRS();
