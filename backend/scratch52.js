const fs = require('fs');

let lines = fs.readFileSync('src/features/auth/auth.services.js', 'utf8').split(/\r?\n/);

const acceptStart = lines.findIndex(l => l.includes('async acceptInvitation('));
if (acceptStart !== -1) {
  for (let i = acceptStart; i < acceptStart + 100; i++) {
    if (lines[i].includes('await userService.activateUser(')) {
      if (!lines[i+1].includes("user.status = 'Active';")) {
        lines.splice(i + 1, 0, "          user.status = 'Active';");
      }
      break;
    }
  }
}

fs.writeFileSync('src/features/auth/auth.services.js', lines.join('\n'));
console.log('Fixed auth.services.js');
