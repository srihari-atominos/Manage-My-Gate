import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const scriptPath = path.resolve(__dirname, '../scripts/repair_membership_template.mjs');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

function runScript(args) {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [scriptPath, ...args],
      {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, MONGODB_URI },
      },
      (error, stdout, stderr) => {
        resolve({
          code: error ? error.code || 1 : 0,
          stdout: stdout.toString(),
          stderr: stderr.toString(),
        });
      }
    );
  });
}

describe('SEC-05 — Membership Repair Tool Operational Safeguards Suite', () => {
  let db;
  let testUserId;
  let testOrgId;
  let testRoleId;
  let existingMemberUserId;

  before(async () => {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    db = mongoose.connection.db;

    testUserId = new mongoose.Types.ObjectId();
    testOrgId = new mongoose.Types.ObjectId();
    testRoleId = new mongoose.Types.ObjectId();
    existingMemberUserId = new mongoose.Types.ObjectId();

    // Seed test org
    await db.collection('organizations').insertOne({
      _id: testOrgId,
      name: 'Safe Remediation Community',
      isActive: true,
    });

    // Seed test user needing repair
    await db.collection('users').insertOne({
      _id: testUserId,
      email: 'safeguard-test@community.com',
      username: `safeguard_${Date.now()}_1`,
      phoneNumber: `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
      firstName: 'Safeguard',
      lastName: 'Tester',
      orgId: testOrgId,
    });

    // Seed user with existing membership
    await db.collection('users').insertOne({
      _id: existingMemberUserId,
      email: 'existing-member@community.com',
      username: `safeguard_${Date.now()}_2`,
      phoneNumber: `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
      firstName: 'Existing',
      lastName: 'Member',
      orgId: testOrgId,
    });

    // Seed test role
    await db.collection('roles').insertOne({
      _id: testRoleId,
      name: 'Resident',
      orgId: testOrgId,
    });

    // Seed existing membership
    await db.collection('orgmemberships').insertOne({
      userId: existingMemberUserId,
      orgId: testOrgId,
      status: 'Active',
      roleId: testRoleId,
    });
  });

  after(async () => {
    if (db) {
      await db.collection('organizations').deleteOne({ _id: testOrgId });
      await db.collection('users').deleteMany({ _id: { $in: [testUserId, existingMemberUserId] } });
      await db.collection('roles').deleteOne({ _id: testRoleId });
      await db.collection('orgmemberships').deleteMany({ orgId: testOrgId });
      await db.collection('securitylogs').deleteMany({ orgId: testOrgId });
    }
    await mongoose.disconnect();
  });

  it('1. Fails closed with exit code 1 when required arguments --userId or --orgId are omitted', async () => {
    const resNoArgs = await runScript([]);
    assert.equal(resNoArgs.code, 1);
    assert.match(resNoArgs.stderr, /--userId and --orgId are required/);

    const resOnlyUser = await runScript([`--userId=${testUserId}`]);
    assert.equal(resOnlyUser.code, 1);
    assert.match(resOnlyUser.stderr, /--userId and --orgId are required/);
  });

  it('2. Fails closed when live execution (--execute) is attempted without explicit approver and role', async () => {
    const resNoApprover = await runScript([
      `--userId=${testUserId}`,
      `--orgId=${testOrgId}`,
      '--execute',
    ]);
    assert.equal(resNoApprover.code, 1);
    assert.match(resNoApprover.stderr, /Live execution requires --approver.*and --role/);
  });

  it('3. Fails closed when targeting a non-existent user or non-existent organization', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const resFakeUser = await runScript([
      `--userId=${fakeId}`,
      `--orgId=${testOrgId}`,
      '--dry-run',
    ]);
    assert.equal(resFakeUser.code, 1);
    assert.match(resFakeUser.stderr, /User .* not found/);

    const resFakeOrg = await runScript([
      `--userId=${testUserId}`,
      `--orgId=${fakeId}`,
      '--dry-run',
    ]);
    assert.equal(resFakeOrg.code, 1);
    assert.match(resFakeOrg.stderr, /Organization .* not found/);
  });

  it('4. Dry-run mode previews proposed membership, masks user PII, and makes ZERO database mutations', async () => {
    const resDryRun = await runScript([
      `--userId=${testUserId}`,
      `--orgId=${testOrgId}`,
      '--role=Resident',
      '--dry-run',
    ]);

    assert.equal(resDryRun.code, 0);
    assert.match(resDryRun.stdout, /DRY-RUN \(No Changes\)/);
    assert.match(resDryRun.stdout, /s\*\*\*t@community\.com/); // Masked PII
    assert.doesNotMatch(resDryRun.stdout, /safeguard-test@community\.com/); // Raw email must NOT appear

    // Verify database remains untouched
    const membership = await db.collection('orgmemberships').findOne({
      userId: testUserId,
      orgId: testOrgId,
    });
    assert.equal(membership, null, 'Dry-run must not create any membership record');
  });

  it('5. Detects existing membership and halts execution idempotently without duplication', async () => {
    const resExisting = await runScript([
      `--userId=${existingMemberUserId}`,
      `--orgId=${testOrgId}`,
      '--role=Resident',
      '--dry-run',
    ]);

    assert.equal(resExisting.code, 0);
    assert.match(resExisting.stdout, /User already has a membership/);

    const count = await db.collection('orgmemberships').countDocuments({
      userId: existingMemberUserId,
      orgId: testOrgId,
    });
    assert.equal(count, 1, 'Existing membership count must remain exactly 1');
  });

  it('6. Authorized execution creates active membership and appends immutable security audit log', async () => {
    const resExec = await runScript([
      `--userId=${testUserId}`,
      `--orgId=${testOrgId}`,
      '--role=Resident',
      '--approver=Community President Jane Doe',
      '--execute',
    ]);

    assert.equal(resExec.code, 0);
    assert.match(resExec.stdout, /SUCCESS.*OrgMembership successfully created/);
    assert.match(resExec.stdout, /Security audit log recorded successfully/);

    // Verify membership record created
    const createdMembership = await db.collection('orgmemberships').findOne({
      userId: testUserId,
      orgId: testOrgId,
    });
    assert.ok(createdMembership, 'Membership record must exist in database');
    assert.equal(createdMembership.status, 'Active');
    assert.equal(createdMembership.auditTrail.approvedBy, 'Community President Jane Doe');

    // Verify security log entry
    const logEntry = await db.collection('securitylogs').findOne({
      action: 'ORGANIZATION_MEMBERSHIP_REPAIR',
      userId: testUserId,
      orgId: testOrgId,
    });
    assert.ok(logEntry, 'Security log record must exist');
    assert.equal(logEntry.approvedBy, 'Community President Jane Doe');
  });
});
