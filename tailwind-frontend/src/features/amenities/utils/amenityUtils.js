/**
 * Formats a given number into local currency format (INR)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

/**
 * Formats a time string (HH:mm) to AM/PM format
 * @param {string} timeString - The 24h time string
 * @returns {string} Formatted 12h time string
 */
export const formatTimeAMPM = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // the hour '0' should be '12'
  return `${h}:${minutes} ${ampm}`;
};

/**
 * Maps day index (0-6) to day name
 * @param {number} dayIndex - 0 for Sunday, 6 for Saturday
 * @returns {string} Day name (short)
 */
export const getDayName = (dayIndex) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex] || '';
};
