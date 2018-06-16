const { errors, reserved, handleTypes } = require('./constants');
const CalloError = require('./cerror');
const Handle = require('./handle');

class Module {
  constructor(name, req, res, props, state, server) {
    this.name = name ? String(name) : null;
    this.req = req;
    this.res = res;

    // disable set attempts
    const propsValidator = {
      get(target, key) {
        if (typeof target[key] === 'object' && target[key] !== null) {
          return new Proxy(target[key], propsValidator);
        } else {
          return target[key];
        }
      },
      set(obj, key, value) {
        console.warn('WARNING: cannot modify props on server side');
        return true;
      },
      deleteProperty(obj, key) {
        console.warn('WARNING: cannot modify props on server side');
        return true;
      },
    };
    this.props = new Proxy(props, propsValidator);

    this.state = state;

    this.server = server;

    this.action = null;
    this.data = {};

    // unique symbol that avoids user tampering
    this._kSealSymbol = Symbol('seal');
  }

  static toCalloModule(obj, req, res, server) {
    if (typeof obj !== 'object') {
      throw new CalloError(400, errors.ERR_REQ_BODY_CONTENT, 'bad request body');
    }
    return new Module(obj.name, req, res, obj.props || {}, obj.state || {}, server);
  }

  _sealState = (state) => {
    state[this._kSealSymbol] = true;
  };

  _createProxyState = () => {
    let _isSealed = false;
    let self = this;

    const stateValidator = {
      get(target, key) {
        if (typeof target[key] === 'object' && target[key] !== null) {
          return new Proxy(target[key], stateValidator);
        } else {
          return target[key];
        }
      },
      set(obj, key, value) {
        if (_isSealed) {
          console.warn('WARNING: cannot modify state after handling');
          return true;
        }

        // Special key for sealing
        if (key === self._kSealSymbol) {
          _isSealed = true;
          return true;
        }

        obj[key] = value;
        return true;
      },
      deleteProperty(obj, key) {
        if (_isSealed) {
          console.warn('WARNING: cannot modify state after handling');
          return true;
        }
        delete obj[key];
        return true;
      },
    };
    return new Proxy(this.state, stateValidator);
  };

  process = async (okHandler) => {
    const cache = this.server.cache;
    let iter;

    if (this.state[reserved.FLOW_ID]) {
      iter = cache.getEntryIteratorFromId(this.state[reserved.FLOW_ID]);
    } else {
      iter = cache.getEntryIteratorByName(this.name);
    }
    if (!iter || !iter.getCurr()) {
      this.action = handleTypes.UNKNOWN;
      okHandler(this.req, this.res, this);
      return;
    }

    let done = false;
    let replied = false;

    const unitProcess = async (iter) => {
      const fn = iter.getCurr();
      if (!fn) {
        done = true;
        return;
      }

      const promise = new Promise((resolve, reject) => {
        const _proxyState = this._createProxyState();
        const h = new Handle(this.req, this.res, resolve, reject, this, _proxyState);
        // The proxy states are independent of each other
        fn(h, this.props, _proxyState);
      });

      const resolved = await promise;
      if (resolved.action) {
        this.action = resolved.action;
      }
      if (resolved.data) {
        this.data = resolved.data;
      }

      switch (resolved.handleType) {
        case handleTypes.REWIND:
          iter.rewindBy(resolved.count);
          break;
        case handleTypes.JUMP:
          iter.jumpBy(resolved.count);
          break;
        case handleTypes.NEXT:
          iter.next();
          break;

        case handleTypes.END:
          this.state = {}; // clear state
          okHandler(this.req, this.res, this);
          done = true;
          replied = true;
          break;
        case handleTypes.ORDER:
          iter.next();
          this.state[reserved.FLOW_ID] = iter.getCurrId();
          okHandler(this.req, this.res, this);
          done = true;
          replied = true;
          break;
        case handleTypes.ORDER_REWIND:
          iter.rewindBy(resolved.count);
          this.state[reserved.FLOW_ID] = iter.getCurrId();
          okHandler(this.req, this.res, this);
          done = true;
          replied = true;
          break;
        case handleTypes.ORDER_JUMP:
          iter.jumpBy(resolved.count);
          this.state[reserved.FLOW_ID] = iter.getCurrId();
          okHandler(this.req, this.res, this);
          done = true;
          replied = true;
          break;
        default: // as if called next()
          iter.next();
          break;
      }
    };

    while (!done) {
      await(unitProcess(iter));
    }

    if (!replied) {
      // default reply
      console.warn('WARNING: reach end of flow without explicit reply action');
      // set to handleTypes.END to alert client
      this.action = handleTypes.END;
      okHandler(this.req, this.res, this);
    }
  };
}

module.exports = Module;
