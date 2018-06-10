const crypto = require('crypto');

const bodyParser = require('body-parser');
const compression = require('compression');

const { errors } = require('./constants');
const {
  Cache: CalloCache,
} = require('./cache');
const CalloError = require('./cerror');
const CalloModule = require('./cmodule');
const { Flow, NamedFlow } = require('./flow');
const { isEmpty } = require('./utils');

class Server {
  constructor(opt) {
    if (!(this instanceof Server)) return new Server(opt);

    this.cache = new CalloCache();

    this.middlewareFlow = new Flow();
    this.unregisteredFlows = [];

    this.expressMiddlewares = [bodyParser.json()];

    opt = { ...opt };

    // encrypt settings
    if (!opt.password) {
      opt.password = crypto.randomBytes(32).toString('hex');
    }

    this.options = opt;
  }

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
      // TODO: better handling
    }
  };

  useExpressMiddleware = (middleware) => {
    this.expressMiddlewares.push(middleware);
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
    if (!req.body) {
      next(errors.ERR_REQ_READ_BODY);
      return;
    }

    let jsonObject = req.body;

    try {
      // jsonObject = JSON.parse(req.body);
      if (jsonObject.state) {
        jsonObject.state = this._decrypt(jsonObject.state); // decrypt here
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

  _sendResponse = (req, res, mod) => {
    const responseObject = {
      data: mod.data,
    };

    if (mod.state && !isEmpty(mod.state)) {
      responseObject.state = this._encrypt(mod.state);
    }

    if (mod.action) {
      responseObject.action = mod.action;
    }

    let json;

    try {
      json = JSON.stringify(responseObject);
    } catch (err) {
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
      case 'password':
        opt.password = value;
        break;
    }
  };

  _encrypt = (obj) => {
    let password = this.options.password;
    let json;

    try {
      json = JSON.stringify(obj);
      const iv = crypto.randomBytes(16);
      const salt = crypto.randomBytes(64);
      const key = crypto.pbkdf2Sync(password, salt, 2145, 32, 'sha512');
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
    } catch (err) {
      throw new CalloError(errors.ERR_ENCRYPT);
    }
  };

  _decrypt = (enc) => {
    try {
      let password = this.options.password;
      const bData = Buffer.from(enc, 'base64');
      const salt = bData.slice(0, 64);
      const iv = bData.slice(64, 80);
      const tag = bData.slice(80, 96);
      const text = bData.slice(96);
      const key = crypto.pbkdf2Sync(password, salt, 2145, 32, 'sha512');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const decoded = decipher.update(text, 'binary', 'utf8') + decipher.final('utf8');
      return JSON.parse(decoded);
    } catch (err) {
      throw new CalloError(errors.ERR_DECRYPT);
    }
  };

  pre = (flow) => {
    this.middlewareFlow.use(flow);
  };

  on = (name) => {
    let namedFlow = new NamedFlow(name);
    this.unregisteredFlows.push(namedFlow);
    return namedFlow;
  };

  commit = () => {
    for (const f of this.unregisteredFlows) {
      f.pre(this.middlewareFlow);
      this.cache.registerNamedFlow(f);
    }
    // clear unregistered flows
    this.unregisteredFlows = [];
  };
}

module.exports = Server;
