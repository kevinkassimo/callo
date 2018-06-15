const { NamedFlow } = require('./flow');
const { CalloError } = require('./cerror');

/**
 * The Cache of handlers and flows
 * Notice that the internals of Cache is not supposed to be modified directly
 * The cache is not defended towards tampering
 */
class Cache {
  /**
   * Init cache
   * It is actually just an array and a map<string, number> to index
   * @public
   */
  constructor() {
    this.cache = []; // array to allow fast access
    this.entryMap = new Map();
  }

  /**
   * Register a new flow into the cache, under a specific name used for retrieval
   * An ID (in fact index) is created for later access
   * @param {NamedFlow} flow
   * @public
   */
  registerNamedFlow(flow) {
    if (!(flow instanceof NamedFlow)) {
      throw new CalloError(500, 'No name is given to flow, failed to register');
    }
    if (!flow.chain) {
      throw new CalloError(500, 'Registering an empty flow is prohibited');
    }
    // avoid registering same flow twice. We do not support overwriting.
    if (this.entryMap.has(flow.name)) {
      throw new CalloError(500, 'Flow name is already registered');
    }

    this.entryMap.set(flow.name, this.cache.length);
    this.cache = this.cache.concat(flow.chain);
    this.cache.push(null); // null implies termination of a flow
  }

  /**
   * Get the ID of an cached flow by name
   * @param {string} name
   * @returns {number|null}
   * @public
   */
  getEntryIdByName(name) {
    if (!this.entryMap.has(name)) {
      return null; // null for no entry
    }
    return this.entryMap.get(name);
  }

  /**
   * Get iterator of a cached flow by name
   * @param {string} name
   * @returns {CacheIterator|null}
   * @public
   */
  getEntryIteratorByName(name) {
    if (!this.entryMap.has(name)) {
      return null; // null for no entry
    }
    return new CacheIterator(this, this.entryMap.get(name));
  }

  /**
   * Wrap an entry id to create an iterator
   * @param {number} id
   * @returns {CacheIterator}
   * @public
   */
  getEntryIteratorFromId(id) {
    return new CacheIterator(this, id);
  }

  /**
   * Get the corresponding handler at ID
   * @param {number} id
   * @returns {function|null}
   * @public
   */
  get(id) {
    if (this.cache.length <= id || id < 0) {
      return null;
    }
    return this.cache[id];
  }
}

/**
 * (fake) Iterator for easier access of handlers of a cached flow
 */
class CacheIterator {
  /**
   * Create an iterator
   * @param {Cache} cache
   * @param {number} id
   * @public
   */
  constructor(cache, id) {
    if (typeof id !== 'number' || id < 0) {
      throw new CalloError(500, 'Cannot create iterator with invalid start id');
    }
    if (!(cache instanceof Cache)) {
      throw new CalloError(500, 'Iterator must be attached to a valid cache');
    }
    this.cache = cache;
    this.id = id;
  }

  /**
   * Get current ID
   * @returns {number|*}
   * @public
   */
  getCurrId() {
    return this.id;
  }

  /**
   * Get current handler
   * @returns {function}
   * @public
   */
  getCurr() {
    return this.cache.get(this.id);
  }

  /**
   * Move to next handler.
   * Would only move if the current iterator is not null
   * The next handler could be null (signifying end of flow)
   * @public
   */
  next() {
    if (this.cache.get(this.id) !== null) {
      this.id++;
    }
  }

  /**
   * Rewind to a previous handler by amount (or reach to the beginning instead)
   * @param {number} amt
   * @public
   */
  rewindBy(amt) {
    while (amt > 0 && this.cache.get(this.id-1)) {
      amt--;
      this.id--;
    }
  }

  /**
   * Jump to a future handler by amount (or to the last handler of flow)
   * @param {number} amt
   * @public
   */
  jumpBy(amt) {
    if (this.cache.get(this.id) === null) {
      // avoid accessing next registered flow!
      return;
    }
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
