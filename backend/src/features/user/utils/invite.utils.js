/**
 * Generates the user invitation activation link.
 * 
 * @param {string} invitationToken - The generated invitation token
 * @returns {string} The full client-side registration URL
 */
export const generateInviteLink = (invitationToken) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  return `${clientUrl}/#/invite?token=${invitationToken}`;
};

export default {
  generateInviteLink,
};
