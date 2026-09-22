import React from 'react';
import { Platform } from 'react-native';
import { ImageCarousel } from '@/components/common/ImageCarousel';
import apiClient from '../../../services/apiClient';

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

  // Normalize backslashes to forward slashes
  uri = uri.replace(/\\/g, '/');

  // If already absolute HTTP(S) or base64 data URI, return as-is
  if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:')) {
    return uri;
  }

  // Resolve relative backend paths
  if (uri.startsWith('/') || uri.startsWith('public/') || uri.startsWith('uploads/')) {
    if (!uri.startsWith('/')) uri = '/' + uri;

    let apiBaseURL = '';
    if (apiClient && apiClient.defaults && apiClient.defaults.baseURL) {
      apiBaseURL = apiClient.defaults.baseURL;
    } else if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
      apiBaseURL = process.env.EXPO_PUBLIC_API_URL;
    }

    if (apiBaseURL) {
      const host = apiBaseURL.replace(/\/api(\/v\d+)?\/?$/, '');
      return `${host}${uri}`;
    }

    if (Platform.OS === 'android') {
      return `http://10.0.2.2:5002${uri}`;
    }
    return `http://localhost:5002${uri}`;
  }

  return uri;
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
