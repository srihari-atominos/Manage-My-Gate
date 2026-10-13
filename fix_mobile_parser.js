const fs = require('fs');
const file = 'mobile/mobile-app/src/features/villa/components/BulkUploadVillasModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /else if \(hdr\.includes\('residenttype'\)\) \{[\s\S]*?else rowObj\.residentType = val;\n\s*\}/;
const replacement = "else if (hdr.includes('residenttype')) {\n          rowObj.residentType = val;\n        }";

content = content.replace(regex, replacement);
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed mobile parser');
