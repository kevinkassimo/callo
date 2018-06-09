const { errors, reserved } = require('./constants');
const CalloError = require('./cerror');

class Module {
  constructor(name, req, res, props, state, server) {
    this.name = name.toString();
    this.req = req;
    this.res = res;

    // disable set attempts
    const validator = {
      get(target, key) {
        if (typeof target[key] === 'object' && target[key] !== null) {
          return new Proxy(target[key], validator);
        } else {
          return target[key];
        }
      },
      set: function(obj, key, value) {
        console.warn('WARNING: cannot modify props on server side')
      },
      deleteProperty: function (oTarget, sKey) {
        console.warn('WARNING: cannot modify props on server side')
      },
    };
    this.props = new Proxy(props, validator);

    this.state = state;
    this.server = server;

    this.action = null;
    this.data = {};
  }

  static toCalloModule(obj, req, res, server) {
    if (!obj || typeof obj !== 'object') {
      throw new CalloError(errors.ERR_REQ_BODY_CONTENT);
    }
    return new Module(obj.name, req, res, obj.props || {}, obj.state || {}, server);
  }

  process = async (okHandler) => {
    const cache = this.server.cache;
    let iter;

    if (this.state[reserved.FLOW_ID]) {
      iter = cache.getEntryIteratorFromId(this.state[reserved.FLOW_ID]);
    } else {
      iter = cache.getEntryIteratorByName(this.name);
    }
    if (!iter || !iter.getCurr()) {
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
        const h = new Handle(req, res, resolve, reject);
        fn(h, this.props, this.state);
      });

      const resolved = await promise;
      if (resolved.action) {
        this.action = resolved.action;
      }
      if (resolved.data) {
        this.data = resolved.data;
      }

      switch (resolved.handleType) {
        case HandleType.REWIND:
          iter.rewindBy(resolved.count-1);
          break;
        case HandleType.JUMP:
          iter.jumpBy(resolved.count+1);
          break;
        case HandleType.NEXT:
          iter.next();
          break;

        case HandleType.ABORT:
          this.state = {}; // clear state
          okHandler(this.req, this.res, this);
          done = true;
          replied = true;
          break;
        case HandleType.ORDER:
          iter.next();
          this.state[reserved.FLOW_ID] = iter.getCurrId();
          okHandler(this.req, this.res, this);
          done = true;
          replied = true;
          break;
        case HandleType.ORDER_REWIND:
          iter.rewindBy(resolved.count-1);
          this.state[reserved.FLOW_ID] = iter.getCurrId();
          okHandler(this.req, this.res, this);
          done = true;
          replied = true;
          break;
        case HandleType.ORDER_JUMP:
          iter.jumpBy(resolved.count);
          this.state[reserved.FLOW_ID] = iter.getCurrId();
          okHandler(this.req, this.res, this);
          done = true;
          replied = true;
          break;
        default: // as if called next(), but actually should be forever stalled...
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
      okHandler(this.req, this.res, this);
    }
  };
}

module.exports = Module;
