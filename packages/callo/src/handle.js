const { handleTypes } = require('./constants');

/**
 * Handle for Callo operations
 * Notice: handle actions are SIGNALS.
 * Basically, invoking a handle action means "please do such action some time the server wants"
 * It never promises when will the destined action runs.
 * After the handle action, you are supposed to immediately return, no matter what!
 * State inside current handler would be frozen once any handle action is called
 * Therefore, it is different from behavior of Express
 */
class Handle {
  constructor(req, res, resolve, reject, mod, proxyState) {
    this.req = req; // actual request handler
    this.res = res;

    this._resolve = resolve;
    this._reject = reject;

    this._mod = mod;
    this._proxyState = proxyState;
  }

  _callResolve(handleType, action, data, count) {
    if (!this._resolve) {
      console.warn('WARNING: Cannot submit another handle action');
      return;
    }

    // Avoid set state
    this._mod._sealState(this._proxyState);

    const resolvedObject = {
      handleType,
    };

    if (action !== undefined && action !== null) {
      resolvedObject.action = action;
    }

    if (data !== undefined && data !== null) {
      resolvedObject.data = data;
    }

    if (count !== undefined && count !== null) {
      resolvedObject.count = count;
    }
    this._resolve(resolvedObject);

    // Avoid duplicate resolve
    this._resolve = null;
  }

  /**
   * End current flow (no future handler would be called)
   * @param {Object} data
   * @public
   */
  end(data) {
    this._callResolve(handleTypes.END, handleTypes.END, data);
  }

  /**
   * Jump out of current flow, replying with action and data
   * would save next handler's ID inside of encrypted state
   * would resume from next handler if the state is submitted back
   * @param {string} action
   * @param {Object} data
   * @public
   */
  order(action, data) {
    this._callResolve(handleTypes.ORDER, action, data);
  }

  /**
   * Jump out of current flow, reply with action and data
   * would save current handler's ID inside of encrypted state
   * would resume from beginning of current handler if the state is submitted back
   * @param {string} action
   * @param {Object} data
   * @public
   */
  orderReplay(action, data) {
    return this.orderRewind(0, action, data);
  }

  /**
   * Rerun current handler as next handler
   * Resume normal flow after this repetition
   * ----
   * ^  |
   * |  v
   *  h1
   * @public
   */
  replay() {
    return this.rewind(0);
  }

  /**
   * Jump out of current flow, reply with action and data
   * would save handler's ID inside of encrypted state, based on rewind count
   * would resume from the handler corresponding to ID if the state is submitted back
   * e.g. orderRewind(0, ...) === orderReplay(...)
   * @param {number} count
   * @param {string} action
   * @param {Object} data
   * @public
   */
  orderRewind(count, action, data) {
    this._callResolve(handleTypes.ORDER_REWIND, action, data, count);
  }

  /**
   * Rerun handler count away before current handler as next handler
   * e.g. rewind(0, ...) === replay(...)
   * @param {number} count
   * @public
   */
  rewind(count) {
    this._callResolve(handleTypes.REWIND, null, null, count);
  }

  /**
   * Jump out of current flow, reply with action and data
   * would save next next handler's ID inside of encrypted state
   * would resume from next next handler if the state is submitted back
   * (basically ignoring next handler)
   * @param {string} action
   * @param {Object} data
   * @public
   */
  orderSkip(action, data) {
    return this.orderJump(2, action, data);
  }

  /**
   * Skip the next handler
   * ---------------
   * ^             |
   * |             v
   * h1     h2     h3
   * @public
   */
  skip() {
    return this.jump(2);
  }

  /**
   * Jump out of current flow, reply with action and data
   * would save handler's ID inside of encrypted state, based on jump count
   * would resume from the handler corresponding to ID if the state is submitted back
   * e.g. orderJump(2) === orderSkip()
   * @param {number} count
   * @param {string } action
   * @param {Object} data
   * @public
   */
  orderJump(count, action, data) {
    this._callResolve(handleTypes.ORDER_JUMP, action, data, count);
  }

  /**
   * Directly jump to some later handler based on count
   * e.g. jump(2) === skip()
   * @param {number} count
   * @public
   */
  jump(count) {
    this._callResolve(handleTypes.JUMP, null, null, count);
  }

  /**
   * Go to next handler
   */
  next() {
    this._callResolve(handleTypes.NEXT, handleTypes.NEXT);
  }
}

module.exports = Handle;
