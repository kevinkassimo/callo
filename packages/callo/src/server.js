const bodyParser = require('body-parser');
const compression = require('compression');

const { errors } = require('./constants');
const {
  Cache: CalloCache,
} = require('./cache');
const CalloError = require('./cerror');
const CalloModule = require('./cmodule');
const { Flow, NamedFlow } = require('./flow');

const { isEmpty, isObject } = require('./utils');

const {
  genKey256,
  genKey256FromPassword,
  genSalt64,
  encrypt,
  decrypt,
} = require('./encryption');

// Format crypt data to proper key
function useCrypt(crypt) {
  if (isObject(crypt) && crypt.key) {
    const key = Buffer.from(crypt.key);
    if (key.length !== 32) { // not 256 bits
      throw new Error('key not 256 bits');
    }
    return { key };
  } else if (isObject(crypt) && crypt.password) {
    const password = Buffer.from(crypt.password);
    const salt = crypt.salt ? Buffer.from(crypt.salt) : genSalt64();
    return { key: genKey256FromPassword(password, salt) };
  } else {
    return { key: genKey256() };
  }
}

function formatResponseJSON(action, data, state, key) {
  const obj = {};
  if (action) {
    obj.action = action;
  }
  if (data) {
    obj.data = data;
  }
  if (state && !isEmpty(state)) {
    // Only send state when state is not empty
    obj.state = encrypt(state, key);
  }
  return JSON.stringify(obj);
}

function formatErrorResponseJSON(error) {
  return JSON.parse({ error });
}

class Server {
  /*
   * Construct Server
   * opt = {
   *   crypt?: {
   *     password?: String | Buffer
   *     key?: String | Buffer
   *     salt?: String | Buffer
   *   }
   *   password?: <alias> crypt.password
   *   key?: <alias> crypt.key
   *   compress?: Boolean
   *   compressOptions?: Object (see express compress options)
   * }
   */
  constructor(opt) {
    this.cache = new CalloCache();

    this.middlewareFlow = new Flow();
    this.unregisteredFlows = [];
    this.expressMiddlewares = [bodyParser.json()];

    opt = { ...opt }; // { ...undefined } okay
    const tempCrypt = { ...opt.crypt };
    if (opt.password) {
      tempCrypt.password = opt.password;
    }
    if (opt.key) {
      tempCrypt.key = opt.key;
    }
    opt.crypt = useCrypt(tempCrypt);
    this.options = opt;
  }

  /* public */

  /*
   * Add a callo middleware
   * Attach this flow to the front all flows to be registered
   */
  pre = (flow) => {
    this.middlewareFlow.use(flow);
  };

  /*
   * Add a new handle flow, identified through name
   * Just like naming a function
   */
  on = (name) => {
    let namedFlow = new NamedFlow(name);
    this.unregisteredFlows.push(namedFlow);
    return namedFlow;
  };

  /*
   * Register all flows created by .on()
   */
  commit = () => {
    for (const f of this.unregisteredFlows) {
      f.pre(this.middlewareFlow);
      this.cache.registerNamedFlow(f);
    }
    // clear unregistered flows
    this.unregisteredFlows = [];
  };

  /*
   * Use express middlewares
   */
  useExpressMiddleware = (middleware) => {
    this.expressMiddlewares.push(middleware);
  };

  /*
   * Set options
   */
  set = (key, value) => {
    const opt = this.options;

    if (!key || !value) {
      return;
    }

    switch (key.toString().toLowerCase()) {
      case 'compress':
        opt.compress = value;
        break;
      case 'compressOptions':
        opt.compressOptions = value;
        break;
      case 'crypt':
        opt.crypt = useCrypt(value);
        break;
      case 'password':
        opt.crypt = useCrypt({ password: value });
        break;
      case 'key':
        opt.crypt = useCrypt({ key: value });
        break;
    }
  };

  /*
   * Create a Node http server compatible handler
   * Would run .commit() if not yet
   */
  handler = () => {
    // check if all the handlers are already registered.
    // If not, register them
    if (this.unregisteredFlows.length > 0) {
      this.commit();
    }

    return (req, res) => {
      const opt = this.options;
      if (opt.compress) {
        this.useExpressMiddleware(compression(opt.compressionOptions));
      }
      this._applyExpressMiddlewares(req, res, this._coreHandler, this._handleError);
    };
  };

  /* private */

  _handleError = (err, req, res) => {
    let errMsg;
    let errObj;

    if (typeof err === 'string') {
      errMsg = err;
    } else if (err instanceof CalloError) {
      errMsg = err.type;
    } else if (err instanceof Error) {
      errMsg = err.message;
      errObj = err;
    } else {
      errMsg = err.toString();
    }

    console.warn(errObj ? errObj : new Error(errMsg));

    try {
      res.statusCode = 418; // TODO: use a more accurate status code
      res.end(JSON.stringify({ error: errMsg }));
    } catch (e) {
      console.warn(e);
    }
  };

  _applyExpressMiddlewares = (req, res, handler, errorHandler) => {
    let middlewares = this.expressMiddlewares.slice();
    middlewares.push(handler);

    let combinedMiddleware = (req, res, next) => {
      let dequeue = () => {
        let mid = middlewares.shift();
        let cb;
        if (middlewares.length) {
          cb = (err) => {
            if (err) {
              next(err);
            }
            dequeue();
          };
        } else {
          cb = next;
        }

        if (!mid) {
          return next();
        }

        try {
          mid(req, res, cb);
        } catch (err) {
          next(err);
        }
      };

      dequeue();
    };

    let endNext = (err) => {
      if (err) {
        errorHandler(err, req, res);
      }
    };

    combinedMiddleware(req, res, endNext);
  };

  _coreHandler = async (req, res, next) => {
    const { key } = this.options.crypt;

    if (!req.body) {
      next(errors.ERR_REQ_READ_BODY);
      return;
    }

    let jsonObject = req.body;

    try {
      if (jsonObject.state) {
        jsonObject.state = decrypt(jsonObject.state, key);
      }
    } catch (err) {
      next(errors.ERR_REQ_PARSE_BODY);
      return;
    }

    let calloModule;

    try {
      calloModule = CalloModule.toCalloModule(jsonObject, req, res, this);
    } catch (err) {
      next(errors.ERR_REQ_BODY_CONTENT);
      return;
    }

    try {
      await calloModule.process(this._sendResponse);
    } catch (err) {
      next(err);
    }
  };

  _sendResponse = (req, res, mod) => {
    const { key } = this.options.crypt;

    let json;

    try {
      json = formatResponseJSON(mod.action, mod.data, mod.state, key);
    } catch (err) {
      this.
      this._handleError(errors.ERR_RES_PACKAGE_BODY, req, res);
      return;
    }

    try {
      res.setHeader('content-type', 'application/json');
      res.end(json);
    } catch (err) {
      this._handleError(err, req, res);
    }
  };
}

module.exports = Server;
