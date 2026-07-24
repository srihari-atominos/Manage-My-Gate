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

    // 5. Map all system permissions to Platform Super Admin role
    const permissionIds = upsertedPermissions.map((p) => p._id.toString());
    await rolePermissionService.updateRolePermissions(superAdminRole._id.toString(), permissionIds);
    logger.info('Mapped all system permissions to the "Platform Super Admin" role.');

    // 6. Bootstrap default Super Admin user using env credentials
    const adminEmail = process.env.SUPER_ADMIN_EMAIL;
    const adminUsername = process.env.SUPER_ADMIN_USERNAME;
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!adminEmail || !adminUsername || !adminPassword) {
      logger.warn('Super Admin environment credentials missing. Skipping Super Admin user bootstrapping.');
      return;
    }

    let superAdminUser = await userService.getUserByEmail(adminEmail);

    if (!superAdminUser) {
      superAdminUser = await userService.createUser({
        email: adminEmail,
        username: adminUsername,
        password: adminPassword,
        status: 'Active',
      });
      logger.info(`Successfully bootstrapped default Super Admin user: email="${adminEmail}", username="${adminUsername}"`);
    } else {
      if (superAdminUser.status !== 'Active') {
        const User = (await import('../features/user/user.model.js')).default;
        await User.updateOne({ _id: superAdminUser._id }, { status: 'Active' });
        superAdminUser.status = 'Active';
        logger.info('Updated existing Super Admin user status to "Active".');
      }
      logger.info('Super Admin user already bootstrapped.');
    }

    // 7. Link Super Admin user to the Platform organization
    const OrgMembership = (await import('../features/orgMembership/orgMembership.model.js')).default;
    let membership = await OrgMembership.findOne({ userId: superAdminUser._id, orgId: platformOrg._id });
    if (!membership) {
      await OrgMembership.create({
        userId: superAdminUser._id,
        orgId: platformOrg._id,
        roleIds: [superAdminRole._id],
        roleId: superAdminRole._id,
      });
      logger.info('Linked Super Admin user to the Platform organization with Platform Super Admin role.');
    }

    // 6.5 Self-healing: Ensure all existing 'Community Admin' roles get all system permissions mapped
    const RoleModel = (await import('../features/role/role.model.js')).default;
    const communityAdminRoles = await RoleModel.find({ name: 'Community Admin' });
    const allSystemPermissions = await PermissionModel.find({});

    for (const role of communityAdminRoles) {
      let roleModified = false;
      for (const perm of allSystemPermissions) {
        const mappingExists = await RolePermissionModel.findOne({
          roleId: role._id,
          permissionId: perm._id
        });
        if (!mappingExists) {
          await RolePermissionModel.create({
            roleId: role._id,
            permissionId: perm._id
          });
          roleModified = true;
          logger.info(`Self-healed role "${role.name}" (${role._id}) with permission "${perm.name}".`);
        }
      }
      if (roleModified) {
        // Clear the service cache for this role
        rolePermissionService.cache.delete(role._id.toString());
      }
    }

    // 6.7 Self-healing: Ensure all existing memberships have status 'Active' (fixes dev/seed data missing status)
    const OrgMembershipModel = (await import('../features/orgMembership/orgMembership.model.js')).default;
    await OrgMembershipModel.updateMany({ status: { $ne: 'Active' } }, { $set: { status: 'Active' } });
    logger.info('Self-healed all memberships to status "Active".');

    // 6.8 Self-healing: Ensure all existing workspaces have all default modules backfilled
    const WorkspaceModel = (await import('../features/workspace/workspace.model.js')).default;
    const workspacesList = await WorkspaceModel.find({});
    const { DEFAULT_MODULES } = await import('../features/workspace/workspace.service.js');
    
    for (const ws of workspacesList) {
      let modified = false;
      if (!ws.modules) {
        ws.modules = [];
      }
      for (const defaultMod of DEFAULT_MODULES) {
        const hasModule = ws.modules.some(m => m.moduleKey === defaultMod.moduleKey);
        if (!hasModule) {
          ws.modules.push({ ...defaultMod });
          modified = true;
        }
      }
      if (modified) {
        await ws.save({ validateBeforeSave: false });
        logger.info(`Self-healed workspace "${ws.workspaceName}" (${ws._id}) by backfilling missing default modules.`);
      }
    }

    // 6.9 Self-healing: Ensure all existing organizations have all default module features in allowedFeatures
    const OrganizationModel = (await import('../features/organization/organization.model.js')).default;
    const orgsList = await OrganizationModel.find({});
    const defaultFeatureKeys = DEFAULT_MODULES.map(m => m.moduleKey);
    
    for (const org of orgsList) {
      let modified = false;
      if (!org.allowedFeatures) {
        org.allowedFeatures = [];
      }
      for (const key of defaultFeatureKeys) {
        if (!org.allowedFeatures.includes(key)) {
          org.allowedFeatures.push(key);
          modified = true;
        }
      }
      if (modified) {
        await org.save({ validateBeforeSave: false });
        logger.info(`Self-healed organization "${org.name}" (${org._id}) by backfilling missing allowedFeatures.`);
      }
    }

    logger.info('Permission synchronization and Super Admin bootstrapping finished successfully.');
  } catch (error) {
    logger.error('Failed to synchronize permissions and bootstrap Super Admin user:', error);
    throw error;
  }
};

export default syncPermissions;
