/**
 * Simple debounce utility for throttling quick successive function calls.
 * Used primarily for debouncing user inputs on search fields.
 * 
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The debounce timeout in milliseconds.
 * @returns {Function} - The debounced function.
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default debounce;
