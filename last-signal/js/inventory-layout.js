(function (global) {
  'use strict';
  var NS = global.LastSignal = global.LastSignal || {};
  var SIZE = 36, MAIN_SIZE = 27, HOTBAR_SIZE = 9;
  var DEFAULT_KEY = 'last-signal:inventory-layout:v1';

  function validId(id) { return typeof id === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id); }
  function indexIn(value, size) { return Number.isInteger(value) && value >= 0 && value < size; }
  function empty() { return Array(SIZE).fill(null); }
  function uniqueItems(ids) {
    var seen = new Set();
    return (Array.isArray(ids) ? ids : []).filter(function (id) {
      if (!validId(id) || seen.has(id)) return false;
      seen.add(id); return true;
    });
  }
  function read(storage, key) {
    try {
      var source = JSON.parse(storage && storage.getItem(key));
      if (!source || source.version !== 1 || !Array.isArray(source.slots)) return null;
      var used = new Set(), slots = empty();
      for (var i = 0; i < SIZE; i += 1) {
        var id = source.slots[i];
        if (validId(id) && !used.has(id)) { slots[i] = id; used.add(id); }
      }
      var overflow = uniqueItems(source.overflow).filter(function (id) {
        if (used.has(id)) return false;
        used.add(id); return true;
      });
      return { slots: slots, activeHotbar: indexIn(source.activeHotbar, HOTBAR_SIZE) ? source.activeHotbar : 0, overflow: overflow };
    } catch (_) { return null; }
  }

  /** Arrangement only: the game model remains the authority for item ownership. */
  function InventoryLayout(options) {
    options = options || {};
    this.storage = options.storage || null;
    this.key = typeof options.key === 'string' && options.key ? options.key : DEFAULT_KEY;
    this.slots = empty();
    this.activeHotbar = 0;
    this._overflow = [];
    this._owned = new Set();
    this._pending = read(this.storage, this.key);
    if (this._pending) this.activeHotbar = this._pending.activeHotbar;
    this._initialized = false;
    this._lastSerialized = null;
  }

  InventoryLayout.SIZE = SIZE;
  InventoryLayout.MAIN_SIZE = MAIN_SIZE;
  InventoryLayout.HOTBAR_SIZE = HOTBAR_SIZE;
  InventoryLayout.DEFAULT_KEY = DEFAULT_KEY;

  InventoryLayout.prototype.snapshot = function () {
    return { version: 1, slots: this.slots.slice(), activeHotbar: this.activeHotbar, overflow: this._overflow.slice() };
  };
  InventoryLayout.prototype._save = function () {
    if (!this._initialized) return;
    var serialized = JSON.stringify(this.snapshot());
    if (serialized === this._lastSerialized) return;
    this._lastSerialized = serialized;
    try { if (this.storage) this.storage.setItem(this.key, serialized); } catch (_) { /* Play remains available when storage is unavailable. */ }
  };
  InventoryLayout.prototype.sync = function (items, legacySelected) {
    var owned = uniqueItems(items), allowed = new Set(owned), first = !this._initialized;
    var previous = first && this._pending ? this._pending : this.snapshot();
    var used = new Set(), next = empty();
    for (var i = 0; i < SIZE; i += 1) {
      var id = previous.slots[i];
      if (allowed.has(id) && !used.has(id)) { next[i] = id; used.add(id); }
    }
    // Migrate an existing held item once; later syncs never override the selected slot.
    if (first && !this._pending && allowed.has(legacySelected)) {
      next[MAIN_SIZE] = legacySelected; used.add(legacySelected); this.activeHotbar = 0;
    }
    var remaining = uniqueItems((previous.overflow || []).concat(owned)).filter(function (id) { return allowed.has(id) && !used.has(id); });
    var preferredSlots = [];
    for (var h = MAIN_SIZE; h < SIZE; h += 1) preferredSlots.push(h);
    for (var m = 0; m < MAIN_SIZE; m += 1) preferredSlots.push(m);
    preferredSlots.forEach(function (slot) {
      if (next[slot] === null && remaining.length) next[slot] = remaining.shift();
    });
    this.slots = next;
    this._overflow = remaining;
    this._owned = allowed;
    this._pending = null;
    this._initialized = true;
    this._save();
    return this.snapshot();
  };
  InventoryLayout.prototype.held = function () {
    var id = this.slots[MAIN_SIZE + this.activeHotbar];
    return id && this._owned.has(id) ? id : null;
  };
  InventoryLayout.prototype.selectHotbar = function (index) {
    if (indexIn(index, HOTBAR_SIZE)) {
      this.activeHotbar = index;
      if (this._pending) this._pending.activeHotbar = index;
      this._save();
    }
    return this.held();
  };
  InventoryLayout.prototype.find = function (id) { return validId(id) ? this.slots.indexOf(id) : -1; };
  InventoryLayout.prototype.overflow = function () { return this._overflow.slice(); };
  InventoryLayout.prototype.move = function (from, to) {
    if (this._initialized && indexIn(from, SIZE) && indexIn(to, SIZE) && from !== to) {
      var item = this.slots[from]; this.slots[from] = this.slots[to]; this.slots[to] = item;
      this._save();
    }
    return this.snapshot();
  };
  InventoryLayout.prototype.autoMove = function (index) {
    if (this._initialized && indexIn(index, SIZE) && this.slots[index] !== null) {
      var from = index < MAIN_SIZE ? MAIN_SIZE : 0, to = index < MAIN_SIZE ? SIZE : MAIN_SIZE;
      for (var i = from; i < to; i += 1) {
        if (this.slots[i] === null) return this.move(index, i);
      }
    }
    return this.snapshot();
  };
  InventoryLayout.prototype.reset = function () {
    this.slots = empty(); this.activeHotbar = 0; this._overflow = []; this._owned = new Set();
    this._pending = null; this._initialized = true; this._save();
    return this.snapshot();
  };

  NS.InventoryLayout = InventoryLayout;
})(globalThis);
