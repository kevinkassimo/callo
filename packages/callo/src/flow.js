const { CalloError } = require('./cerror');

/**
 * Flow, the basic structure for a series of handlers
 */
class Flow {
  /**
   * Create a new Flow
   * @param {Array<function>} defaultChain
   * @returns {Flow}
   * @public
   */
  constructor(defaultChain = []) {
    for (let fn of defaultChain) {
      if (typeof fn !== 'function') {
        throw new CalloError(500, 'Flow(...): chain elements should all be functions');
      }
    }
    this.chain = defaultChain.slice();
  }

  /**
   * Prepend a function/flow to this flow
   * @param {function|Flow} fn
   * @returns {Flow} self
   * @public
   */
  pre(fn) {
    if (fn instanceof Flow && Array.isArray(fn.chain)) {
      this.chain = fn.chain.slice().concat(this.chain);
    } else if (typeof fn === 'function') {
      this.chain.unshift(fn);
    } else {
      throw new CalloError(500, 'use(...) should have a function or flow as handler');
    }
    return this;
  }

  /**
   * Append a function/flow to this flow
   * @param {function|Flow} fn
   * @returns {Flow}
   * @public
   */
  use(fn) {
    if (fn instanceof Flow && Array.isArray(fn.chain)) {
      this.chain = this.chain.concat(fn.chain);
    } else if (typeof fn === 'function') {
      this.chain.push(fn);
    } else {
      throw new Callorror(500, 'use(...) should have a function or flow as handler');
    }
    return this;
  }

  /**
   * Create a copy of the current flow
   * @returns {Flow} copy
   * @public
   */
  clone() {
    return new Flow(this.chain.slice());
  }
}

/**
 * Flow with Name, used for named handler registration
 */
class NamedFlow extends Flow {
  /**
   * Create a new NamedFlow
   * @param {string} name
   * @param {Array<function>} defaultChain
   * @public
   */
  constructor(name, defaultChain = []) {
    super(defaultChain);
    this.name = name;
  }
}

module.exports = {
  Flow,
  NamedFlow,
};
