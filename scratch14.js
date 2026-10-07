const fs = require('fs');
let content = fs.readFileSync('frontend/src/views/pages/invite/InviteHandler.jsx', 'utf8');

const replaceStr = `        const universalLink = \`\${window.location.origin}/invite/handoff/\${token}\`
        const storeUrl = isIos ? APP_STORE_URL : PLAY_STORE_URL`;

const newStr = `        // If we don't have a valid handoff ticket, use the custom scheme to trigger deep link directly
        // because navigating to the same /invite/:token path might not trigger universal links on all OSes
        const universalLink = \`managemygate://accept-invite?token=\${token}\`
        const storeUrl = isIos ? APP_STORE_URL : PLAY_STORE_URL`;

content = content.replace(replaceStr, newStr);

fs.writeFileSync('frontend/src/views/pages/invite/InviteHandler.jsx', content);
