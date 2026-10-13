const fs = require('fs');
const path = require('path');

const replacements = [
  // Exact defaultValues
  { search: /defaultValue:\s*'Loading organizations\.\.\.'/g, replace: "defaultValue: 'Loading communities...'" },
  { search: /defaultValue:\s*'No organizations found\.'/g, replace: "defaultValue: 'No communities found.'" },
  { search: /defaultValue:\s*'Organizations will appear here once created\.'/g, replace: "defaultValue: 'Communities will appear here once created.'" },
  { search: /defaultValue:\s*'Organization'/g, replace: "defaultValue: 'Community'" },
  { search: /defaultValue:\s*'Organization Details'/g, replace: "defaultValue: 'Community Details'" },
  { search: /defaultValue:\s*'Back to Organizations'/g, replace: "defaultValue: 'Back to Communities'" },
  { search: /defaultValue:\s*'Organization Info'/g, replace: "defaultValue: 'Community Info'" },
  { search: /defaultValue:\s*'Organization Information'/g, replace: "defaultValue: 'Community Information'" },
  { search: /defaultValue:\s*'Organization Name'/g, replace: "defaultValue: 'Community Name'" },
  { search: /defaultValue:\s*'Organization Name is required'/g, replace: "defaultValue: 'Community Name is required'" },
  { search: /defaultValue:\s*'Creating Organization\.\.\.'/g, replace: "defaultValue: 'Creating Community...'" },
  { search: /defaultValue:\s*'Organization Created Successfully!'/g, replace: "defaultValue: 'Community Created Successfully!'" },
  { search: /defaultValue:\s*'Go to Organization Dashboard'/g, replace: "defaultValue: 'Go to Community Dashboard'" },
  { search: /defaultValue:\s*'Failed to Create Organization'/g, replace: "defaultValue: 'Failed to Create Community'" },
  { search: /defaultValue:\s*'Please review the organization details before final provisioning\.'/g, replace: "defaultValue: 'Please review the community details before final provisioning.'" },
  // Aria labels
  { search: /aria-label="Organization pagination"/g, replace: 'aria-label="Community pagination"' },
  // HTML text nodes & hardcoded text
  { search: /Organization Name is required/g, replace: 'Community Name is required' },
  { search: /aria-label="Organization Name"/g, replace: 'aria-label="Community Name"' },
  { search: /label="Organization Name"/g, replace: 'label="Community Name"' },
  { search: /placeholder="Organization Name"/g, replace: 'placeholder="Community Name"' },
  { search: /'Organization Name'/g, replace: "'Community Name'" },
  { search: /"Organization Name"/g, replace: '"Community Name"' },
  { search: />Organization</g, replace: '>Community<' },
  { search: /Manage all system organizations, view status/g, replace: 'Manage all system communities, view status' }
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
console.log('Replacement process complete.');
