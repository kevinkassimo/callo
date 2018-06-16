const Callo = require('../dist');
const CalloServer = require('callo');
const http = require('http');

require('isomorphic-fetch');

function defer(constructor) {
  let res, rej;

  let promise = new Promise((resolve, reject) => {
    if (constructor) {
      constructor(resolve, reject);
    }

    res = resolve;
    rej = reject;
  });

  promise.resolve = a => {
    res(a);
    return promise;
  };

  promise.reject = a => {
    rej(a);
    return promise;
  };

  return promise;
}

describe('test callocall', () => {
  test('test basic', async (done) => {
    let s1 = CalloServer.server();
    s1.useExpressMiddleware((req, res, next) => {
      req.midData = 1;
      next();
    });
    s1.on('test')
      .use((h, props, state) => {
        expect(h.req.midData).toBe(1);
        if (!props.p1) {
          h.end({ reason: 'NO_P1' });
          return;
        }
        if (props.shouldSkip) {
          h.skip();
          return;
        }
        state.s1 = props.p1;
        h.next();
      })
      .use((h, props, state) => {
        if (!props.p2) {
          h.order('NEED_P2', { reason: 'NO_P2' });
          return;
        }
        state.s2 = props.p2;
        h.next();
      })
      .use((h, props, state) => {
        if (!state.s2) {
          state.s2 = props.p2;
          state.s2h3 = 'set in handler 3';
        }
        h.end(state);
      });

    let httpServer = http.createServer(s1.handler());

    let requestDeferred = defer();
    let serverDeferred = defer();

    // spin off a server
    (async () => {
      httpServer.listen(8000);
      requestDeferred.resolve();
      await serverDeferred;
      httpServer.close();
      done();
    })();

    await requestDeferred;

    let sess = Callo.session('http://localhost:8000');
    await sess.dial('non-existent', {});
    expect(sess.action).toBe(null);

    await sess.dial('test', {});
    expect(sess.data.reason).toBe('NO_P1');
    expect(sess.action).toBe(null);

    await sess.dial('test', { p1: 'a' });
    expect(sess.data.reason).toBe('NO_P2');
    expect(sess.action).toBe('NEED_P2');

    await sess.reply({ p2: 'b' });
    expect(sess.data.s1).toBe('a');
    expect(sess.data.s2).toBe('b');
    expect(sess.action).toBe(null);

    serverDeferred.resolve();
  });
});
