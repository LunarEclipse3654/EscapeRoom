/* Asteria — deterministic puzzle model, browser and desktop shell independent. */
(function (root) {
  'use strict';
  var NS = root.LastSignal = root.LastSignal || {};
  var VERSION = 1, SAVE_KEY = 'asteria:save:v1';
  var MAP_INITIAL = [2, 0, 3, 1], MAP_CORRECT = [0, 1, 2, 3], SKY_ORDER = [3, 2, 0, 1];
  var STARS = [
    { id: 'cygnus', name: '백조', symbol: '☾', azimuth: 40, altitude: 25 },
    { id: 'lyra', name: '거문고', symbol: '△', azimuth: 110, altitude: 45 },
    { id: 'aquila', name: '독수리', symbol: '◇', azimuth: 200, altitude: 30 },
    { id: 'orion', name: '오리온', symbol: '✶', azimuth: 310, altitude: 60 }
  ];
  var BOOLEAN_FIELDS = ['mapSolved', 'clockSolved', 'mirrorAligned', 'mirrorSolved', 'skySolved', 'labRead', 'escaped'];
  var PORTABLE = ['map', 'journal', 'decoder', 'blueprint'];
  var DROP_BOUNDS = Object.freeze({ minX: -4.6, maxX: 12.7, minZ: -4.6, maxZ: 17 });
  function integer(v, lo, hi) { return Number.isInteger(v) && v >= lo && v <= hi; }
  function same(a, b) { return Array.isArray(a) && a.length === b.length && a.every(function (v, i) { return v === b[i]; }); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function outcome(ok, message, extra) { return Object.assign({ ok: ok, message: message || '' }, extra || {}); }
  function add(a, v) { if (a.indexOf(v) < 0) a.push(v); }
  function rawId(id) { return typeof id === 'string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,48}$/.test(id); }
  function onGround(state, id) { return state.dropped.some(function (entry) { return entry.id === id; }); }
  function dropPosition(position) {
    if (!position || typeof position !== 'object' || !Number.isFinite(position.x) || !Number.isFinite(position.z)) return null;
    var yaw = position.yaw === undefined ? 0 : position.yaw, y = position.y === undefined ? 0 : position.y;
    if (!Number.isFinite(yaw) || !Number.isFinite(y) || y < 0 || y > 2.4 || position.x < DROP_BOUNDS.minX || position.x > DROP_BOUNDS.maxX || position.z < DROP_BOUNDS.minZ || position.z > DROP_BOUNDS.maxZ) return null;
    var point = { x: position.x, z: position.z, yaw: yaw };
    // Old saves omit height and continue to mean the floor.
    if (position.y !== undefined) point.y = y;
    return point;
  }
  function initialState() {
    return { mapOrder: MAP_INITIAL.slice(), mapSolved: false, observations: [], azimuth: 0, altitude: 0,
      clockHour: 0, clockMinute: 0, clockSolved: false, mirrorTurns: [1, 3, 2], mirrorAligned: false,
      mirrorSolved: false, skyInput: [], skySolved: false, labRead: false, escaped: false,
      seen: [], collected: [], owned: [], dropped: [], scratch: '', elapsed: 0 };
  }
  function sanitized(raw) {
    var s = initialState();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return s;
    BOOLEAN_FIELDS.forEach(function (key) { s[key] = raw[key] === true; });
    if (Array.isArray(raw.mapOrder) && raw.mapOrder.length === 4 && new Set(raw.mapOrder).size === 4 && raw.mapOrder.every(function (v) { return integer(v, 0, 3); })) s.mapOrder = raw.mapOrder.slice();
    s.mapSolved = s.mapSolved || same(s.mapOrder, MAP_CORRECT);
    if (s.mapSolved) s.mapOrder = MAP_CORRECT.slice();
    ['azimuth', 'altitude', 'clockHour', 'clockMinute'].forEach(function (key) {
      var range = { azimuth: [0, 359], altitude: [0, 90], clockHour: [0, 23], clockMinute: [0, 59] }[key];
      if (integer(raw[key], range[0], range[1])) s[key] = raw[key];
    });
    if (Array.isArray(raw.observations)) raw.observations.slice(0, 20).forEach(function (entry) {
      var found = STARS.find(function (star) { return entry && star.id === entry.id; });
      if (found && !s.observations.some(function (v) { return v.id === found.id; })) s.observations.push(copy(found));
    });
    if (Array.isArray(raw.skyInput) && raw.skyInput.length <= 4 && raw.skyInput.every(function (v) { return integer(v, 0, 3); })) s.skyInput = raw.skyInput.slice();
    if (Array.isArray(raw.seen)) raw.seen.slice(0, 100).forEach(function (id) { if (rawId(id)) add(s.seen, id); });
    if (Array.isArray(raw.collected)) raw.collected.forEach(function (id) { if (PORTABLE.indexOf(id) >= 0) add(s.collected, id); });
    // Before physical pickup was added, inspecting a paper already put it in the
    // bag. Migrate only those older saves; new saves distinguish seen from held.
    else PORTABLE.forEach(function (id) { if (s.seen.indexOf(id) >= 0 || (id === 'map' && s.mapSolved)) add(s.collected, id); });
    if (Array.isArray(raw.owned)) raw.owned.slice(0, 100).forEach(function (id) { if (PORTABLE.indexOf(id) >= 0) add(s.owned, id); });
    s.collected.forEach(function (id) { add(s.seen, id); });
    if (typeof raw.scratch === 'string') s.scratch = raw.scratch.slice(0, 12000);
    if (Number.isFinite(raw.elapsed)) s.elapsed = Math.max(0, Math.min(31536000, raw.elapsed));
    // Completed physical mechanisms are durable. A corrupted dial or a missing old
    // intermediate flag must never trap a player beyond a door they already opened.
    if (s.escaped) { s.labRead = true; s.skySolved = true; }
    if (s.labRead) s.skySolved = true;
    if (s.skySolved) s.mirrorSolved = true;
    if (!s.skySolved) s.collected = s.collected.filter(function (id) { return id !== 'blueprint'; });
    if (s.mirrorSolved) s.clockSolved = true;
    s.mirrorAligned = s.clockSolved;
    if (s.clockSolved) { s.clockHour = 3; s.clockMinute = 49; }
    s.mirrorTurns = [1, 3, 2];
    s.collected.forEach(function (id) { add(s.owned, id); });
    // Ground state never grants possession. It must refer to a collected paper,
    // and inaccessible blueprints have already been removed above.
    if (Array.isArray(raw.dropped)) raw.dropped.slice(0, 100).forEach(function (entry) {
      if (!entry || PORTABLE.indexOf(entry.id) < 0 || s.collected.indexOf(entry.id) < 0 || onGround(s, entry.id)) return;
      var position = dropPosition(entry);
      if (position) s.dropped.push(Object.assign({ id: entry.id }, position));
    });
    return s;
  }
  function safeStorage() { try { return root.localStorage; } catch (_) { return null; } }
  function Model(options) {
    options = options || {}; this.storage = options.storage === undefined ? safeStorage() : options.storage;
    this.listeners = []; this.storageError = false; this.state = initialState();
    try {
      var raw = this.storage && this.storage.getItem(SAVE_KEY);
      if (raw) { var payload = JSON.parse(raw); if (payload.version === VERSION) this.state = sanitized(payload.state); }
    } catch (_) { this.storageError = true; }
  }
  Model.prototype.subscribe = function (listener) {
    if (typeof listener !== 'function') return function () {};
    this.listeners.push(listener); var self = this;
    return function () { self.listeners = self.listeners.filter(function (v) { return v !== listener; }); };
  };
  Model.prototype.save = function () {
    try { if (this.storage) this.storage.setItem(SAVE_KEY, JSON.stringify({ version: VERSION, state: this.state })); this.storageError = false; return true; }
    catch (_) { this.storageError = true; return false; }
  };
  Model.prototype.changed = function () {
    this.save(); var self = this; this.listeners.slice().forEach(function (fn) { fn(self.state); });
  };
  Model.prototype.inspect = function (id) {
    if (!rawId(id)) return outcome(false, '조사할 수 없다.');
    if ((id === 'blueprint' || id === 'ending' || id === 'lab') && !this.state.skySolved) return outcome(false, '벽 너머에는 닿지 않는다.');
    if ((id === 'mirrors' || id === 'mirror') && !this.state.clockSolved) return outcome(false, '기계실 문이 잠겨 있다.');
    if (id === 'sky' && !this.state.mirrorSolved) return outcome(false, '책장이 벽을 가리고 있다.');
    add(this.state.seen, id); this.changed(); return outcome(true, '', { art: id });
  };
  Model.prototype.collect = function (id) {
    if (PORTABLE.indexOf(id) < 0) return outcome(false, '이 물건은 가지고 갈 수 없다.');
    if (id === 'blueprint' && !this.state.skySolved) return outcome(false, '벽 너머에는 닿지 않는다.');
    var s = this.state;
    if (s.collected.indexOf(id) >= 0) return outcome(true, '이미 소지하고 있다.', { alreadyOwned: true });
    add(s.collected, id); add(s.owned, id); add(s.seen, id); this.changed();
    return outcome(true, '종이를 소지품에 넣었다.', { collected: id });
  };
  // Possession is separate from observation and puzzle completion.
  Model.prototype.inventory = function (includeDropped) {
    var s = this.state, items = [];
    if (s.collected.indexOf('map') >= 0) items.push({ id: 'map', name: s.mapSolved ? '이어 붙인 성도' : '찢어진 성도 조각', kind: '자료', description: s.mapSolved ? '네 조각의 눈금과 별의 선을 이어 붙인 종이 성도.' : '책상에서 챙긴 네 장의 종이 조각. 가방에서 펼쳐 서로 이어 붙일 수 있다.' });
    if (s.collected.indexOf('journal') >= 0) items.push({ id: 'journal', name: '헤일의 연구일지', kind: '자료', description: '헤일이 관측 중에 남긴 손글씨와 광학 장치의 기록.' });
    if (s.collected.indexOf('decoder') >= 0) items.push({ id: 'decoder', name: '관측 기호 대조표', kind: '자료', description: '관측 기호와 시간 눈금이 인쇄된 접힌 종이.' });
    if (s.collected.indexOf('blueprint') >= 0) items.push({ id: 'blueprint', name: '헤일의 실험 설계도', kind: '자료', description: '비밀 연구실에서 챙긴 설계도. 뒷장에는 마지막 실험 기록이 끼워져 있다.' });
    return includeDropped === true ? items : items.filter(function (item) { return !onGround(s, item.id); });
  };
  Model.prototype.dropItem = function (id, position) {
    var s = this.state, point = dropPosition(position);
    if (PORTABLE.indexOf(id) < 0 || s.collected.indexOf(id) < 0 || onGround(s, id) || !point || (id === 'blueprint' && !s.skySolved)) return outcome(false, '');
    add(s.owned, id);
    var dropped = Object.assign({ id: id }, point);
    s.dropped.push(dropped);
    if (s.selected === id) s.selected = null;
    this.changed(); return outcome(true, '', { dropped: Object.assign({}, dropped) });
  };
  Model.prototype.pickupItem = function (id) {
    var s = this.state;
    if (!onGround(s, id) || s.collected.indexOf(id) < 0 || (id === 'blueprint' && !s.skySolved)) return outcome(false, '');
    s.dropped = s.dropped.filter(function (entry) { return entry.id !== id; });
    this.changed(); return outcome(true, '', { collected: id, acquired: [id], pickedUp: id });
  };
  Model.prototype.swapMap = function (a, b) {
    var s = this.state;
    if (!integer(a, 0, 3) || !integer(b, 0, 3)) return outcome(false, '');
    if (s.mapSolved || a === b) return outcome(true, '');
    var old = s.mapOrder[a]; s.mapOrder[a] = s.mapOrder[b]; s.mapOrder[b] = old;
    s.mapSolved = same(s.mapOrder, MAP_CORRECT); add(s.seen, 'map'); this.changed();
    return outcome(true, s.mapSolved ? '눈금과 별의 선이 끊김 없이 이어졌다.' : '', { solved: s.mapSolved });
  };
  Model.prototype.setAim = function (azimuth, altitude) {
    if (!integer(azimuth, 0, 359) || !integer(altitude, 0, 90)) return outcome(false, '눈금 범위를 벗어났다.');
    this.state.azimuth = azimuth; this.state.altitude = altitude; this.changed();
    return outcome(true, '', { observation: this.currentView() });
  };
  Model.prototype.currentView = function () {
    var s = this.state, found = STARS.find(function (v) { return v.azimuth === s.azimuth && v.altitude === s.altitude; });
    return found ? copy(found) : null;
  };
  Model.prototype.observe = function () {
    var found = this.currentView(); add(this.state.seen, 'telescope');
    if (!found) { this.changed(); return outcome(false, '초점 안에 옅은 별빛만 보인다.', { observation: null }); }
    if (!this.state.observations.some(function (v) { return v.id === found.id; })) this.state.observations.push(copy(found));
    this.changed(); return outcome(true, '접안렌즈 안쪽에 새겨진 기호가 드러났다.', { observation: found });
  };
  Model.prototype.tryClock = function (hour, minute) {
    if (!integer(hour, 0, 23) || !integer(minute, 0, 59)) return outcome(false, '시계의 눈금 범위를 벗어났다.');
    var s = this.state; if (s.clockSolved) return outcome(true, '톱니가 일정하게 돌아가고 있다.');
    s.clockHour = hour; s.clockMinute = minute; add(s.seen, 'clock');
    var ok = hour === 3 && minute === 49;
    if (ok) { s.clockSolved = true; s.mirrorAligned = true; }
    this.changed(); return outcome(ok, ok ? '무거운 톱니가 맞물렸다. 벽 속 축이 돌고 기계실 문이 열렸다.' : '태엽이 되돌아온다.');
  };
  // The clock's camshaft positions the reflectors. The player traces the first
  // beam; there is no undocumented dial combination beyond the supplied design.
  Model.prototype.alignMirrors = function () { return outcome(this.state.clockSolved, this.state.clockSolved ? '' : '구동축이 멈춰 있다.'); };
  Model.prototype.rotateMirror = function () { return this.alignMirrors(); };
  Model.prototype.handleStar = function (index) {
    if (!this.state.clockSolved) return outcome(false, '기계실 문이 잠겨 있다.');
    if (index !== 5 && index !== 'lower-east') return outcome(false, '차갑고 매끈한 별 장식이다.');
    this.state.mirrorSolved = true; add(this.state.seen, 'mirrors'); this.changed();
    return outcome(true, '별 장식의 가장자리에 손가락이 걸렸다. 숨은 손잡이를 당기자 책장이 움직였다.');
  };
  Model.prototype.pushSky = function (index) {
    if (!this.state.mirrorSolved) return outcome(false, '책장이 벽을 가리고 있다.');
    if (this.state.skySolved) return outcome(true, '벽은 이미 열려 있다.');
    if (!integer(index, 0, 3)) return outcome(false, '');
    if (this.state.skyInput.length >= 4) return outcome(false, '네 번의 입력이 남아 있다.');
    this.state.skyInput.push(index); this.changed(); return outcome(true, '별 단추가 눌렸다.');
  };
  Model.prototype.clearSky = function () { this.state.skyInput = []; this.changed(); return outcome(true, ''); };
  Model.prototype.checkSky = function () {
    var s = this.state; if (!s.mirrorSolved) return outcome(false, '책장이 벽을 가리고 있다.');
    if (s.skySolved) return outcome(true, '벽은 이미 열려 있다.');
    var ok = same(s.skyInput, SKY_ORDER);
    if (ok) { s.skySolved = true; add(s.seen, 'sky'); }
    else s.skyInput = [];
    this.changed(); return outcome(ok, ok ? '벽의 별들이 빛난다. 뒤편에서 걸쇠가 풀리는 소리가 들렸다.' : '작은 걸쇠가 돌아왔다. 단추들이 원래대로 올라온다.');
  };
  Model.prototype.readLab = function () {
    if (!this.state.skySolved) return outcome(false, '벽 너머에는 닿지 않는다.');
    this.state.labRead = true; add(this.state.seen, 'blueprint'); add(this.state.seen, 'ending'); this.changed();
    return outcome(true, '녹음이 끝나자 비상 출입구의 기계식 걸쇠가 풀렸다.');
  };
  Model.prototype.escape = function () {
    if (!this.state.skySolved || !this.state.labRead) return outcome(false, '비상 출입구의 걸쇠가 잠겨 있다.');
    this.state.escaped = true; this.changed(); return outcome(true, '아스테리아 관측소를 탈출했다.');
  };
  Model.prototype.setScratch = function (text) { this.state.scratch = String(text == null ? '' : text).slice(0, 12000); this.changed(); };
  Model.prototype.tick = function (seconds) { if (Number.isFinite(seconds) && seconds > 0 && !this.state.escaped) this.state.elapsed = Math.min(31536000, this.state.elapsed + seconds); };
  Model.prototype.reset = function () { this.state = initialState(); this.changed(); return outcome(true, ''); };
  Model.VERSION = VERSION; Model.SAVE_KEY = SAVE_KEY; Model.STARS = STARS.map(copy); Model.SKY_ORDER = SKY_ORDER.slice();
  Model.sanitized = sanitized; Model.initialState = initialState; Model.MIRROR_TARGET = 5; Model.PORTABLE = PORTABLE.slice();
  Model.DROP_BOUNDS = DROP_BOUNDS;
  NS.Model = Model;
})(typeof globalThis !== 'undefined' ? globalThis : window);
