const fs = require('fs');
let content = fs.readFileSync('src/features/organization/organization.controller.js', 'utf8');
content = content.replace('  }\n}\n\nexport default new OrganizationController();', '  }\n\n  async updateLoginPolicy(req, res, next) {\n    try {\n      res.status(501).json({ success: false, message: "Not implemented" });\n    } catch (error) {\n      next(error);\n    }\n  }\n}\n\nexport default new OrganizationController();');
fs.writeFileSync('src/features/organization/organization.controller.js', content, 'utf8');
