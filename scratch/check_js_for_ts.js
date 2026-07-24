import fs from 'fs';
import path from 'path';

const tailwindSrc = 'e:/atominos/Manage-My-Gate/tailwind-frontend/src';

function getFilesRecursively(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const jsFiles = getFilesRecursively(tailwindSrc);
const tsPatternsInJs = [];

const patterns = [
  { name: 'as number/string/any/const', regex: /\sas\s+(number|string|any|const|boolean)\b/ },
  { name: 'type annotation (e.g. : string)', regex: /:\s*(string|number|boolean|any)\b/ },
  { name: 'interface declaration', regex: /\binterface\s+[A-Z][A-Za-z0-9_]*\s*\{/ },
  { name: 'type declaration', regex: /\btype\s+[A-Z][A-Za-z0-9_]*\s*=/ },
  { name: 'React.FC', regex: /\bReact\.FC\b/ },
  { name: 'non-null assertion', regex: /[a-zA-Z0-9_]\s*!(?!\=)/ },
  { name: 'generic syntax', regex: /<[A-Z][A-Za-z0-9_]*>\(/ }
];

for (const file of jsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    
    for (const pat of patterns) {
      if (pat.regex.test(line)) {
        tsPatternsInJs.push({
          file: path.relative(tailwindSrc, file).replace(/\\/g, '/'),
          line: idx + 1,
          content: line.trim(),
          pattern: pat.name
        });
      }
    }
  });
}

console.log(`Found ${tsPatternsInJs.length} TS constructs in JS/JSX files:`);
for (const occurrence of tsPatternsInJs) {
  console.log(`  - File: ${occurrence.file} (Line ${occurrence.line})`);
  console.log(`    Pattern: ${occurrence.pattern}`);
  console.log(`    Code: ${occurrence.content}`);
}
