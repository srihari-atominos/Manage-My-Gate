const fs = require('fs');

const file = 'mobile/mobile-app/src/features/villa/components/BulkUploadVillasModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /import \{ downloadCSVFile, downloadExcelFile \} from '@\/src\/utils\/downloadHelper';/;

const replacement = `import { downloadCSVFile, downloadExcelFile } from '@/src/utils/downloadHelper';
import { Platform, Alert } from 'react-native';

let LegacyFileSystem: any = null;
try {
  LegacyFileSystem = require('expo-file-system/legacy');
} catch (e) {
  try {
    LegacyFileSystem = require('expo-file-system');
  } catch (err) {
    LegacyFileSystem = null;
  }
}
`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Added LegacyFileSystem fallback.');
