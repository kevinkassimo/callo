// Resolve a promise from outside, attach res and rej directly on promise object
// https://github.com/mavoweb/mavo/blob/1e2cfb0b04814d2ec8cbb90115549ed49de4abe9/src/util.js
function defer(constructor) {
  let res, rej;

  let promise = new Promise((resolve, reject) => {
    if (constructor) {
      constructor(resolve, reject);
    }

    res = resolve;
    rej = reject;
  });

  promise.resolve = a => {
    res(a);
    return promise;
  };

  promise.reject = a => {
    rej(a);
    return promise;
  };

  return promise;
}

function isEmpty(obj) {
  for(const key in obj) {
    if(obj.hasOwnProperty(key))
      return false;
  }
  return true;
}

module.exports = {
  defer,
  isEmpty,
};
