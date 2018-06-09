class Cache {
  constructor() {
    this.cache = []; // array to allow fast access
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

  getEntryIteratorByName(name) {
    if (!this.entryMap.get(name)) {
      return null; // null for no entry
    }
    return new CalloCacheIterator(this, this.entryMap.get(name));
  }

  getEntryIteratorFromId(id) {
    return new CalloCacheIterator(this, id);
  }

  get(id) {
    if (this.cache.length <= id || id < 0) {
      return null;
    }
    return this.cache[id];
  }
}

class CacheIterator {
  constructor(cache, id) {
    this.cache = cache;
    this.id = id;
  }

  getCurrId() {
    return this.id;
  }

  getNextId() {
    return this.id + 1;
  }

  getCurr() {
    return this.cache.get(this.id);
  }

  getNext() {
    this.id++;
    return this.cache.get(this.id);
  }

  next() {
    this.id++;
  }

  rewindBy(amt) {
    while (amt > 0 && this.cache.get(this.id-1)) {
      amt--;
      this.id--;
    }
  }

  jumpBy(amt) {
    while (amt > 0 && this.cache.get(this.id+1)) {
      amt--;
      this.id++;
    }
  }
}

module.exports = {
  Cache,
  CacheIterator,
};