import { Platform, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';

let ModernFile: any = null;
let ModernPaths: any = null;
try {
  const expoFs = require('expo-file-system');
  ModernFile = expoFs.File;
  ModernPaths = expoFs.Paths;
} catch (e) {
  ModernFile = null;
  ModernPaths = null;
}

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

/** Strips path separators and unsafe characters so a server-supplied name cannot escape the cache directory. */
export const safeFileName = (name: string) =>
  String(name || 'export')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/^\.+/, '');

export async function toUint8Array(data: any): Promise<Uint8Array> {
  if (!data) return new Uint8Array(0);
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  // Blob or File with .arrayBuffer()
  if (typeof data === 'object' && typeof data.arrayBuffer === 'function') {
    try {
      const ab = await data.arrayBuffer();
      return new Uint8Array(ab);
    } catch (e) {
      // continue to other strategies
    }
  }

  // String
  if (typeof data === 'string') {
    const clean = data.replace(/^data:.*?,/, '').trim();
    // Check if it's base64 encoded
    if (/^[A-Za-z0-9+/=\r\n]+$/.test(clean) && clean.length % 4 === 0) {
      try {
        return new Uint8Array(Buffer.from(clean, 'base64'));
      } catch {}
    }
    return new Uint8Array(Buffer.from(clean, 'binary'));
  }

  // React Native FileReader fallback
  if (typeof FileReader !== 'undefined') {
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = String(reader.result || '');
          resolve(res.includes(',') ? res.split(',')[1] : res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(data);
      });
      return new Uint8Array(Buffer.from(b64, 'base64'));
    } catch {}
  }

  return new Uint8Array(0);
}

export async function toBase64(data: any): Promise<string> {
  if (!data) return '';
  if (typeof data === 'string') {
    const clean = data.replace(/^data:.*?,/, '').trim();
    if (/^[A-Za-z0-9+/=\r\n]+$/.test(clean) && clean.length % 4 === 0) {
      return clean;
    }
    return Buffer.from(clean, 'binary').toString('base64');
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('base64');
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('base64');
  }

  if (typeof data === 'object' && typeof data.arrayBuffer === 'function') {
    try {
      const ab = await data.arrayBuffer();
      return Buffer.from(ab).toString('base64');
    } catch {}
  }

  if (typeof FileReader !== 'undefined') {
    try {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = String(reader.result || '');
          resolve(res.includes(',') ? res.split(',')[1] : res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(data);
      });
    } catch {}
  }

  return '';
}

async function saveAndShareNativeFile(
  data: any,
  fileName: string,
  mimeType: string,
  dialogTitle: string,
  uti: string
): Promise<string> {
  const safeName = safeFileName(fileName);
  let targetUri = '';

  // 1. Modern Expo 52+ File API
  try {
    if (ModernFile && ModernPaths && ModernPaths.cache) {
      const file = new ModernFile(ModernPaths.cache, safeName);
      if (!file.exists) {
        file.create();
      }
      const bytes = await toUint8Array(data);
      file.write(bytes);
      targetUri = file.uri;
    }
  } catch (err) {
    // Modern file API write failed, fallback to legacy
  }

  // 2. Legacy FileSystem fallback
  if (!targetUri) {
    const fs = LegacyFileSystem || {};
    const docDir = fs.cacheDirectory || fs.documentDirectory || '';
    if (docDir) {
      const baseDir = docDir.endsWith('/') ? docDir : `${docDir}/`;
      const fileUri = `${baseDir}${safeName}`;
      const base64Data = await toBase64(data);
      if (fs.writeAsStringAsync) {
        await fs.writeAsStringAsync(fileUri, base64Data, {
          encoding: fs.EncodingType?.Base64 || 'base64',
        });
        targetUri = fileUri;
      }
    }
  }

  if (!targetUri) {
    throw new Error(`Device storage unavailable to save ${fileName}`);
  }

  // 3. Share or notify
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(targetUri, {
      mimeType,
      dialogTitle,
      UTI: uti,
    });
  } else {
    Alert.alert('File Saved', `File saved at:\n${targetUri}`);
  }

  return targetUri;
}

async function downloadWebBlob(
  data: any,
  fileName: string,
  mimeType: string
): Promise<void> {
  let blob: Blob;
  if (data instanceof Blob) {
    blob = data;
  } else {
    const bytes = await toUint8Array(data);
    blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 300);
}

export const downloadCSVFile = async (content: string | Blob | any, fileName: string) => {
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
      }, 300);
      return;
    }

    const safeName = safeFileName(fileName);
    let targetUri = '';

    try {
      if (ModernFile && ModernPaths && ModernPaths.cache) {
        const file = new ModernFile(ModernPaths.cache, safeName);
        if (!file.exists) file.create();
        file.write(textContent);
        targetUri = file.uri;
      }
    } catch (e) {}

    if (!targetUri) {
      const fs = LegacyFileSystem || {};
      const docDir = fs.cacheDirectory || fs.documentDirectory || '';
      if (docDir) {
        const baseDir = docDir.endsWith('/') ? docDir : `${docDir}/`;
        const fileUri = `${baseDir}${safeName}`;
        if (fs.writeAsStringAsync) {
          await fs.writeAsStringAsync(fileUri, textContent, {
            encoding: 'utf8',
          });
          targetUri = fileUri;
        }
      }
    }

    if (!targetUri) {
      throw new Error(`Device storage unavailable to save ${fileName}`);
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(targetUri, {
        mimeType: 'text/csv',
        dialogTitle: `Save or Share ${fileName}`,
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('File Saved', `CSV file saved at:\n${targetUri}`);
    }
  } catch (err: any) {
    console.error('Download CSV error:', err);
    Alert.alert('Download Error', err?.message || 'Could not generate or save CSV file.');
    throw err;
  }
};

export const downloadExcelFile = async (data: any, fileName: string) => {
  try {
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (Platform.OS === 'web') {
      await downloadWebBlob(data, fileName, mimeType);
      return;
    }

    await saveAndShareNativeFile(
      data,
      fileName,
      mimeType,
      `Save or Share ${fileName}`,
      'com.microsoft.excel.xlsx'
    );
  } catch (err: any) {
    console.error('Download Excel error:', err);
    Alert.alert('Download Error', err?.message || 'Could not generate or save Excel file.');
    throw err;
  }
};

/** Downloads a server-generated PDF on web or opens the native share sheet on mobile. */
export const downloadPDFFile = async (data: any, fileName: string) => {
  try {
    if (Platform.OS === 'web') {
      await downloadWebBlob(data, fileName, 'application/pdf');
      return;
    }

    await saveAndShareNativeFile(
      data,
      fileName,
      'application/pdf',
      `Save or Share ${fileName}`,
      'com.adobe.pdf'
    );
  } catch (err: any) {
    console.error('Download PDF error:', err);
    Alert.alert('Download Error', err?.message || 'Could not generate or save PDF file.');
    throw err;
  }
};
