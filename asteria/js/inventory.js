(function (NS) {
  'use strict';

  const bagIcon = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M17 13V9a7 7 0 0 1 14 0v4M12 14h24l3 27H9l3-27Z"/><path d="M9 24h30M18 24v8h12v-8M18 37h12"/></svg>';
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const icon = item => typeof item?.icon === 'string' && item.icon.trim().startsWith('<') ? item.icon : '<span class="inventory-fallback">' + escape(item?.icon || '◇') + '</span>';

  /** One cursor or one selected hotbar item; the model remains responsible for item ownership. */
  class Inventory {
    constructor(options) {
      this.options = options;
      this.layout = new NS.InventoryLayout({ storage: options.storage, key: options.storageKey || 'escape:inventory-layout:v1' });
      this.open = false;
      this.visible = false;
      this.drag = null;
      this.applyingId = null;
      this.items = [];
      this.focusedId = null;
      this.signature = '';
      this.initialized = false;
      this.lastHeld = undefined;
      this.notifying = false;
      this.syncing = false;
      this.hoverElement = null;
      this.suppressClickUntil = 0;
      this.abort = new AbortController();
      this.announceTimer = 0;
      this.panel = document.createElement('aside');
      this.panel.id = 'inventory-panel';
      this.panel.className = 'hidden';
      this.panel.dataset.inventoryDrop = 'inventory';
      this.panel.setAttribute('aria-labelledby', 'inventory-heading');
      this.panel.innerHTML = '<header class="inventory-header"><div><span class="inventory-eyebrow">INVENTORY</span><h2 id="inventory-heading">소지품</h2></div><span id="inventory-count"></span><button id="inventory-close" type="button" aria-label="소지품 닫기">×</button></header><div class="inventory-storage-label">보관함 <span>27칸</span></div><div id="inventory-grid" class="inventory-grid" role="group" aria-label="보관함 27칸"></div><div class="inventory-storage-label inventory-hotbar-label">빠른 슬롯 <span>선택한 한 칸만 손에 듭니다</span></div><div id="inventory-panel-hotbar" class="inventory-grid inventory-panel-hotbar" role="group" aria-label="빠른 슬롯 9칸"></div><section class="inventory-detail"><div class="inventory-detail-heading"><h3 id="inventory-item-name">물건을 선택하세요</h3><span id="inventory-item-kind"></span></div><p id="inventory-item-description">물건을 끌어 빈 칸에 옮기거나 다른 물건과 자리를 바꾸세요.</p><button id="inventory-inspect" type="button" disabled>꺼내 살펴보기 <span aria-hidden="true">↗</span></button></section><p class="inventory-hand-status" id="inventory-hand-status"></p><p class="inventory-help">끌어서 칸을 옮기거나 장치에 직접 놓습니다.<span class="inventory-keyboard-help">Space 집기 · Tab 이동 · Enter 놓기 · Shift+클릭 빠르게 옮기기</span><span class="inventory-touch-help">길게 눌러 집은 뒤 끌어서 놓으세요.</span></p>';
      this.bar = document.createElement('nav');
      this.bar.id = 'inventory-bar';
      this.bar.className = 'hidden';
      this.bar.dataset.inventoryDrop = 'inventory';
      this.bar.setAttribute('aria-label', '빠른 슬롯. 선택한 한 칸만 손에 듭니다.');
      this.bar.innerHTML = '<button id="inventory-toggle" type="button" aria-label="소지품 열기" aria-controls="inventory-panel" aria-expanded="false">' + bagIcon + '<span>가방 <kbd>I</kbd></span></button><div id="inventory-quickslots" class="inventory-quickslots"></div><span id="inventory-hotbar-selected-name" aria-live="polite"></span>';
      this.hand = document.createElement('aside');
      this.hand.id = 'inventory-hand';
      this.hand.className = 'hidden';
      this.hand.setAttribute('aria-label', '한 손에 든 물건');
      this.hand.innerHTML = '<span class="inventory-hand-art"></span><span class="inventory-hand-caption">한 손</span><strong id="inventory-hand-name">빈손</strong>';
      this.ghost = document.createElement('div');
      this.ghost.id = 'inventory-drag';
      this.ghost.className = 'hidden';
      this.ghost.setAttribute('aria-hidden', 'true');
      this.live = document.createElement('div');
      this.live.id = 'inventory-status';
      this.live.className = 'inventory-sr-only';
      this.live.setAttribute('role', 'status');
      this.live.setAttribute('aria-live', 'polite');
      document.body.append(this.panel, this.bar, this.hand, this.ghost, this.live);
      this.grid = this.panel.querySelector('#inventory-grid');
      this.panelHotbar = this.panel.querySelector('#inventory-panel-hotbar');
      this.quickslots = this.bar.querySelector('#inventory-quickslots');
      const on = (target, name, callback, extra = {}) => target.addEventListener(name, callback, { signal: this.abort.signal, ...extra });
      on(this.panel.querySelector('#inventory-close'), 'click', () => this.setOpen(false));
      on(this.bar.querySelector('#inventory-toggle'), 'click', () => this.toggle());
      on(this.panel.querySelector('#inventory-inspect'), 'click', () => {
        const item = this.selectedItem();
        if (item) this.options.onInspect?.(item.id);
      });
      for (const container of [this.panel, this.bar]) {
        on(container, 'pointerdown', event => this.pointerDown(event));
        on(container, 'click', event => this.click(event));
        on(container, 'dblclick', event => {
          const slot = event.target.closest('[data-inventory-item]');
          if (slot && performance.now() > this.suppressClickUntil) this.options.onInspect?.(slot.dataset.inventoryItem);
        });
        on(container, 'keydown', event => this.slotKey(event));
        on(container, 'pointerdown', event => event.stopPropagation());
      }
      on(document, 'pointermove', event => this.pointerMove(event), { capture: true });
      on(document, 'pointerup', event => this.pointerUp(event), { capture: true });
      on(document, 'pointercancel', event => {
        if (this.drag && event.pointerId === this.drag.pointerId) this.cancelDrag();
      }, { capture: true });
      on(document, 'keydown', event => this.dragKey(event), { capture: true });
      on(document, 'focusin', () => { if (this.drag?.keyboard) this.keyboardHover(); });
      on(window, 'blur', () => this.cancelDrag());
      on(document, 'visibilitychange', () => { if (document.hidden) this.cancelDrag(); });
      this.sync();
    }

    get isOpen() { return this.open; }
    get isDragging() { return Boolean(this.drag?.active); }
    get handBusy() { return this.isDragging || this.applyingId !== null; }
    selectedItem() { return this.items.find(item => item.id === this.focusedId); }
    heldItem() { return this.applyingId || (this.drag?.active ? this.drag.id : this.layout.held()); }
    canDisplay() { return Boolean(this.options.isStarted?.() && this.options.canShow?.()); }
    item(id) { return this.items.find(item => item.id === id); }

    notifyHeld(force = false) {
      const id = this.heldItem() || null;
      if (this.notifying || (!force && this.lastHeld === id)) return;
      this.lastHeld = id;
      this.notifying = true;
      try { this.options.onSelect?.(id); } finally { this.notifying = false; }
    }

    sync() {
      if (this.syncing) return;
      this.syncing = true;
      try {
        this.items = (this.options.getItems?.() || []).filter(item => item && item.id);
        this.layout.sync(this.items.map(item => item.id), this.initialized ? undefined : this.options.getSelected?.());
        this.initialized = true;
        const visible = this.canDisplay();
        if (this.drag && (!visible || !this.item(this.drag.id))) this.finishDrag();
        this.visible = visible;
        if (!visible && this.open) {
          this.open = false;
          this.options.onToggle?.(false);
        }
        if (this.focusedId && !this.item(this.focusedId)) this.focusedId = null;
        const state = this.layout.snapshot();
        if (!this.focusedId) this.focusedId = this.layout.held() || this.items[0]?.id || null;
        this.bar.classList.toggle('hidden', !visible);
        this.panel.classList.toggle('hidden', !visible || !this.open);
        this.bar.querySelector('#inventory-toggle').setAttribute('aria-expanded', String(this.open));
        document.body.classList.toggle('inventory-visible', visible);
        document.body.classList.toggle('inventory-open', visible && this.open);
        this.notifyHeld();
        this.renderHand();
        if (this.drag) return;
        const signature = JSON.stringify([state, this.focusedId, this.items.map(item => [item.id, item.name, item.icon, item.description, item.kind])]);
        if (signature === this.signature) return;
        this.signature = signature;
        const focus = document.activeElement?.closest('[data-inventory-slot]');
        const focusIndex = focus?.dataset.inventorySlot;
        const focusContainer = focus && this.panel.contains(focus) ? (this.grid.contains(focus) ? this.grid : this.panelHotbar) : this.quickslots;
        const render = (id, index) => this.renderSlot(id, index, state.activeHotbar);
        this.grid.innerHTML = state.slots.slice(0, 27).map((id, index) => render(id, index)).join('');
        const row = state.slots.slice(27, 36).map((id, index) => render(id, index + 27)).join('');
        this.panelHotbar.innerHTML = row;
        this.quickslots.innerHTML = row;
        this.panel.querySelector('#inventory-count').textContent = this.items.length + ' / 36';
        const item = this.selectedItem();
        this.panel.querySelector('#inventory-item-name').textContent = item?.name || '물건을 선택하세요';
        this.panel.querySelector('#inventory-item-kind').textContent = item?.kind || '';
        this.panel.querySelector('#inventory-item-description').textContent = item?.description || '물건을 끌어 빈 칸에 옮기거나 다른 물건과 자리를 바꾸세요.';
        this.panel.querySelector('#inventory-inspect').disabled = !item;
        if (focusIndex != null) focusContainer.querySelector('[data-inventory-slot="' + focusIndex + '"]')?.focus({ preventScroll: true });
      } finally { this.syncing = false; }
    }

    renderSlot(id, index, active) {
      const item = this.item(id), hotbar = index >= 27, selected = hotbar && index - 27 === active;
      const name = item?.name || '빈 칸';
      return '<button type="button" class="inventory-slot' + (!item ? ' inventory-empty' : '') + (selected ? ' is-selected' : '') + (item?.id === this.focusedId ? ' is-focused-item' : '') + '" data-inventory-slot="' + index + '"' + (item ? ' data-inventory-item="' + escape(item.id) + '"' : '') + ' aria-label="' + (hotbar ? '빠른 슬롯 ' + (index - 26) : '보관함 ' + (index + 1)) + ' · ' + escape(name) + '" aria-pressed="' + selected + '" title="' + escape(name) + '">' + (hotbar ? '<span class="inventory-slot-number" aria-hidden="true">' + (index - 26) + '</span>' : '') + (item ? '<span class="inventory-slot-art">' + icon(item) + '</span><span class="inventory-slot-name">' + escape(name) + '</span>' : '<span class="inventory-slot-art inventory-empty-art" aria-hidden="true"></span>') + '<span class="inventory-selection-mark" aria-hidden="true"></span></button>';
    }

    renderHand() {
      const item = this.item(this.heldItem());
      this.hand.classList.toggle('hidden', !this.visible || this.open || this.handBusy);
      this.hand.classList.toggle('is-empty', !item);
      const art = this.hand.querySelector('.inventory-hand-art');
      const nextArt = item ? icon(item) : '';
      if (art.innerHTML !== nextArt) art.innerHTML = nextArt;
      this.hand.querySelector('#inventory-hand-name').textContent = item?.name || '빈손';
      this.bar.querySelector('#inventory-hotbar-selected-name').textContent = item?.name || '빈손';
      this.panel.querySelector('#inventory-hand-status').textContent = '손에 든 물건: ' + (item?.name || '없음 · 빈손');
    }

    setOpen(value) {
      const open = Boolean(value && this.canDisplay());
      if (this.open === open) return;
      if (!open && this.drag) this.cancelDrag();
      this.open = open;
      const toggle = this.bar.querySelector('#inventory-toggle');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '소지품 닫기' : '소지품 열기');
      this.options.onToggle?.(open);
      this.sync();
    }
    toggle() { this.setOpen(!this.open); }
    selectHotbar(index) {
      if (this.isDragging) return false;
      this.layout.selectHotbar(index);
      this.focusedId = this.layout.held() || null;
      this.sync();
      this.announce(this.layout.held() ? this.item(this.layout.held())?.name + '을 손에 들었습니다.' : '빈손입니다.');
      return true;
    }
    cycleHotbar(delta) {
      const state = this.layout.snapshot();
      return this.selectHotbar((state.activeHotbar + (delta > 0 ? 1 : -1) + 9) % 9);
    }
    resetLayout() {
      this.cancelDrag();
      this.layout.reset();
      this.initialized = true;
      this.focusedId = null;
      this.signature = '';
      this.sync();
    }

    click(event) {
      const slot = event.target.closest('[data-inventory-slot]');
      if (!slot) return;
      event.stopPropagation();
      if (performance.now() < this.suppressClickUntil) { event.preventDefault(); return; }
      const index = Number(slot.dataset.inventorySlot);
      if (event.shiftKey && this.open && slot.dataset.inventoryItem) {
        this.layout.autoMove(index);
        this.signature = '';
        this.sync();
        return;
      }
      if (index >= 27) this.selectHotbar(index - 27);
      else { this.focusedId = slot.dataset.inventoryItem || null; this.sync(); }
    }

    pointerDown(event) {
      const slot = event.target.closest('[data-inventory-item]');
      if (!slot || event.button !== 0 || !this.visible) return;
      if (this.drag) this.cancelDrag();
      const panel = slot.closest('#inventory-panel');
      this.drag = { id: slot.dataset.inventoryItem, from: Number(slot.dataset.inventorySlot), pointerId: event.pointerId, pointerType: event.pointerType, originX: event.clientX, originY: event.clientY, x: event.clientX, y: event.clientY, source: slot, active: false, keyboard: false, panel, startedAt: performance.now(), scrollStartY: panel?.scrollTop || 0, scrolling: false };
      try { slot.setPointerCapture(event.pointerId); } catch (_) { /* Pointer may already be cancelled. */ }
    }
    pointerMove(event) {
      const drag = this.drag;
      if (!drag || drag.keyboard || event.pointerId !== drag.pointerId) return;
      drag.x = event.clientX; drag.y = event.clientY;
      const dx = drag.x - drag.originX, dy = drag.y - drag.originY;
      if (!drag.active && !drag.scrolling && drag.pointerType === 'touch' && drag.panel && performance.now() - drag.startedAt < 180) {
        if (Math.abs(dy) > 10) drag.scrolling = true;
        else return;
      }
      if (drag.scrolling) { event.preventDefault(); drag.panel.scrollTop = drag.scrollStartY - dy; return; }
      if (!drag.active && Math.hypot(dx, dy) < 7) return;
      event.preventDefault();
      if (!drag.active) this.startDrag();
      if (!this.drag) return;
      this.moveGhost(drag.x, drag.y);
      this.hover(drag.x, drag.y);
    }
    pointerUp(event) {
      const drag = this.drag;
      if (!drag || drag.keyboard || event.pointerId !== drag.pointerId) return;
      if (drag.scrolling) {
        event.preventDefault(); event.stopPropagation();
        this.suppressClickUntil = performance.now() + 420;
        this.finishDrag(); this.sync(); return;
      }
      if (!drag.active) { this.finishDrag(); return; }
      event.preventDefault(); event.stopPropagation();
      const payload = this.dropAt(event.clientX, event.clientY);
      this.completeDrop(drag, payload);
    }
    startDrag() {
      const drag = this.drag, item = this.item(drag.id);
      if (!item) { this.cancelDrag(); return; }
      drag.active = true;
      this.focusedId = item.id;
      this.notifyHeld();
      for (const slot of document.querySelectorAll('[data-inventory-item]')) slot.classList.toggle('is-drag-source', slot.dataset.inventoryItem === drag.id);
      this.ghost.innerHTML = '<span class="inventory-drag-art">' + icon(item) + '</span><strong>' + escape(item.name) + '</strong><span class="inventory-drag-caption">한 손에 들고 이동 중</span>';
      this.ghost.classList.remove('hidden');
      document.body.classList.add('inventory-dragging');
      this.renderHand();
      this.announce(item.name + ' 집음. 다른 칸이나 장치에 놓으세요.');
    }
    moveGhost(x, y) {
      const width = 126, height = 122, margin = 8;
      const left = Math.min(Math.max(margin, x + 18), window.innerWidth - width - margin);
      const top = Math.min(Math.max(margin, y - 48), window.innerHeight - height - margin);
      this.ghost.style.transform = 'translate3d(' + left + 'px,' + top + 'px,0)';
    }
    dropAt(x, y) {
      const elements = document.elementsFromPoint(x, y);
      const element = elements.map(candidate => candidate.closest('[data-inventory-drop]')).find(Boolean) || null;
      const slot = elements.map(candidate => candidate.closest('[data-inventory-slot]')).find(Boolean) || null;
      return { x, y, zone: element?.dataset.inventoryDrop || null, itemTarget: slot?.dataset.inventoryItem || null, slot: slot ? Number(slot.dataset.inventorySlot) : null };
    }
    completeDrop(drag, payload) {
      this.suppressClickUntil = performance.now() + 420;
      // Device use may synchronously emit model updates. Keep the one cursor item
      // authoritative until its use and any resulting inventory changes finish.
      this.applyingId = drag.id;
      this.finishDrag();
      try {
        let combined = false;
        if (payload.zone === 'inventory') {
          if (payload.itemTarget && payload.itemTarget !== drag.id) combined = this.options.onDrop?.(drag.id, payload) === true;
          if (!combined && Number.isInteger(payload.slot)) this.layout.move(drag.from, payload.slot);
        } else {
          const applied = this.options.onDrop?.(drag.id, payload) === true;
          // A reusable tool stays in the single active hand after it is applied.
          // Items taken from storage swap with that hotbar cell; consumed items disappear.
          if (applied) {
            const owned = (this.options.getItems?.() || []).filter(item => item && item.id);
            this.layout.sync(owned.map(item => item.id));
            const index = this.layout.find(drag.id);
            if (index >= 27) this.layout.selectHotbar(index - 27);
            else if (index >= 0) this.layout.move(index, 27 + this.layout.snapshot().activeHotbar);
          }
        }
      } finally {
        this.applyingId = null;
        this.signature = '';
        this.sync();
        this.notifyHeld(true);
        this.renderHand();
      }
    }
    hover(x, y, explicitElement) {
      const element = explicitElement || document.elementsFromPoint(x, y).map(candidate => candidate.closest('[data-inventory-slot], [data-inventory-drop]')).find(Boolean) || null;
      if (this.hoverElement !== element) {
        this.hoverElement?.classList.remove('inventory-drop-hover');
        this.hoverElement = element;
        if (element) element.classList.add('inventory-drop-hover');
      }
      const zone = element?.closest('[data-inventory-drop]')?.dataset.inventoryDrop || null;
      this.options.onHover?.({ x, y, zone });
    }
    slotKey(event) {
      const slot = event.target.closest('[data-inventory-slot]');
      if (!slot) return;
      if (!this.drag && event.key === 'Escape' && this.open) {
        event.preventDefault(); this.setOpen(false); this.bar.querySelector('#inventory-toggle').focus({ preventScroll: true }); return;
      }
      if (!this.drag && event.key.toLowerCase() === 'i') { event.preventDefault(); this.toggle(); return; }
      if (!this.drag && this.open && /^[1-9]$/.test(event.key)) {
        event.preventDefault(); this.layout.move(Number(slot.dataset.inventorySlot), 26 + Number(event.key)); this.sync(); return;
      }
      if (!this.drag && !this.open && /^[1-9]$/.test(event.key)) {
        event.preventDefault(); this.selectHotbar(Number(event.key) - 1); return;
      }
      if ((event.key === ' ' || event.code === 'Space') && !this.drag && slot.dataset.inventoryItem) {
        event.preventDefault();
        const rect = slot.getBoundingClientRect();
        this.drag = { id: slot.dataset.inventoryItem, from: Number(slot.dataset.inventorySlot), source: slot, pointerId: null, keyboard: true, active: false, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        this.startDrag(); this.keyboardHover();
      }
    }
    keyboardHover() {
      if (!this.drag) return;
      const focused = document.activeElement;
      const element = focused?.closest('[data-inventory-slot], [data-inventory-drop]');
      const rect = focused && focused !== document.body ? focused.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
      const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
      this.drag.x = x; this.drag.y = y; this.moveGhost(x, y); this.hover(x, y, element);
    }
    dragKey(event) {
      if (!this.drag) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); this.cancelDrag(); }
      else if (this.drag.keyboard && event.key === 'Enter') {
        event.preventDefault(); event.stopImmediatePropagation();
        const drag = this.drag, focused = document.activeElement;
        const element = focused?.closest('[data-inventory-drop]'), slot = focused?.closest('[data-inventory-slot]');
        this.completeDrop(drag, { x: drag.x, y: drag.y, zone: element?.dataset.inventoryDrop || null, itemTarget: slot?.dataset.inventoryItem || null, slot: slot ? Number(slot.dataset.inventorySlot) : null });
      }
    }
    finishDrag() {
      const drag = this.drag;
      this.drag = null;
      if (drag?.pointerId != null) { try { drag.source.releasePointerCapture(drag.pointerId); } catch (_) { /* Already released. */ } }
      this.ghost.classList.add('hidden'); this.ghost.innerHTML = '';
      this.hoverElement?.classList.remove('inventory-drop-hover'); this.hoverElement = null;
      document.body.classList.remove('inventory-dragging');
      for (const slot of document.querySelectorAll('.is-drag-source')) slot.classList.remove('is-drag-source');
      this.options.onHover?.(null);
    }
    cancelDrag() {
      if (!this.drag) return false;
      const active = this.drag.active;
      this.finishDrag();
      if (active) { this.suppressClickUntil = performance.now() + 420; this.announce('물건을 원래 칸에 되돌렸습니다.'); }
      this.sync(); this.notifyHeld(true); this.renderHand(); return true;
    }
    announce(message) {
      clearTimeout(this.announceTimer); this.live.textContent = '';
      this.announceTimer = setTimeout(() => { this.live.textContent = message; }, 25);
    }
    destroy() {
      this.cancelDrag(); this.setOpen(false); this.abort.abort(); clearTimeout(this.announceTimer);
      this.panel.remove(); this.bar.remove(); this.hand.remove(); this.ghost.remove(); this.live.remove();
      document.body.classList.remove('inventory-visible', 'inventory-open', 'inventory-dragging');
    }
  }
  NS.Inventory = Inventory;
})(window.LastSignal = window.LastSignal || {});
