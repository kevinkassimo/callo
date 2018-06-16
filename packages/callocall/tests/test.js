// const CalloCall = require('../dist');
// //
// // let sess = CalloCall.session('http://localhost:8000/');
// //
// // (async () => {
// //   try {
// //     await sess.dial('test', {});
// //     console.log(sess.data);
// //     await sess.reply({ test: 1 });
// //     console.log(sess.data);
// //   } catch (err) {
// //     console.log(err);
// //   }
// // })();

require('isomorphic-fetch');

(async () => {

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
  console.log(j1);
})();