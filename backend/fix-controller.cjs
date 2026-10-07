const fs = require('fs');
let content = fs.readFileSync('src/features/organization/organization.controller.js', 'utf8');
content = content.replace('}\n\n  async updateLoginPolicy', '  async updateLoginPolicy');
content = content.replace('  }\n}\n\nexport default new OrganizationController();', '  }\n\nexport default new OrganizationController();');
fs.writeFileSync('src/features/organization/organization.controller.js', content, 'utf8');
