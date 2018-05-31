const jsonfy = require('../../index')._jsonfy;

it('stringify a normal object correctly', () => {
  const obj = {
    a: 1,
    b: 'string',
    c: true,
    'd-prop': null,
  };
  const parsedObj = JSON.parse(jsonfy.toPlainJSON(obj));
  expect(parsedObj.a).toEqual(1);
  expect(parsedObj.b).toEqual('string');
  expect(parsedObj.c).toEqual(true);
  expect(parsedObj['d-prop']).toEqual(null);
});

it('stringify a nested object correctly', () => {
  const obj = {
    o: {
      o: {
        n: 1,
      },
      s: 's',
    }
  };
  const parsedObj = JSON.parse(jsonfy.toPlainJSON(obj));
  expect(parsedObj.o.o.n).toEqual(1);
  expect(parsedObj.o.s).toEqual('s');
});

it('stringify a class correctly', () => {
  class TestClass {
    constructor(n, s) {
      this.n = n;
      this.s = s;
    }
    method() {
      return 'should not present'
    }
  }

  const cls = new TestClass(1, 's');
  const parsedObj = JSON.parse(jsonfy.toPlainJSON(cls));
  expect(parsedObj.n).toEqual(1);
  expect(parsedObj.s).toEqual('s');
  expect(parsedObj.method).toEqual(undefined);
});
