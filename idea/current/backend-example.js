/* FIFTH ITERATION */
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
const $F = $C.flow;
const myDB = require('mydb-scripts');

const srv = $C();
srv.secretKey('My Best Secret Key for MAC'); // if not called, will set implicitly. BUT you should always call it to ensure same secret key is used for MAC
srv.compress('gzip'); // choose to compress transmitted data from server to client
srv.storageTimeout(5000); // delete localState after certain time period

const handleLogin = $F()
  .use((req, props, state, storage) => {
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
     *
     *   If none of the above are called in a handler, it is equivalent to req.abort() with a preset abort message saying 'no-op'
     * props: data passed from client, should only be modified by client ONLY
     *   For behavior of props, we would have it overwritten in the following handler every single time an .order or .replay is dispatched
     *   Basically, programmers should refrain from considering data in props as persistent, and instead, dump useful data to state or storage
     *   This might be a bit confusing though, as we can never promise that in middlewares, user's props would persist...
     * state: current state of the session, will be packages and sent to client on .order(), thus should be kept small. Should only be modified by server ONLY
     *   We should create a signature as MAC along side with compressed clear text
     *   (We can directly automatically ABORT if MAC does not match clear text, to avoid client circumvent our provided API and customize their own)
     *   state.$local: everything stored under state.$local would be encrypted when sent to client
     *   state.$temp: everything stored under state.$temp would be gone when an .order() or .replay() is called (basically, it would only persist if the whole flow is all only processed on server side. One "jumps out" to client, it is deleted)
     * storage: current state of the session, will be packages and SAVED in the server-side (not sent to client)
     *   This feature is still debatable whether to exist or not
     */
    const username = state.username ? state.username : props.username;
    const password = props.password;

    if (!username || !password) {
      req.replay('REQUIRE_USERNAME_PASSWORD', {
        msg: 'you need to provide username and password',
      });
    }

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
            req.order('SAVE_TOKEN', {
              msg: 'please save this token for future calls',
            });
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

            req.replay('INVALID_PASSWORD', {
              message: 'password is invalid',
            });
          }
        }
      })
      .catch((err) => {
        req.abort(err);
      });
  });

const checkLogin = $F()
  .use((req, props, state) => {
    const token = props.token;
    state.token = token;
    req.next(!token || !myDB.checkTokenSync(token));
  })
  .branch(handleLogin, $C.pass()); // $C.pass() means no-op, directly land on the next handler provided through .then()
/*
 * Another API for .branch is the following:
 * Assume you pass in a string in req.next(string)
 * then you can do:
 * .branch({
 *   'case-A': handlerA,
 *   'case-B': $C.pass(),
 *   '$default': handlerDefault,
 * })
 */

const handleGetHistory = $F()
  .use((req, props, state) => {
    const {
      startDate
    } = props;

    if (!startDate) {
      req.abort({ error: 'no start date provided' });
      return;
    }

    const username = props.username || state.username;

    if (!username) {
      req.replay('MISSING_USERNAME', {
        msg: 'you need to provide username for search',
      });
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

srv.pre(checkLogin); // similar to middleware run before everything on the chain
// when multiple .pre mounts, we run these middleware based on the sequence they are mounted
// This method name inspired by Mongoose

srv.on('getHistory')
  .use(handleGetHistory)
  .done();

const app = require('express')();
app.use('/protected-api', srv.toHandler()); // to a normal HTTP handler for Node
app.listen(80);
