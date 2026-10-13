const fs = require('fs');
const file = 'src/features/user/user.listeners.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\\\$\{(.*?)\}/g, '${$1}');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed email template escaping in user.listeners.js');
