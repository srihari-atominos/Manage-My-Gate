const fs = require('fs');
let file = 'mobile/mobile-app/src/features/profile/components/ContactChangeWizardModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<Button variant="default" onPress=\{handleRequestCurrentOtp\} >/g, '<Button variant="default" onPress={handleRequestCurrentOtp} disabled={loading}>');
content = content.replace(/<Button variant="default" onPress=\{handleVerifyCurrentOtp\} >/g, '<Button variant="default" onPress={handleVerifyCurrentOtp} disabled={loading}>');
content = content.replace(/<Button variant="default" onPress=\{handleRequestNewOtp\} >/g, '<Button variant="default" onPress={handleRequestNewOtp} disabled={loading}>');
content = content.replace(/<Button variant="default" onPress=\{handleFinalSubmit\} >/g, '<Button variant="default" onPress={handleFinalSubmit} disabled={loading}>');
content = content.replace(/<Button variant="ghost" onPress=\{handleClose\}  className="mt-2">/g, '<Button variant="ghost" onPress={handleClose} disabled={loading} className="mt-2">');

fs.writeFileSync(file, content, 'utf8');
console.log('Restored buttons');
