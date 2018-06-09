const assert = require('assert');
const crypto = require('crypto');
const util = require('util');
const zlib = require('zlib');
// From express
const getRawBody = require('raw-body');
const contentType = require('content-type');
const compression = require('compression');
const createError = require('http-errors');

const constants = require('./constants');
const { NamedFlow, Flow } = require('./flow');
const { Handle, HandleType } = require('./handle');


class Callo {

}

class Deferred {
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    })
  }
}

class CalloError {
  constructor(type) {
    this.type = type;
  }
}

class CalloCacheIterator {
  constructor(cache, id) {
    this.cache = cache;
    this.id = id;
  }

  getCurrId() {
    return this.id;
  }

  getNextId() {
    return this.id + 1;
  }

  getCurr() {
    return this.cache.get(this.id);
  }

  getNext() {
    this.id++;
    return this.cache.get(this.id);
  }

  next() {
    this.id++;
  }

  rewindBy(amt) {
    while (amt > 0 && this.cache.get(this.id-1)) {
      amt--;
      this.id--;
    }
  }

  jumpBy(amt) {
    while (amt > 0 && this.cache.get(this.id+1)) {
      amt--;
      this.id++;
    }
  }
}

class CalloCache {
  constructor() {
    this.cache = []; // array to allow fast access
    this.entryMap = new Map();
  }

  registerNamedFlow(flow) {
    if (!(flow instanceof NamedFlow)) {
      throw new Error('No name is given to flow, failed to register');
    }
    if (!flow.chain) {
      throw new Error('Registering an empty flow is prohibited');
    }

    if (this.entryMap.has(flow.name)) {
      throw new Error('This named flow is already registered');
    }

    this.entryMap.set(flow.name, this.cache.length);
    this.cache.concat(flow.chain);
    this.cache.push(null); // null implies termination
  }

  getEntryIdByName(name) {
    if (!this.entryMap.get(name)) {
      return null; // null for no entry
    }
    return this.entryMap.get(name);
  }

  getEntryIteratorByName(name) {
    if (!this.entryMap.get(name)) {
      return null; // null for no entry
    }
    return new CalloCacheIterator(this, this.entryMap.get(name));
  }

  getEntryIteratorFromId(id) {
    return new CalloCacheIterator(this, id);
  }

  get(id) {
    if (this.cache.length <= id || id < 0) {
      return null;
    }
    return this.cache[id];
  }
}

class CalloModule {
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
    return new CalloModule(obj.name, req, res, obj.props || {}, obj.state || {}, server);
  }

  process = async (okHandler, errorHandler) => {
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

class CalloServer {
  constructor(password) {
    this.cache = new CalloCache();

    this.middlewareFlow = new Flow();
    this.unregisteredFlows = [];

    // Dunno if this is good, self used as salt
    const saltOfKey = crypto.pbkdf2Sync(password, password, 100000, 64, 'sha256');
    this.secretKey = crypto.pbkdf2Sync(password, saltOfKey, 100000, 64, 'sha256');
    this.iv = crypto.randomBytes(16);

    this.shouldCompress = true;
  }

  handleError = (err, req, res) => {
    let errMsg;
    if (typeof err === 'string') {
      errMsg = err;
    } else if (err instanceof CalloError) {
      errMsg = err.type;
    }
    try {
      res.statusCode = 400; // TODO: use a more accurate status code
      res.end(JSON.stringify({ error: errMsg }));
    } catch (e) {
      console.warn(e);
      // TODO: better handling
    }
  };

  handler = () => {
    return async (req, res) => {
      if (req.body) {

      } else {
        let bodyBuf;
        try {
          bodyBuf = await getRawBody(req, {
            length: req.headers['content-length'],
            encoding: contentType.parse(req).parameters.charset,
          });
        } catch (err) {
          this.handleError(constants.ERR_PARSE_BODY, req, res);
          return;
        }

        let body;
        switch (req.headers['content-encoding']) {
          case 'gzip':
          case 'deflate':
            try {
              body = (await util.promisify(zlib.unzip)(bodyBuf)).toString();
            } catch (err) {
              this.handleError(constants.ERR_UNCOMPRESS_BODY, req, res);
              return;
            }
            break;
          default:
            body = buf.toString();
        }

        let json;

        try {
          json = JSON.parse(body);
          if (json.state) {
            json.state = this.decrypt(json.state); // decrypt here
          }
        } catch (err) {
          this.handleError(constants.ERR_PARSE_BODY_JSON, req, res);
          return;
        }

        let calloModule;

        try {
          calloModule = CalloModule.toCalloModule(json, req, res, server);
        } catch (err) {
          this.handleError(constants.ERR_BODY_CONTENT, req, res);
          return;
        }

        try {
          await calloModule.process(this.sendResponse, this.handleError);
        } catch (err) {
          this.handleError(err, req, res);
        }
      }
    };
  };

  sendResponse = (req, res, mod) => {
    const responseObject = {
      data: mod.data,
      state: this.encrypt(mod.state),
    };

    if (mod.action) {
      responseObject.action = mod.action;
    }

    let json;

    try {
      json = JSON.stringify(responseObject);
    } catch (err) {
      this.handleError(constants.ERR_PACKAGE_RESPONSE, req, res);
      return;
    }

    try {
      let sendHandler = (req, res) => {
        res.end(json);
      };

      if (this.shouldCompress) {
        compression()(req, res, sendHandler);
      } else {
        sendHandler();
      }
    } catch (err) {
      this.handleError(constants.ERR_SEND_RESPONSE, req, res);
    }
  };

  setPassword = (password) => {
    const saltOfKey = crypto.pbkdf2Sync(password, password, 100000, 64, 'sha256');
    this.secretKey = crypto.pbkdf2Sync(password, saltOfKey, 100000, 64, 'sha256');
    this.iv = crypto.randomBytes(16);
  };

  setCompress = (cond) => {
    this.shouldCompress = cond;
  };

  encrypt = (obj) => {
    let json;

    try {
      // create a nonce
      obj.nonce = crypto.randomBytes(16).toString();
      json = JSON.stringify(obj);
      const cipher = crypto.createCipheriv('aes256', this.secretKey, this.iv);
      let result = cipher.update(json, 'utf8', 'hex');
      result += cipher.final(encoding);
      return result;
    } catch (err) {
      throw new CalloError(constants.ERR_ENCRYPT);
    }
  };

  decrypt = (json) => {
    let obj;

    try {
      const decipher = crypto.createDecipheriv('aes256', this.secretKey, this.iv);
      let result = decipher.update(json, 'utf8', 'hex');
      result += decipher.final(encoding);

      obj = JSON.parse(result);
      // discard nonce
      delete obj['nonce'];
      return obj;
    } catch (err) {
      throw new CalloError(constants.ERR_DECRYPT);
    }
  };

  pre(flow) {
    this.middlewareFlow.use(flow);
  }

  on(name) {
    let namedFlow = new NamedFlow(name);
    this.unregisteredFlows.push(namedFlow);
    return namedFlow;
  }

  commit() {
    for (const f of this.unregisteredFlows) {
      this.cache.registerNamedFlow(f);
    }
  }
}
