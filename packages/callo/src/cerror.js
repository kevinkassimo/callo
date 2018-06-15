/**
 * Customized Callo Error
 */
class CalloError extends Error {
  /**
   * Create Callo Error, message for server side message,
   * hint for client side, status for possible response status
   * @param status
   * @param message
   * @param hint
   */
  constructor(status = 500, message = 'Server-side Error', hint = 'server error') {
    super(message);

    // Only available on v8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CalloError);
    }

    this.status = status;
    this.hint = hint;
  }
}

module.exports = CalloError;