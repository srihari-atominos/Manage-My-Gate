const fs = require('fs');
const file = 'src/features/villa/services/villaService.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /export const downloadBulkUploadTemplate = async \(\) => \{\s+const response = await apiClient\.get\('\/villas\/bulk-upload\/template', \{ responseType: 'blob' \}\);\s+return response\.data;\s+\};/;

const replacement = `export const downloadBulkUploadTemplate = async () => {
  const blob = await apiClient.get('/villas/bulk-upload/template', { responseType: 'blob' });
  return blob;
};`;

if (content.includes('const response = await apiClient.get')) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed downloadBulkUploadTemplate return value');
} else {
  console.log('Not found');
}
