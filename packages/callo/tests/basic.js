const callo = require('../dist');
const http = require('http');
const util = require('util');

let srv = callo.server({ password: 'password' });

// Middleware!
// One thing to be careful about middleware is the chances of overwriting props
// Always store props that needs to persist in state if possible
srv.pre((h, props, state) => {
  state.pre = 'my-pre';
  h.next();
});

// Path for "test"
// Use .use to do chaining
srv.on('test')
  .use((h, props, state) => {
    state.store = 'my-store';
    if (props.test === undefined) {
      // This tells client:
      // "Please give me more data before proceeding!"
      // and exit current flow
      // When client send the data (with the encrypted state), it would resume from the next handler
      h.order('TEST_ORDER', { text: 'please respond with TEST_ORDER with { test: 1 }' });
      return;
    }
    // This directly forward to the next handler
    h.next();

    // The following change state attempt should be treated with a warning!
    // Currently for some reason this is buggy and does not work as intended...
    state.b = 'changes after handling, e.g. h.next(), would not be stored, and instead generate a warning';
  })
  .use((h, props, state) => {
    if (props.test !== 1) {
      h.abort({ bad: 'You sent me the wrong thing!' });
      return;
    }
    h.end({ text: `Okay! My state contains: ${util.inspect(state)}, and you sent me ${util.inspect(props)}` });
  });

http.createServer(srv.handler()).listen(8000);

/*
To test if these code works, design HTTP request looking like the following:

http://localhost:8000

body 1 (lands on "TEST_ORDER"):
{
  "name": "test"
}

body 2 (lands on "$$CALLO_ABORT"):
{
	"name": "test",
	"state": "GcgDUaC1xbYLkpsj28fBtVjBxT/7znq6yjPSc+sE9kudEAHfL2vFsTbqIgNDCwUwuLE11k/rZ8MtPMo7eUt0gdWII1yIvbeOsr45AsIF3l5tKmLAOgb6C2zcBsplQdGmcMEPmtKtxg+bWAd9fkwDFQ6FRyA1wQRuWdURL1nA",
	"props": {}
}

body 3 (lands on "$$CALLO_END"):
{
	"name": "test",
	"state": "GcgDUaC1xbYLkpsj28fBtVjBxT/7znq6yjPSc+sE9kudEAHfL2vFsTbqIgNDCwUwuLE11k/rZ8MtPMo7eUt0gdWII1yIvbeOsr45AsIF3l5tKmLAOgb6C2zcBsplQdGmcMEPmtKtxg+bWAd9fkwDFQ6FRyA1wQRuWdURL1nA",
	"props": { "test": 1 }
}
 */
