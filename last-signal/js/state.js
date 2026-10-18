(function (global) {
  'use strict';
  var VERSION = 2;
  var SAVE_KEY = 'last-signal:save:v2';
  var PHOTO_INITIAL = [4, 0, 5, 2, 1, 3];
  var LOOSE_PAPERS = ['photo', 'tide', 'weather', 'atlas', 'morse', 'chart'];
  var PAPERS = LOOSE_PAPERS.concat(['chronology', 'starcard', 'stamp', 'relations']);
  var ITEMS = ['key', 'acetate', 'cipher', 'uv', 'fuse', 'lens', 'stripA', 'stripB'].concat(PAPERS);
  var DROP_BOUNDS = Object.freeze({ minX: -4.6, maxX: 4.6, minZ: -3.6, maxZ: 7.7 });
  var POWER_TARGET = Array(9).fill(false);
  var BOOLEAN_FIELDS = ['photoSolved', 'booksOpened', 'drawerOpened', 'cabinetOpened', 'fuseInstalled', 'powered', 'clockOpened', 'lensInstalled', 'telescopeSolved', 'radioSolved', 'safeOpened', 'pressureSolved', 'stripAPlaced', 'stripBPlaced', 'lighttableReady', 'doorUnlocked', 'escaped'];

  function affected(index) {
    var row = Math.floor(index / 3), col = index % 3;
    return [index, row > 0 ? index - 3 : -1, row < 2 ? index + 3 : -1, col > 0 ? index - 1 : -1, col < 2 ? index + 1 : -1].filter(function (v) { return v >= 0; });
  }
  [0, 2, 4, 6].forEach(function (i) { affected(i).forEach(function (n) { POWER_TARGET[n] = !POWER_TARGET[n]; }); });
  Object.freeze(POWER_TARGET);
  function result(ok, message, extra) { return Object.assign({ ok: ok, message: message }, extra || {}); }
  function integer(value, min, max) { return Number.isInteger(value) && value >= min && value <= max; }
  function same(a, b) {
    if (!Array.isArray(a) || a.length !== b.length) return false;
    for (var i = 0; i < b.length; i += 1) if (a[i] !== b[i]) return false;
    return true;
  }
  function rawId(id) { return typeof id === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id); }
  function add(list, id) { if (list.indexOf(id) < 0) list.push(id); }
  function note(id) { return { id: id, art: id }; }
  function observe(state, id) {
    if (!rawId(id)) return;
    add(state.seen, id);
    if (!state.notes.some(function (entry) { return entry.id === id; })) state.notes.push(note(id));
  }
  function own(state, id) { return state.inventory.indexOf(id) >= 0; }
  function onGround(state, id) { return state.dropped.some(function (entry) { return entry.id === id; }); }
  function earn(state, id) {
    add(state.owned, id);
    if (!onGround(state, id)) add(state.inventory, id);
  }
  function dropPosition(position) {
    if (!position || typeof position !== 'object' || !Number.isFinite(position.x) || !Number.isFinite(position.z)) return null;
    var yaw = position.yaw === undefined ? 0 : position.yaw, y = position.y === undefined ? 0 : position.y;
    if (!Number.isFinite(yaw) || !Number.isFinite(y) || y < 0 || y > 2.4 || position.x < DROP_BOUNDS.minX || position.x > DROP_BOUNDS.maxX || position.z < DROP_BOUNDS.minZ || position.z > DROP_BOUNDS.maxZ) return null;
    var point = { x: position.x, z: position.z, yaw: yaw };
    // Missing height is the original floor placement. Keep its save shape intact.
    if (position.y !== undefined) point.y = y;
    return point;
  }
  function installed(state, id) {
    return (id === 'fuse' && state.fuseInstalled) || (id === 'lens' && state.lensInstalled) || (id === 'stripA' && state.stripAPlaced) || (id === 'stripB' && state.stripBPlaced);
  }
  function consume(state, id) {
    state.inventory = state.inventory.filter(function (item) { return item !== id; });
    state.dropped = state.dropped.filter(function (entry) { return entry.id !== id; });
    if (state.selected === id) state.selected = null;
  }
  function initialState() {
    return {
      photoOrder: PHOTO_INITIAL.slice(), photoSolved: false, booksOpened: false, drawerOpened: false,
      cabinetOpened: false, fuseInstalled: false, powerCells: Array(9).fill(false), powered: false,
      clockHour: 0, clockMinute: 0, clockOpened: false, lensInstalled: false,
      telescopeX: 1, telescopeY: 1, telescopeSolved: false, frequency: 975, radioSolved: false,
      safeOpened: false, pressureValues: [1, 1, 1, 1], pressureSolved: false,
      stripAPlaced: false, stripBPlaced: false, lighttableReady: false,
      doorUnlocked: false, escaped: false, overlayRotation: 1, discShift: 0,
      selected: null, inventory: [], collected: [], owned: [], dropped: [], seen: [], notes: [], scratch: '', elapsed: 0
    };
  }
  // Reward flags are ownership records. Rebuild recoverable tools, then remove only
  // items whose physical placement is retained. Nothing is lost to a stale item array.
  function reconcile(state) {
    state.collected = state.collected || [];
    state.owned = state.owned || [];
    state.dropped = state.dropped || [];
    state.inventory.forEach(function (id) { add(state.owned, id); });
    if (state.booksOpened) { earn(state, 'key'); earn(state, 'acetate'); }
    if (state.drawerOpened) { earn(state, 'cipher'); add(state.collected, 'chronology'); observe(state, 'chronology'); }
    if (state.cabinetOpened) { earn(state, 'uv'); earn(state, 'fuse'); }
    if (state.clockOpened) { earn(state, 'lens'); add(state.collected, 'starcard'); add(state.collected, 'stamp'); observe(state, 'starcard'); observe(state, 'stamp'); }
    if (state.safeOpened) { earn(state, 'stripA'); add(state.collected, 'relations'); observe(state, 'relations'); }
    state.collected.forEach(function (id) { if (PAPERS.indexOf(id) >= 0) earn(state, id); });
    if (state.pressureSolved) earn(state, 'stripB');
    state.inventory = state.inventory.filter(function (id) { return !onGround(state, id); });
    if (state.telescopeSolved) observe(state, 'beacon');
    if (state.radioSolved) observe(state, 'radio');
    if (state.fuseInstalled) consume(state, 'fuse');
    if (state.lensInstalled) consume(state, 'lens');
    if (state.stripAPlaced) consume(state, 'stripA');
    if (state.stripBPlaced) consume(state, 'stripB');
    state.lighttableReady = state.powered && state.stripAPlaced && state.stripBPlaced;
    if (state.lighttableReady) observe(state, 'finale');
    if (!own(state, state.selected)) state.selected = null;
  }
  function sanitized(raw) {
    var state = initialState();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return state;
    BOOLEAN_FIELDS.forEach(function (key) { state[key] = raw[key] === true; });
    if (Array.isArray(raw.photoOrder) && raw.photoOrder.length === 6 && new Set(raw.photoOrder).size === 6 && raw.photoOrder.every(function (v) { return integer(v, 0, 5); })) state.photoOrder = raw.photoOrder.slice();
    state.photoSolved = same(state.photoOrder, [0, 1, 2, 3, 4, 5]) || state.photoSolved;
    if (state.photoSolved) state.photoOrder = [0, 1, 2, 3, 4, 5];
    if (Array.isArray(raw.powerCells) && raw.powerCells.length === 9) state.powerCells = raw.powerCells.map(function (value) { return value === true; });
    if (Array.isArray(raw.pressureValues) && raw.pressureValues.length === 4) state.pressureValues = raw.pressureValues.map(function (value) { return integer(value, 1, 6) ? value : 1; });
    ['overlayRotation', 'discShift', 'clockHour', 'clockMinute', 'telescopeX', 'telescopeY', 'frequency'].forEach(function (key) {
      var ranges = { overlayRotation: [0, 3], discShift: [0, 25], clockHour: [0, 23], clockMinute: [0, 59], telescopeX: [1, 9], telescopeY: [1, 9], frequency: [880, 1080] };
      if (integer(raw[key], ranges[key][0], ranges[key][1])) state[key] = raw[key];
    });
    if (Array.isArray(raw.inventory)) raw.inventory.forEach(function (id) { if (ITEMS.indexOf(id) >= 0) add(state.inventory, id); });
    // A durable acquisition record preserves recovered legacy tools after a drop.
    // It authorizes ground records only; by itself it never creates an item.
    if (Array.isArray(raw.owned)) raw.owned.slice(0, 200).forEach(function (id) { if (ITEMS.indexOf(id) >= 0) add(state.owned, id); });
    if (Array.isArray(raw.seen)) raw.seen.slice(0, 200).forEach(function (id) { if (rawId(id)) observe(state, id); });
    // Saved prose is never trusted: notebook entries are raw-art references only.
    if (Array.isArray(raw.notes)) raw.notes.slice(0, 200).forEach(function (entry) { if (entry && rawId(entry.id)) observe(state, entry.id); });
    if (Array.isArray(raw.collected)) raw.collected.slice(0, PAPERS.length).forEach(function (id) { if (PAPERS.indexOf(id) >= 0) add(state.collected, id); });
    else PAPERS.forEach(function (id) { if (state.seen.indexOf(id) >= 0) add(state.collected, id); });
    state.inventory.forEach(function (id) { if (PAPERS.indexOf(id) >= 0) add(state.collected, id); });
    state.collected.forEach(function (id) { observe(state, id); });
    if (typeof raw.scratch === 'string') state.scratch = raw.scratch.slice(0, 12000);
    if (typeof raw.elapsed === 'number' && Number.isFinite(raw.elapsed)) state.elapsed = Math.max(0, Math.min(31536000, raw.elapsed));
    state.selected = ITEMS.indexOf(raw.selected) >= 0 ? raw.selected : null;
    // Damaged dependencies must not destroy earned one-off rewards or observed paper.
    if (raw.safeOpened === true) { earn(state, 'stripA'); add(state.collected, 'relations'); observe(state, 'relations'); }
    if (raw.pressureSolved === true) earn(state, 'stripB');
    if (raw.telescopeSolved === true) observe(state, 'beacon');
    if (raw.radioSolved === true) observe(state, 'radio');
    state.powered = state.powered && state.fuseInstalled && same(state.powerCells, POWER_TARGET);
    state.telescopeSolved = state.telescopeSolved && state.powered && state.lensInstalled;
    state.radioSolved = state.radioSolved && state.powered;
    state.safeOpened = state.safeOpened && state.powered;
    state.pressureSolved = state.pressureSolved && state.powered && same(state.pressureValues, [3, 4, 6, 5]);
    state.doorUnlocked = state.doorUnlocked && state.powered && state.pressureSolved;
    state.escaped = state.escaped && state.doorUnlocked;
    // Reconstruct earned ownership before trusting any ground item. Invalid
    // locations return an owned object to the bag, rather than losing it.
    reconcile(state);
    if (Array.isArray(raw.dropped)) raw.dropped.slice(0, 200).forEach(function (entry) {
      if (!entry || ITEMS.indexOf(entry.id) < 0 || state.owned.indexOf(entry.id) < 0 || installed(state, entry.id) || onGround(state, entry.id)) return;
      var position = dropPosition(entry);
      if (!position) { add(state.inventory, entry.id); return; }
      state.dropped.push(Object.assign({ id: entry.id }, position));
    });
    reconcile(state);
    return state;
  }
  function Model(options) {
    options = options || {};
    this.storage = options.storage || null;
    this.storageKey = typeof options.storageKey === 'string' ? options.storageKey : SAVE_KEY;
    this.listeners = new Set(); this.state = initialState(); this.restored = false; this._savedSecond = 0;
    if (this.storage) {
      try {
        var serialized = this.storage.getItem(this.storageKey);
        if (typeof serialized === 'string' && serialized.length < 200000) {
          var data = JSON.parse(serialized);
          if (data && data.version === VERSION && data.state && typeof data.state === 'object' && !Array.isArray(data.state)) { this.state = sanitized(data.state); this.restored = true; }
        }
      } catch (error) { /* Damaged or unavailable saves do not block a fresh game. */ }
    }
    this._savedSecond = Math.floor(this.state.elapsed);
  }
  Model.SAVE_KEY = SAVE_KEY;
  Model.SAVE_VERSION = VERSION;
  Model.POWER_TARGET = POWER_TARGET;
  Model.PAPERS = Object.freeze(PAPERS.slice());
  Model.LOOSE_PAPERS = Object.freeze(LOOSE_PAPERS.slice());
  Model.ITEMS = Object.freeze(ITEMS.slice());
  Model.DROP_BOUNDS = DROP_BOUNDS;
  Model.prototype.subscribe = function (listener) {
    if (typeof listener !== 'function') return function () {};
    this.listeners.add(listener); listener(this.state);
    var self = this; return function () { self.listeners.delete(listener); };
  };
  Model.prototype._notify = function () { var state = this.state; this.listeners.forEach(function (listener) { listener(state); }); };
  Model.prototype._changed = function () { reconcile(this.state); this.save(); this._notify(); };
  Model.prototype.save = function () {
    if (!this.storage) return false;
    try { this.storage.setItem(this.storageKey, JSON.stringify({ version: VERSION, state: this.state })); this._savedSecond = Math.floor(this.state.elapsed); return true; }
    catch (error) { return false; }
  };
  Model.prototype.stage = function () {
    var s = this.state;
    return s.escaped ? 'complete' : s.doorUnlocked ? 'escape' : s.pressureSolved ? 'door' : s.safeOpened ? 'pressure' : s.radioSolved ? 'safe' : s.telescopeSolved ? 'radio' : s.powered ? 'telescope' : s.cabinetOpened ? 'power' : s.drawerOpened ? 'cabinet' : s.booksOpened ? 'drawer' : s.photoSolved ? 'shelf' : 'photo';
  };
  Model.prototype.objective = function () { return '비상문은 잠겨 있다.'; };
  Model.prototype.inspect = function (id) {
    if (!rawId(id)) return result(false, '기록할 수 없습니다.');
    var wasSeen = this.state.seen.indexOf(id) >= 0;
    observe(this.state, id); if (!wasSeen) this._changed();
    return result(true, '', { note: note(id) });
  };
  Model.prototype.collect = function (id) {
    if (LOOSE_PAPERS.indexOf(id) < 0) return result(false, '회수할 수 없습니다.');
    if (this.state.collected.indexOf(id) >= 0) return result(true, '이미 가방에 있습니다.', { acquired: [] });
    add(this.state.collected, id); observe(this.state, id); this._changed();
    return result(true, '종이를 챙겼습니다.', { acquired: [id] });
  };
  Model.prototype.swapPhoto = function (i, j) {
    if (!integer(i, 0, 5) || !integer(j, 0, 5)) return result(false, '조각을 움직일 수 없습니다.');
    if (this.state.photoSolved) return result(true, '사진이 이어져 있습니다.');
    var order = this.state.photoOrder, previous = order[i]; order[i] = order[j]; order[j] = previous;
    this.state.photoSolved = same(order, [0, 1, 2, 3, 4, 5]); observe(this.state, 'photo'); this._changed();
    return result(true, this.state.photoSolved ? '사진이 이어졌습니다.' : '');
  };
  Model.prototype.tryBooks = function (symbols) {
    if (this.state.booksOpened) return result(true, '칸이 열려 있습니다.');
    if (!same(symbols, ['anchor', 'moon', 'bird', 'lighthouse'])) return result(false, '움직이지 않습니다.');
    this.state.booksOpened = true; this._changed(); return result(true, '칸이 열렸습니다.', { acquired: ['key', 'acetate'] });
  };
  Model.prototype.select = function (item) {
    if (item !== null && !own(this.state, item)) return result(false, '물건을 선택할 수 없습니다.');
    this.state.selected = item; this._changed(); return result(true, '');
  };
  Model.prototype.dropItem = function (id, position) {
    var point = dropPosition(position), s = this.state;
    if (ITEMS.indexOf(id) < 0 || !own(s, id) || onGround(s, id) || installed(s, id) || !point) return result(false, '');
    add(s.owned, id);
    s.inventory = s.inventory.filter(function (item) { return item !== id; });
    if (s.selected === id) s.selected = null;
    var dropped = Object.assign({ id: id }, point);
    s.dropped.push(dropped); this._changed();
    return result(true, '', { dropped: Object.assign({}, dropped) });
  };
  Model.prototype.pickupItem = function (id) {
    var s = this.state;
    if (!onGround(s, id) || installed(s, id)) return result(false, '');
    s.dropped = s.dropped.filter(function (entry) { return entry.id !== id; });
    earn(s, id); this._changed();
    return result(true, '', { acquired: [id], pickedUp: id });
  };
  Model.prototype.use = function (target) {
    var s = this.state, selected = s.selected, acquired = [];
    if (target === 'drawer' && s.drawerOpened) return result(true, '서랍이 열려 있습니다.');
    if (target === 'power' && s.fuseInstalled) return result(true, '부품이 장착되어 있습니다.');
    if (target === 'telescope' && s.lensInstalled) return result(true, '부품이 장착되어 있습니다.');
    if (!selected || !own(s, selected)) return result(false, '선택한 물건이 없습니다.');
    if (target === 'drawer' && selected === 'key') { s.drawerOpened = true; acquired = ['cipher', 'chronology']; }
    else if (target === 'tide' && selected === 'acetate') { observe(s, 'tide'); observe(s, 'tideOverlay'); }
    else if (target === 'painting' && selected === 'uv') observe(s, 'paintingUV');
    else if (target === 'power' && selected === 'fuse') s.fuseInstalled = true;
    else if (target === 'telescope' && selected === 'lens') s.lensInstalled = true;
    else if (target === 'lighttable' && (selected === 'stripA' || selected === 'stripB')) {
      if (!s.powered) return result(false, '전원이 없습니다.');
      s[selected === 'stripA' ? 'stripAPlaced' : 'stripBPlaced'] = true;
    } else return result(false, '맞지 않습니다.');
    observe(s, target); this._changed(); return result(true, acquired.length ? '서랍이 열렸습니다.' : '', { acquired: acquired });
  };
  Model.prototype.setOverlayRotation = function (value) {
    if (!integer(value, 0, 3)) return result(false, '회전할 수 없습니다.');
    this.state.overlayRotation = value; this._changed(); return result(true, '');
  };
  Model.prototype.tryCabinet = function (value) {
    if (this.state.cabinetOpened) return result(true, '보관함이 열려 있습니다.');
    if (typeof value !== 'string' || value.trim() !== '7364') return result(false, '잠금이 풀리지 않습니다.');
    this.state.cabinetOpened = true; this._changed(); return result(true, '보관함이 열렸습니다.', { acquired: ['uv', 'fuse'] });
  };
  Model.prototype.togglePower = function (index) {
    if (!integer(index, 0, 8)) return result(false, '누를 수 없습니다.');
    if (this.state.powered) return result(false, '장치가 고정되어 있습니다.');
    var cells = this.state.powerCells; affected(index).forEach(function (n) { cells[n] = !cells[n]; });
    this._changed(); return result(true, '');
  };
  Model.prototype.checkPower = function () {
    if (this.state.powered) return result(true, '전원이 공급되고 있습니다.');
    if (!this.state.fuseInstalled || !same(this.state.powerCells, POWER_TARGET)) return result(false, '반응이 없습니다.');
    this.state.powered = true; this._changed(); return result(true, '전원이 들어왔습니다.');
  };
  Model.prototype.tryClock = function (hour, minute) {
    if (this.state.clockOpened) return result(true, '덮개가 열려 있습니다.');
    if (!integer(hour, 0, 23) || !integer(minute, 0, 59)) return result(false, '바늘을 맞출 수 없습니다.');
    this.state.clockHour = hour; this.state.clockMinute = minute;
    if (hour !== 4 || minute !== 35) { this._changed(); return result(false, '움직이지 않습니다.'); }
    this.state.clockOpened = true; this._changed(); return result(true, '덮개가 열렸습니다.', { acquired: ['lens', 'starcard', 'stamp'] });
  };
  Model.prototype.setTelescope = function (x, y) {
    if (!integer(x, 1, 9) || !integer(y, 1, 9)) return result(false, '축을 맞출 수 없습니다.');
    this.state.telescopeX = x; this.state.telescopeY = y; this._changed(); return result(true, '');
  };
  Model.prototype.observeTelescope = function () {
    var s = this.state;
    if (!s.powered) return result(false, '전원이 없습니다.');
    if (!s.lensInstalled) return result(false, '상이 맺히지 않습니다.');
    if (s.telescopeX !== 7 || s.telescopeY !== 3) return result(false, '어두운 수평선이 보입니다.');
    s.telescopeSolved = true; observe(s, 'beacon'); this._changed(); return result(true, '', { note: note('beacon') });
  };
  Model.prototype.setFrequency = function (value) {
    if (!integer(value, 880, 1080)) return result(false, '조절할 수 없습니다.');
    this.state.frequency = value; this._changed(); return result(true, '');
  };
  Model.prototype.tuneRadio = function () {
    if (!this.state.powered) return result(false, '전원이 없습니다.');
    if (this.state.frequency !== 1037) return result(false, '잡음만 들립니다.');
    this.state.radioSolved = true; observe(this.state, 'radio'); this._changed(); return result(true, '', { note: note('radio') });
  };
  Model.prototype.setDiscShift = function (value) {
    if (!integer(value, 0, 25)) return result(false, '회전할 수 없습니다.');
    this.state.discShift = value; this._changed(); return result(true, '');
  };
  Model.prototype.trySafe = function (directions) {
    if (this.state.safeOpened) return result(true, '금고가 열려 있습니다.');
    if (!this.state.powered) return result(false, '전원이 없습니다.');
    if (!same(directions, ['E', 'N', 'E', 'S', 'E'])) return result(false, '잠금이 풀리지 않습니다.');
    this.state.safeOpened = true; this._changed(); return result(true, '금고가 열렸습니다.', { acquired: ['stripA', 'relations'] });
  };
  Model.prototype.setPressure = function (index, value) {
    if (!integer(index, 0, 3) || !integer(value, 1, 6)) return result(false, '조절할 수 없습니다.');
    if (this.state.pressureSolved) return result(false, '장치가 고정되어 있습니다.');
    this.state.pressureValues[index] = value; this._changed(); return result(true, '');
  };
  Model.prototype.checkPressure = function () {
    if (this.state.pressureSolved) return result(true, '장치가 작동하고 있습니다.');
    if (!this.state.powered) return result(false, '전원이 없습니다.');
    if (!same(this.state.pressureValues, [3, 4, 6, 5])) return result(false, '반응이 없습니다.');
    this.state.pressureSolved = true; this._changed(); return result(true, '해치가 열렸습니다.', { acquired: ['stripB'] });
  };
  Model.prototype.unlockDoor = function (symbols) {
    if (this.state.doorUnlocked) return result(true, '문이 열려 있습니다.');
    if (!this.state.powered) return result(false, '전원이 없습니다.');
    if (!this.state.pressureSolved || !same(symbols, ['diamond', 'star', 'moon', 'triangle', 'sun', 'circle'])) return result(false, '잠금이 풀리지 않습니다.');
    this.state.doorUnlocked = true; this._changed(); return result(true, '문이 열렸습니다.');
  };
  Model.prototype.escape = function () {
    if (this.state.escaped) return result(true, '탈출했습니다.');
    if (!this.state.doorUnlocked) return result(false, '문이 잠겨 있습니다.');
    this.state.escaped = true; this._changed(); return result(true, '탈출했습니다.');
  };
  Model.prototype.setScratch = function (text) {
    if (typeof text !== 'string') return result(false, '기록할 수 없습니다.');
    this.state.scratch = text.slice(0, 12000); this._changed(); return result(true, '');
  };
  Model.prototype.tick = function (seconds) {
    if (this.state.escaped || typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return;
    var previousSecond = Math.floor(this.state.elapsed);
    this.state.elapsed = Math.min(31536000, this.state.elapsed + Math.min(seconds, 60));
    var currentSecond = Math.floor(this.state.elapsed);
    if (currentSecond - this._savedSecond >= 10) this.save();
    if (currentSecond !== previousSecond) this._notify();
  };
  Model.prototype.reset = function () {
    this.state = initialState(); this.restored = false; this._savedSecond = 0; this._changed(); return result(true, '새로 시작합니다.');
  };
  global.LastSignal = global.LastSignal || {};
  global.LastSignal.Model = Model;
})(typeof globalThis !== 'undefined' ? globalThis : this);
