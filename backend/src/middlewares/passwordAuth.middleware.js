import HttpError from '../utils/httpError.utils.js';

/**
 * Password sign-in, registration, reset and setup are being retired in favour of
 * email/phone OTP and SSO. They stay available until AUTH_PASSWORD_ENABLED=false,
 * which is switched only after the web app has moved to OTP and old mobile builds
 * are blocked by the minimum-version check.
 */
export const isPasswordAuthEnabled = () => process.env.AUTH_PASSWORD_ENABLED !== 'false';

export const requirePasswordAuth = (req, res, next) => {
  if (isPasswordAuthEnabled()) return next();
  return next(
    new HttpError(410, 'Password sign-in is no longer available. Please sign in with an email or phone code, or SSO.', {
      code: 'PASSWORD_AUTH_DISABLED',
    })
  );
};

export default requirePasswordAuth;
