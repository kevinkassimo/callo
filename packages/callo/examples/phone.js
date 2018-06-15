const callo = require('../dist/index');
const http = require('http');
const util = require('util');

const srv = callo.server({ password: 'password-for-phone-call' });

srv.on('reservation')
  .use(function recordName(h, props, state) {
    if (!props.name) {
      h.orderReplay('SUBMIT_NAME', { hint: 'what is your name?' });
      return;
    }

    state.name = props.name;

    if (!props.date) {
      h.order('SUBMIT_DATE', { hint: 'when do you want to reserve?' });
      return;
    }

    h.next();
  })
  .use(function whenToReserve(h, props, state) {
    if (isNaN(new Date(date).getTime())) {
      h.orderReplay('RESUBMIT_DATE', { hint: 'your previously submitted date errs. Submit a new one' });
      return;
    }

    state.date = props.date;

    if (!props.reason) {
      h.order('SUBMIT_REASON', { hint: 'why do you want to reserve?' });
      return;
    }

    h.next();
  })
  .use(function whyToReserve(h, props, state) {
    state.reason = props.reason;
    
    setTimeout(function fakeStoreToDB() {
      console.log(`Saved to DB: ${ util.inspect(state) }`);
      h.end({ hint: 'reservation successful.' });
    }, 1000);
  });

http.createServer(srv.handler()).listen(8000);
