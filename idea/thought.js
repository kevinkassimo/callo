/* FIRST ITERATION */

const express = require('express')
const crossCall = require('crosscall');
const mongoApi = require('example-mongoApi');

const api = crossCall('/api', 'api'); // mount path, alias

api.on('getAllRepos', async (username) => {
  let validated = await api.request('validateCredentials', 'REQUIRE_CRED')
  if (validated) {
    let result = await mongoApi.find({query: 'blah'})
    return result
  }

  return null
})

api.on('validateCredentials', async (token) => {
  if (!token) {
    return false;
  }
  let data = await mongoApi.findOne({token: token})
  return !!data
})

// Check ws for mounting this to websocket

// Frontend
cc.dial('@api', async (conn) => {
  let handle = await conn.call('getAllRepos', 'kevinkassimo')
  while (handle.actionRequired) {
    switch (handle.action) {
      case 'REQUIRE_CRED':
        await handle.respond(localStorage.get('token'));
        break;
    }
  }
  let data = handle.result
  // Do work...
  conn.hangoff();
});

/* SECOND ITERATION */

/*
 * Thoughts:
 * One way to store information of current backend operation flow is to store to mongo
 * Another way is to use the JWT token idea, encrypt and send the state to the client, so the client can resume whenever it wants.
 * The only problem now comes to how to make the API itself nice to use enough
 */

api.on('getAllRepos', (username) => {
  api.save({username});
  return api.order('validateCredentials', 'REQUIRE_CARD')
})

api.on('getAllRepos')
  .then(() => {
    return api.order('validateCredentials', 'REQUIRE_CRED')
  })
  .then((isValidated) => {
    if (!isValidated) {
      throw api.abort();
    }
    mongoApi.findOne('')
  });

/* THIRD ITERATION */

const workHelp = callo.run((step) => {

  step.res();
  step.rej();
});

const studyHelp = callo.run((step) => {

});

api.on('needHelp', (helpType) => {
    return helpType
  })
  .branch({
    work: workHelp,
    study: studyHelp,
  });


const badLoginHandle = cl.handle((next) => {
  next.abort()
});

const goodLoginHandle = $$((next, username) => {
    return [username, next.order('SEND_PASSWORD')];
  })
  .andThen((next, username, password) => {
    next.branchTo(checkIfPasswordMatches(username, password));
    return [username, password]
  })
  .branch(cl.handle((next, username, password) => {
    let token = generateToken(username, password);
    next.respond(token)
  }), badLoginHandle);

const loginHandle = cl.handle((next, username) => {
    next.branchTo(usernameInDatabase(username));
    return [username];
  })
  .branch(goodLoginHandle, badLoginHandle);

srv.on('login')
  .use(loginHandle)
  .done();

/* FOURTH ITERATION */
/*
 * This iteration is heavily inspired by React/Redux.
 * It also incorporate some Express patterns with modifications.
 *
 * localState are lazily initialized. If not ever used, they do not exist
 * could be implemented with JS Proxy() (object observe, reactive programming)
 *
 * I know the state thing seems a bit controversial, but the main idea of this framework
 * is to exchange for some waste of bandwidth with light load on server, while keeping
 * the interactivity between client and server. The action of saving data is actually
 * commonly used in JWT
 */
const $C = require('callo');
const myDB = require('mydb-scripts');

const srv = $C();
srv.setSecretKey('My Best Secret Key for MAC'); // if not called, will set implicitly. BUT you should always call it to ensure same secret key is used for MAC
srv.setCompress('gzip'); // choose to compress transmitted data from server to client
srv.setLocalStateTimeout(5000); // delete localState after certain time period

const handleLogin = $C.flow()
  .then((req, props, state, localState) => {
    /*
     * req: request, provide stepping handlers (next, abort, hold, etc.). Only the last one used will be effective (signals overwrite each other)
     *   req.abort(msgObj): abort the operation, send an ABORT message to client (state discarded)
     *   req.next(branchSelector): passed to next handler. Notice that it is different from Express in that this .next is a SIGNAL, rather than telling to INSERT next handler at this place.
     *     Using req.next would NOT overwrite props, meaning the props for the next handler will be the same as that in the current handler
     *     branchSelector is used to determine which branch should be picked if the following statement is .branch(): two types: true/false or string-based
     *   req.replay(msgObj, actionString): ask for more data from client; once heard back, rerun current handler (state persists)
     *     actionString is similar to that of action type for Redux
     *   req.order(msgObj, actionString): ask for more data from client; once heard back, run next handler (state persists)
     *     We NEVER overwrite props on server side. Client should decide whether to provide a different props for next handler after such .order operation
     *     If server want to save some data that it considers VERY important, save to state/localState instead
     *   req.end(data): send data back and stop (abort)
     * props: data passed from client, should only be modified by client ONLY
     * state: current state of the session, will be packages and sent to client on .order(), thus should be kept small. Should only be modified by server ONLY
     *   We should create a signature as MAC along side with compressed clear text
     *   (We can directly automatically ABORT if MAC does not match clear text, to avoid client circumvent our provided API and customize their own)
     * localState: current state of the session, will be packages and SAVED in the server-side (not sent to client)
     *   This feature is still debatable whether to exist or not
     */
    const username = state.username ? state.username : props.username;
    const password = props.password;

    myDB.checkPassword(username, password)
      .then((result) => {
        if (result.ok) {
          myDB.generateToken(username, (err, token) => {
            if (err) {
              req.abort({
                error: 'cannot generate token',
              }); // abort,
              return;
            }
            state.token = token;
            req.order({
              msg: 'please save this token for future calls',
            }, 'SAVE_TOKEN');
          })
        } else {
          if (state.trials && state.trials > 5) {
            req.abort({
              error: 'too many trials',
            });
          } else {
            state.username = username;
            // increment trials
            state.trials = state.trials || 0;
            state.trials++;

            req.replay({
              message: 'password is invalid',
            }, 'INVALID_PASSWORD');
          }
        }
      })
      .catch((err) => {
        req.abort(err);
      });
  });

const checkLogin = $C.flow()
  .then((req, props, state) => {
    const token = props.token;
    state.token = token;
    req.next(!token || !myDB.checkTokenSync(token));
  })
  .branch(handleLogin, $C.pass()); // $C.pass() means no-op, directly land on the next handler provided through .then()

const handleGetHistory = $C.flow()
  .then((req, props, state) => {
    const {
      startDate
    } = props;

    if (!startDate) {
      req.abort({ error: 'no start date provided' });
      return;
    }

    const username = props.username || state.username;

    if (!username) {
      req.replay({
        msg: 'you need to provide username for search',
      }, 'MISSING_USERNAME');
    }

    myDB.getDataFromStartDate(username, startDate)
      .then((data) => {
        req.end({
          data,
        });
      })
      .catch(() => {
        req.abort({ error: 'fetch data failed' });
      })
  });

srv.useBeforeAll(checkLogin); // similar to middleware run before everything on the chain

srv.on('getHistory')
  .use(handleGetHistory)
  .done();

srv.listen('/protected-api', 80);
// we can also generate an Express-like handler that could be used alongside normal express
// e.g.
const app = require('express')();
app.use('/protected-api', srv.requestHandler);
app.listen(80);
