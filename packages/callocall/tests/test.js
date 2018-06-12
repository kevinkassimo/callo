const CalloCall = require('../dist');

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