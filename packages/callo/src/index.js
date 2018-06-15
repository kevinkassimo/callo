const { Flow } = require('./flow');
const Server = require('./server');
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

module.exports = Callo;
