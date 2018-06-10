class Flow {
  constructor(defaultChain = []) {
    if (!(this instanceof Flow)) return new Flow(defaultChain);
    this.chain = defaultChain.slice();
  }

  pre(fn) {
    if (fn instanceof Flow && Array.isArray(fn.chain)) {
      this.chain = fn.chain.slice().concat(this.chain);
    } else if (typeof fn === 'function') {
      this.chain.unshift(fn);
    } else {
      throw new Error('use(...) should have a function or flow as handler');
    }
  }

  use(fn) {
    if (fn instanceof Flow && Array.isArray(fn.chain)) {
      this.chain = this.chain.concat(fn.chain);
    } else if (typeof fn === 'function') {
      this.chain.push(fn);
    } else {
      throw new Error('use(...) should have a function or flow as handler');
    }
    return this;
  }

  clone() {
    return new Flow(this.chain.slice());
  }
}

class NamedFlow extends Flow {
  constructor(name) {
    super();
    this.name = name;
  }
}

module.exports = {
  Flow,
  NamedFlow,
};
