const { Flow } = require('./flow');
const Server = require('./server');

function Callo(opt) {
  return new Server(opt);
}

Callo.server = Server;
Callo.flow = Flow;

module.exports = Callo;
