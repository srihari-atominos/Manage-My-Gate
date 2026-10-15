const fs = require('fs');
const file = 'd:/atominos/GatedCommunity/backend/src/features/auth/auth.services.js';
let content = fs.readFileSync(file, 'utf8');

const ssoInviteLogic = `      // Process invitation token if provided during SSO login
      let targetOrgIdFromInvite = null;
      if (inviteToken) {
        const tokenRes = await tokenService.validateInvitationToken(inviteToken, session);
        if (tokenRes.userId && tokenRes.userId.toString() !== user._id.toString()) {
           throw new HttpError(403, 'The authenticated account does not match the invitation identity.');
        }
        targetOrgIdFromInvite = tokenRes.orgId;
        const orgMembershipService = (await import('../orgMembership/orgMembership.services.js')).default;
        await orgMembershipService.updateStatus(user._id, tokenRes.orgId, 'Active', session);
        
        const membership = await orgMembershipService.getMembershipWithVilla(user._id, tokenRes.orgId, session);
        if (membership && membership.units && membership.units.length > 0) {
          const villaService = (await import('../villa/villa.services.js')).default;
          for (const unit of membership.units) {
            if (unit.villaId) {
              await villaService.assignResidentToVilla(unit.villaId._id || unit.villaId, user._id, unit.residentType || 'Resident', session, tokenRes.orgId);
            }
          }
        }
        await tokenService.consumeInvitationToken(inviteToken, session);
      }`;

content = content.replace(/\/\/ Process invitation token if provided during SSO login[\s\S]*?if \(user\.status === 'Pending Verification'\) \{[\s\S]*?\}\n        \}\n      \}/, ssoInviteLogic);

fs.writeFileSync(file, content);
