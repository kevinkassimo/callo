const { Flow } = require('./flow');
const Server = require('./server');
const CalloError = require('./cerror');
require('babel-polyfill');

function Callo(opt) {
  return new Server(opt);
}

Callo.server = (opt) => {
  return new Server(opt);
};
Callo.flow = (defaultChain) => {
  return new Flow(defaultChain);
};
Callo.error = (...args) => {
  return new CalloError(...args);
};

module.exports = Callo;
