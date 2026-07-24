import { useState, useEffect } from 'react';

/**
 * Custom hook that tracks the status of a media query.
 * Useful for responsive designs and component routing logic.
 *
 * @param {string} query - The CSS media query to evaluate (e.g., '(max-width: 768px)')
 * @returns {boolean} True if the media query matches, false otherwise
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    // Check if window object is available
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);
    
    // Set initial value in case query changed
    setMatches(mediaQueryList.matches);

    const listener = (event) => {
      setMatches(event.matches);
    };

    // Support both modern and older browsers
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', listener);
    } else {
      mediaQueryList.addListener(listener);
    }

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', listener);
      } else {
        mediaQueryList.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
};

export default useMediaQuery;
