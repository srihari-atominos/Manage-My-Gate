const fs = require('fs');
let c = fs.readFileSync('mobile/mobile-app/app/(resident)/admin/users.tsx', 'utf8');
c = c.replace(/const InviteUserModal = lazy[\s\S]*?\n/, '');
c = c.replace(/\s*inviteUser,/g, '');
c = c.replace(/const handleSendInvite = async[\s\S]*?throw err;\s*\}\s*\};/g, '');
c = c.replace(/label=\{t\('invite_user', 'Invite'\)\}/g, 'label={t(\'bulk_create\', \'Bulk Create\')}');
c = c.replace(/accessibilityLabel=\{t\('invite_user', 'Invite User'\)\}/g, 'accessibilityLabel={t(\'bulk_create\', \'Bulk Create\')}');
c = c.replace(/No community users registered yet\. Tap the button below to invite users\./g, 'No community users registered yet. Tap the button below to bulk create users.');
fs.writeFileSync('mobile/mobile-app/app/(resident)/admin/users.tsx', c);
