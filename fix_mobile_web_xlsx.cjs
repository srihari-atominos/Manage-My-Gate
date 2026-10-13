const fs = require('fs');

const file = 'mobile/mobile-app/src/features/villa/components/BulkUploadVillasModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /if \(asset\.name\.toLowerCase\(\)\.endsWith\('\.xlsx'\)\) \{[\s\S]*?fileContent = XLSX\.utils\.sheet_to_csv\(sheet\);\r?\n\s*\} else \{/;

const replacement = `if (asset.name.toLowerCase().endsWith('.xlsx')) {
                if (Platform.OS === 'web' && (asset as any).file) {
                  const buffer = await (asset as any).file.arrayBuffer();
                  const workbook = XLSX.read(buffer, { type: 'array' });
                  const sheet = workbook.Sheets[workbook.SheetNames[0]];
                  fileContent = XLSX.utils.sheet_to_csv(sheet);
                } else {
                  const fsModule = LegacyFileSystem || FileSystem;
                  const b64 = await fsModule.readAsStringAsync(asset.uri, { encoding: fsModule.EncodingType?.Base64 || 'base64' });
                  const workbook = XLSX.read(b64, { type: 'base64' });
                  const sheet = workbook.Sheets[workbook.SheetNames[0]];
                  fileContent = XLSX.utils.sheet_to_csv(sheet);
                }
              } else {`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Mobile Unit parsing fixed for Web environment.');
