import HttpError from '../../../utils/httpError.utils.js';

export class IdempotencyError extends HttpError {
  /**
   * @param {string} [message='Payment webhook event already processed']
   * @param {any} [details=null]
   */
  constructor(message = 'Payment webhook event already processed', details = null) {
    super(409, message, details);
    this.name = 'IdempotencyError';
    this.isIdempotencyError = true;
  }
}

export default IdempotencyError;
