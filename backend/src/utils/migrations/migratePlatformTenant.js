import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';
import Organization from '../../features/organization/organization.model.js';
import User from '../../features/user/user.model.js';
import Role from '../../features/role/role.model.js';
import OrgMembership from '../../features/orgMembership/orgMembership.model.js';
import logger from '../logger.utils.js';

/**
 * Executes the database migration sequence to convert isPlatformAdmin to Platform Super Admin OrgMembership
 * inside the given Mongoose ClientSession.
 * 
 * @param {import('mongoose').ClientSession} session
 * @returns {Promise<void>}
 */
export const migratePlatformTenant = async (session) => {
  logger.info('Starting Phase 1 platform-tenant migration sequence...');

  // 1. Create a single Organization document named "System Platform" with isPlatform: true and status: 'Active'
  const orgs = await Organization.create(
    [
      {
        name: 'System Platform',
        isPlatform: true,
        status: 'Active',
      },
    ],
    { session }
  );
  const platformOrg = orgs[0];
  const orgId = platformOrg._id;
  logger.info(`Created platform Organization: "System Platform" with ID: ${orgId}`);

  // 2. Create a global Role document named "Platform Super Admin" linked to this new organization's ID
  const roles = await Role.create(
    [
      {
        name: 'Platform Super Admin',
        orgId: orgId,
        description: 'Global administrator role for the System Platform workspace.',
      },
    ],
    { session }
  );
  const platformSuperAdminRole = roles[0];
  const roleId = platformSuperAdminRole._id;
  logger.info(`Created platform Role: "Platform Super Admin" with ID: ${roleId}`);

  // 3. Query the database for all User documents where isPlatformAdmin: true
  // Note: Since we removed the field from the schema, we query using { isPlatformAdmin: true } directly
  // which works in mongoose/mongo regardless of schema presence when using find.
  const platformAdmins = await User.find({ isPlatformAdmin: true }).session(session);
  logger.info(`Found ${platformAdmins.length} users with isPlatformAdmin: true`);

  // 4. For each of these users:
  for (const user of platformAdmins) {
    const userId = user._id;

    // Create an OrgMembership document linking their userId, the new platform orgId, and the new roleId
    await OrgMembership.create(
      [
        {
          userId,
          orgId,
          roleIds: [roleId],
        },
      ],
      { session }
    );
    logger.info(`Created OrgMembership linking User: ${user.username || user.email} (ID: ${userId}) to System Platform Org`);

    // Update the user document using $unset to permanently remove the isPlatformAdmin field from their record
    // We pass strict: false so mongoose doesn't filter out the $unset operator since isPlatformAdmin is no longer defined in schema.
    await User.updateOne(
      { _id: userId },
      { $unset: { isPlatformAdmin: '' } },
      { session, strict: false }
    );
    logger.info(`Permanently removed isPlatformAdmin flag from User: ${user.username || user.email}`);
  }

  logger.info('Phase 1 platform-tenant migration sequence completed successfully.');
};

// Check if this script is executed directly
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && __filename === path.resolve(process.argv[1]);

if (isMain) {
  const runStandalone = async () => {
    logger.info('Executing migration script in standalone mode...');
    let session = null;
    try {
      // Connect to DB using config and connection config
      const { default: connectToDb } = await import('../../config/db/mongodbConnectToDb.config.js');
      await connectToDb();

      // Start Mongoose Transaction session
      session = await mongoose.startSession();
      session.startTransaction();

      // Run migration
      await migratePlatformTenant(session);

      // Commit transaction
      await session.commitTransaction();
      logger.info('Migration transaction successfully committed!');
      process.exit(0);
    } catch (error) {
      logger.error('Migration transaction FAILED! Aborting transaction...', error);
      if (session) {
        try {
          await session.abortTransaction();
          logger.info('Transaction successfully aborted. Rollback complete.');
        } catch (abortError) {
          logger.error('Failed to abort transaction:', abortError);
        }
      }
      process.exit(1);
    } finally {
      if (session) {
        session.endSession();
      }
      // Close Mongoose connection
      await mongoose.disconnect();
      logger.info('Disconnected from MongoDB.');
    }
  };

  runStandalone();
}
