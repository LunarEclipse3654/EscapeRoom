'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/state.js');
const Model = globalThis.LastSignal.Model;
const FINAL = ['diamond', 'star', 'moon', 'triangle', 'sun', 'circle'];
const BOOKS = ['anchor', 'moon', 'bird', 'lighthouse'];
const ROUTE = ['E', 'N', 'E', 'S', 'E'];

test('loose papers are physical carried objects, not automatic puzzle solutions',()=>{
 const m=new Model();for(const id of Model.LOOSE_PAPERS){assert.deepEqual(m.collect(id).acquired,[id]);assert.equal(m.collect(id).acquired.length,0);assert.equal(m.state.inventory.filter(v=>v===id).length,1);assert.ok(m.state.collected.includes(id));}
 assert.equal(m.state.photoSolved,false);assert.equal(m.state.powered,false);assert.equal(m.collect('drawer').ok,false);assert.equal(m.collect('chronology').ok,false);
 const clone=restored(m.state);assert.deepEqual(clone.state.inventory,m.state.inventory);assert.deepEqual(clone.state.collected,m.state.collected);m.reset();assert.deepEqual(m.state.collected,[]);assert.deepEqual(m.state.inventory,[]);
});
test('paper pickup migrates old inspected sheets while modern seen and carried stay distinct',()=>{
 const old=restored({seen:['photo','weather','beacon'],drawerOpened:true,clockOpened:true});for(const id of ['photo','weather','chronology','starcard','stamp'])assert.ok(old.state.inventory.includes(id));
 const modern=restored({seen:['photo','weather'],collected:['photo','<bad>','photo']});assert.deepEqual(modern.state.collected,['photo']);assert.deepEqual(modern.state.inventory,['photo']);assert.equal(modern.state.photoSolved,false);
});

function memoryStorage(seed) {
  const values = new Map(Object.entries(seed || {}));
  return { getItem(key) { return values.get(key) || null; }, setItem(key, value) { values.set(key, value); } };
}
function restored(state) { return new Model({ storage: memoryStorage({ [Model.SAVE_KEY]: JSON.stringify({ version: 2, state }) }) }); }
function use(model, item, target) {
  assert.equal(model.select(item).ok, true, `select ${item}`);
  assert.equal(model.use(target).ok, true, `use ${item} on ${target}`);
}
function photo(model) {
  for (let i = 0; i < 6; i += 1) {
    const at = model.state.photoOrder.indexOf(i);
    if (at !== i) assert.equal(model.swapPhoto(i, at).ok, true);
  }
}
function powered(model) {
  if (!model.state.cabinetOpened) assert.equal(model.tryCabinet('7364').ok, true);
  if (!model.state.fuseInstalled) use(model, 'fuse', 'power');
  if (model.state.powered) return;
  // Find a solution from the actual partial position, including checkpoint edits.
  const initial = model.state.powerCells.slice();
  for (let mask = 0; mask < 512; mask += 1) {
    const cells = initial.slice();
    for (let i = 0; i < 9; i += 1) {
      if (!(mask & (1 << i))) continue;
      const r = Math.floor(i / 3), c = i % 3;
      for (const j of [i, r ? i - 3 : -1, r < 2 ? i + 3 : -1, c ? i - 1 : -1, c < 2 ? i + 1 : -1]) if (j >= 0) cells[j] = !cells[j];
    }
    if (cells.every((value, i) => value === Model.POWER_TARGET[i])) {
      for (let i = 0; i < 9; i += 1) if (mask & (1 << i)) model.togglePower(i);
      assert.equal(model.checkPower().ok, true); return;
    }
  }
  assert.fail('A reachable partial board must remain solvable.');
}
function finish(model) {
  photo(model); model.tryBooks(BOOKS);
  if (!model.state.drawerOpened) use(model, 'key', 'drawer');
  use(model, 'acetate', 'tide'); model.setOverlayRotation(0); powered(model);
  use(model, 'uv', 'painting'); model.tryClock(4, 35);
  if (!model.state.lensInstalled) use(model, 'lens', 'telescope');
  model.setTelescope(7, 3); model.observeTelescope(); model.setFrequency(1037); model.tuneRadio(); model.setDiscShift(3);
  model.trySafe(ROUTE);
  if (!model.state.pressureSolved) [3, 4, 6, 5].forEach((n, i) => model.setPressure(i, n));
  model.checkPressure();
  if (!model.state.stripAPlaced) use(model, 'stripA', 'lighttable');
  if (!model.state.stripBPlaced) use(model, 'stripB', 'lighttable');
  assert.equal(model.unlockDoor(FINAL).ok, true); assert.equal(model.escape().ok, true);
}

test('complete long chain covers each physical gate and inventory transition', () => {
  const storage = memoryStorage(), model = new Model({ storage });
  assert.deepEqual(model.state.photoOrder, [4, 0, 5, 2, 1, 3]);
  assert.equal(model.tryBooks(['moon', 'anchor', 'bird', 'lighthouse']).ok, false);
  photo(model); assert.equal(model.state.photoSolved, true);
  assert.deepEqual(model.tryBooks(BOOKS).acquired, ['key', 'acetate']);
  assert.deepEqual(model.state.inventory, ['key', 'acetate']);
  assert.equal(model.use('drawer').ok, false); use(model, 'key', 'drawer');
  assert.ok(model.state.seen.includes('chronology') && model.state.inventory.includes('cipher'));
  use(model, 'acetate', 'tide'); model.setOverlayRotation(0); model.tryCabinet('7364');
  use(model, 'uv', 'painting'); assert.equal(model.state.seen.includes('paintingUV'), true);
  [0, 2, 4, 6].forEach(i => model.togglePower(i)); assert.equal(model.checkPower().ok, false);
  use(model, 'fuse', 'power'); assert.equal(model.state.selected, null); assert.equal(model.state.inventory.includes('fuse'), false);
  assert.equal(model.checkPower().ok, true); assert.equal(model.tryClock(4, 35).ok, true);
  assert.ok(model.state.seen.includes('starcard') && model.state.seen.includes('stamp'));
  use(model, 'lens', 'telescope'); model.setTelescope(7, 3); assert.equal(model.observeTelescope().note.id, 'beacon');
  model.setFrequency(1037); assert.equal(model.tuneRadio().note.id, 'radio'); model.setDiscShift(3);
  assert.deepEqual(model.trySafe(ROUTE).acquired, ['stripA', 'relations']);
  [3, 4, 6, 5].forEach((n, i) => model.setPressure(i, n)); assert.deepEqual(model.checkPressure().acquired, ['stripB']);
  use(model, 'stripB', 'lighttable'); assert.equal(model.state.lighttableReady, false); assert.equal(model.state.seen.includes('finale'), false);
  use(model, 'stripA', 'lighttable'); assert.equal(model.state.lighttableReady, true); assert.ok(model.state.seen.includes('finale'));
  assert.equal(model.unlockDoor(FINAL).ok, true); model.tick(27); assert.equal(model.escape().ok, true); model.tick(10);
  assert.equal(model.state.elapsed, 27); assert.equal(new Model({ storage }).state.escaped, true);
});

test('physical prerequisites hold while inferred answers have no seen-clue gates', () => {
  const m = new Model();
  assert.equal(m.tryBooks(Array(4)).ok, false);
  for (const response of [m.escape(), m.unlockDoor(FINAL), m.checkPressure(), m.trySafe(ROUTE)]) assert.equal(response.ok, false);
  m.setFrequency(1037); assert.equal(m.tuneRadio().ok, false); m.setTelescope(7, 3); assert.equal(m.observeTelescope().ok, false);
  assert.equal(m.tryClock(4, 35).ok, true, 'clock is independent of power');
  assert.equal(m.tryBooks(BOOKS).ok, true, 'photograph observation is not a gate');
  assert.equal(m.tryCabinet('7364').ok, true, 'overlay observation is not a gate');
  powered(m); assert.equal(m.observeTelescope().ok, false, 'lens is a physical gate');
  use(m, 'lens', 'telescope'); assert.equal(m.observeTelescope().ok, true);
  assert.equal(m.trySafe(ROUTE).ok, true, 'cipher and chart observations are not gates');
  assert.equal(m.unlockDoor(FINAL).ok, false, 'hydraulic pressure is a gate');
  [3, 4, 6, 5].forEach((n, i) => m.setPressure(i, n)); m.checkPressure();
  assert.equal(m.unlockDoor(FINAL).ok, true, 'assembled strips are clues, not artificial gates');
});

test('incorrect values and malformed controls fail across every puzzle type', () => {
  const m = new Model();
  for (const value of [null, '0', 1.2, -1, 6, NaN]) assert.equal(m.swapPhoto(value, 0).ok, false);
  for (const code of [7364, '7634', '73640', '', null]) assert.equal(m.tryCabinet(code).ok, false);
  for (const i of [null, '0', 0.5, -1, 9]) assert.equal(m.togglePower(i).ok, false);
  for (const n of [-1, 4, 1.5, null, '1']) assert.equal(m.setOverlayRotation(n).ok, false);
  for (const n of [-1, 26, 3.5, null, '3']) assert.equal(m.setDiscShift(n).ok, false);
  for (const args of [[24, 0], [-1, 0], [4, 60], [4, -1], ['4', 35], [4, null], [16, 35], [6, 10]]) assert.equal(m.tryClock(...args).ok, false);
  for (const args of [[0, 3], [7, 10], ['7', 3], [7, 3.5]]) assert.equal(m.setTelescope(...args).ok, false);
  for (const n of [879, 1081, null, '1037', 1037.5, NaN]) assert.equal(m.setFrequency(n).ok, false);
  for (const args of [[4, 1], [0, 0], [0, 7], ['0', 3], [0, '3']]) assert.equal(m.setPressure(...args).ok, false);
  assert.equal(m.select('nonexistent').ok, false); assert.equal(m.select(null).ok, true); assert.equal(m.use('drawer').ok, false);
  assert.equal(m.inspect('<script>').ok, false); assert.equal(m.setScratch([]).ok, false); powered(m);
  assert.equal(m.checkPressure().ok, false); assert.equal(m.trySafe(['N', 'E', 'E', 'S', 'S']).ok, false);
  assert.equal(m.trySafe(ROUTE.concat('N')).ok, false); m.setFrequency(1036); assert.equal(m.tuneRadio().ok, false);
  assert.equal(m.trySafe(Array(5)).ok, false);
  m.tryClock(4, 35); use(m, 'lens', 'telescope'); m.setTelescope(3, 7); assert.equal(m.observeTelescope().ok, false);
  [3, 4, 6, 5].forEach((n, i) => m.setPressure(i, n)); m.checkPressure(); assert.equal(m.unlockDoor(FINAL.slice().reverse()).ok, false);
  assert.equal(m.unlockDoor(Array(6)).ok, false);
});

test('Lights Out toggles self and orthogonal neighbours without row wrapping', () => {
  const m = new Model();
  m.togglePower(2); assert.deepEqual(m.state.powerCells, [false, true, true, false, false, true, false, false, false]);
  m.togglePower(2); assert.deepEqual(m.state.powerCells, Array(9).fill(false));
  m.togglePower(4); assert.deepEqual(m.state.powerCells, [false, true, false, true, true, true, false, true, false]);
  m.togglePower(4); [0, 2, 4, 6].forEach(i => m.togglePower(i)); assert.deepEqual(m.state.powerCells, Model.POWER_TARGET);
  assert.deepEqual(Model.POWER_TARGET, [true, true, true, true, true, false, true, false, false]);
  assert.equal(Object.isFrozen(Model.POWER_TARGET), true);
  m.tryCabinet('7364'); use(m, 'fuse', 'power'); m.checkPower(); assert.equal(m.togglePower(4).ok, false);
});

test('pressure equations have exactly one solution in the legal range', () => {
  const candidates = [];
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) for (let d = 1; d <= 6; d++) {
    if (c === 2 * a && d === b + 1 && a < b && a + b + c + d === 18) candidates.push([a, b, c, d]);
  }
  assert.deepEqual(candidates, [[3, 4, 6, 5]]);
});

test('raw notebook records no generated answers, next steps, or decoded text', () => {
  const m = new Model();
  for (const id of ['photo', 'weather', 'atlas', 'morse', 'chart', 'anyPhysicalTarget']) m.inspect(id);
  finish(m); assert.ok(m.state.notes.length > 10);
  assert.equal(m.state.notes.length, new Set(m.state.notes.map(n => n.id)).size);
  for (const entry of m.state.notes) assert.deepEqual(Object.keys(entry).sort(), ['art', 'id']);
  const serialized = JSON.stringify(m.state.notes);
  for (const decoded of ['1037', '7364', 'NORTH', 'QRUWK', 'triangle', 'diamond', '다음', '확인하세요']) assert.equal(serialized.includes(decoded), false, decoded);
  assert.equal(m.objective(), '비상문은 잠겨 있다.'); assert.equal(typeof m.hint, 'undefined');
  const contaminated = restored({ notes: [{ id: 'radio', text: '1037 NORTH next step' }], seen: ['radio'] });
  assert.deepEqual(contaminated.state.notes, [{ id: 'radio', art: 'radio' }]);
});

test('repeated actions cannot duplicate rewards, raw notes, or consumed tools', () => {
  const m = new Model(); finish(m); const inventory = m.state.inventory.slice(), notes = m.state.notes.slice();
  for (let i = 0; i < 4; i++) {
    m.tryBooks(BOOKS); m.tryCabinet('7364'); m.tryClock(4, 35); m.trySafe(ROUTE); m.checkPressure(); m.checkPower();
    m.use('drawer'); m.use('power'); m.use('telescope'); m.inspect('radio'); m.observeTelescope(); m.tuneRadio(); m.unlockDoor(FINAL); m.escape();
  }
  assert.deepEqual(m.state.inventory, inventory); assert.deepEqual(m.state.notes, notes); assert.equal(new Set(inventory).size, inventory.length);
  for (const id of ['fuse', 'lens', 'stripA', 'stripB']) assert.equal(inventory.includes(id), false);
  for (const id of ['key', 'acetate', 'cipher', 'uv']) assert.equal(inventory.includes(id), true);
});

test('every partial puzzle and chain checkpoint restores exactly and remains completable', () => {
  const storage = memoryStorage(), m = new Model({ storage }), checkpoints = [];
  function capture() { m.save(); checkpoints.push({ state: structuredClone(m.state), data: storage.getItem(Model.SAVE_KEY) }); }
  capture(); m.swapPhoto(0, 1); capture(); photo(m); capture(); m.tryBooks(BOOKS); capture();
  use(m, 'key', 'drawer'); m.setScratch('내가 직접 적은 기록'); capture();
  use(m, 'acetate', 'tide'); m.setOverlayRotation(2); capture(); m.tryCabinet('7364'); capture();
  use(m, 'fuse', 'power'); m.togglePower(8); capture(); powered(m); capture();
  m.tryClock(3, 55); capture(); m.tryClock(4, 35); capture(); use(m, 'lens', 'telescope'); capture();
  m.setTelescope(6, 2); capture(); m.setTelescope(7, 3); m.observeTelescope(); capture();
  m.setFrequency(1037); m.tuneRadio(); m.setDiscShift(3); capture(); m.trySafe(ROUTE); capture();
  m.setPressure(0, 3); m.setPressure(1, 2); capture(); [3, 4, 6, 5].forEach((n, i) => m.setPressure(i, n)); m.checkPressure(); capture();
  use(m, 'stripA', 'lighttable'); capture(); use(m, 'stripB', 'lighttable'); capture(); m.unlockDoor(FINAL); capture(); m.escape(); capture();
  for (let i = 0; i < checkpoints.length; i += 1) {
    const saved = checkpoints[i], resume = new Model({ storage: memoryStorage({ [Model.SAVE_KEY]: saved.data }) });
    assert.equal(resume.restored, true); assert.deepEqual(resume.state, saved.state, `exact checkpoint ${i}`);
    finish(resume); assert.equal(resume.state.escaped, true, `finish checkpoint ${i}`);
  }
});

test('v1 remains untouched; incompatible, malformed, or blocked storage stays playable', () => {
  const legacy = JSON.stringify({ version: 1, state: { escaped: true } });
  const storage = memoryStorage({ 'last-signal:save:v1': legacy });
  const m = new Model({ storage }); assert.equal(m.restored, false); assert.equal(m.state.escaped, false);
  finish(m); assert.equal(storage.getItem('last-signal:save:v1'), legacy);
  for (const raw of ['{', 'null', '[]', JSON.stringify({ version: 1, state: { escaped: true } }), JSON.stringify({ version: 2, state: [] })]) {
    const fresh = new Model({ storage: memoryStorage({ [Model.SAVE_KEY]: raw }) }); assert.equal(fresh.restored, false); finish(fresh);
  }
  const blocked = new Model({ storage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } } });
  finish(blocked); assert.equal(blocked.save(), false);
});

test('damaged saves preserve all earned or placed one-off items', () => {
  const cases = [
    { booksOpened: true, inventory: [] }, { drawerOpened: true, inventory: [] }, { cabinetOpened: true, inventory: [] },
    { cabinetOpened: true, fuseInstalled: true, powered: true, powerCells: ['bad'], safeOpened: true, pressureSolved: true, inventory: [] },
    { clockOpened: true, inventory: [] }, { lensInstalled: true, inventory: [] },
    { safeOpened: true, stripAPlaced: true, pressureSolved: true, stripBPlaced: false, inventory: [] },
    { booksOpened: true, cabinetOpened: true, fuseInstalled: true, powered: true, powerCells: Model.POWER_TARGET, pressureValues: ['3', null, -1, 5], pressureSolved: true, escaped: true, doorUnlocked: true, inventory: ['fuse', 'fuse', '<script>'], seen: ['<script>'], elapsed: -20 }
  ];
  for (const bad of cases) {
    const m = restored(bad); assert.equal(m.state.escaped, false);
    assert.equal(new Set(m.state.inventory).size, m.state.inventory.length);
    assert.ok(m.state.inventory.every(id => ['key', 'acetate', 'cipher', 'uv', 'fuse', 'lens', 'stripA', 'stripB', ...Model.PAPERS].includes(id)));
    if (bad.cabinetOpened && !m.state.fuseInstalled) assert.ok(m.state.inventory.includes('fuse'));
    if (bad.clockOpened && !m.state.lensInstalled) assert.ok(m.state.inventory.includes('lens'));
    if (bad.safeOpened && !m.state.stripAPlaced) assert.ok(m.state.inventory.includes('stripA'));
    if (bad.pressureSolved && !m.state.stripBPlaced) assert.ok(m.state.inventory.includes('stripB'));
    finish(m); assert.equal(m.state.escaped, true);
  }
  const separate = restored({ inventory: ['fuse', 'lens', 'stripA', 'stripB'] });
  assert.deepEqual(separate.state.inventory, ['fuse', 'lens', 'stripA', 'stripB']);
  use(separate, 'fuse', 'power'); use(separate, 'lens', 'telescope'); assert.equal(separate.state.fuseInstalled, true); assert.equal(separate.state.lensInstalled, true);
});

test('timer, scratchpad, selection, subscriptions, and reset work with ordinary saves', () => {
  const storage = memoryStorage(), m = new Model({ storage }); let updates = 0;
  const unsub = m.subscribe(() => updates++); m.tick(0.2); m.tick(0.2); m.tick(0.2); assert.equal(updates, 1);
  m.tick(0.5); assert.equal(updates, 2); const elapsed = m.state.elapsed;
  for (const invalid of [-1, NaN, Infinity, '1']) m.tick(invalid); assert.equal(m.state.elapsed, elapsed);
  m.tryBooks(BOOKS); m.select('key'); m.setScratch('raw\npersonal notes');
  const resume = new Model({ storage }); assert.equal(resume.state.selected, 'key'); assert.equal(resume.state.scratch, 'raw\npersonal notes');
  unsub(); const before = updates; m.tick(2); assert.equal(updates, before);
  m.reset(); assert.equal(m.restored, false); assert.equal(m.state.scratch, ''); assert.deepEqual(m.state.inventory, []);
  assert.deepEqual(new Model({ storage }).state, m.state);
});
