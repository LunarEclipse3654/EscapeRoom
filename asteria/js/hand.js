(function (global) {
  'use strict';
  const NS = global.LastSignal = global.LastSignal || {};

  /** A single right hand attached to the player's camera; it never owns inventory. */
  class HandView {
    constructor({ camera, scene }) {
      const T = global.THREE;
      this.T = T;
      this.camera = camera;
      this.disposed = false;
      this.itemId = null;
      this.itemIcon = null;
      this.itemTexture = null;
      this.itemMaterial = null;
      this.geometries = {
        box: new T.BoxGeometry(1, 1, 1),
        cylinder: new T.CylinderGeometry(1, 1, 1, 8),
        circle: new T.CircleGeometry(1, 12),
        ring: new T.RingGeometry(.62, 1, 12),
        plane: new T.PlaneGeometry(1, 1)
      };
      const material = (color, extra = {}) => new T.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, toneMapped: false, side: T.DoubleSide, ...extra });
      this.materials = {
        sleeve: material(0x49676c), cuff: material(0x344d54), skin: material(0xc99875), thumb: material(0xb98764),
        brass: material(0xd1ad61), brassDark: material(0x9e7f43), ceramic: material(0xe2ded1), iron: material(0x8d9fa2),
        dark: material(0x29363b), purple: material(0x9e6fe5), glass: material(0xa8d9df, { transparent: true, opacity: .55 }),
        glassRim: material(0x6c8e97), film: material(0xb9d5ce, { transparent: true, opacity: .58 }), paper: material(0xdbcaa5)
      };
      this.rig = new T.Group();
      this.rig.name = 'single-right-hand';
      this.rig.visible = false;
      this.wrist = new T.Group();
      this.wrist.rotation.set(.14, -.16, -.14);
      this.rig.add(this.wrist);
      this._mesh(this.wrist, 'box', 'sleeve', .025, -.205, .14, .17, .33, .17);
      this._mesh(this.wrist, 'box', 'cuff', .012, -.065, .04, .177, .055, .174);
      this._mesh(this.wrist, 'box', 'skin', 0, .005, -.005, .175, .155, .155);
      this._mesh(this.wrist, 'box', 'thumb', -.084, .004, -.05, .058, .082, .09);
      this.itemGroup = new T.Group();
      this.itemGroup.name = 'held-item';
      this.itemGroup.position.set(-.015, .055, -.075);
      this.wrist.add(this.itemGroup);
      camera.add(this.rig);
      if (scene && !camera.parent) scene.add(camera);
    }

    _mesh(parent, geometry, material, x, y, z, sx, sy, sz) {
      const mesh = new this.T.Mesh(this.geometries[geometry], typeof material === 'string' ? this.materials[material] : material);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.renderOrder = 100;
      mesh.frustumCulled = false;
      parent.add(mesh);
      return mesh;
    }

    _clearItem() {
      while (this.itemGroup.children.length) this.itemGroup.remove(this.itemGroup.children[0]);
      if (this.itemTexture) this.itemTexture.dispose();
      if (this.itemMaterial) this.itemMaterial.dispose();
      this.itemTexture = null;
      this.itemMaterial = null;
    }

    _paperMaterial(item, film) {
      // Inventory supplies the current physical arrangement, never a solved replacement.
      if (!global.document) return film ? this.materials.film : this.materials.paper;
      const T = this.T;
      const artwork = NS.ItemArt?.descriptor(item);
      const ratio = artwork?.aspect || 1.5;
      const canvas = document.createElement('canvas');
      const resolution = 1024;
      canvas.width = ratio >= 1 ? resolution : Math.round(resolution * ratio);
      canvas.height = ratio >= 1 ? Math.round(resolution / ratio) : resolution;
      const ctx = canvas.getContext('2d');
      if (!ctx) return film ? this.materials.film : this.materials.paper;
      // Leave film holes and the round disc transparent instead of painting fake text.
      if (!film && item.id !== 'cipher') { ctx.fillStyle = '#e3d5b4'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      texture.minFilter = T.LinearFilter;
      texture.magFilter = T.LinearFilter;
      texture.generateMipmaps = false;
      this.itemTexture = texture;
      this.itemMaterial = new T.MeshBasicMaterial({ map: texture, color: 0xffffff, side: T.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false, transparent: true, opacity: 1 });
      let source = artwork?.source || '';
      const thumbnail = typeof item.icon === 'string' ? item.icon.trim() : '';
      if (!source && thumbnail.startsWith('<svg')) {
        const svg = thumbnail.includes('xmlns=') ? thumbnail : thumbnail.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        source = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      } else if (!source && thumbnail.startsWith('<img')) {
        const holder = document.createElement('div'); holder.innerHTML = thumbnail;
        const image = holder.querySelector('img'); source = image ? image.getAttribute('src') || '' : '';
      } else if (!source && thumbnail.startsWith('data:image/')) source = thumbnail;
      // Assets are self-contained. Do not introduce network requests for a held thumbnail.
      if (source.startsWith('data:image/') && typeof global.Image === 'function') {
        const image = new Image();
        image.onload = () => {
          if (this.disposed || this.itemTexture !== texture) return;
          const scale = Math.min(canvas.width / Math.max(1, image.width), canvas.height / Math.max(1, image.height));
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, (canvas.width - image.width * scale) / 2, (canvas.height - image.height * scale) / 2, image.width * scale, image.height * scale);
          texture.needsUpdate = true;
        };
        image.src = source;
      }
      return this.itemMaterial;
    }

    _setItem(item) {
      this._clearItem();
      this.itemId = item ? item.id : null;
      this.itemIcon = item ? item.icon : null;
      if (!item) return;
      const object = new this.T.Group();
      object.name = 'held-' + item.id;
      this.itemGroup.add(object);
      if (item.id === 'key') {
        this._mesh(object, 'ring', 'brass', 0, .245, 0, .088, .088, 1);
        this._mesh(object, 'box', 'brass', 0, .105, 0, .028, .20, .025);
        this._mesh(object, 'box', 'brassDark', .027, .037, 0, .075, .029, .029);
        this._mesh(object, 'box', 'brass', .024, .08, 0, .068, .025, .029);
      } else if (item.id === 'fuse') {
        this._mesh(object, 'cylinder', 'ceramic', 0, .125, 0, .043, .225, .043);
        this._mesh(object, 'cylinder', 'iron', 0, .243, 0, .046, .043, .046);
        this._mesh(object, 'cylinder', 'iron', 0, .009, 0, .046, .043, .046);
      } else if (item.id === 'cipher') {
        this._mesh(object, 'circle', 'brassDark', 0, .16, -.004, .168, .168, 1);
        this._mesh(object, 'plane', this._paperMaterial(item, false), 0, .16, .003, .35, .35, 1);
        object.rotation.y = -.12;
      } else if (item.id === 'lens') {
        this._mesh(object, 'circle', 'glass', 0, .16, 0, .145, .145, 1);
        this._mesh(object, 'ring', 'glassRim', 0, .16, .003, .154, .154, 1);
        object.rotation.y = -.22;
      } else if (item.id === 'uv') {
        this._mesh(object, 'cylinder', 'dark', 0, .10, 0, .052, .23, .052);
        this._mesh(object, 'cylinder', 'iron', 0, .233, 0, .07, .062, .07);
        const light = this._mesh(object, 'circle', 'purple', 0, .266, 0, .056, .056, 1);
        light.rotation.x = -Math.PI / 2;
        object.rotation.x = .45;
      } else {
        const film = item.id === 'acetate' || item.id === 'stripA' || item.id === 'stripB';
        const strip = item.id === 'stripA' || item.id === 'stripB';
        const ratio = NS.ItemArt?.descriptor(item)?.aspect || (strip ? 2.75 : 1.5);
        const width = item.id === 'acetate' ? .31 : strip ? .46 : .44;
        this._mesh(object, 'plane', this._paperMaterial(item, film), -.035, .15, 0, width, width / ratio, 1);
        object.rotation.set(-.04, -.08, -.045);
      }
    }

    update(dt, time, options = {}) {
      if (this.disposed) return;
      const item = options.item || null;
      if ((item ? item.id : null) !== this.itemId || (item ? item.icon : null) !== this.itemIcon) this._setItem(item);
      this.rig.visible = options.visible !== false;
      if (!this.rig.visible) return;
      const fov = (this.camera.fov || 65) * Math.PI / 180;
      const vertical = Math.tan(fov / 2) * .8;
      const right = vertical * Math.max(.35, this.camera.aspect || 1);
      const scale = Math.min(1, Math.max(.64, (this.camera.aspect || 1) * .9));
      this.rig.scale.setScalar(scale);
      const bob = options.moving && !options.reducedMotion ? 1 : 0;
      const t = Number.isFinite(time) ? time : 0;
      this.rig.position.set(Math.min(.43, Math.max(.055, right - .20 * scale)) - Math.max(0, 1 - (this.camera.aspect || 1)) * .08 + Math.sin(t * 8) * .007 * bob, -vertical * .77 + Math.max(0, 1 - (this.camera.aspect || 1)) * .22 + Math.abs(Math.sin(t * 8)) * .008 * bob, -.8);
      this.rig.rotation.set(Math.sin(t * 8) * .009 * bob, 0, Math.sin(t * 4) * .012 * bob);
    }

    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this._clearItem();
      this.camera.remove(this.rig);
      Object.values(this.geometries).forEach(geometry => geometry.dispose());
      Object.values(this.materials).forEach(material => material.dispose());
    }
  }

  NS.HandView = HandView;
})(globalThis);
