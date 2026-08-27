import React from 'react';
import { ImageCarousel } from '@/components/common/ImageCarousel';
import apiClient from '../../../services/apiClient';

/**
 * NoticeImageGallery Component
 * Wraps global ImageCarousel to display swipable attachments.
 */
export function NoticeImageGallery({ images, className, imageWidth = 280, imageHeight = 180 }) {
  if (!images || !Array.isArray(images) || images.length === 0) return null;

  const formattedImages = images.map((img, index) => {
    let uri = '';
    if (typeof img === 'string') {
      uri = img;
    } else if (img && typeof img === 'object') {
      uri = img.url || img.uri || '';
    }

    // Resolve relative backend URLs to absolute URLs
    if (uri && (uri.startsWith('/') || uri.startsWith('public/'))) {
      if (!uri.startsWith('/')) uri = '/' + uri;
      let apiBaseURL = '';
      if (apiClient && apiClient.defaults && apiClient.defaults.baseURL) {
        apiBaseURL = apiClient.defaults.baseURL;
      } else if (process.env.EXPO_PUBLIC_API_URL) {
        apiBaseURL = process.env.EXPO_PUBLIC_API_URL;
      }
      
      if (apiBaseURL) {
        // Strip /api, /api/v1, /api/v2, etc., from the end of the base URL
        const host = apiBaseURL.replace(/\/api(\/v\d+)?\/?$/, '');
        uri = `${host}${uri}`;
      } else {
        // Fallback for emulator if nothing else works
        uri = `http://10.0.2.2:5002${uri}`;
      }
    }

    return {
      id: (img && img._id) || uri || String(index),
      source: uri ? { uri } : null,
      alt: `Notice Image ${index + 1}`
    };
  });

  return (
    <ImageCarousel
      images={formattedImages}
      imageWidth={imageWidth}
      imageHeight={imageHeight}
      className={className}
    />
  );
}

export default NoticeImageGallery;
