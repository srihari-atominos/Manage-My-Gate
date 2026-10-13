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
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 200);
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
        Alert.alert('File Saved', `CSV file saved at:\n${fileUri}`);
      }
    }
  } catch (err: any) {
    console.error('Download CSV error:', err);
    Alert.alert('Download Error', err?.message || 'Could not generate or save CSV file.');
  }
};

export const downloadExcelFile = async (data: Blob | string | Uint8Array, fileName: string) => {
  try {
    let excelBlob: Blob;

    if (typeof data === 'string') {
      // Base64 string from XLSX.write
      const cleanB64 = data.replace(/^data:.*,/, '');
      const binaryString = atob(cleanB64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      excelBlob = new Blob([bytes.buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    } else if (data instanceof Uint8Array) {
      excelBlob = new Blob([data.buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    } else {
      excelBlob = data as Blob;
    }

    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(excelBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 200);
    } else {
      const fs = LegacyFileSystem || {};
      const docDir = fs.documentDirectory || fs.cacheDirectory || '';
      const fileUri = `${docDir}${fileName}`;
      
      let base64Data = '';
      if (typeof data === 'string') {
        base64Data = data.replace(/^data:.*,/, '');
      } else {
        const reader = new FileReader();
        base64Data = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const res = reader.result as string;
            resolve(res.split(',')[1] || res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(excelBlob);
        });
      }

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
        Alert.alert('File Saved', `Excel file saved at:\n${fileUri}`);
      }
    }
  } catch (err: any) {
    console.error('Download Excel error:', err);
    Alert.alert('Download Error', err?.message || 'Could not generate or save Excel file.');
  }
};
