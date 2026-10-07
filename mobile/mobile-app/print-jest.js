const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log(JSON.stringify(pkg.jest, null, 2));
