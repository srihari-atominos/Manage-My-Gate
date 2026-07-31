import fs from 'fs';
import path from 'path';

const tailwindSrc = 'e:/atominos/Manage-My-Gate/tailwind-frontend/src';
const legacySrc = 'e:/atominos/Manage-My-Gate/frontend/src';

const unreferencedViews = [
  'ResidentBookingView',
  'ResidentHistoryView',
  'AssignComplaint',
  'ComplaintDetails',
  'ComplaintSettings',
  'PerformanceAnalytics',
  'NoticeBoardList',
  'NotificationView'
];

function getFilesRecursively(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else if (file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = getFilesRecursively(tailwindSrc);

console.log('--- SEARCHING REFERENCES IN NEW FRONTEND ---');
for (const name of unreferencedViews) {
  const refs = [];
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    // search for import or mention, excluding the file itself
    if (path.basename(file, path.extname(file)) !== name) {
      if (content.includes(name)) {
        const rel = path.relative(tailwindSrc, file).replace(/\\/g, '/');
        refs.push(rel);
      }
    }
  }
  console.log(`\nReferences to '${name}':`);
  if (refs.length === 0) {
    console.log('  (None found)');
  } else {
    for (const ref of refs) {
      console.log(`  - ${ref}`);
    }
  }
}

console.log('\n--- SEARCHING REFERENCES IN LEGACY FRONTEND ---');
const legacyFiles = getFilesRecursively(legacySrc);
for (const name of unreferencedViews) {
  const refs = [];
  for (const file of legacyFiles) {
    const content = fs.readFileSync(file, 'utf8');
    // search for import or mention, excluding the file itself
    if (path.basename(file, path.extname(file)) !== name) {
      if (content.includes(name)) {
        const rel = path.relative(legacySrc, file).replace(/\\/g, '/');
        refs.push(rel);
      }
    }
  }
  console.log(`\nLegacy references to '${name}':`);
  if (refs.length === 0) {
    console.log('  (None found)');
  } else {
    for (const ref of refs) {
      console.log(`  - ${ref}`);
    }
  }
}
