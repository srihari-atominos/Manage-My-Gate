import { Platform, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';

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

export const downloadCSVFile = async (content: string | Blob, fileName: string) => {
  try {
    let textContent = '';
    if (typeof content === 'string') {
      textContent = content;
    } else if (content && typeof (content as any).text === 'function') {
      textContent = await (content as Blob).text();
    } else {
      textContent = String(content || '');
    }

    if (Platform.OS === 'web') {
      const blob = new Blob([textContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      const fs = LegacyFileSystem || {};
      const docDir = fs.documentDirectory || fs.cacheDirectory || '';
      const fileUri = `${docDir}${fileName}`;
      if (fs.writeAsStringAsync) {
        await fs.writeAsStringAsync(fileUri, textContent, {
          encoding: 'utf8',
        });
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Save or Share ${fileName}`,
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Template File Saved', `CSV template saved at:\n${fileUri}`);
      }
    }
  } catch (err: any) {
    console.error('Download CSV error:', err);
    Alert.alert('Download Error', 'Could not generate or save CSV template file.');
  }
};

export const downloadExcelFile = async (blob: Blob, fileName: string) => {
  try {
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      const fs = LegacyFileSystem || {};
      const docDir = fs.documentDirectory || fs.cacheDirectory || '';
      const fileUri = `${docDir}${fileName}`;
      
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        // result is a data URL like data:application/vnd...;base64,...
        const base64Data = result.split(',')[1];
        
        if (fs.writeAsStringAsync) {
          await fs.writeAsStringAsync(fileUri, base64Data, {
            encoding: 'base64',
          });
        }

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: `Save or Share ${fileName}`,
            UTI: 'com.microsoft.excel.xls',
          });
        } else {
          Alert.alert('Template File Saved', `Excel template saved at:\n${fileUri}`);
        }
      };
      reader.onerror = () => {
        console.error('FileReader error while converting Blob to Base64');
        Alert.alert('Download Error', 'Could not read Blob data.');
      };
      reader.readAsDataURL(blob);
    }
  } catch (err: any) {
    console.error('Download Excel error:', err);
    Alert.alert('Download Error', 'Could not generate or save Excel template file.');
  }
};
