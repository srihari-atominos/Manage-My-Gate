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
import Token from '../src/features/token/token.model.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import userIdentityService from '../src/features/userIdentity/userIdentity.services.js';
import '../src/features/user/user.listeners.js';

async function runVerification() {
  console.log('=== Starting Multi-Tenant User Invitation & Notification Flow Verification ===\n');
  await connectToDb();
  await OrgMembership.collection.dropIndexes().catch(() => null);
  await OrgMembership.syncIndexes().catch(() => null);

  const timestamp = Date.now();
  const testEmail = `test_resident_${timestamp}@example.com`;
  const adminEmail = `admin_b_${timestamp}@example.com`;
  let orgA, orgB, residentUser, adminB, roleA, roleB;

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
    roleA = await Role.create({
      name: 'Resident',
      orgId: orgA._id,
      isTenantRole: true,
    });
    roleB = await Role.create({
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
      'WEB',
      adminB._id.toString()
    );

    const inviteToken = inviteResult.invitationToken;
    console.log(`✓ Invitation dispatched successfully. Token generated: ${inviteToken ? 'YES' : 'NO'}`);

    // Verify Token data model fields (inviterId, status, expiresAt, used)
    const hashedInviteToken = crypto.createHash('sha256').update(inviteToken).digest('hex');
    const tokenDoc = await Token.findOne({ token: hashedInviteToken });
    console.log(`- Token document found in DB: ${tokenDoc ? 'YES' : 'NO'}`);
    if (!tokenDoc) {
      throw new Error('TOKEN LIFECYCLE FAILURE: Token document not found in database!');
    }
    console.log(`- Token inviterId: ${tokenDoc.inviterId} (Expected: ${adminB._id})`);
    if (!tokenDoc.inviterId || tokenDoc.inviterId.toString() !== adminB._id.toString()) {
      throw new Error(`TOKEN LIFECYCLE FAILURE: Expected inviterId ${adminB._id}, got ${tokenDoc.inviterId}`);
    }
    console.log(`- Token status: ${tokenDoc.status} (Expected: PENDING)`);
    if (tokenDoc.status !== 'PENDING') {
      throw new Error(`TOKEN LIFECYCLE FAILURE: Expected status PENDING, got ${tokenDoc.status}`);
    }
    console.log(`- Token expiresAt: ${tokenDoc.expiresAt.toISOString()}`);
    const twentyFourHoursFromNow = Date.now() + 24 * 60 * 60 * 1000;
    if (Math.abs(tokenDoc.expiresAt.getTime() - twentyFourHoursFromNow) > 60000) {
      throw new Error(`TOKEN LIFECYCLE FAILURE: Expected expiresAt to be ~24h in the future, got ${tokenDoc.expiresAt}`);
    }
    console.log('✓ Token data model persistence, inviterId attribution, and 24h expiration verified!');

    // Allow event listener to persist notification
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify notification has senderId populated with adminB._id
    const inviteNotif = await Notification.findOne({ recipientId: residentUser._id, type: 'INVITATION' });
    console.log(`- Invitation notification found: ${inviteNotif ? 'YES' : 'NO'}, senderId: ${inviteNotif?.senderId}`);
    if (!inviteNotif || !inviteNotif.senderId || inviteNotif.senderId.toString() !== adminB._id.toString()) {
      throw new Error(`NOTIFICATION FAILURE: Expected invitation notification senderId to be ${adminB._id}, got ${inviteNotif?.senderId}`);
    }
    console.log('✓ In-app invitation notification senderId correctly attribution to adminB verified!');

    // Verify validateInvite response payload
    const validateRes = await authService.validateInvite(inviteToken);
    console.log(`- validateInvite result: valid=${validateRes.valid}, invitationStatus=${validateRes.invitationStatus}, inviterId=${validateRes.inviterId}`);
    if (!validateRes.valid || validateRes.invitationStatus !== 'PENDING' || validateRes.inviterId?.toString() !== adminB._id.toString()) {
      throw new Error(`VALIDATE_INVITE FAILURE: Invalid payload from validateInvite: ${JSON.stringify(validateRes)}`);
    }
    console.log('✓ validateInvite endpoint verified with strict lifecycle fields!');

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
    const returnedWorkspaces = acceptResponse.availableWorkspaces.map((w) => w.orgId.toString());
    console.log(`- Workspaces returned in acceptResponse: [${returnedWorkspaces.join(', ')}]`);
    if (!returnedWorkspaces.includes(orgB._id.toString())) {
      throw new Error('DASHBOARD VISIBILITY FAILURE: Newly accepted Community B is missing from acceptResponse.availableWorkspaces!');
    }
    if (!returnedWorkspaces.includes(orgA._id.toString())) {
      throw new Error('DASHBOARD VISIBILITY FAILURE: Existing Community A is missing from acceptResponse.availableWorkspaces!');
    }
    if (acceptResponse.user.orgId.toString() !== orgB._id.toString()) {
      throw new Error('DASHBOARD VISIBILITY FAILURE: Active orgId in acceptResponse is not Community B!');
    }
    console.log('✓ acceptResponse immediately includes BOTH organizations in availableWorkspaces and active orgId is Community B!');

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

    // 10. Verify Idempotency: Repeated Acceptance blocked
    console.log('\n[Step 9] Testing Idempotency: Attempting to re-accept already accepted token...');
    const acceptedTokenDoc = await Token.findOne({ token: hashedInviteToken });
    console.log(`- Token status in DB: ${acceptedTokenDoc.status}, used: ${acceptedTokenDoc.used}`);
    if (acceptedTokenDoc.status !== 'ACCEPTED' || acceptedTokenDoc.used !== true) {
      throw new Error(`IDEMPOTENCY FAILURE: Expected token status to be ACCEPTED and used=true, got status=${acceptedTokenDoc.status}, used=${acceptedTokenDoc.used}`);
    }
    let reacceptErrorCaught = false;
    try {
      await authService.acceptInvitation(inviteToken, null, testEmail);
    } catch (err) {
      reacceptErrorCaught = true;
      console.log(`✓ Repeated acceptance correctly blocked: "${err.message}"`);
    }
    if (!reacceptErrorCaught) {
      throw new Error('IDEMPOTENCY FAILURE: User was able to accept an already accepted invitation token!');
    }

    // 11. Verify Expired Token Lifecycle
    console.log('\n[Step 10] Testing Expired Token Lifecycle:');
    const expiredRawToken = crypto.randomBytes(32).toString('hex');
    const expiredHashedToken = crypto.createHash('sha256').update(expiredRawToken).digest('hex');
    await Token.create({
      userId: residentUser._id,
      orgId: orgB._id,
      inviterId: adminB._id,
      token: expiredHashedToken,
      type: 'INVITATION',
      status: 'PENDING',
      invitationSource: 'WEB',
      expiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour in the past
    });

    let expiredValidateCaught = false;
    try {
      await authService.validateInvite(expiredRawToken);
    } catch (err) {
      expiredValidateCaught = true;
      console.log(`✓ validateInvite on expired token correctly blocked: "${err.message}"`);
    }
    if (!expiredValidateCaught) {
      throw new Error('EXPIRATION FAILURE: validateInvite did not block expired token!');
    }

    let expiredAcceptCaught = false;
    try {
      await authService.acceptInvitation(expiredRawToken, 'NewPass123!');
    } catch (err) {
      expiredAcceptCaught = true;
      console.log(`✓ acceptInvitation on expired token correctly blocked: "${err.message}"`);
    }
    if (!expiredAcceptCaught) {
      throw new Error('EXPIRATION FAILURE: acceptInvitation did not block expired token!');
    }

    // 12. Verify Admin Revocation Lifecycle & Cross-Tenant Protection
    console.log('\n[Step 11] Testing Admin Revocation Lifecycle & Cross-Tenant Security:');
    const revokeEmail = `revoked_resident_${timestamp}@example.com`;
    const revokeInviteResult = await userService.inviteUser(
      revokeEmail,
      orgB._id.toString(),
      null,
      'None',
      'Resident',
      '',
      'To Be Revoked',
      'WEB',
      adminB._id.toString()
    );
    const revokeRawToken = revokeInviteResult.invitationToken;
    const revokeHashedToken = crypto.createHash('sha256').update(revokeRawToken).digest('hex');
    const tokenToRevokeDoc = await Token.findOne({ token: revokeHashedToken });

    // Try cross-tenant revocation: Admin of Org A tries to revoke invitation of Org B
    let crossTenantCaught = false;
    try {
      await userService.revokeInvitation(tokenToRevokeDoc._id.toString(), orgA._id.toString(), residentUser._id.toString());
    } catch (err) {
      crossTenantCaught = true;
      console.log(`✓ Cross-tenant revocation correctly blocked: "${err.message}"`);
    }
    if (!crossTenantCaught) {
      throw new Error('SECURITY FAILURE: Admin was able to revoke an invitation belonging to another organization!');
    }

    // Authorised revocation by Org B admin
    const revokeResult = await userService.revokeInvitation(tokenToRevokeDoc._id.toString(), orgB._id.toString(), adminB._id.toString());
    console.log(`✓ Revocation succeeded: ${revokeResult.message}, status: ${revokeResult.status}`);
    const revokedDocAfter = await Token.findById(tokenToRevokeDoc._id);
    if (revokedDocAfter.status !== 'REVOKED' || revokedDocAfter.used !== true) {
      throw new Error(`REVOCATION FAILURE: Token doc status should be REVOKED and used=true, got ${revokedDocAfter.status}`);
    }

    // Block validating revoked token
    let revokedValidateCaught = false;
    try {
      await authService.validateInvite(revokeRawToken);
    } catch (err) {
      revokedValidateCaught = true;
      console.log(`✓ validateInvite on revoked token correctly blocked: "${err.message}"`);
    }
    if (!revokedValidateCaught) {
      throw new Error('REVOCATION FAILURE: validateInvite accepted a revoked token!');
    }

    // Block accepting revoked token
    let revokedAcceptCaught = false;
    try {
      await authService.acceptInvitation(revokeRawToken, 'NewPass123!');
    } catch (err) {
      revokedAcceptCaught = true;
      console.log(`✓ acceptInvitation on revoked token correctly blocked: "${err.message}"`);
    }
    if (!revokedAcceptCaught) {
      throw new Error('REVOCATION FAILURE: acceptInvitation accepted a revoked token!');
    }

    // Block double revocation
    let doubleRevokeCaught = false;
    try {
      await userService.revokeInvitation(tokenToRevokeDoc._id.toString(), orgB._id.toString(), adminB._id.toString());
    } catch (err) {
      doubleRevokeCaught = true;
      console.log(`✓ Double revocation correctly blocked: "${err.message}"`);
    }
    if (!doubleRevokeCaught) {
      throw new Error('REVOCATION FAILURE: Able to revoke an already revoked token!');
    }

    // 13. Verify Rejection Lifecycle
    console.log('\n[Step 12] Testing Rejection Lifecycle:');
    const rejectEmail = `rejected_resident_${timestamp}@example.com`;
    const rejectInviteResult = await userService.inviteUser(
      rejectEmail,
      orgB._id.toString(),
      null,
      'None',
      'Resident',
      '',
      'To Be Rejected',
      'WEB',
      adminB._id.toString()
    );
    const rejectRawToken = rejectInviteResult.invitationToken;
    const rejectHashedToken = crypto.createHash('sha256').update(rejectRawToken).digest('hex');

    await authService.rejectInvitation(rejectRawToken);
    const rejectedTokenDoc = await Token.findOne({ token: rejectHashedToken });
    console.log(`- Rejected token in DB: status=${rejectedTokenDoc.status}, used=${rejectedTokenDoc.used}`);
    if (rejectedTokenDoc.status !== 'REJECTED' || rejectedTokenDoc.used !== true) {
      throw new Error(`REJECTION FAILURE: Token status should be REJECTED and used=true, got ${rejectedTokenDoc.status}`);
    }

    let rejectValidateCaught = false;
    try {
      await authService.validateInvite(rejectRawToken);
    } catch (err) {
      rejectValidateCaught = true;
      console.log(`✓ validateInvite on rejected token correctly blocked: "${err.message}"`);
    }
    if (!rejectValidateCaught) {
      throw new Error('REJECTION FAILURE: validateInvite allowed a rejected token!');
    }

    let rejectAcceptCaught = false;
    try {
      await authService.acceptInvitation(rejectRawToken, 'NewPass123!');
    } catch (err) {
      rejectAcceptCaught = true;
      console.log(`✓ acceptInvitation on rejected token correctly blocked: "${err.message}"`);
    }
    if (!rejectAcceptCaught) {
      throw new Error('REJECTION FAILURE: acceptInvitation allowed a rejected token!');
    }

    // 13. Verify Phase 2 GAP-01: SSO Invitation Scoping to Target Org (Org B)
    console.log('\n[Step 13] Testing SSO Acceptance Scoping to Target Org (GAP-01):');
    const ssoEmail = `sso_multi_org_${timestamp}@example.com`;
    // Create pre-existing user who already belongs to Org A
    const ssoUser = await User.create({
      name: 'SSO Multi-Org Resident',
      username: `sso_user_${timestamp}`,
      email: ssoEmail,
      password: hashedPassword,
      status: 'Active',
    });
    await OrgMembership.create({
      userId: ssoUser._id,
      orgId: orgA._id,
      roleIds: [roleA._id],
      status: 'Active',
    });

    // Invite this existing user to Org B
    const ssoInviteResult = await userService.inviteUser(
      ssoEmail,
      orgB._id.toString(),
      null,
      'None',
      'Resident',
      '',
      'SSO Multi-Org Resident',
      'WEB',
      adminB._id.toString()
    );
    const ssoInviteRawToken = ssoInviteResult.invitationToken;

    // Temporarily mock external Google OAuth token validation on userIdentityService
    const originalVerify = userIdentityService.verifyAndNormalizeProviderToken;
    userIdentityService.verifyAndNormalizeProviderToken = async (provider, token) => {
      return {
        provider: 'google',
        providerId: `google_uid_${timestamp}`,
        providerEmail: ssoEmail,
        profileData: { name: 'SSO Multi-Org Resident' }
      };
    };

    try {
      const ssoAcceptResult = await authService.acceptInvitationWithSSO(
        ssoInviteRawToken,
        'mock_google_oauth_token',
        'google'
      );

      console.log(`- SSO Accepted session activeOrgId: ${ssoAcceptResult.user.activeOrgId}`);
      console.log(`- Target invited orgId: ${orgB._id}`);
      console.log(`- Older membership orgId: ${orgA._id}`);

      if (ssoAcceptResult.user.activeOrgId.toString() !== orgB._id.toString()) {
        throw new Error(
          `GAP-01 FAILURE: Expected activeOrgId to be target invited org (${orgB._id}), got ${ssoAcceptResult.user.activeOrgId}`
        );
      }
      if (ssoAcceptResult.user.activeOrgId.toString() === orgA._id.toString()) {
        throw new Error(`GAP-01 FAILURE: Session was scoped to older organization (Org A) instead of target (Org B)!`);
      }
      console.log('✓ GAP-01 Verified: SSO invitation acceptance explicitly scoped token to target Org B!');

      // Step 14: Verify Mobile Acceptance Contract (GAP-02)
      console.log('\n[Step 14] Testing Mobile Acceptance Response Contract (GAP-02):');
      if (!ssoAcceptResult.token) throw new Error('GAP-02 FAILURE: Response missing token');
      if (!ssoAcceptResult.refreshToken) throw new Error('GAP-02 FAILURE: Response missing refreshToken');
      if (!ssoAcceptResult.user || !ssoAcceptResult.user.id) throw new Error('GAP-02 FAILURE: Response missing normalized user');
      if (!Array.isArray(ssoAcceptResult.availableWorkspaces) || ssoAcceptResult.availableWorkspaces.length < 2) {
        throw new Error('GAP-02 FAILURE: Response missing multi-org availableWorkspaces');
      }
      console.log('✓ GAP-02 Verified: Response contains token, refreshToken, user, and multi-org availableWorkspaces!');

      // Step 15: Verify Multi-Org Context Isolation & Legacy Field Safety (GAP-04)
      console.log('\n[Step 15] Testing Multi-Org Context Isolation & Legacy Field Safety (GAP-04):');
      const memberships = await OrgMembership.find({ userId: ssoUser._id }).lean();
      console.log(`- Total distinct org memberships for user: ${memberships.length}`);
      if (memberships.length !== 2) {
        throw new Error(`GAP-04 FAILURE: User should have exactly 2 memberships, got ${memberships.length}`);
      }
      const membershipOrgs = memberships.map(m => m.orgId.toString());
      if (!membershipOrgs.includes(orgA._id.toString()) || !membershipOrgs.includes(orgB._id.toString())) {
        throw new Error('GAP-04 FAILURE: Memberships do not contain both Org A and Org B!');
      }
      console.log('✓ GAP-04 Verified: One User -> Many OrgMemberships strictly preserved without global bleed!');
    } finally {
      userIdentityService.verifyAndNormalizeProviderToken = originalVerify;
      await User.deleteOne({ _id: ssoUser._id }).catch(() => null);
      await OrgMembership.deleteMany({ userId: ssoUser._id }).catch(() => null);
      const UserIdentity = (await import('../src/features/userIdentity/userIdentity.model.js')).default;
      await UserIdentity.deleteMany({ userId: ssoUser._id }).catch(() => null);
    }

    // =====================================================================
    // PHASE 4 SECURITY REGRESSION TESTS (SEC-01 through SEC-15)
    // =====================================================================
    console.log('\n======================================================');
    console.log('=== PHASE 4 SECURITY REGRESSION TESTS ===');
    console.log('======================================================\n');

    let secPassed = 0;
    let secFailed = 0;

    // SEC-01: validateInvite rejects missing token (P0-02)
    console.log('[SEC-01] validateInvite rejects missing/empty token...');
    try {
      await authService.validateInvite(null);
      console.log('  ❌ FAIL: Did not throw on null token');
      secFailed++;
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('token is required')) {
        console.log('  ✅ PASS: Correctly rejected null token');
        secPassed++;
      } else {
        console.log(`  ❌ FAIL: Wrong error: ${err.statusCode} ${err.message}`);
        secFailed++;
      }
    }

    try {
      await authService.validateInvite('');
      console.log('  ❌ FAIL: Did not throw on empty string token');
      secFailed++;
    } catch (err) {
      if (err.statusCode === 400) {
        console.log('  ✅ PASS: Correctly rejected empty string token');
        secPassed++;
      } else {
        console.log(`  ❌ FAIL: Wrong error: ${err.statusCode} ${err.message}`);
        secFailed++;
      }
    }

    // SEC-02: validateInvite rejects email mismatch (P0-02)
    console.log('[SEC-02] validateInvite rejects email mismatch...');
    const sec02Email = `sec02_${timestamp}@example.com`;
    const sec02Invite = await userService.inviteUser(
      sec02Email, orgB._id.toString(), null, 'None', 'Resident', '', 'SEC-02 User', 'WEB', adminB._id.toString()
    );
    try {
      await authService.validateInvite(sec02Invite.invitationToken, 'attacker@evil.com');
      console.log('  ❌ FAIL: Did not throw on mismatched email');
      secFailed++;
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('does not match')) {
        console.log('  ✅ PASS: Correctly rejected mismatched email');
        secPassed++;
      } else {
        console.log(`  ❌ FAIL: Wrong error: ${err.statusCode} ${err.message}`);
        secFailed++;
      }
    }

    // SEC-03: validateInvite rejects fabricated/random token (P0-02)
    console.log('[SEC-03] validateInvite rejects fabricated token...');
    try {
      await authService.validateInvite(crypto.randomBytes(32).toString('hex'));
      console.log('  ❌ FAIL: Did not throw on fabricated token');
      secFailed++;
    } catch (err) {
      if (err.statusCode === 400) {
        console.log('  ✅ PASS: Correctly rejected fabricated token');
        secPassed++;
      } else {
        console.log(`  ❌ FAIL: Wrong error: ${err.statusCode} ${err.message}`);
        secFailed++;
      }
    }

    // SEC-04: acceptInvitation rejects fabricated/random token
    console.log('[SEC-04] acceptInvitation rejects fabricated token...');
    try {
      await authService.acceptInvitation(crypto.randomBytes(32).toString('hex'), 'SomePass123!');
      console.log('  ❌ FAIL: Did not throw on fabricated token');
      secFailed++;
    } catch (err) {
      console.log(`  ✅ PASS: Correctly rejected fabricated token: "${err.message}"`);
      secPassed++;
    }

    // SEC-05: Cross-tenant revocation blocked (already tested in Step 11, re-verify explicitly)
    console.log('[SEC-05] Cross-tenant revocation explicitly blocked...');
    const sec05Email = `sec05_${timestamp}@example.com`;
    const sec05Invite = await userService.inviteUser(
      sec05Email, orgB._id.toString(), null, 'None', 'Resident', '', 'SEC-05 User', 'WEB', adminB._id.toString()
    );
    const sec05HashedToken = crypto.createHash('sha256').update(sec05Invite.invitationToken).digest('hex');
    const sec05TokenDoc = await Token.findOne({ token: sec05HashedToken });
    try {
      // residentUser is a member of orgA — should NOT be able to revoke orgB invitations
      await userService.revokeInvitation(sec05TokenDoc._id.toString(), orgA._id.toString(), residentUser._id.toString());
      console.log('  ❌ FAIL: Cross-tenant revocation was not blocked');
      secFailed++;
    } catch (err) {
      console.log(`  ✅ PASS: Cross-tenant revocation blocked: "${err.message}"`);
      secPassed++;
    }

    // SEC-06: Double revocation blocked
    console.log('[SEC-06] Double revocation blocked...');
    // First revoke SEC-05 token properly
    await userService.revokeInvitation(sec05TokenDoc._id.toString(), orgB._id.toString(), adminB._id.toString());
    try {
      await userService.revokeInvitation(sec05TokenDoc._id.toString(), orgB._id.toString(), adminB._id.toString());
      console.log('  ❌ FAIL: Double revocation was not blocked');
      secFailed++;
    } catch (err) {
      console.log(`  ✅ PASS: Double revocation blocked: "${err.message}"`);
      secPassed++;
    }

    // SEC-07: Re-acceptance of already accepted token blocked (idempotency)
    console.log('[SEC-07] Re-acceptance of already accepted token blocked...');
    try {
      // inviteToken was already accepted in Step 7
      await authService.acceptInvitation(inviteToken, null, testEmail);
      console.log('  ❌ FAIL: Re-acceptance of accepted token was not blocked');
      secFailed++;
    } catch (err) {
      console.log(`  ✅ PASS: Re-acceptance blocked: "${err.message}"`);
      secPassed++;
    }

    // SEC-08: Expired token validateInvite blocked
    console.log('[SEC-08] Expired token validateInvite blocked...');
    const sec08RawToken = crypto.randomBytes(32).toString('hex');
    const sec08HashedToken = crypto.createHash('sha256').update(sec08RawToken).digest('hex');
    await Token.create({
      userId: residentUser._id, orgId: orgB._id, inviterId: adminB._id,
      token: sec08HashedToken, type: 'INVITATION', status: 'PENDING',
      email: `sec08_${timestamp}@example.com`, invitationSource: 'WEB',
      expiresAt: new Date(Date.now() - 3600 * 1000),
    });
    try {
      await authService.validateInvite(sec08RawToken);
      console.log('  ❌ FAIL: Expired token was not blocked on validate');
      secFailed++;
    } catch (err) {
      console.log(`  ✅ PASS: Expired token blocked on validate: "${err.message}"`);
      secPassed++;
    }

    // SEC-09: Expired token acceptInvitation blocked
    console.log('[SEC-09] Expired token acceptInvitation blocked...');
    try {
      await authService.acceptInvitation(sec08RawToken, 'SomePass123!');
      console.log('  ❌ FAIL: Expired token was not blocked on accept');
      secFailed++;
    } catch (err) {
      console.log(`  ✅ PASS: Expired token blocked on accept: "${err.message}"`);
      secPassed++;
    }

    // SEC-10: Revoked token validateInvite blocked
    console.log('[SEC-10] Revoked token validateInvite blocked...');
    try {
      await authService.validateInvite(sec05Invite.invitationToken);
      console.log('  ❌ FAIL: Revoked token was not blocked on validate');
      secFailed++;
    } catch (err) {
      console.log(`  ✅ PASS: Revoked token blocked on validate: "${err.message}"`);
      secPassed++;
    }

    // SEC-11: Revoked token acceptInvitation blocked
    console.log('[SEC-11] Revoked token acceptInvitation blocked...');
    try {
      await authService.acceptInvitation(sec05Invite.invitationToken, 'SomePass123!');
      console.log('  ❌ FAIL: Revoked token was not blocked on accept');
      secFailed++;
    } catch (err) {
      console.log(`  ✅ PASS: Revoked token blocked on accept: "${err.message}"`);
      secPassed++;
    }

    // SEC-12: Rejected token validateInvite blocked
    console.log('[SEC-12] Rejected token validateInvite blocked...');
    try {
      // rejectRawToken was rejected in Step 12
      await authService.validateInvite(rejectRawToken);
      console.log('  ❌ FAIL: Rejected token was not blocked on validate');
      secFailed++;
    } catch (err) {
      console.log(`  ✅ PASS: Rejected token blocked on validate: "${err.message}"`);
      secPassed++;
    }

    // SEC-13: Rejected token acceptInvitation blocked
    console.log('[SEC-13] Rejected token acceptInvitation blocked...');
    try {
      await authService.acceptInvitation(rejectRawToken, 'SomePass123!');
      console.log('  ❌ FAIL: Rejected token was not blocked on accept');
      secFailed++;
    } catch (err) {
      console.log(`  ✅ PASS: Rejected token blocked on accept: "${err.message}"`);
      secPassed++;
    }

    // SEC-14: Active membership not demoted to Pending on re-invite (P2-01)
    console.log('[SEC-14] Active membership preserved on re-invite (P2-01)...');
    // residentUser is Active in orgA from initial setup. Re-invite them to orgA should NOT demote.
    const membershipABefore = await orgMembershipService.getMembership(residentUser._id, orgA._id);
    const membershipAStatusBefore = membershipABefore?.status;
    console.log(`  - Membership in orgA before re-invite: ${membershipAStatusBefore}`);
    if (membershipAStatusBefore === 'Active') {
      try {
        await userService.inviteUser(
          testEmail, orgA._id.toString(), null, 'None', 'Resident', '', 'Existing Resident', 'WEB', adminB._id.toString()
        );
      } catch (e) {
        // Invitation might throw for already-active member, that's acceptable
        console.log(`  - Re-invite threw (acceptable): ${e.message}`);
      }
      const membershipAAfter = await orgMembershipService.getMembership(residentUser._id, orgA._id);
      if (membershipAAfter?.status === 'Active') {
        console.log('  ✅ PASS: Active membership preserved after re-invite');
        secPassed++;
      } else {
        console.log(`  ❌ FAIL: Membership demoted from Active to ${membershipAAfter?.status}`);
        secFailed++;
      }
    } else {
      console.log(`  ⚠ SKIP: Membership was not Active before re-invite (${membershipAStatusBefore})`);
    }

    // SEC-15: Villa conflict detection - atomic assignment (P2-02)
    console.log('[SEC-15] Villa conflict detection (P2-02)...');
    const conflictVilla = await Villa.create({
      orgId: orgA._id, unitNumber: `CONFLICT-${timestamp}`, blockOrBuilding: 'Tower X',
      status: 'Occupied', type: 'Villa', primaryResidentId: adminB._id,
      residents: [{ userId: adminB._id, residencyType: 'Resident', isPrimary: true, assignedAt: new Date() }],
    });
    try {
      await villaService.assignResidentToVilla(conflictVilla._id, residentUser._id, 'Resident', null, orgA._id);
      console.log('  ❌ FAIL: Villa conflict was not detected');
      secFailed++;
    } catch (err) {
      if (err.statusCode === 409) {
        console.log(`  ✅ PASS: Villa conflict detected with 409: "${err.message}"`);
        secPassed++;
      } else {
        console.log(`  ❌ FAIL: Wrong error code ${err.statusCode}: "${err.message}"`);
        secFailed++;
      }
    }
    // Cleanup conflict villa
    await Villa.deleteOne({ _id: conflictVilla._id }).catch(() => null);

    // SEC-16: OrgMembership unique index enforcement (P2-03)
    console.log('[SEC-16] OrgMembership unique index - duplicate prevention (P2-03)...');
    try {
      await OrgMembership.createIndexes();
      // residentUser already has membership in orgA — creating a second should fail
      await OrgMembership.create({
        userId: residentUser._id, orgId: orgA._id, roleIds: [roleA._id], status: 'Active',
      });
      console.log('  ❌ FAIL: Duplicate OrgMembership was allowed');
      secFailed++;
    } catch (err) {
      if (err.code === 11000 || err.name === 'MongoServerError' || err.message.includes('duplicate') || err.message.includes('E11000')) {
        console.log('  ✅ PASS: Duplicate OrgMembership prevented by unique index');
        secPassed++;
      } else {
        console.log(`  ❌ FAIL: Unexpected error: ${err.message}`);
        secFailed++;
      }
    }

    // Security test summary
    const secTotal = secPassed + secFailed;
    console.log('\n======================================================');
    console.log(`=== SECURITY TESTS COMPLETE: ${secPassed}/${secTotal} PASSED ===`);
    if (secFailed > 0) {
      console.log(`⚠ ${secFailed} SECURITY TEST(S) FAILED`);
    }
    console.log('======================================================\n');

    if (secFailed > 0) {
      throw new Error(`${secFailed} security regression test(s) failed. See details above.`);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL MULTI-TENANT INVITATION, NOTIFICATION & SECURITY TESTS PASSED!');
    console.log('======================================================\n');
  } finally {
    // Cleanup test data
    console.log('Cleaning up test data...');
    await User.deleteMany({ email: { $regex: new RegExp(`.*_${timestamp}@example\\.com`) } });
    await Token.deleteMany({ orgId: { $in: [orgA?._id, orgB?._id] } });
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
