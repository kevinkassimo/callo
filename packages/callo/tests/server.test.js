const Server = require('../dist/server');
const { defer } = require('../dist/utils');
const { handleTypes } = require('../dist/constants');
const http = require('http');
require('isomorphic-fetch');

describe('test server', () => {
  test('server create', () => {
    let s1 = new Server();
    expect(s1.options.crypt.key).toBeTruthy();
    expect(s1.options.crypt.key.length).toBe(32);

    let s2 = new Server({ password: 'my-password' });
    expect(s2.options.crypt.key).toBeTruthy();
    expect(s2.options.crypt.key.length).toBe(32);

    expect(() => {
      new Server({ key: 'invalid' });
    }).toThrow();
  });

  test('server set options', async (done) => {
    let s1 = new Server();
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

    let r1 = await fetch('http://localhost:8000', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'test',
        props: {}
      }),
    });
    let j1 = await r1.json();
    expect(j1.data.reason).toBe('NO_P1');

    let r2 = await fetch('http://localhost:8000', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'test',
        props: {
          p1: 'a',
        }
      }),
    });
    let j2 = await r2.json();
    expect(j2.action).toBe('NEED_P2');
    expect(j2.data.reason).toBe('NO_P2');

    let r3 = await fetch('http://localhost:8000', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'test',
        props: {
          p1: 'a',
          p2: 'b',
        },
        state: j2.state
      }),
    });
    let j3 = await r3.json();
    expect(j3.data.s2h3).toBe('set in handler 3');

    let r4 = await fetch('http://localhost:8000', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'test',
        props: {
          p1: 'a',
          p2: 'b',
        }
      }),
    });
    let j4 = await r4.json();
    expect(j4.data.s2h3).toBeFalsy();

    let r5 = await fetch('http://localhost:8000', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'test',
        props: {
          p1: 'a',
          p2: 'b',
          shouldSkip: true,
        }
      }),
    });
    let j5 = await r5.json();
    expect(j5.data.s1).toBeFalsy();
    expect(j5.data.s2h3).toBe('set in handler 3');

    let r6 = await fetch('http://localhost:8000', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'non-existent',
        props: {}
      }),
    });
    let j6 = await r6.json();
    expect(j6.action).toBe(handleTypes.UNKNOWN);

    serverDeferred.resolve();
  });
});
