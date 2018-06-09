const { NamedFlow } = require('./cache');

class Cache {
  constructor() {
    this.cache = [];
    this.entryMap = new Map();
  }

  registerNamedFlow(flow) {
    if (!(flow instanceof NamedFlow)) {
      throw new Error('No name is given to flow, failed to register');
    }
    if (!flow.chain) {
      throw new Error('Registering an empty flow is prohibited');
    }

    if (this.entryMap.has(flow.name)) {
      throw new Error('This named flow is already registered');
    }

    this.entryMap.set(flow.name, this.cache.length);
    this.cache.concat(flow.chain);
    this.cache.push(null); // null implies termination
  }

  getEntryIdByName(name) {
    if (!this.entryMap.get(name)) {
      return null; // null for no entry
    }
    return this.entryMap.get(name);
  }

  getNextHandler(id) {
    return this.cache[id+1];
  }
}