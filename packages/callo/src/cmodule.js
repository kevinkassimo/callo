class Module {
  constructor(name, req, res, props, state, server) {
    this.name = name;
    this.req = req;
    this.res = res;
    this.props = props;
    this.state = state;
    this.server = server;
    this.action = null;
  }

  static toCalloModule(obj, req, res, server) {
    if (!obj || typeof obj !== 'object') {
      throw new CalloError(constants.ERR_BODY_CONTENT);
    }
    return new Module(obj.name, req, res, obj.props || {}, obj.state || {}, server);
  }

  process = async (okHandler) => {
    const cache = this.server.cache;
    let iter;

    if (this.state.$$flowId) {
      iter = cache.getEntryIteratorFromId(this.state.$$flowId);
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
        const h = new Handle(req, res, this, resolve, reject);
        fn(h, this.props, this.state);
      });

      const resolved = await promise;
      if (resolved.action) {
        this.action = action;
      }
      if (resolved.data) {
        this.data = data;
      }

      switch (resolved.handleType) {
        case HandleType.REWIND:
          iter.rewindBy(resolved.count-1);
          break;
        case HandleType.JUMP:
          iter.jumpBy(resolved.count+1);
          this.state.$$flowId = iter.getCurrId();
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
          this.state.$$flowId = iter.getCurrId();
          okHandler(this.req, this.res, this);
          done = true;
          replied = true;
          break;
        case HandleType.ORDER_REWIND:
          iter.rewindBy(resolved.count-1);
          this.state.$$flowId = iter.getCurrId();
          okHandler(this.req, this.res, this);
          done = true;
          replied = true;
          break;
        case HandleType.ORDER_JUMP:
          iter.jumpBy(resolved.count);
          this.state.$$flowId = iter.getCurrId();
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
      // TODO: default reply
    }
  };
}

module.exports = Module;
