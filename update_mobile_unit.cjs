const fs = require('fs');
const file = 'mobile/mobile-app/src/features/villa/components/BulkUploadVillasModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove DEFAULT_VILLA_CSV_TEMPLATE
content = content.replace(/export const DEFAULT_VILLA_CSV_TEMPLATE = `[\s\S]*?`;/, '');

// 2. Add imports
if (!content.includes("import * as XLSX from 'xlsx';")) {
  content = content.replace(
    /import \* as DocumentPicker from 'expo-document-picker';/,
    "import * as DocumentPicker from 'expo-document-picker';\nimport * as XLSX from 'xlsx';"
  );
}

content = content.replace(
  /import \{ downloadCSVFile \} from '@\/src\/utils\/downloadHelper';/,
  "import { downloadCSVFile, downloadExcelFile } from '@/src/utils/downloadHelper';"
);

// 3. Update handleDownloadTemplateClick
content = content.replace(
  /const handleDownloadTemplateClick = async \(\) => \{[\s\S]*?\};/,
  `const handleDownloadTemplateClick = async () => {
    try {
      if (onDownloadTemplate) {
        const res = await onDownloadTemplate();
        const blob = res.data || res;
        await downloadExcelFile(blob, 'bulk_upload_units_template.xlsx');
      } else {
        Alert.alert('Download Error', 'Template download function not provided.');
      }
    } catch (e) {
      console.log('[BulkUploadModal] Template download failed', e);
      Alert.alert('Download Error', 'Could not download the Excel template.');
    }
  };`
);

// 4. Update file reading logic
const fileReadRegex = /let text = '';\r?\n\s*if \(Platform\.OS === 'web' && \(asset as any\)\.file\) \{[\s\S]*?setErrorMsg\('Could not read text content from selected file\.'\);\r?\n\s*\}/;

const newFileReadLogic = `
        if (asset.name.toLowerCase().endsWith('.xlsx')) {
          const fs = LegacyFileSystem || FileSystem;
          let b64 = '';
          if (Platform.OS === 'web' && (asset as any).file) {
            const buffer = await (asset as any).file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const csvText = XLSX.utils.sheet_to_csv(sheet);
            parseCSVText(csvText);
          } else if (asset.uri) {
            if (fs.readAsStringAsync) {
              b64 = await fs.readAsStringAsync(asset.uri, { encoding: fs.EncodingType?.Base64 || 'base64' });
              const workbook = XLSX.read(b64, { type: 'base64' });
              const sheet = workbook.Sheets[workbook.SheetNames[0]];
              const csvText = XLSX.utils.sheet_to_csv(sheet);
              parseCSVText(csvText);
            }
          }
        } else {
          let text = '';
          if (Platform.OS === 'web' && (asset as any).file) {
            text = await (asset as any).file.text();
          } else if (asset.uri) {
            const fs = LegacyFileSystem || FileSystem;
            if (fs.readAsStringAsync) {
              text = await fs.readAsStringAsync(asset.uri);
            }
          }
  
          if (text) {
            parseCSVText(text);
          } else {
            setErrorMsg('Could not read text content from selected file.');
          }
        }
`;

content = content.replace(fileReadRegex, newFileReadLogic);

// Replace the UI text to say Excel instead of CSV
content = content.replace(/Download Sample CSV Template/g, 'Download Excel Template');
content = content.replace(/Download CSV Template/g, 'Download Excel Template');
content = content.replace(/Sample CSV Format & Structure/g, 'Template Format & Structure');
content = content.replace(/must be a valid CSV file/g, 'must be a valid Excel (.xlsx) or CSV file');
content = content.replace(/type: \['text\/csv', 'text\/comma-separated-values', 'text\/plain', 'application\/vnd\.ms-excel', '\*\/\*'\]/, "type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '*/*']");

fs.writeFileSync(file, content, 'utf8');
console.log('Mobile Unit Template updated.');
