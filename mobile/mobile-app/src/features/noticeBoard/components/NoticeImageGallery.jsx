import React from 'react';
import { ImageCarousel } from '@/components/common/ImageCarousel';
import getImageUrl from '@/src/utils/imageUrl';

/**
 * Normalizes and resolves image URLs to full network paths.
 * Gracefully strips local file system paths (e.g. C:\Users) that cannot be fetched over HTTP.
 */
export function resolveImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let uri = rawUrl.trim();
  if (!uri || uri === 'null' || uri === 'undefined') return '';

  // Filter out local Windows or Unix file paths that cannot be resolved over HTTP
  if (/^[a-zA-Z]:[\\\/]/.test(uri) || uri.startsWith('file://')) {
    return '';
  }

  return getImageUrl(uri);
}

/**
 * NoticeImageGallery Component
 * Wraps global ImageCarousel to display swipable attachments with robust URL resolution.
 */
export function NoticeImageGallery({ images, className, imageWidth = 280, imageHeight = 180 }) {
  if (!images || !Array.isArray(images) || images.length === 0) return null;

  const validImages = [];

  images.forEach((img, index) => {
    let raw = '';
    if (typeof img === 'string') {
      raw = img;
    } else if (img && typeof img === 'object') {
      raw = img.url || img.uri || '';
    }

    const resolvedUri = resolveImageUrl(raw);
    if (resolvedUri) {
      validImages.push({
        id: (img && img._id) || resolvedUri || String(index),
        source: { uri: resolvedUri },
        alt: (img && img.filename) || `Notice Image ${index + 1}`,
      });
    }
  });

  if (validImages.length === 0) return null;

  return (
    <ImageCarousel
      images={validImages}
      imageWidth={imageWidth}
      imageHeight={imageHeight}
      className={className}
    />
  );
}

export default NoticeImageGallery;
