# Callo
Experiment with phone-call styled Minimal Stateful HTTP requests, with call styles inspired by Meteor Methods.  
This package is still at its VERY EARLY development state, so it is highly unstable.  

It has YET to be published to NPM, since I haven't done all the implementation (e.g. Front End `callocall` is yet a mess... I am also polishing backend code, so sometimes things just does NOT work...)

## Introduction
HTTP is a stateless protocol, and we are all thankful of thisand we are all thankful of this fact that simplifies a lot of things.
However, sometimes we want to be able to make our HTTP requests, rather than simply RESTful ones, more similar to a "phone call": I dial to someone, someone asks me for more information, and I later respond. If I gave wrong info or missed some data, rather than brutally hanging off the "phone call", it might be more polite and conceptually easy to ask "PARDON?".  

This is what `Callo` is trying to achieve: it allows, on the server side, to "jump out" of the current flow, and ask for more info from the client, given a special hint of "Action", and necessary data along with such action. Client could respond based on this, and as they forward their fixed request back to the server, we can resume from where we left off before!  

More interesting, `Callo` supports "time travel": rewind back to a previous handler, jumping forward to a future handler, replay current handler, etc. It makes the flow of handling more dynamic and controllable.  

## How does it Work?
`Callo` is inspired by Meteor methods, React, Express, and JWT.  
Instead of directly exposing HTTP calls to client, we wrap them inside our special structure that allows for RPC-like remote calls: you give name of "function" (a series of handlers), and supply necessary `props` (as if arguments), and then `await`s.  
Whenever the server want to jump out of the current handling flow, we allow server to store necessary info for resuming operation in `state` (Restriction: such state should be kept minimal though, and must be able to convert to JSON). This `state` would then be stringified, encrypted, and send to client-side under the hood of `Callo`'s structure. In such way, the server are devoid of load for saving these state. It is similar to JWT in a way that necessary info is delegated to client. Furthermore, using cryptography to avoid modification, inspection or tampering by the "wicked" client.  
`Callo` has built-in support for middlewares, just like Express. Though, due to the nature of wrapping around actual HTTP calls, we are a bit more restricted to set our `req` and `res` freely like what we do with Express, `Callo` also supports using Express middlewares. Under a bit careful operation, you should not find hard to combine Express with Callo.

## Current Stage
This is actually pretty much an experiment project. The code and thought is actually pretty simple, and, to be honest, I myself has yet to find an extremely compelling reason to use this over Express. The "Jump Out of Handling Flow" feature, though core to the project, is yet to find its actual perfect scenario of usage by me. Nevertheless, it could still be used as a Meteor method alternative if you don't want to use the huge Meteor libraries.  

## Example
```javascript
const callo = require('callo');
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

// Handlers for "test"
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
  })
  .use((h, props, state) => {
    if (props.test !== 1) {
      h.end({ bad: 'You sent me the wrong thing!' });
      return;
    }
    h.end({ text: `Okay! My state contains: ${util.inspect(state)}, and you sent me ${util.inspect(props)}` });
  });

http.createServer(srv.handler()).listen(8000);

// And on client side, assume Node
const CalloCall = require('callocall');

let sess = CalloCall.session('http://localhost:8000/');

(async () => {
  try {
    await sess.dial('test', {});
    console.log(sess.data);
    await sess.reply({ test: 1 });
    console.log(sess.data);
  } catch (err) {
    console.log(err);
  }
})();
```

## More Documentation
See [Server Side Documentation](https://github.com/kevinkassimo/callo/packages/callo/README.md);