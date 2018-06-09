/*
 * TODO:
 * Have a clearer idea about how the nodes should be concatenated
 * The most troubling problem is cloning a flow
 * Since we support branching, we must clone the nodes in a nice way to avoid problems
 * especially with each branch!
 *
 * A possible implementation is to implement a doubly linked list
 */

class FlowNode {
  constructor(fn, next, prevArr) { // mapper is of type Map
    this.handler = fn;
    this.prevNodes = prevArr;

    if (next instanceof FlowNode) {
      // means this is a normal flow
      this.nextNode = next;
      this.nextMap = null;
    } else {
      this.nextNode = null; // no default next handler
      this.nextMap = next ? new Map(next) : null;
    }
  }

  clone() {
    if (this.nextNode) {
      return new FlowNode(this.handler, this.nextNode);
    }
    return new FlowNode(this.handler, new Map(this.nextMap));
  }

  getNext(nextChecker) {
    if (this.nextNode) {
      return this.nextNode;
    } else if (this.nextMap.has(nextChecker)) {
      return this.nextMap.get(nextChecker);
    }

    return null; // assume termination
  }
}


class FlowOld {
  constructor(req) {
    // TODO: config?

    this.req = req || null;

    this.chain = []; // chain of FlowNodes

    this._startNode = null;
    this._endNodes = [];
  }

  clone() {
    // TODO: create a clone of this FlowOld, need to clone each Node
  }

  setReq(req) {
    this.req = req;
  }

  concatFlow(otherFlow) {
    if (otherFlow.chain) {
      for (const fn of otherFlow) {
        this.chain.push(fn);
      }
    }
  }

  use(fn) {
    if (typeof fn === 'function') {
      const newNode = new FlowNode(fn, null, []); // prevArr not yet defined

      if (!this._startNode) {
        this._startNode = newNode; // no prev node
      }

      for (const pn of this._endNodes) {
        pn.defaultNext = newNode;
      }

      this._endNodes = [newNode];
      this.chain.push(newNode);
    } else if (fn instanceof FlowOld) { // we allow two flows to concatenate
      this.concatFlow(fn);
    }

    return this;
  }

  branch(...args) {
    if (args.length === 0) {
      throw new Error('No handlers are given for branching');
    }
    if (typeof args[0] === 'object') {

    }

    if (typeof args[0] === 'function' && args[1]) {

    }

    return this;
  }
}



module.exports = {};