/**
 * Customized Callo Error
 */
class CalloError extends Error {
  /**
   * Create Callo Error, message for server side message,
   * hint for client side, status for possible response status
   * @param {number} status
   * @param {string} message
   * @param {string} hint
   * @param {string} shouldCrash
   */
  constructor(status = 500, message = 'Server-side Error', hint = 'server error', shouldCrash = false) {
    super(message);

    // Only available on v8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CalloError);
    }

    // status code when the error triggers
    this.status = status;
    // hint that should be sent to client
    this.hint = hint;
    // should crash or not if error found in request
    this.shouldCrash = shouldCrash;
  }
}

module.exports = CalloError;