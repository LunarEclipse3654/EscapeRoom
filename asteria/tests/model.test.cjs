'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/state.js');
require('../js/content.js');
const { Model, Art } = globalThis.LastSignal;

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return { getItem(key) { return values.get(key) || null; }, setItem(key, value) { values.set(key, value); } };
}
function model(raw) {
  const storage = memoryStorage(raw ? { [Model.SAVE_KEY]: JSON.stringify({ version: 1, state: raw }) } : {});
  return new Model({ storage });
}
function solveMap(m) {
  for (let i = 0; i < 4; i++) { const at = m.state.mapOrder.indexOf(i); if (at !== i) m.swapMap(i, at); }
}
function observeAll(m) {
  Model.STARS.forEach(s => { assert.equal(m.setAim(s.azimuth, s.altitude).ok, true); assert.equal(m.observe().observation.symbol, s.symbol); });
}
function openSky(m) {
  Model.SKY_ORDER.forEach(v => assert.equal(m.pushSky(v).ok, true));
  assert.equal(m.checkSky().ok, true);
}
function finish(m) {
  solveMap(m); observeAll(m); m.tryClock(3, 49); m.handleStar(5); m.clearSky(); openSky(m); m.readLab(); assert.equal(m.escape().ok, true);
}

test('complete supplied five-puzzle chain opens real physical gates', () => {
  const m = model();
  assert.deepEqual(m.state.mapOrder, [2, 0, 3, 1]);
  assert.equal(m.handleStar(5).ok, false);
  assert.equal(m.pushSky(3).ok, false);
  assert.equal(m.readLab().ok, false);
  assert.equal(m.escape().ok, false);
  solveMap(m); assert.equal(m.state.mapSolved, true);
  observeAll(m);
  assert.deepEqual(m.state.observations.map(v => v.symbol), ['☾', '△', '◇', '✶']);
  assert.equal(m.tryClock(3, 49).ok, true);
  assert.equal(m.state.mirrorAligned, true);
  assert.equal(m.handleStar(9).ok, false);
  assert.equal(m.state.mirrorSolved, false);
  assert.equal(m.handleStar(5).ok, true);
  assert.equal(m.state.mirrorSolved, true);
  openSky(m);
  assert.equal(m.escape().ok, false);
  assert.equal(m.readLab().ok, true);
  assert.equal(m.escape().ok, true);
});

test('clock arithmetic derives 03:49 from raw symbol key and daily wrap', () => {
  const m = model();
  const key = { '☾': 2, '△': 7, '◇': 4, '✶': 9 };
  const symbols = Model.STARS.map(v => v.symbol);
  const digits = symbols.map(v => key[v]).join('');
  const h = Number(digits.slice(0, 2)) % 24, minute = Number(digits.slice(2));
  assert.deepEqual([h, minute], [3, 49]);
  assert.equal(m.tryClock(27, 49).ok, false);
  assert.equal(m.tryClock(2, 49).ok, false);
  assert.equal(m.state.clockSolved, false);
  assert.equal(m.tryClock(h, minute).ok, true);
  assert.deepEqual(m.state.seen, ['clock'], 'Knowledge can be used without artificial inspection flags.');
});

test('telescope changes live view, stores raw observations once, accepts any visit order', () => {
  const m = model();
  for (const i of [3, 1, 0, 2]) {
    const star = Model.STARS[i];
    m.setAim(star.azimuth, star.altitude);
    assert.equal(m.currentView().symbol, star.symbol);
    assert.equal(m.observe().observation.name, star.name);
    m.observe();
  }
  assert.equal(m.state.observations.length, 4);
  assert.deepEqual(m.state.observations.map(v => v.id), ['orion', 'lyra', 'cygnus', 'aquila']);
  m.setAim(110, 44); assert.equal(m.currentView(), null); assert.equal(m.observe().ok, false);
  assert.equal(m.setAim(-1, 0).ok, false); assert.equal(m.setAim(360, 0).ok, false); assert.equal(m.setAim(0, 91).ok, false);
  assert.deepEqual([m.state.azimuth, m.state.altitude], [110, 44]);
});

test('only the first beam endpoint opens the bookshelf; the fourth beam endpoint is a decoy', () => {
  const m = model(); m.tryClock(3, 49);
  assert.equal(Model.MIRROR_TARGET, 5);
  for (let i = 0; i < 6; i++) if (i !== 5) assert.equal(m.handleStar(i).ok, false);
  assert.equal(m.handleStar('lower-east').ok, true);
});

test('half-turn maps original clockwise constellation order to bottom-right, bottom-left, top-left, top-right', () => {
  const original = [0, 1, 3, 2];
  const afterHalfTurn = original.map(v => 3 - v);
  assert.deepEqual(afterHalfTurn, [3, 2, 0, 1]);
  assert.deepEqual(Art.skyGrid, ['aquila', 'orion', 'lyra', 'cygnus']);
  const m = model(); m.tryClock(3, 49); m.handleStar(5);
  original.forEach(v => m.pushSky(v)); assert.equal(m.checkSky().ok, false);
  assert.deepEqual(m.state.skyInput, []);
  afterHalfTurn.forEach(v => m.pushSky(v)); assert.equal(m.pushSky(1).ok, false);
  assert.equal(m.checkSky().ok, true);
});

test('reload preserves every checkpoint and the complete run remains finishable', () => {
  const storage = memoryStorage(); let m = new Model({ storage });
  const reload = () => { m.save(); const before = JSON.parse(JSON.stringify(m.state)); m = new Model({ storage }); assert.deepEqual(m.state, before); };
  m.swapMap(0, 3); reload(); solveMap(m); reload();
  m.setAim(40, 25); m.observe(); reload(); observeAll(m); reload();
  m.tryClock(3, 49); reload(); m.handleStar(5); reload();
  m.pushSky(3); m.pushSky(2); reload(); m.pushSky(0); m.pushSky(1); m.checkSky(); reload();
  m.readLab(); reload(); m.escape(); reload(); assert.equal(m.state.escaped, true);
});

test('damaged saves sanitize fields without removing a previously opened physical gate', () => {
  for (const flag of ['clockSolved', 'mirrorSolved', 'skySolved', 'labRead', 'escaped']) {
    const m = model({ [flag]: true, mapOrder: [0, 0, 0, 0], azimuth: Infinity, clockHour: 'bad', mirrorTurns: ['bad'], observations: [{ id: 'cygnus', symbol: '<script>', name: 'fake' }], skyInput: [4], elapsed: -100 });
    assert.equal(m.state[flag], true);
    assert.equal(m.state.clockSolved, true);
    assert.deepEqual([m.state.clockHour, m.state.clockMinute], [3, 49]);
    assert.deepEqual(m.state.observations, [Model.STARS[0]]);
    assert.equal(m.state.elapsed, 0);
    finish(m);
  }
  for (const raw of ['{', 'null', '[]', '{"version":99,"state":{"escaped":true}}']) {
    const m = new Model({ storage: memoryStorage({ [Model.SAVE_KEY]: raw }) });
    assert.equal(m.state.escaped, false); finish(m);
  }
});

test('progress notifications, notes, reset, elapsed time and unavailable storage are resilient', () => {
  const m = model(); let changes = 0;
  const unsubscribe = m.subscribe(() => changes++); m.inspect('journal'); m.setScratch('메모');
  assert.equal(changes, 2); unsubscribe(); m.inspect('decoder'); assert.equal(changes, 2);
  m.tick(3.5); m.tick(-1); m.tick(NaN); assert.equal(m.state.elapsed, 3.5);
  m.reset(); assert.deepEqual(m.state, Model.initialState());
  const denied = new Model({ storage: { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } } });
  assert.equal(denied.storageError, true); finish(denied); assert.equal(denied.state.escaped, true);
});

test('all raw evidence is self-contained SVG and never prints the final clock or sky sequence', () => {
  for (const id of Object.keys(Art.names)) {
    const svg = Art.svg(id);
    assert.match(svg, /^<svg/); assert.match(svg, /viewBox="0 0 900 600"/);
    assert.doesNotMatch(svg, /(?:href|src)="https?:/);
    assert.match(Art.url(id), /^data:image\/svg\+xml/);
  }
  assert.doesNotMatch(Art.svg('decoder'), /03:49|3시간 49|정답/);
  assert.match(Art.svg('decoder'), /24h/);
  assert.match(Art.svg('journal'), /네 번째 빛을 좇지 마라/);
  assert.match(Art.svg('map'), /새벽의 눈부터 따라가라/);
  assert.match(Art.svg('sky'), /rotate\(180 450 300\)/);
  assert.doesNotMatch(Art.svg('telescope'), /scale\(2\.03125\)/);
  assert.match(Art.svg('telescope', { symbol: '☾' }), /scale\(2\.03125\)/);
});

test('paper collection is separate from inspection and map completion, durable, and resettable', () => {
  const storage = memoryStorage(); let m = new Model({ storage });
  assert.deepEqual(m.inventory(), []);
  m.inspect('map'); assert.deepEqual(m.inventory(), [], 'Seeing a paper is not possession.');
  m.inspect('journal'); m.inspect('decoder');
  assert.deepEqual(m.inventory(), []);
  assert.equal(m.collect('clock').ok, false);
  assert.equal(m.collect('map').ok, true);
  assert.equal(m.state.mapSolved, false);
  assert.deepEqual(m.inventory().map(v => v.id), ['map'], 'Unsolved pieces can be carried.');
  assert.equal(m.inventory()[0].name, '찢어진 성도 조각');
  assert.equal(m.collect('map').alreadyOwned, true);
  m.collect('journal'); m.collect('decoder');
  solveMap(m);
  assert.deepEqual(m.inventory().map(v => v.id), ['map', 'journal', 'decoder']);
  assert.ok(m.inventory().every(v => v.kind === '자료' && v.name && v.description));
  const before = JSON.parse(JSON.stringify(m.state));
  m.inventory()[0].name = 'changed outside';
  assert.deepEqual(m.state, before, 'Inspecting bag metadata has no effect on puzzle values.');
  m.save(); m = new Model({ storage });
  assert.deepEqual(m.inventory().map(v => v.id), ['map', 'journal', 'decoder']);
  assert.equal(m.state.clockSolved, false); assert.deepEqual(m.state.observations, []);
  m.reset(); assert.deepEqual(m.inventory(), []);
});

test('v1 saves migrate old observed papers but retain explicit new possession and whitelist collected ids', () => {
  const old = model({ seen: ['map', 'journal', 'decoder', 'clock'] });
  assert.deepEqual(old.state.collected, ['map', 'journal', 'decoder']);
  assert.deepEqual(old.inventory().map(v => v.id), ['map', 'journal', 'decoder']);
  assert.equal(old.state.mapSolved, false);
  const solvedOld = model({ mapSolved: true });
  assert.deepEqual(solvedOld.state.collected, ['map']);
  const fresh = model({ seen: ['map', 'journal'], collected: ['decoder', 'decoder', 'clock', '<bad>', null] });
  assert.deepEqual(fresh.state.collected, ['decoder']);
  assert.deepEqual(fresh.inventory().map(v => v.id), ['decoder']);
  assert.ok(fresh.state.seen.includes('decoder'));
});

test('lab blueprint must be physically reachable and collecting it never plays the last record', () => {
  const m = model();
  assert.equal(m.collect('blueprint').ok, false);
  m.tryClock(3, 49); m.handleStar(5); openSky(m);
  assert.equal(m.collect('blueprint').ok, true);
  assert.deepEqual(m.inventory().map(v => v.id), ['blueprint']);
  assert.equal(m.state.labRead, false);
  assert.equal(m.escape().ok, false);
  const restored = model(m.state);
  assert.deepEqual(restored.state.collected, ['blueprint']);
  assert.equal(restored.state.labRead, false);
  assert.equal(restored.readLab().ok, true);
  assert.equal(restored.escape().ok, true);
  const old = model({ skySolved: true, seen: ['blueprint'] });
  assert.deepEqual(old.state.collected, ['blueprint']);
  assert.deepEqual(model({ collected: ['blueprint'] }).inventory(), []);
});
