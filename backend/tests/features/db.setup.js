import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fs from 'node:fs';

// Honor a valid test-only system binary, but never force a stale machine-specific path.
// When it is absent or invalid, mongodb-memory-server may acquire its disposable test binary.
if (process.env.MONGOMS_SYSTEM_BINARY && !fs.existsSync(process.env.MONGOMS_SYSTEM_BINARY)) {
  delete process.env.MONGOMS_SYSTEM_BINARY;
}
let replset;

export const connectDb = async () => {
  // Enforces a completely isolated, ephemeral, in-memory MongoDB replica set.
  // A replica set is required to support MongoDB transactions.
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replset.getUri();

  // Disable un-awaited background autoIndex builds that race with raw inserts
  // and multi-document transactions on MongoDB 8.0 WiredTiger.
  await mongoose.connect(uri, { autoIndex: false });

  // Deterministically pre-create collections and indexes before any test executes.
  for (const model of Object.values(mongoose.connection.models)) {
    await model.createCollection();
    await model.createIndexes();
  }
};

export const closeDb = async () => {
  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    // Drop ONLY the current connected test database
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (replset) {
    await replset.stop();
    replset = null;
  }
};

export const clearDb = async () => {
  if (mongoose.connection) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      // Clear synthetic collections created by the current test
      await collection.deleteMany({});
    }
  }
};
