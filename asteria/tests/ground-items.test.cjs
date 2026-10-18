'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/state.js');
const Model = globalThis.LastSignal.Model;
const POINT = { x: 9.2, z: 10.4, yaw: 2.2 };
function storage() {
  const data = new Map();
  return { getItem: k => data.get(k) || null, setItem: (k, v) => data.set(k, v) };
}
function restored(raw) {
  const saved = storage();
  saved.setItem(Model.SAVE_KEY, JSON.stringify({ version: Model.VERSION, state: raw }));
  return new Model({ storage: saved });
}
function carried(m) { return m.inventory().map(v => v.id); }

test('all four collected papers can be dropped, saved, restored, and picked up once', () => {
  let m = restored({ skySolved: true });
  for (const id of Model.PORTABLE) {
    assert.equal(m.collect(id).ok, true);
    assert.equal(m.dropItem(id, POINT).ok, true);
    assert.equal(carried(m).includes(id), false);
    assert.ok(m.state.collected.includes(id));
    m.setAim(40, 25); m.setScratch('an unrelated state change');
    assert.equal(carried(m).includes(id), false);
    m = new Model({ storage: m.storage });
    assert.ok(m.state.dropped.some(v => v.id === id));
    assert.equal(m.pickupItem(id).ok, true);
    assert.equal(carried(m).filter(v => v === id).length, 1);
    assert.equal(m.pickupItem(id).ok, false);
  }
  assert.deepEqual(carried(m), Model.PORTABLE);
  assert.deepEqual(m.state.dropped, []);
});

test('inventory optionally exposes ground object metadata without changing physical ownership', () => {
  const m = restored({ collected: ['map', 'journal'] });
  m.dropItem('map', POINT);
  assert.deepEqual(carried(m), ['journal']);
  assert.deepEqual(m.inventory(true).map(v => v.id), ['map', 'journal']);
  assert.equal(m.inventory(true)[0].name, '찢어진 성도 조각');
  const before = structuredClone(m.state);
  m.inventory(true)[0].name = 'outside mutation';
  assert.deepEqual(m.state, before);
  assert.equal(m.state.mapSolved, false);
});

test('original paper collection and puzzle updates cannot duplicate a dropped object', () => {
  const m = new Model({ storage: storage() }); m.collect('map'); m.dropItem('map', POINT);
  assert.equal(m.collect('map').alreadyOwned, true);
  m.swapMap(0, 1); m.tryClock(3, 49); m.observe();
  assert.deepEqual(carried(m), []);
  assert.deepEqual(m.state.collected, ['map']);
  assert.deepEqual(m.state.dropped, [{ id: 'map', ...POINT }]);
  assert.deepEqual(new Model({ storage: m.storage }).state.dropped, m.state.dropped);
});

test('drop and pickup require a real carried or ground object; invalid positions do not change state', () => {
  const m = restored({ collected: ['journal'] });
  const before = structuredClone(m.state);
  for (const point of [null, {}, { x: NaN, z: 1 }, { x: 0, z: Infinity }, { x: -5, z: 0 }, { x: 0, z: 18 }, { x: 0, z: 0, yaw: NaN }]) {
    assert.equal(m.dropItem('journal', point).ok, false);
    assert.deepEqual(m.state, before);
  }
  for (const id of ['map', 'blueprint', 'unknown', null]) assert.equal(m.dropItem(id, POINT).ok, false);
  assert.equal(m.pickupItem('journal').ok, false);
  assert.equal(m.dropItem('journal', { x: 12.7, z: 17 }).ok, true);
  assert.equal(m.state.dropped[0].yaw, 0);
  assert.equal(m.dropItem('journal', POINT).ok, false);
  assert.equal(m.pickupItem('journal').ok, true);
  assert.equal(m.pickupItem('journal').ok, false);
});

test('damaged saves reject forged or duplicated floor objects and restore invalid locations to the bag', () => {
  const m = restored({ collected: ['map', 'journal', 'decoder'], dropped: [
    { id: 'map', ...POINT }, { id: 'map', x: 1, z: 1, yaw: 0 },
    { id: 'journal', x: null, z: 1 }, { id: 'decoder', x: 50, z: 1 },
    { id: 'blueprint', ...POINT }, { id: '<bad>', ...POINT }, null
  ] });
  assert.deepEqual(m.state.dropped, [{ id: 'map', ...POINT }]);
  assert.deepEqual(carried(m), ['journal', 'decoder']);
  assert.equal(m.inventory(true).length, 3);
  assert.equal(restored({ dropped: [{ id: 'map', ...POINT }] }).state.dropped.length, 0);
  assert.equal(restored({ owned: ['map'], dropped: [{ id: 'map', ...POINT }] }).state.dropped.length, 0);
  assert.equal(restored({ collected: ['blueprint'], dropped: [{ id: 'blueprint', ...POINT }] }).state.dropped.length, 0);
});

test('old possession saves get empty floor state and reset clears persistent ground objects', () => {
  const m = restored({ seen: ['map', 'journal'] });
  assert.deepEqual(m.state.dropped, []);
  assert.deepEqual(carried(m), ['map', 'journal']);
  m.dropItem('map', POINT); m.reset();
  assert.deepEqual(m.state.dropped, []); assert.deepEqual(m.state.owned, []); assert.deepEqual(carried(m), []);
  assert.deepEqual(new Model({ storage: m.storage }).state, m.state);
});

test('drop results do not share mutable position objects with state', () => {
  const m = restored({ collected: ['map'] });
  const point = { ...POINT }, result = m.dropItem('map', point);
  point.x = 100; result.dropped.x = 200;
  assert.equal(m.state.dropped[0].x, POINT.x);
});
