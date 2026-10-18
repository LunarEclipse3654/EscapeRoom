'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/state.js');
const Model = globalThis.LastSignal.Model;
const POINT = { x: 1.25, z: 2.5, yaw: -0.4 };
function storage() {
  const data = new Map();
  return { getItem: k => data.get(k) || null, setItem: (k, v) => data.set(k, v) };
}
function restored(raw) {
  const saved = storage();
  saved.setItem(Model.SAVE_KEY, JSON.stringify({ version: Model.SAVE_VERSION, state: raw }));
  return new Model({ storage: saved });
}
function ids(m) { return m.state.inventory.concat(m.state.dropped.map(v => v.id)); }

test('each portable tool and paper survives dropping, unrelated changes, save, reload, and pickup', () => {
  const m = restored({ inventory: Model.ITEMS });
  for (const id of Model.ITEMS) {
    assert.equal(m.select(id).ok, true);
    assert.equal(m.dropItem(id, POINT).ok, true, id);
    assert.equal(m.state.selected, null);
    assert.equal(m.state.inventory.includes(id), false);
    assert.equal(m.select(id).ok, false);
    m.setOverlayRotation(2);
    assert.equal(m.state.inventory.includes(id), false, 'reconcile must not respawn a dropped object');
    const resume = new Model({ storage: m.storage });
    assert.deepEqual(resume.state.dropped, m.state.dropped);
    assert.equal(resume.state.inventory.includes(id), false);
    assert.equal(resume.pickupItem(id).ok, true);
    assert.equal(resume.state.inventory.filter(v => v === id).length, 1);
    assert.equal(resume.state.dropped.some(v => v.id === id), false);
    assert.equal(resume.pickupItem(id).ok, false);
  }
  assert.equal(new Set(ids(m)).size, Model.ITEMS.length);
  assert.equal(ids(m).length, Model.ITEMS.length);
});

test('reward reconciliation and collecting an original paper cannot recreate its ground copy', () => {
  const m = restored({ booksOpened: true, drawerOpened: true, cabinetOpened: true, clockOpened: true, collected: ['photo'] });
  const earned = m.state.inventory.slice();
  for (const id of earned) assert.equal(m.dropItem(id, POINT).ok, true);
  assert.deepEqual(m.state.inventory, []);
  m.collect('photo'); m.tryBooks(['anchor', 'moon', 'bird', 'lighthouse']); m.tryCabinet('7364'); m.tryClock(4, 35);
  m.setScratch('notebook state update'); m.setDiscShift(2);
  assert.deepEqual(m.state.inventory, []);
  assert.deepEqual(m.state.dropped.map(v => v.id), earned);
  assert.ok(m.state.collected.includes('photo'), 'source pickup remains recorded while the paper is on the floor');
  assert.deepEqual(new Model({ storage: m.storage }).state.dropped, m.state.dropped);
});

test('only carried owned objects may be dropped and invalid locations leave every item untouched', () => {
  const m = restored({ inventory: ['key'] }); m.select('key');
  const before = structuredClone(m.state);
  for (const point of [null, {}, { x: NaN, z: 1 }, { x: 1, z: Infinity }, { x: 5, z: 0 }, { x: 0, z: -4 }, { x: 0, z: 0, yaw: Infinity }]) {
    assert.equal(m.dropItem('key', point).ok, false);
    assert.deepEqual(m.state, before);
  }
  for (const id of ['lens', 'unknown', null]) assert.equal(m.dropItem(id, POINT).ok, false);
  assert.deepEqual(m.state, before);
  assert.equal(m.dropItem('key', { x: -4.6, z: 7.7 }).ok, true);
  assert.equal(m.state.dropped[0].yaw, 0);
  assert.equal(m.dropItem('key', POINT).ok, false);
});

test('ground pickup is exclusive and returned drop data cannot mutate saved positions', () => {
  const m = restored({ inventory: ['key', 'acetate'] });
  assert.equal(m.pickupItem('key').ok, false);
  const result = m.dropItem('key', POINT);
  result.dropped.x = 500;
  assert.equal(m.state.dropped[0].x, POINT.x);
  assert.equal(m.pickupItem('acetate').ok, false);
  assert.equal(m.pickupItem('key').ok, true);
  assert.equal(ids(m).filter(v => v === 'key').length, 1);
});

test('old saves migrate empty ground state; recovered legacy tools retain ownership after a drop', () => {
  const old = restored({ inventory: ['key', 'lens'], collected: [] });
  assert.deepEqual(old.state.dropped, []);
  assert.equal(old.state.booksOpened, false);
  old.dropItem('key', POINT); old.dropItem('lens', POINT);
  const resumed = new Model({ storage: old.storage });
  assert.deepEqual(resumed.state.inventory, []);
  assert.deepEqual(resumed.state.dropped.map(v => v.id), ['key', 'lens']);
  assert.equal(resumed.pickupItem('key').ok, true);
  assert.equal(resumed.pickupItem('lens').ok, true);
});

test('damaged ground records cannot forge possession, duplicate objects, or lose owned objects at invalid positions', () => {
  const m = restored({ inventory: ['key', 'acetate', 'cipher'], dropped: [
    { id: 'key', ...POINT }, { id: 'key', x: 2, z: 2, yaw: 0 },
    { id: 'acetate', x: null, z: 0, yaw: 0 }, { id: 'cipher', x: 200, z: 0, yaw: 0 },
    { id: 'lens', ...POINT }, { id: '<script>', ...POINT }, null
  ] });
  assert.deepEqual(m.state.dropped, [{ id: 'key', ...POINT }]);
  assert.deepEqual(m.state.inventory.sort(), ['acetate', 'cipher']);
  assert.equal(ids(m).length, 3); assert.equal(new Set(ids(m)).size, 3);
  assert.equal(restored({ owned: ['key'] }).state.inventory.length, 0, 'ownership history alone never issues a new item');
  assert.equal(restored({ dropped: [{ id: 'key', ...POINT }] }).state.dropped.length, 0);
  const recovered = restored({ owned: ['key'], dropped: [{ id: 'key', x: null, z: 0 }] });
  assert.deepEqual(recovered.state.inventory, ['key']);
});

test('placed fuse, lens, and strips take precedence over stale bag or ground records', () => {
  for (const [id, flag] of [['fuse', 'fuseInstalled'], ['lens', 'lensInstalled'], ['stripA', 'stripAPlaced'], ['stripB', 'stripBPlaced']]) {
    const m = restored({ [flag]: true, inventory: [id], owned: [id], dropped: [{ id, ...POINT }] });
    assert.equal(m.state.inventory.includes(id), false, id);
    assert.equal(m.state.dropped.some(v => v.id === id), false, id);
    assert.equal(m.pickupItem(id).ok, false, id);
    assert.equal(m.dropItem(id, POINT).ok, false, id);
    m.setOverlayRotation(3);
    assert.equal(m.state.inventory.includes(id), false, id);
  }
});

test('a dropped part must be picked back up before use; placing it consumes its one physical copy', () => {
  const m = new Model({ storage: storage() }); m.tryCabinet('7364'); m.select('fuse'); m.dropItem('fuse', POINT);
  assert.equal(m.use('power').ok, false);
  assert.equal(m.state.fuseInstalled, false);
  m.pickupItem('fuse'); m.select('fuse'); assert.equal(m.use('power').ok, true);
  assert.equal(m.state.fuseInstalled, true);
  assert.equal(ids(m).includes('fuse'), false);
  assert.equal(new Model({ storage: m.storage }).state.dropped.length, 0);
});

test('reset clears floor objects and acquisition history in memory and on disk', () => {
  const m = restored({ inventory: ['key', 'photo'] }); m.dropItem('key', POINT); m.dropItem('photo', POINT);
  m.reset();
  for (const key of ['inventory', 'dropped', 'owned', 'collected']) assert.deepEqual(m.state[key], []);
  assert.deepEqual(new Model({ storage: m.storage }).state, m.state);
});
