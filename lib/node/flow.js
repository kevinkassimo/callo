class Flow {
  constructor(defaultChain = []) {
    this.chain = defaultChain.slice();
  }

  concatFlow(otherFlow) {
    if (otherFlow.chain) {
      this.chain.concat(otherFlow);
    }
  }

  use(fn) {
    if (fn instanceof Flow) {
      this.concatFlow(fn);
    } else if (typeof fn === 'function') {
      this.chain.push(fn);
    } else {
      throw new Error('use(...) should have a function or flow as handler');
    }
  }

  clone() {
    return new Flow(this.chain);
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