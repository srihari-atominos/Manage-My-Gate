const fs = require('fs');
let content = fs.readFileSync('src/features/auth/auth.services.js', 'utf8');

// The file has things like: message: isDev 'Some message'
content = content.replace(/message:\s*isDev\s*'([^']+)'/g, "message: '$1'");
// It might also have `message: isDev "Some message"` or template strings
content = content.replace(/message:\s*isDev\s*`([^`]+)`/g, "message: '$1'");
content = content.replace(/message:\s*isDev\s*"([^"]+)"/g, 'message: "$1"');

// Wait, looking at the previous failed script output:
// content = content.replace(/\?.*\(Dev Code: \$\{plainCode\}\).*:\s*('[^']+')/g, "$1");
// Actually, earlier it was: message: isDev ? `OTP sent successfully (Dev Code: ${plainCode})` : 'OTP sent successfully'
// And my bad replace changed it to `message: isDev 'OTP sent successfully'`
// So we want to remove the `isDev ` part.

fs.writeFileSync('src/features/auth/auth.services.js', content);
console.log('Fixed syntax error!');
