import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

export type UploadableImage = { uri: string; name: string; type: string; size?: number };
type ImageAsset = { uri: string; fileName?: string | null; mimeType?: string | null; fileSize?: number | null; width?: number; height?: number };

/** Keeps selected images compact and avoids Base64 allocations on the JS thread. */
export async function prepareImageForUpload(asset: ImageAsset, options: { maxDimension?: number; quality?: number; prefix?: string } = {}): Promise<UploadableImage> {
  const maxDimension = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.75;
  const safeName = asset.fileName?.replace(/\.[^.]+$/, '') || `${options.prefix ?? 'image'}_${Date.now()}`;
  if (Platform.OS === 'web') return { uri: asset.uri, name: asset.fileName || `${safeName}.jpg`, type: asset.mimeType || 'image/jpeg', size: asset.fileSize ?? undefined };
  const width = asset.width || maxDimension;
  const height = asset.height || maxDimension;
  const actions: ImageManipulator.Action[] = Math.max(width, height) > maxDimension ? [{ resize: width >= height ? { width: maxDimension } : { height: maxDimension } }] : [];
  const result = await ImageManipulator.manipulateAsync(asset.uri, actions, { compress: quality, format: ImageManipulator.SaveFormat.JPEG });
  return { uri: result.uri, name: `${safeName}.jpg`, type: 'image/jpeg' };
}
