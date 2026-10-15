const fs = require('fs');
let lines = fs.readFileSync('backend/src/features/auth/auth.services.js', 'utf8').split('\n');

const acceptStart = lines.findIndex(l => l.includes('async acceptInvitation('));
if (acceptStart !== -1) {
  for (let i = acceptStart; i < acceptStart + 100; i++) {
    if (lines[i].includes("await userService.activateUser(user._id, user.password, session, profileData);")) {
      lines.splice(i + 1, 0, "          user.status = 'Active';");
      break;
    }
  }
}

fs.writeFileSync('backend/src/features/auth/auth.services.js', lines.join('\n'));
console.log('Fixed stale user status in acceptInvitation');
