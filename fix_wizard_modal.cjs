const fs = require('fs');
const file = 'mobile/mobile-app/src/features/profile/components/ContactChangeWizardModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix onChange -> onValueChange
content = content.replace(/onChange=\{setCurrentOtp\}/g, 'onValueChange={setCurrentOtp}');
content = content.replace(/onChange=\{setNewOtp\}/g, 'onValueChange={setNewOtp}');

// Fix SheetGrabHandle onClose
content = content.replace('<SheetGrabHandle />', '<SheetGrabHandle onClose={handleClose} />');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed ContactChangeWizardModal');
