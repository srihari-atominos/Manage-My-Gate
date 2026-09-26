import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const legacyIndexName = 'userId_1';
const expectedIndexName = 'userId_1_orgId_1';
const expectedKey = { userId: 1, orgId: 1 };

const hasKey = (index, key) =>
  JSON.stringify(index?.key || {}) === JSON.stringify(key);

async function migrateWalletPerOrganizationIndex() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to migrate wallet indexes.');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const wallets = mongoose.connection.collection('wallets');
    const existingIndexes = await wallets.indexes();
    const compoundIndex = existingIndexes.find((index) => hasKey(index, expectedKey));

    if (!compoundIndex) {
      await wallets.createIndex(expectedKey, {
        name: expectedIndexName,
        unique: true,
      });
    } else if (!compoundIndex.unique) {
      throw new Error(
        `Wallet index '${compoundIndex.name}' must be unique for { userId, orgId }. Resolve duplicate wallet records before retrying.`
      );
    }

    const legacyIndex = existingIndexes.find(
      (index) => index.name === legacyIndexName && hasKey(index, { userId: 1 })
    );

    if (legacyIndex) {
      await wallets.dropIndex(legacyIndexName);
      console.log(`Removed obsolete wallet index '${legacyIndexName}'.`);
    } else {
      console.log(`Obsolete wallet index '${legacyIndexName}' was not present.`);
    }

    const verifiedIndexes = await wallets.indexes();
    const hasExpectedIndex = verifiedIndexes.some(
      (index) => hasKey(index, expectedKey) && index.unique === true
    );
    const hasLegacyIndex = verifiedIndexes.some(
      (index) => index.name === legacyIndexName && hasKey(index, { userId: 1 })
    );

    if (!hasExpectedIndex || hasLegacyIndex) {
      throw new Error('Wallet index migration verification failed.');
    }

    console.log('Wallet indexes now support one wallet per user per organization.');
  } finally {
    await mongoose.disconnect();
  }
}

migrateWalletPerOrganizationIndex().catch((error) => {
  console.error(`Wallet index migration failed: ${error.message}`);
  process.exitCode = 1;
});
