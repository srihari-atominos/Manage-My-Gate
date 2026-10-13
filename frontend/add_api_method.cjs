const fs = require('fs');
const file = 'src/features/userManagement/services/userApi.js';
let content = fs.readFileSync(file, 'utf8');

const newMethod = `
/**
 * Downloads the Excel template for bulk inviting users.
 * @returns {Promise<Blob>}
 */
export const downloadBulkInviteTemplate = async () => {
  const blob = await apiClient.get('/users/bulk-invite/template', { responseType: 'blob' });
  return blob;
};
`;

if (!content.includes('downloadBulkInviteTemplate')) {
  content += newMethod;
  fs.writeFileSync(file, content, 'utf8');
  console.log('Added downloadBulkInviteTemplate to userApi.js');
} else {
  console.log('Already exists');
}
