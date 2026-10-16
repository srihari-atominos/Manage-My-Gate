/**
 * Read-Only Diagnostic Audit Script: Organization Membership Migration Readiness
 * (SEC-05.8 Infrastructure & Data Migration Verification)
 *
 * This script performs a non-destructive, read-only audit of the MongoDB database to identify:
 * 1. Users who have an assigned `user.orgId` or legacy `user.roles` but LACK an active `OrgMembership`
 *    record in that organization (these users will fail closed under SEC-05.1-F01 RBAC rules).
 * 2. Inactive, suspended, or pending memberships.
 * 3. Orphaned memberships pointing to non-existent users or non-existent organizations.
 * 4. Duplicate membership records for the same (userId, orgId) pair.
 *
 * Usage:
 *   node backend/scripts/audit_org_memberships.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env if available
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate';

/**
 * Masks user email addresses to prevent PII leakage in audit logs.
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return 'unknown';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
  return `${maskedName}@${domain}`;
}

export async function auditMemberships(dbConnection = null) {
  const ownConnection = !dbConnection;
  let conn;
  try {
    conn = dbConnection || (await mongoose.createConnection(MONGODB_URI, { serverSelectionTimeoutMS: 5000 }).asPromise());
  } catch (connErr) {
    throw new Error(`Failed to establish read-only connection to target database: ${connErr.message}`);
  }

  try {
    const usersCol = conn.collection('users');
    const orgsCol = conn.collection('organizations');
    const membershipsCol = conn.collection('orgmemberships');

    // 1. Fetch summary counts
    const totalUsers = await usersCol.countDocuments({});
    const totalOrgs = await orgsCol.countDocuments({});
    const totalMemberships = await membershipsCol.countDocuments({});

    // 2. Identify users with orgId but no active OrgMembership
    const usersWithOrg = await usersCol.find(
      { orgId: { $exists: true, $ne: null } },
      { projection: { _id: 1, email: 1, role: 1, roles: 1, orgId: 1, isPlatform: 1, status: 1 } }
    ).toArray();

    const missingMemberships = [];
    const inactiveMemberships = [];

    for (const u of usersWithOrg) {
      // Platform admins have global access and do not require community memberships
      if (u.isPlatform === true || u.role === 'Platform Super Admin') {
        continue;
      }

      const membership = await membershipsCol.findOne({
        userId: u._id,
        orgId: u.orgId,
      });

      if (!membership) {
        missingMemberships.push({
          userId: u._id.toString(),
          maskedEmail: maskEmail(u.email),
          legacyRole: u.role || (Array.isArray(u.roles) ? u.roles.join(', ') : 'None'),
          assignedOrgId: u.orgId.toString(),
          reason: 'NO_MEMBERSHIP_RECORD',
        });
      } else if (membership.status && membership.status !== 'Active') {
        inactiveMemberships.push({
          userId: u._id.toString(),
          maskedEmail: maskEmail(u.email),
          membershipId: membership._id.toString(),
          status: membership.status,
          assignedOrgId: u.orgId.toString(),
          reason: `INACTIVE_STATUS_${membership.status.toUpperCase()}`,
        });
      }
    }

    // 3. Identify duplicate memberships for (userId, orgId)
    const duplicates = await membershipsCol.aggregate([
      {
        $group: {
          _id: { userId: '$userId', orgId: '$orgId' },
          count: { $sum: 1 },
          membershipIds: { $push: '$_id' },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]).toArray();

    // 4. Identify orphaned memberships
    const allMemberships = await membershipsCol.find({}, { projection: { _id: 1, userId: 1, orgId: 1 } }).toArray();
    const orphanedMemberships = [];

    for (const m of allMemberships) {
      const userExists = await usersCol.countDocuments({ _id: m.userId });
      const orgExists = await orgsCol.countDocuments({ _id: m.orgId });

      if (userExists === 0 || orgExists === 0) {
        orphanedMemberships.push({
          membershipId: m._id.toString(),
          userId: m.userId ? m.userId.toString() : 'null',
          orgId: m.orgId ? m.orgId.toString() : 'null',
          missingUser: userExists === 0,
          missingOrg: orgExists === 0,
        });
      }
    }

    const report = {
      timestamp: new Date().toISOString(),
      databaseHost: conn.host || 'connected',
      databaseName: conn.name || 'db',
      summary: {
        totalUsers,
        totalOrganizations: totalOrgs,
        totalMemberships,
        atRiskUsersMissingMembership: missingMemberships.length,
        inactiveOrPendingMemberships: inactiveMemberships.length,
        duplicateMembershipPairs: duplicates.length,
        orphanedMemberships: orphanedMemberships.length,
      },
      findings: {
        missingMemberships,
        inactiveMemberships,
        duplicates: duplicates.map((d) => ({
          userId: d._id.userId ? d._id.userId.toString() : 'null',
          orgId: d._id.orgId ? d._id.orgId.toString() : 'null',
          count: d.count,
          membershipIds: d.membershipIds.map((id) => id.toString()),
        })),
        orphanedMemberships,
      },
      recommendations: [
        missingMemberships.length > 0
          ? `CRITICAL: ${missingMemberships.length} user(s) will be locked out under SEC-05.1-F01 RBAC rules until an active OrgMembership is seeded for them.`
          : 'RBAC Active Membership Readiness: 100% of tenant users have associated memberships.',
        duplicates.length > 0
          ? `WARNING: Deduplicate ${duplicates.length} duplicate membership pairs before enforcing unique compound indexes.`
          : 'Deduplication: No duplicate membership pairs detected.',
        orphanedMemberships.length > 0
          ? `CLEANUP: Clean up ${orphanedMemberships.length} orphaned membership records referencing deleted users or communities.`
          : 'Integrity: No orphaned memberships detected.',
      ],
    };

    return report;
  } finally {
    if (ownConnection) {
      await conn.close();
    }
  }
}

// Direct execution entrypoint
if (process.argv[1] && process.argv[1].endsWith('audit_org_memberships.mjs')) {
  console.log('--- Starting Read-Only Organization Membership Audit ---');
  auditMemberships()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      console.log('\n--- Audit Complete ---');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Audit failed with error:', err.message);
      process.exit(1);
    });
}
