/**
 * Middleware to attach standardized API response helpers to the response object.
 */
export const responseHandler = (req, res, next) => {
  /**
   * Sends a standardized success response.
   * @param {any} data - Data to send back
   * @param {string} [message='Success'] - Optional description message
   * @param {number} [statusCode=200] - HTTP status code
   */
  res.success = (data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  };

  next();
};

export default responseHandler;
