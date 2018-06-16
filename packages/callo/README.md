# Callo, Experiment with Phone-Call Styled Minimal-State HTTP API

## Notice

Currently, `Callo` is still at its probably earliest stage of development. Due to its experimental nature, the API might change in the future to something complete different.

ALSO, Callo requires a front-end wrapper for ease of use, [`callocall`](https://www.npmjs.com/package/callocall), should be soon available on NPM.

## Why?

HTTP is a stateless protocol, and we are all thankful of thisand we are all thankful of this fact that simplifies a lot of things.

However, sometimes we might want to maintain some minimal "states". For example, when an API call sends partially valid data and partially nonsense, we might start processing the valid part (which requires some time and CPU cycles), and then suddenly realize that the rest is nonsense. Sometimes, people would just abort and discards everything, simply sending a status 400. However, it might be nice to actually save the previous part that proves to be valid and their processed result in some "state", and notify the client "hey, you submit something invalid!". When the client realized the problem and submit the correct data, the server could directly resume from this "state", instead of starting running from the very beginning.

Callo is an experiment to see if such idea is going to be proved adequately useful in actual projects. It offers a set of API that allows you easily jump out of a chain of handlers, and jump back in when client submit their corrected data, etc. It further supports rewinding/replaying/skipping handlers. Callo allows you to maintain minimal state, and will be encrypted and send to client, such that no server storage is needed for states. Its front-end package, `callocall` , further allows interation between API server and client more like RPC or Meteor methods.

Callo is influenced by JWT, Express, React, Redux, Meteor.

## Basic Documentation

### Create an Callo API Server

```javascript
const callo = require('callo');

// 256-bit key is used to encrypt state
let srv = callo.server({ key: '5974A1197F7CB9F744CEED4F313DA' });
// or you can supply a password that will be converted to 256-bit key
// let srv = callo.server({ password: 'this-is-a-weak-password' });
```

### Add a Series of Handlers

```javascript
srv.on('login')
    .use((h, props, state) => {
    	// h is handle
    	// props is data passed from client (has to be able to convert to JSON though)
    	// state is where you can retrieve and set state (has to be able to convert to JSON though)
    	console.log('1st handler for login');
    	h.next();
	})
    .use((h, props, state) => {
    	console.log('2nd handler for login');
    	h.end({ message: 'login successful!' })
	});
```

### Add a Callo Middleware

```javascript
srv.pre((h, props, state) => {
	state.dataByMiddleware = true;
	h.next(); 
});
```

### Add an Express Middleware

```javascript
srv.useExpressMiddleware((req, res, next) => {
    console.log('Hi');
    next();
});
```

### Possible Handle Actions

```javascript
h.end(data) // end handle flow and send data to client

h.next() // go to next handler
h.replay() // rerun the current handler
h.rewind(count) // rewind to a previous handler. h.rewind(0) === h.replay()
h.skip() // skip the next handler
h.jump(count) // jump to a future handler `count` away from current. h.jump(2) === h.skip()

h.order(actionString, data) // request more data from client, would resume from NEXT handler (implicit h.next() while requesting for more data)
h.orderReplay(actionString, data) // order version of h.replay
h.orderRewind(count, actionString, data) // order version of h.rewind
h.orderSkip(actionString, data) // order version of h.skip
h.orderJump(count, actionString, data) // order version of h.jump
```

### Access Raw Request (IncomingMessage) and Response (ServerResponse)

```javascript
h.req
h.res
```

### Mount API Server for Listening

```javascript
const http = require('http')

http.createServer(srv.handler()).listen(8000);
```

### Use with Express

```javascript
const express = require('express');
const app = express();

app.post('/some/path', srv.handler());
app.listen(8000);
```