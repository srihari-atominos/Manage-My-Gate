import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import permissionService from '../features/permission/permission.services.js';
import roleService from '../features/role/role.services.js';
import rolePermissionService from '../features/rolePermission/rolePermission.services.js';
import userService from '../features/user/user.services.js';
import logger from './logger.utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Reads permissions.json, syncs all permission entries to MongoDB,
 * maps all permissions to the 'Super Admin' role, and bootstraps a Super Admin user.
 */
export const syncPermissions = async () => {
  try {
    logger.info('Starting permission synchronization and Super Admin bootstrapping...');

    // 1. Read the permissions.json list
    const permissionsPath = path.resolve(__dirname, '../config/permissions.json');
    const fileData = await readFile(permissionsPath, 'utf8');
    const features = JSON.parse(fileData);

    // 2. Upsert permissions
    const upsertedPermissions = [];
    for (const item of features) {
      const { feature, actions } = item;
      for (const action of actions) {
        const permission = await permissionService.upsertPermission(feature, action);
        upsertedPermissions.push(permission);
      }
    }
    // 2b. Clean up deleted/obsolete permissions in database
    const PermissionModel = (await import('../features/permission/permission.model.js')).default;
    const RolePermissionModel = (await import('../features/rolePermission/rolePermission.model.js')).default;
    const upsertedIds = upsertedPermissions.map(p => p._id);
    const deletedPermissions = await PermissionModel.find({ _id: { $nin: upsertedIds } });
    if (deletedPermissions.length > 0) {
      const deletedIds = deletedPermissions.map(p => p._id);
      await RolePermissionModel.deleteMany({ permissionId: { $in: deletedIds } });
      await PermissionModel.deleteMany({ _id: { $in: deletedIds } });
      logger.info(`Removed ${deletedPermissions.length} obsolete permissions from database.`);
    }

    logger.info(`Synced ${upsertedPermissions.length} permissions successfully in database.`);

    // 3. Ensure default Platform Organization exists
    const Organization = (await import('../features/organization/organization.model.js')).default;
    let platformOrg = await Organization.findOne({ isPlatform: true });
    if (!platformOrg) {
      platformOrg = await Organization.create({
        name: 'System Platform',
        isPlatform: true,
        status: 'Active',
        organizationType: 'Other',
      });
      logger.info(`Bootstrapped platform Organization: "System Platform" with ID: ${platformOrg._id}`);
    }

    // 4. Ensure Platform Super Admin Role exists for the platform workspace
    let superAdminRole = await roleService.getRoleByName('Platform Super Admin', platformOrg._id);
    if (!superAdminRole) {
      superAdminRole = await roleService.getRoleByName('Super Admin', platformOrg._id);
      if (!superAdminRole) {
        superAdminRole = await roleService.createRole({
          name: 'Platform Super Admin',
          description: 'System-wide Super Administrator role with full access permissions.',
          orgId: platformOrg._id,
        });
        logger.info('Created "Platform Super Admin" role.');
      }
    }

    // 5. Map all system permissions to Platform Super Admin role (only if it has no permissions, preserving custom edits)
    const existingPerms = await rolePermissionService.getPermissionsByRoleId(superAdminRole._id);
    if (existingPerms.length === 0) {
      const permissionIds = upsertedPermissions.map((p) => p._id.toString());
      await rolePermissionService.updateRolePermissions(superAdminRole._id.toString(), permissionIds);
      logger.info('Mapped all system permissions to the "Platform Super Admin" role (first time setup or failsafe).');
    } else {
      logger.info('Platform Super Admin role already has custom permissions. Skipping auto-sync to preserve user edits.');
    }

    // 6. Bootstrap default Super Admin user using env credentials
    const adminEmail = (process.env.SUPER_ADMIN_EMAIL || 'admin@enterprise.com').trim().toLowerCase();
    const adminUsername = (process.env.SUPER_ADMIN_USERNAME || 'superadmin').trim();
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminPwd@123!';

    const { hashPassword } = await import('./crypto.utils.js');
    const User = (await import('../features/user/user.model.js')).default;

    let userByEmail = await User.findOne({ email: adminEmail });
    let userByUsername = await User.findOne({ username: adminUsername });

    let targetUser = userByUsername || userByEmail;

    // Remove conflicting second document if email and username belong to two different documents
    if (userByEmail && userByUsername && userByEmail._id.toString() !== userByUsername._id.toString()) {
      await User.deleteOne({ _id: userByEmail._id });
      targetUser = userByUsername;
    }

    if (!targetUser) {
      targetUser = await userService.createUser({
        email: adminEmail,
        username: adminUsername,
        password: adminPassword,
        status: 'Active',
        roles: [superAdminRole._id],
      });
      logger.info(`Successfully bootstrapped default Super Admin user: email="${adminEmail}", username="${adminUsername}"`);
    } else {
      const hashedPassword = await hashPassword(adminPassword);
      await User.updateOne(
        { _id: targetUser._id },
        { 
          email: adminEmail,
          username: adminUsername,
          password: hashedPassword, 
          status: 'Active', 
          $addToSet: { roles: superAdminRole._id }
        }
      );
      targetUser.status = 'Active';
      logger.info(`Updated existing Super Admin user credentials: email="${adminEmail}", username="${adminUsername}"`);
    }

    // 7. Link Super Admin user to the Platform organization
    const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;
    let membership = await OrgMembership.findOne({ userId: targetUser._id, orgId: platformOrg._id });
    if (!membership) {
      await OrgMembership.create({
        userId: targetUser._id,
        orgId: platformOrg._id,
        roleIds: [superAdminRole._id],
        roleId: superAdminRole._id,
        status: 'Active',
      });
      logger.info('Linked Super Admin user to the Platform organization with Platform Super Admin role.');
    } else if (membership.status !== 'Active') {
      membership.status = 'Active';
      await membership.save();
      logger.info('Updated existing Super Admin user membership status to Active.');
    }

    logger.info('Permission synchronization and Super Admin bootstrapping finished successfully.');
  } catch (error) {
    logger.error('Failed to synchronize permissions and bootstrap Super Admin user:', error);
    throw error;
  }
};

export default syncPermissions;
