const { handleTypes } = require('./constants');

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

  end(data) {
    this._callResolve(handleTypes.END, handleTypes.END, data);
  }

  order(action, data) {
    this._callResolve(handleTypes.ORDER, action, data);
  }

  orderReplay(action, data) {
    return this.orderRewind(0, action, data);
  }

  replay() {
    return this.rewind(0);
  }

  orderRewind(count, action, data) {
    this._callResolve(handleTypes.ORDER_REWIND, action, data, count);
  }

  rewind(count) {
    this._callResolve(handleTypes.REWIND, null, null, count);
  }

  orderSkip(action, data) {
    return this.orderJump(2, action, data);
  }

  skip() {
    return this.jump(2);
  }

  orderJump(count, action, data) {
    this._callResolve(handleTypes.ORDER_JUMP, action, data, count);
  }

  jump(count) {
    this._callResolve(handleTypes.JUMP, null, null, count);
  }

  next() {
    this._callResolve(handleTypes.NEXT, handleTypes.NEXT);
  }
}

module.exports = Handle;
