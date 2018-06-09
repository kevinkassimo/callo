const HandleType = {
  ABORT: '$$callo-abort',
  ORDER: '$$callo-order',
  ORDER_REWIND: '$$callo-order-rewind',
  REWIND: '$$callo-rewind',
  JUMP: '$$callo-jump',
  ORDER_JUMP: '$$callo-order-jump',
  NEXT: '$$callo-next',
};

class Handle {
  constructor(req, res, mod, resolve, reject) {
    this.req = req; // actual request handler
    this.res = res;

    this.state = state;
    this.cache = mod.cache;

    this._resolve = resolve;
    this._reject = reject;
  }

  _callResolve(handleType, action, data, count) {
    if (!this._resolve) return;
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

    this._resolve = null;
  }

  abort(data) {
    this._callResolve(HandleType.ABORT, HandleType.ABORT, data);
  }

  order(action, data) {
    this._callResolve(HandleType.ORDER, action, data);
  }

  orderReplay(action, data) {
    return this.orderRewind(1, action, data);
  }

  replay() {
    return this.rewind(1);
  }

  orderRewind(count, action, data) {
    this._callResolve(HandleType.ORDER_REWIND, action, data, count);
  }

  rewind(count) {
    this._callResolve(HandleType.REWIND, null, null, count);
  }

  orderSkip(action, data) {
    return this.orderJump(1, action, data);
  }

  skip() {
    return this.jump(1);
  }

  orderJump(count, action, data) {
    this._callResolve(HandleType.ORDER_JUMP, action, data, count);
  }

  jump(count) {
    this._callResolve(HandleType.JUMP, null, null, count);
  }

  next() {
    this.order(HandleType.NEXT, {});
  }
}

module.exports = {
  HandleType,
  Handle,
};