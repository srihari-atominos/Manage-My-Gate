import mongoose from 'mongoose';
import { connectToDb } from '../src/config/db/mongodbConnectToDb.config.js';
import Organization from '../src/features/organization/organization.model.js';
import User from '../src/features/user/user.model.js';
import Villa from '../src/features/villa/villa.model.js';
import Notification from '../src/features/notification/notification.model.js';
import userService from '../src/features/user/user.services.js';
import authService from '../src/features/auth/auth.services.js';
import notificationService from '../src/features/notification/notification.service.js';
import villaService from '../src/features/villa/villa.services.js';
import orgMembershipService from '../src/features/orgMembership/orgMembership.services.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import Role from '../src/features/role/role.model.js';
import bcrypt from 'bcrypt';
import '../src/features/user/user.listeners.js';

async function runVerification() {
  console.log('=== Starting Multi-Tenant User Invitation & Notification Flow Verification ===\n');
  await connectToDb();

  const timestamp = Date.now();
  const testEmail = `test_resident_${timestamp}@example.com`;
  const adminEmail = `admin_b_${timestamp}@example.com`;
  let orgA, orgB, residentUser, adminB;

  try {
    // 1. Create Community A and Community B
    console.log('[Step 1] Creating test organizations (Community A and Community B)...');
    orgA = await Organization.create({
      name: `Test Community A ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });
    orgB = await Organization.create({
      name: `Test Community B ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });

    // Create default 'Resident' roles for both communities
    await Role.create({
      name: 'Resident',
      orgId: orgA._id,
      isTenantRole: true,
    });
    await Role.create({
      name: 'Resident',
      orgId: orgB._id,
      isTenantRole: true,
    });

    // 2. Create Villas
    console.log('[Step 2] Creating test villas in both communities...');
    const villaA = await Villa.create({
      orgId: orgA._id,
      unitNumber: `A-101-${timestamp}`,
      blockOrBuilding: 'Tower A',
      status: 'Vacant',
      type: 'Villa',
    });
    const villaB = await Villa.create({
      orgId: orgB._id,
      unitNumber: `B-202-${timestamp}`,
      blockOrBuilding: 'Tower B',
      status: 'Vacant',
      type: 'Villa',
    });

    // 3. Create Admin for Community B
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    adminB = await User.create({
      name: 'Admin B',
      username: `admin_b_${timestamp}`,
      email: adminEmail,
      password: hashedPassword,
      status: 'Active',
      role: 'Admin',
      orgId: orgB._id,
      organizations: [{ orgId: orgB._id, role: 'Admin', status: 'Active' }],
    });

    // 4. Create Existing Resident User active in Community A occupying Villa A
    console.log('[Step 3] Creating existing resident user in Community A...');
    residentUser = await User.create({
      name: 'Existing Resident',
      username: `resident_${timestamp}`,
      email: testEmail,
      password: hashedPassword,
      status: 'Active',
      role: 'Resident',
      orgId: orgA._id,
      villaId: villaA._id,
      organizations: [
        {
          orgId: orgA._id,
          role: 'Resident',
          status: 'Active',
          villaId: villaA._id,
        },
      ],
    });

    await orgMembershipService.createMembership({
      userId: residentUser._id,
      orgId: orgA._id,
      roleName: 'Resident',
      status: 'Active',
      villaId: villaA._id,
    });

    // Assign resident to Villa A
    await villaService.assignResidentToVilla(villaA._id, residentUser._id, 'Resident', null, orgA._id);
    const refreshedVillaA = await Villa.findById(villaA._id);
    console.log(`✓ Villa A Status: ${refreshedVillaA.status}, Occupant: ${refreshedVillaA.primaryResidentId}`);
    if (refreshedVillaA.status !== 'Occupied' || refreshedVillaA.primaryResidentId.toString() !== residentUser._id.toString()) {
      throw new Error('Initial setup failed: Villa A was not properly marked Occupied');
    }

    // 5. Admin B invites Existing User to Community B with Villa B
    console.log('\n[Step 4] Admin of Community B invites existing user to Community B (with Villa B-202)...');
    const inviteResult = await userService.inviteUser(
      testEmail,
      orgB._id.toString(),
      villaB._id.toString(),
      'Resident',
      'Resident',
      '',
      'Existing Resident',
      'WEB'
    );

    const inviteToken = inviteResult.invitationToken;
    console.log(`✓ Invitation dispatched successfully. Token generated: ${inviteToken ? 'YES' : 'NO'}`);

    // Allow event listener to persist notification
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 6. Verify PRE-ACCEPTANCE state
    console.log('\n[Step 5] Verifying PRE-ACCEPTANCE state:');
    const userPreAccept = await User.findById(residentUser._id);
    const membershipB = await orgMembershipService.getMembership(residentUser._id, orgB._id);

    console.log(`- Membership status in Community B: "${membershipB ? membershipB.status : 'None'}" (Expected: "Pending")`);
    if (!membershipB || membershipB.status !== 'Pending') {
      throw new Error(`PRE-ACCEPTANCE FAILURE: Membership in Community B should be "Pending", but was "${membershipB?.status}"`);
    }

    const villaBPreAccept = await Villa.findById(villaB._id);
    console.log(`- Villa B status: "${villaBPreAccept.status}" (Expected: "Vacant" or NOT "Occupied")`);
    console.log(`- Villa B occupant: ${villaBPreAccept.primaryResidentId} (Expected: null)`);
    if (villaBPreAccept.status === 'Occupied' || villaBPreAccept.primaryResidentId) {
      throw new Error('PRE-ACCEPTANCE FAILURE: Villa B was prematurely marked as Occupied before invitation acceptance!');
    }

    // Verify user cannot switch context or see Community B in availableWorkspaces
    const scopedPre = await authService.getScopedTokenPayload(userPreAccept, orgA._id);
    const workspacesPre = scopedPre.availableWorkspaces.map((w) => w.orgId.toString());
    console.log(`- User available workspaces: [${workspacesPre.join(', ')}]`);
    if (workspacesPre.includes(orgB._id.toString())) {
      throw new Error('PRE-ACCEPTANCE FAILURE: Pending workspace Community B is visible in availableWorkspaces before acceptance!');
    }

    let switchErrorCaught = false;
    try {
      await authService.switchContext(residentUser._id, orgB._id);
    } catch (err) {
      switchErrorCaught = true;
      console.log(`✓ switchContext to unaccepted Community B was correctly blocked: "${err.message}"`);
    }
    if (!switchErrorCaught) {
      throw new Error('PRE-ACCEPTANCE FAILURE: User was able to switch context to Community B without accepting the invitation!');
    }

    // 7. Verify Notification Delivery & Multi-Tenant Isolation
    console.log('\n[Step 6] Testing Notification Delivery and Multi-Tenant Isolation:');
    
    // Create non-invitation notifications in Community A and Community B
    await notificationService.createNotification({
      recipientId: residentUser._id,
      orgId: orgA._id,
      title: 'Water Maintenance Notice',
      body: 'Water shutdown scheduled in Community A.',
      type: 'INFO',
    });

    await notificationService.createNotification({
      recipientId: residentUser._id,
      orgId: orgB._id,
      title: 'Gate Access Maintenance',
      body: 'Gate 2 maintenance in Community B.',
      type: 'INFO',
    });

    // Query notifications scoped to Community A
    const notifsInOrgA = await notificationService.getUserNotifications(residentUser._id, 1, 20, orgA._id.toString());
    const titlesInA = notifsInOrgA.notifications.map((n) => n.title);
    console.log(`- Notifications retrieved when active in Community A:`);
    titlesInA.forEach((t) => console.log(`   * ${t}`));

    const hasOrgANotifInA = titlesInA.some((t) => t.includes('Water Maintenance Notice'));
    const hasOrgBNotifInA = titlesInA.some((t) => t.includes('Gate Access Maintenance'));
    const hasInvitationInA = notifsInOrgA.notifications.some((n) => n.type === 'INVITATION');

    if (!hasOrgANotifInA) {
      throw new Error('NOTIFICATION FAILURE: Community A notifications not visible in Community A!');
    }
    if (hasOrgBNotifInA) {
      throw new Error('NOTIFICATION LEAK FAILURE: Community B general notification leaked into Community A!');
    }
    if (!hasInvitationInA) {
      throw new Error('NOTIFICATION FAILURE: Invitation to Community B was not delivered / visible in user notifications!');
    }
    console.log('✓ Multi-tenant notification isolation verified: Community B notifications do NOT leak into Community A.');
    console.log('✓ Cross-tenant invitation notification is visible so user knows they are invited.');

    // Query notifications scoped to Community B
    const notifsInOrgB = await notificationService.getUserNotifications(residentUser._id, 1, 20, orgB._id.toString());
    const titlesInB = notifsInOrgB.notifications.map((n) => n.title);
    console.log(`- Notifications retrieved when active in Community B:`);
    titlesInB.forEach((t) => console.log(`   * ${t}`));

    const hasOrgBNotifInB = titlesInB.some((t) => t.includes('Gate Access Maintenance'));
    const hasOrgANotifInB = titlesInB.some((t) => t.includes('Water Maintenance Notice'));

    if (!hasOrgBNotifInB) {
      throw new Error('NOTIFICATION FAILURE: Community B notifications not visible in Community B!');
    }
    if (hasOrgANotifInB) {
      throw new Error('NOTIFICATION LEAK FAILURE: Community A general notification leaked into Community B!');
    }
    console.log('✓ Multi-tenant notification isolation verified: Community A notifications do NOT leak into Community B.');

    // 8. User Accepts the Invitation to Community B
    console.log('\n[Step 7] User accepts the invitation to Community B...');
    const acceptResponse = await authService.acceptInvitation(inviteToken, null, testEmail);
    console.log(`✓ Invitation accepted. Returned token: ${acceptResponse.token ? 'YES' : 'NO'}`);

    // 9. Verify POST-ACCEPTANCE state
    console.log('\n[Step 8] Verifying POST-ACCEPTANCE state:');
    const userPostAccept = await User.findById(residentUser._id);
    const membershipBPost = await orgMembershipService.getMembership(residentUser._id, orgB._id);

    console.log(`- Membership status in Community B: "${membershipBPost.status}" (Expected: "Active")`);
    if (membershipBPost.status !== 'Active') {
      throw new Error(`POST-ACCEPTANCE FAILURE: Membership should be "Active", was "${membershipBPost.status}"`);
    }

    const villaBPostAccept = await Villa.findById(villaB._id);
    console.log(`- Villa B status: "${villaBPostAccept.status}" (Expected: "Occupied")`);
    console.log(`- Villa B occupant: ${villaBPostAccept.primaryResidentId} (Expected: ${residentUser._id})`);
    if (villaBPostAccept.status !== 'Occupied' || villaBPostAccept.primaryResidentId.toString() !== residentUser._id.toString()) {
      throw new Error('POST-ACCEPTANCE FAILURE: Villa B was not properly assigned/occupied upon acceptance!');
    }

    // Verify user can now see Community B in availableWorkspaces
    const scopedPost = await authService.getScopedTokenPayload(userPostAccept, orgA._id);
    const workspacesPost = scopedPost.availableWorkspaces.map((w) => w.orgId.toString());
    console.log(`- User available workspaces: [${workspacesPost.join(', ')}]`);
    if (!workspacesPost.includes(orgB._id.toString())) {
      throw new Error('POST-ACCEPTANCE FAILURE: Community B is missing from availableWorkspaces after acceptance!');
    }

    // Verify switchContext to Community B now succeeds
    const switchResult = await authService.switchContext(residentUser._id, orgB._id);
    console.log(`✓ switchContext to Community B succeeded! Active Org in returned user: ${switchResult.user.orgId}`);
    if (switchResult.user.orgId.toString() !== orgB._id.toString()) {
      throw new Error('POST-ACCEPTANCE FAILURE: switchContext returned incorrect active organization');
    }

    console.log('\n======================================================');
    console.log('🎉 ALL MULTI-TENANT INVITATION & NOTIFICATION TESTS PASSED!');
    console.log('======================================================\n');
  } finally {
    // Cleanup test data
    console.log('Cleaning up test data...');
    await User.deleteMany({ email: { $in: [testEmail, adminEmail] } });
    await Organization.deleteMany({ name: { $regex: new RegExp(`Test Community.*${timestamp}`) } });
    await Villa.deleteMany({ unitNumber: { $regex: new RegExp(`.*${timestamp}`) } });
    await Notification.deleteMany({ title: { $in: ['Water Maintenance Notice', 'Gate Access Maintenance'] } });
    await Role.deleteMany({ orgId: { $in: [orgA?._id, orgB?._id] } });
    if (residentUser?._id) {
      await OrgMembership.deleteMany({ userId: residentUser._id });
    }
    if (adminB?._id) {
      await OrgMembership.deleteMany({ userId: adminB._id });
    }
    await mongoose.disconnect();
    console.log('Cleanup complete.');
  }
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
