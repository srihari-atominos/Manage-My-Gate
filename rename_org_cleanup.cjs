const fs = require('fs');
const path = require('path');

const replacements = [
  { search: /defaultValue:\s*'Loading organization users\.\.\.'/g, replace: "defaultValue: 'Loading community users...'" },
  { search: /placeholder="Enter organization or community name"/g, replace: 'placeholder="Enter community name"' },
  { search: /defaultValue:\s*'This user will be assigned as Community Admin for this organization\.'/g, replace: "defaultValue: 'This user will be assigned as Community Admin for this community.'" },
  { search: /defaultValue:\s*'Community \/ Organization'/g, replace: "defaultValue: 'Community'" },
  { search: /'renders Step 1 Organization Info by default'/g, replace: "'renders Step 1 Community Info by default'" },
  { search: /defaultValue:\s*'Organization Details'/g, replace: "defaultValue: 'Community Details'" }
];

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      for (const { search, replace } of replacements) {
        if (search.test(content)) {
          content = content.replace(search, replace);
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'frontend/src/features/organization'));
console.log('Cleanup replacement process complete.');
