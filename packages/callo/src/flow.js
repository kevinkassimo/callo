class Flow {
  constructor(defaultChain = []) {
    if (!(this instanceof Flow)) return new Flow(defaultChain);
    this.chain = defaultChain.slice();
  }

  use(fn) {
    if (fn instanceof Flow) {
      if (Array.isArray(fn.chain)) {
        this.chain.concat(otherFlow);
      } else if (typeof fn === 'function') {
        this.chain.push(fn);
      } else {
        throw new Error('use(...) should have a function or flow as handler');
      }
    }
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
