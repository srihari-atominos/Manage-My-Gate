import fs from 'fs';
import path from 'path';

const tailwindSrc = 'e:/atominos/Manage-My-Gate/tailwind-frontend/src';
const legacySrc = 'e:/atominos/Manage-My-Gate/frontend/src';

const routerPath = path.join(tailwindSrc, 'routes/Router.tsx');
const routerContent = fs.readFileSync(routerPath, 'utf8');

// Find all imported/referenced view components in Router.tsx
// e.g. import(...) or component definitions
console.log('--- ROUTER COMPONENT REFERENCE AUDIT ---');

function getFilesRecursively(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else if (file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.js')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// 1. Audit tailwind-frontend features views
const featuresDir = path.join(tailwindSrc, 'features');
const features = fs.readdirSync(featuresDir);

console.log('\n--- Views in tailwind-frontend vs Router.tsx Route definition ---');
const missingRoutes = [];
const allViews = [];

for (const feature of features) {
  const viewsDir = path.join(featuresDir, feature, 'views');
  if (fs.existsSync(viewsDir)) {
    const viewFiles = getFilesRecursively(viewsDir);
    for (const vf of viewFiles) {
      const relative = path.relative(tailwindSrc, vf).replace(/\\/g, '/');
      const basename = path.basename(vf, path.extname(vf));
      allViews.push({ feature, relative, basename, vf });

      // Check if basename is used in Router.tsx
      const isReferenced = routerContent.includes(basename);
      if (!isReferenced) {
        missingRoutes.push({ feature, relative, basename });
      }
    }
  }
}

console.log(`Found ${allViews.length} views in new tailwind-frontend.`);
console.log(`Found ${missingRoutes.length} views that are NOT referenced in Router.tsx:`);
for (const mr of missingRoutes) {
  console.log(`  - [${mr.feature}] ${mr.basename} (${mr.relative})`);
}

// 2. Audit legacy vs new features views to check if any view file is missing entirely
console.log('\n--- Comparing view files: legacy vs new ---');
const legacyFeaturesDir = path.join(legacySrc, 'features');
const missingFiles = [];

if (fs.existsSync(legacyFeaturesDir)) {
  const legacyFeatures = fs.readdirSync(legacyFeaturesDir);
  for (const lf of legacyFeatures) {
    const legacyViewsDir = path.join(legacyFeaturesDir, lf, 'views');
    if (fs.existsSync(legacyViewsDir)) {
      const legacyViewFiles = getFilesRecursively(legacyViewsDir);
      for (const lvf of legacyViewFiles) {
        const relativeLegacy = path.relative(legacySrc, lvf).replace(/\\/g, '/');
        // Check if corresponding file exists in tailwind-frontend
        const correspondingPath = path.join(tailwindSrc, relativeLegacy);
        const correspondingJsxPath = correspondingPath.endsWith('.js') 
          ? correspondingPath.replace(/\.js$/, '.jsx') 
          : correspondingPath;
        
        if (!fs.existsSync(correspondingPath) && !fs.existsSync(correspondingJsxPath)) {
          missingFiles.push(relativeLegacy);
        }
      }
    }
  }
}

console.log(`Found ${missingFiles.length} legacy view files missing in new frontend:`);
for (const mf of missingFiles) {
  console.log(`  - ${mf}`);
}

// 3. Check for any leftover ts/tsx files in tailwind-frontend/src
console.log('\n--- TypeScript File Audit in tailwind-frontend/src ---');
const allSrcFiles = getFilesRecursively(tailwindSrc);
const tsFiles = allSrcFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
console.log(`Total source files: ${allSrcFiles.length}`);
console.log(`TypeScript files (.ts/.tsx): ${tsFiles.length}`);
// Show a list of TS files
const tsByDir = {};
for (const tf of tsFiles) {
  const rel = path.relative(tailwindSrc, tf).replace(/\\/g, '/');
  const dir = path.dirname(rel);
  tsByDir[dir] = (tsByDir[dir] || 0) + 1;
}
console.log('TypeScript files count by directory:');
for (const [dir, count] of Object.entries(tsByDir)) {
  console.log(`  - ${dir}: ${count} files`);
}
