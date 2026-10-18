'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/inventory-layout.js');
const Layout = globalThis.LastSignal.InventoryLayout;
function memory(seed = {}) {
  const values = new Map(Object.entries(seed));
  return { writes: 0, getItem(key) { return values.get(key) || null; }, setItem(key, value) { this.writes++; values.set(key, value); } };
}
function ids(n) { return Array.from({ length: n }, (_, i) => `item${i}`); }
function all(layout) { const s = layout.snapshot(); return s.slots.filter(Boolean).concat(s.overflow); }

test('27 main slots and nine hotbar slots hold exactly one selected item', () => {
  const bag = new Layout(); bag.sync(['key', 'map', 'lens']);
  assert.equal(Layout.MAIN_SIZE, 27); assert.equal(Layout.HOTBAR_SIZE, 9);
  assert.equal(bag.snapshot().slots.length, 36);
  assert.deepEqual(bag.snapshot().slots.slice(0, 27), Array(27).fill(null));
  assert.deepEqual(bag.snapshot().slots.slice(27, 31), ['key', 'map', 'lens', null]);
  assert.equal(bag.held(), 'key'); assert.equal(bag.selectHotbar(1), 'map');
  assert.equal(bag.selectHotbar(8), null); assert.equal(bag.held(), null);
});
test('filled and empty slot swaps preserve ownership and active slot position', () => {
  const bag = new Layout(); bag.sync(['key', 'map', 'lens']); bag.selectHotbar(1);
  bag.move(28, 2); assert.equal(bag.held(), null); assert.equal(bag.find('map'), 2);
  bag.move(27, 28); assert.equal(bag.held(), 'key');
  bag.move(2, 28); assert.equal(bag.held(), 'map'); assert.equal(bag.find('key'), 2);
  assert.equal(bag.snapshot().activeHotbar, 1); assert.deepEqual(all(bag).sort(), ['key', 'lens', 'map']);
});
test('consumption removes selected item without selecting a second item automatically', () => {
  const bag = new Layout(); bag.sync(['key', 'map']); bag.sync(['map']);
  assert.equal(bag.held(), null); assert.equal(bag.find('key'), -1); assert.equal(bag.find('map'), 28);
  bag.sync(['map', 'fuse']); assert.equal(bag.find('fuse'), 27); assert.equal(bag.held(), 'fuse');
});
test('layout and selected empty slot survive reload; sync strips foreign and consumed ids', () => {
  const storage = memory(), key = 'map-a:bag';
  const bag = new Layout({ storage, key }); bag.sync(['key', 'map', 'lens']); bag.move(27, 5); bag.selectHotbar(7);
  const again = new Layout({ storage, key }); assert.equal(again.held(), null);
  again.sync(['key', 'map']);
  assert.equal(again.find('key'), 5); assert.equal(again.find('map'), 28); assert.equal(again.find('lens'), -1);
  assert.equal(again.snapshot().activeHotbar, 7); assert.equal(again.held(), null);
});
test('legacy held item migrates once, while saved active slot wins thereafter', () => {
  const storage = memory(), bag = new Layout({ storage }); bag.sync(['map', 'key'], 'key');
  assert.equal(bag.held(), 'key'); assert.equal(bag.find('key'), 27);
  bag.selectHotbar(8);
  const again = new Layout({ storage }); again.sync(['map', 'key'], 'key');
  assert.equal(again.snapshot().activeHotbar, 8); assert.equal(again.held(), null);
});
test('new acquisitions fill hotbar first, then all 27 main slots without duplicates', () => {
  const bag = new Layout(); bag.sync(ids(36));
  assert.deepEqual(bag.snapshot().slots.slice(27), ids(9));
  assert.deepEqual(bag.snapshot().slots.slice(0, 27), ids(36).slice(9));
  assert.equal(new Set(all(bag)).size, 36); assert.deepEqual(bag.overflow(), []);
});
test('overflow preserves all ownership and refills a slot after an item is consumed', () => {
  const bag = new Layout(); bag.sync(ids(39));
  assert.deepEqual(bag.overflow(), ['item36', 'item37', 'item38']);
  assert.equal(all(bag).length, 39); assert.equal(new Set(all(bag)).size, 39);
  bag.sync(ids(39).filter(x => x !== 'item0'));
  assert.equal(bag.find('item36'), 27); assert.deepEqual(bag.overflow(), ['item37', 'item38']);
  assert.equal(all(bag).length, 38); assert.ok(!all(bag).includes('item0'));
});
test('shift move crosses regions only and a full destination leaves the item in place', () => {
  const bag = new Layout(); bag.sync(['key', 'map']); bag.autoMove(27);
  assert.equal(bag.find('key'), 0); assert.equal(bag.held(), null);
  bag.autoMove(0); assert.equal(bag.find('key'), 27); assert.equal(bag.held(), 'key');
  bag.sync(ids(36)); const before = bag.snapshot(); bag.autoMove(27); assert.deepEqual(bag.snapshot(), before);
});
test('invalid indices, duplicate ids, foreign stored ids and corrupt saves cannot create items', () => {
  const slots = Array(36).fill(null); slots[1] = 'key'; slots[3] = 'key'; slots[27] = 'foreign'; slots[28] = '<bad>';
  const storage = memory({ bag: JSON.stringify({ version: 1, slots, activeHotbar: 99, overflow: ['foreign', 'map', 'map'] }) });
  const bag = new Layout({ storage, key: 'bag' }); bag.sync(['key', 'map', 'key', '', '<bad>', null]);
  assert.equal(bag.find('key'), 1); assert.equal(bag.find('map'), 27); assert.deepEqual(all(bag).sort(), ['key', 'map']);
  const before = bag.snapshot();
  for (const bad of [-1, 36, 1.1, '1', null, NaN]) { bag.move(bad, 0); bag.move(0, bad); bag.autoMove(bad); }
  for (const bad of [-1, 9, 1.1, '1', null, NaN]) bag.selectHotbar(bad);
  assert.deepEqual(bag.snapshot(), before);
  const broken = new Layout({ storage: memory({ bad: '{broken' }), key: 'bad' }); broken.sync(['key']); assert.equal(broken.held(), 'key');
});
test('reset clears active hand and saved layout, and different maps use independent keys', () => {
  const storage = memory(), a = new Layout({ storage, key: 'a' }), b = new Layout({ storage, key: 'b' });
  a.sync(['key']); a.move(27, 8); a.selectHotbar(4); b.sync(['map']); a.reset();
  assert.deepEqual(all(a), []); assert.equal(a.held(), null); assert.equal(a.snapshot().activeHotbar, 0);
  const restored = new Layout({ storage, key: 'a' }); restored.sync(['key']); assert.equal(restored.find('key'), 27);
  const restoredB = new Layout({ storage, key: 'b' }); restoredB.sync(['map']); assert.equal(restoredB.held(), 'map');
});
test('snapshots are detached and repeated reconciliation avoids redundant save writes', () => {
  const storage = memory(), bag = new Layout({ storage }); bag.sync(['key']);
  const writes = storage.writes, copy = bag.snapshot(); copy.slots[27] = 'fake'; copy.overflow.push('fake');
  assert.equal(bag.held(), 'key'); assert.deepEqual(bag.overflow(), []);
  bag.sync(['key']); bag.selectHotbar(0); assert.equal(storage.writes, writes);
});
test('storage denial does not prevent rearranging and using a single held item', () => {
  const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const bag = new Layout({ storage }); bag.sync(['key', 'map']); bag.move(27, 5);
  assert.equal(bag.held(), null); assert.equal(bag.selectHotbar(1), 'map');
});
