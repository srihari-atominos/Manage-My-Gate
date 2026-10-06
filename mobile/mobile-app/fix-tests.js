const fs = require('fs');
const { execSync } = require('child_process');

function updateTests() {
  const files = execSync('git grep -l "useRouter: () => ({"').toString().trim().split('\n');
  
  for (const file of files) {
    if (!file) continue;
    let content = fs.readFileSync(file, 'utf8');
    // Fix the syntax error I just introduced
    content = content.replace(/navigate:\s*push:\s*([^,]+)/g, 'navigate: $1');
    fs.writeFileSync(file, content);
  }
}
updateTests();
