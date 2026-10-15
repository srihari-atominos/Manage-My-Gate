const fs = require('fs');
const file = 'd:/atominos/GatedCommunity/backend/src/features/user/user.listeners.js';
let content = fs.readFileSync(file, 'utf8');

const newTemplate = `
You're Invited to {{CommunityName}}

You have been invited to join {{CommunityName}}.

Email: {{Email}}
Phone: {{Phone}}
Role: {{Role}}

[ Step Into Your Community ]

After clicking the button, you can sign in using
your registered email address or phone number
and OTP.

If you were not expecting this invitation,
you can safely ignore this email.
`;

// we should replace customInviteBody with this template, formatted as HTML if needed, but since it asks for email template, I'll provide exactly the text or a basic HTML wrapper for the text.

const rawHtmlTemplate = `
<div style="font-family: sans-serif; padding: 20px; color: #333;">
  <h2>You're Invited to {{community_name}}</h2>
  <p>You have been invited to join {{community_name}}.</p>
  <p>Email: {{Email}}<br/>
  Phone: {{Phone}}<br/>
  Role: {{Role}}</p>
  <p><a href="{{invite_link}}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Step Into Your Community</a></p>
  <p>After clicking the button, you can sign in using your registered email address or phone number and OTP.</p>
  <p>If you were not expecting this invitation, you can safely ignore this email.</p>
</div>
`;

// the listener file has a very large HTML template right now, from `const customInviteBody = \`` to the end of the template string.
content = content.replace(/const customInviteBody = `[\s\S]*?<\/html>\n`;/, "const customInviteBody = `" + rawHtmlTemplate + "`;");

// ensure the link doesn't append mode
// There are lines like:
// const inviteLink = `${baseUrl}/#/invite?token=${invitationToken}`;
// let's make sure it doesn't append ?mode
// Wait, looking at the code from previous task, there was no `?mode` appending, just `/#/invite?token=`. But let me double check.
content = content.replace(/&mode=\w+/g, '');

content = content.replace(/{{Email}}/g, '${email || "Not provided"}');
content = content.replace(/{{Phone}}/g, '${phone || "Not provided"}');
content = content.replace(/{{Role}}/g, '${roleName || "User"}');

fs.writeFileSync(file, content);
