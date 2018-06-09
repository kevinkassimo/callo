const { handleTypes } = require('./constants');

class Handle {
  constructor(req, res, resolve, reject) {
    this.req = req; // actual request handler
    this.res = res;

    this.state = state;

    this._resolve = resolve;
    this._reject = reject;
  }

  _callResolve(handleType, action, data, count) {
    if (!this._resolve) {
      console.warn('WARNING: Cannot submit another handle action');
      return;
    }

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
    // Avoid set state
    const validator = {
      get(target, key) {
        if (typeof target[key] === 'object' && target[key] !== null) {
          return new Proxy(target[key], validator);
        } else {
          return target[key];
        }
      },
      set: function(obj, key, value) {
        console.warn('WARNING: cannot modify state after handled')
      },
      deleteProperty: function (oTarget, sKey) {
        console.warn('WARNING: cannot modify state after handled')
      },
    };
    this.state = new Proxy({ ...this.state }, validator);
  }

  abort(data) {
    this._callResolve(handleTypes.ABORT, handleTypes.ABORT, data);
  }

  order(action, data) {
    this._callResolve(handleTypes.ORDER, action, data);
  }

  orderReplay(action, data) {
    return this.orderRewind(1, action, data);
  }

  replay() {
    return this.rewind(1);
  }

  orderRewind(count, action, data) {
    this._callResolve(handleTypes.ORDER_REWIND, action, data, count);
  }

  rewind(count) {
    this._callResolve(handleTypes.REWIND, null, null, count);
  }

  orderSkip(action, data) {
    return this.orderJump(1, action, data);
  }

  skip() {
    return this.jump(1);
  }

  orderJump(count, action, data) {
    this._callResolve(handleTypes.ORDER_JUMP, action, data, count);
  }

  jump(count) {
    this._callResolve(handleTypes.JUMP, null, null, count);
  }

  next() {
    this.order(handleTypes.NEXT, {});
  }
}

module.exports = {
  Handle,
};