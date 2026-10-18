/**
 * Authorized Membership Remediation & Audit Tool (SEC-05.10)
 *
 * This script provides an audited, non-destructive, parameter-validated mechanism
 * to repair tenant organization memberships for users that were created prior to
 * multi-tenant membership enforcement.
 *
 * CRITICAL SECURITY DIRECTIVES (SEC-05.9 / SEC-05.10):
 * 1. NEVER automatically grant privileged roles (e.g. 'Community Admin') without explicit,
 *    recorded approval from the responsible organization owner.
 * 2. Runs in --dry-run mode by default.
 * 3. Requires --execute, --userId, --orgId, --role, and --approver to write to the database.
 * 4. PII (emails) are masked in all standard stdout logs.
 *
 * Usage:
 *   Dry-Run:
 *     node backend/scripts/repair_membership_template.mjs --userId=6a96985af5ec436a30273db9 --orgId=6a6efd60f62f21f2b26eb9a0 --role="Resident" --approver="Community Owner Name" --dry-run
 *
 *   Authorized Execution:
 *     node backend/scripts/repair_membership_template.mjs --userId=6a96985af5ec436a30273db9 --orgId=6a6efd60f62f21f2b26eb9a0 --role="Resident" --approver="Community Owner Name" --execute
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    userId: null,
    orgId: null,
    role: null,
    approver: null,
    execute: false,
    dryRun: true,
  };

  for (const arg of args) {
    if (arg.startsWith('--userId=')) params.userId = arg.split('=')[1];
    if (arg.startsWith('--orgId=')) params.orgId = arg.split('=')[1];
    if (arg.startsWith('--role=')) params.role = arg.split('=')[1];
    if (arg.startsWith('--approver=')) params.approver = arg.split('=')[1];
    if (arg === '--execute') {
      params.execute = true;
      params.dryRun = false;
    }
    if (arg === '--dry-run') {
      params.dryRun = true;
      params.execute = false;
    }
  }

  return params;
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '[REDACTED]';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

async function run() {
  const params = parseArgs();

  console.log('=== Authorized Membership Remediation Tool (SEC-05.10) ===');
  console.log(`Mode: ${params.execute ? 'LIVE EXECUTION' : 'DRY-RUN (No Changes)'}`);

  if (!params.userId || !params.orgId) {
    console.error('Error: --userId and --orgId are required.');
    process.exit(1);
  }

  if (params.execute && (!params.approver || !params.role)) {
    console.error('Error: Live execution requires --approver="<Owner Name>" and --role="<Role Name>".');
    process.exit(1);
  }

  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable is not set.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;

  try {
    const userObjectId = new mongoose.Types.ObjectId(params.userId);
    const orgObjectId = new mongoose.Types.ObjectId(params.orgId);

    // 1. Validate User
    const user = await db.collection('users').findOne({ _id: userObjectId });
    if (!user) {
      console.error(`Error: User ${params.userId} not found.`);
      process.exit(1);
    }

    // 2. Validate Organization
    const org = await db.collection('organizations').findOne({ _id: orgObjectId });
    if (!org) {
      console.error(`Error: Organization ${params.orgId} not found.`);
      process.exit(1);
    }

    // 3. Check for existing membership
    const existingMembership = await db.collection('orgmemberships').findOne({
      userId: userObjectId,
      orgId: orgObjectId,
    });

    if (existingMembership) {
      console.log(`User already has a membership in ${org.name}:`, {
        membershipId: existingMembership._id,
        status: existingMembership.status,
      });
      process.exit(0);
    }

    // 4. Resolve Role ObjectId if role specified
    let targetRoleId = null;
    if (params.role) {
      const roleDoc = await db.collection('roles').findOne({
        name: new RegExp(`^${params.role}$`, 'i'),
        $or: [{ orgId: orgObjectId }, { isSystem: true }],
      });
      if (roleDoc) {
        targetRoleId = roleDoc._id;
      }
    }

    const proposedRecord = {
      userId: userObjectId,
      orgId: orgObjectId,
      roleId: targetRoleId,
      status: 'Active',
      residentType: 'None',
      units: [],
      assignments: params.role
        ? [
            {
              roleName: params.role,
              roleId: targetRoleId,
              assignmentType: 'general',
              name: params.role,
            },
          ]
        : [],
      createdAt: new Date(),
      updatedAt: new Date(),
      auditTrail: {
        remediatedBy: 'SEC-05.10-Authorized-Remediation',
        approvedBy: params.approver || 'PENDING_APPROVAL',
        timestamp: new Date().toISOString(),
      },
    };

    console.log('\n[PLAN] Proposed OrgMembership Record (PII Masked):', {
      user: maskEmail(user.email),
      userId: params.userId,
      organization: org.name,
      orgId: params.orgId,
      assignedRole: params.role || 'Unspecified',
      status: 'Active',
      approvedBy: params.approver || 'PENDING_APPROVAL',
    });

    if (!params.execute) {
      console.log('\n[DRY-RUN] No changes were made to the database.');
      console.log('To execute this remediation, obtain written approval from the community owner and re-run with:');
      console.log(`  node backend/scripts/repair_membership_template.mjs --userId=${params.userId} --orgId=${params.orgId} --role="${params.role || 'Resident'}" --approver="${params.approver || 'Owner Name'}" --execute`);
      process.exit(0);
    }

    // 5. Execute insertion
    const result = await db.collection('orgmemberships').insertOne(proposedRecord);
    console.log(`\n[SUCCESS] OrgMembership successfully created with ID: ${result.insertedId}`);

    // 6. Record in security log
    await db.collection('securitylogs').insertOne({
      action: 'ORGANIZATION_MEMBERSHIP_REPAIR',
      userId: userObjectId,
      orgId: orgObjectId,
      membershipId: result.insertedId,
      role: params.role,
      approvedBy: params.approver,
      timestamp: new Date(),
      details: 'SEC-05.10 authorized legacy user membership backfill',
    });
    console.log('[AUDIT] Security audit log recorded successfully.');

  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('Fatal execution error:', err.message);
  process.exit(1);
});
