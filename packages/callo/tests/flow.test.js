const { Flow, NamedFlow } = require('../dist/flow');

describe('test flow', () => {
  let f0 = () => console.log('f0');
  let f1 = () => console.log('f1');
  let f2 = () => console.log('f2');
  let f3 = () => console.log('f3');

  let g0 = () => console.log('g0');
  let g1 = () => console.log('g1');
  let g2 = () => console.log('g2');
  let g3 = () => console.log('g3');

  test('create flow', () => {
    let f = new Flow([f1, f2, f3]);
    expect(f.chain).toBeTruthy();
    expect(f.chain.length).toBe(3);
  });

  test('create named flow', () => {
    let f = new NamedFlow('named', [f1, f2, f3]);
    expect(f.name).toBe('named');
    expect(f.chain).toBeTruthy();
    expect(f.chain.length).toBe(3);
  });

  test('flow use function', () => {
    let f = new Flow([f0, f1]);
    f.use(f2);
    expect(f.chain.length).toBe(3);
    expect(f.chain[0]).toBe(f0);
    expect(f.chain[1]).toBe(f1);
    expect(f.chain[2]).toBe(f2);
  });

  test('flow use another flow', () => {
    let f = new Flow([f0, f1]);
    let g = new Flow([g0, g1]);
    f.use(g);
    expect(f.chain.length).toBe(4);
    expect(f.chain[0]).toBe(f0);
    expect(f.chain[3]).toBe(g1);
    expect(g.chain.length).toBe(2);

    g.use(f);
    expect(f.chain.length).toBe(4);
    expect(g.chain.length).toBe(6);
    expect(g.chain[5]).toBe(g1);
  });

  test('flow pre function', () => {
    let f = new Flow([f1, f2]);
    f.pre(f0);
    expect(f.chain.length).toBe(3);
    expect(f.chain[0]).toBe(f0);
    expect(f.chain[1]).toBe(f1);
    expect(f.chain[2]).toBe(f2);
  });

  test('flow prepend another flow', () => {
    let f = new Flow([f0, f1]);
    let g = new Flow([g0, g1]);
    f.pre(g);
    expect(f.chain.length).toBe(4);
    expect(f.chain[0]).toBe(g0);
    expect(f.chain[3]).toBe(f1);
    expect(g.chain.length).toBe(2);
  });
});