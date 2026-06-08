/**
 * Initialize Passport / SSO configurations.
 * Real strategy implementation (OAuth, JWT, SAML, etc.) will go here.
 * @param {import('express').Application} app - Express application instance
 */
export const initializePassport = (app) => {
  console.log('Passport/SSO stub initialized.');
  // passport.initialize() configurations can be mounted here
};

export default initializePassport;
