// mod from https://stackoverflow.com/questions/34699529/convert-javascript-class-instance-to-plain-object-preserving-methods
const warning = require('warning');

function toPlainObject(proto) {
  if (proto === null || proto === undefined) {
    return proto;
  }

  let jsoned = {};

  warning(
    proto instanceof Object,
    'jsonfy.asObjectProps should receive an object to parse'
  );

  Object.getOwnPropertyNames(proto).forEach((prop) => {
    let val = proto[prop];
    // discard function
    if (prop === 'constructor' || typeof val === 'function') {
      return;
    } else if (typeof val === 'object') {
      val = toPlainObject(val, shouldInherit)
    }
    jsoned[prop] = val;
  });

  return jsoned;
}

function toPlainJSON(proto) {
  return JSON.stringify(proto);
}

module.exports = {
  toPlainObject: toPlainObject,
  toPlainJSON: toPlainJSON,
};