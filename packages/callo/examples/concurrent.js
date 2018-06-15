const callo = require('../dist/index');
const http = require('http');

const srv = callo.server({ password: 'password-for-phone-call' });

srv.on('test')
  .use(function recordName(h, props, state) {
    setTimeout(() => {
      h.end({ ok: 1 });
    }, 1000);
  });

http.createServer(srv.handler()).listen(8000);
