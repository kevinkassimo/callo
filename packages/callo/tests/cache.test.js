const { Cache } = require('../dist/cache');
const { Flow, NamedFlow } = require('../dist/flow');

describe('test cache', () => {
  let f0 = () => console.log('f0');
  let f1 = () => console.log('f1');
  let f2 = () => console.log('f2');

  let f_arr = [f0, f1, f2];

  let g0 = () => console.log('g0');
  let g1 = () => console.log('g1');
  let g2 = () => console.log('g2');

  let g_arr = [g0, g1, g2];

  test('add new flow', () => {
    let cache = new Cache();
    expect(() => {
      let f = new Flow([f0, f1, f2]);
      cache.registerNamedFlow(f);
    }).toThrow();
    let nf = new NamedFlow('flow-0', [f0, f1, f2]);
    cache.registerNamedFlow(nf);
    expect(cache.entryMap.has('flow-0')).toBeTruthy();
    expect(cache.entryMap.size).toBe(1);
  });

  test('access iterator', () => {
    let cache = new Cache();
    let nf_f = new NamedFlow('flow-f', [f0, f1, f2]);
    let nf_g = new NamedFlow('flow-g', [g0, g1, g2]);

    cache.registerNamedFlow(nf_f);
    cache.registerNamedFlow(nf_g);

    expect(cache.getEntryIteratorByName('flow-not-exists')).toBe(null);
    let iter_f = cache.getEntryIteratorByName('flow-f');
    let iter_g = cache.getEntryIteratorByName('flow-g');

    let i = 0;
    while (iter_f.getCurr()) {
      expect(iter_f.getCurr()).toBe(f_arr[i]);
      iter_f.next();
      i++;
    }
    iter_f.jumpBy(10);
    expect(iter_f.getCurr()).toBe(null);
    iter_f.rewindBy(1);
    expect(iter_f.getCurr()).toBe(f2);
    iter_f.rewindBy(3);
    expect(iter_f.getCurr()).toBe(f0);

    iter_g.rewindBy(2);
    expect(iter_g.getCurr()).toBe(g0);
  });
});