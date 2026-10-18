(function () {
  'use strict';
  const T = window.THREE;
  window.LastSignal = window.LastSignal || {};
  const PI = Math.PI;
  const palette = { teal: 0x173e42, tealLight: 0x28565a, trim: 0x91a2a0, brass: 0xb99a60, wood: 0x523b2d, dark: 0x15272b, cream: 0xeadab7, orange: 0xf3b866 };
  function canvas(w, h, paint) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    paint(c.getContext('2d'), w, h);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4; return tex;
  }
  function textLine(ctx, text, x, y, size, color, weight, align) {
    ctx.font = `${weight || 500} ${size}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
    ctx.fillStyle = color || '#eddfbd'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
  }
  const boxG = new T.BoxGeometry(1, 1, 1);
  const cylG = new T.CylinderGeometry(1, 1, 1, 20);
  const planeG = new T.PlaneGeometry(1, 1);
  const sphereG = new T.SphereGeometry(1, 16, 10);
  class World {
    constructor(scene) {
      this.scene = scene; this.colliders = []; this.targets = []; this.doorProgress = 0;
      this.spawn = { x: 0, y: 1.65, z: 3.3, yaw: 0 };
      this.materials = {}; this.lights = []; this.blink = []; this.disposables = [];
      this.mat('teal', palette.teal); this.mat('tealLight', palette.tealLight); this.mat('dark', palette.dark);
      this.mat('wood', palette.wood); this.mat('woodLight', 0x7d5a3d); this.mat('cream', palette.cream);
      this.mat('brass', palette.brass, .58, .36); this.mat('iron', 0x3b5054, .48, .4);
      this.mat('black', 0x101a1b); this.mat('rug', 0x9f6246); this.mat('leaf', 0x426c58);
      this.mat('paper', 0xd7c9a7); this.mat('cushion', 0x8d7454);
      this.room(); this.exterior(); this.desk(); this.locker(); this.power(); this.gauges(); this.radio(); this.exit(); this.decor(); this.lighting();
    }
    mat(name, color, metalness = 0, roughness = .82, extra = {}) {
      return this.materials[name] = new T.MeshStandardMaterial({ color, metalness, roughness, ...extra });
    }
    mesh(g, m, x, y, z, sx = 1, sy = 1, sz = 1, parent = this.scene) {
      const mesh = new T.Mesh(g, typeof m === 'string' ? this.materials[m] : m);
      mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    }
    box(m, x, y, z, sx, sy, sz, parent) { return this.mesh(boxG, m, x, y, z, sx, sy, sz, parent); }
    cyl(m, x, y, z, r, h, parent) { return this.mesh(cylG, m, x, y, z, r, h, r, parent); }
    group(x, y, z, angle = 0, parent = this.scene) { const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = angle; parent.add(g); return g; }
    collider(minX, maxX, minZ, maxZ) { this.colliders.push({ minX, maxX, minZ, maxZ }); }
    target(id, label, mesh) { this.targets.push({ id, label, mesh }); mesh.userData.interactionId = id; return mesh; }
    art(id, w, h, parent, options = {}) {
      // SVG clues are copied onto opaque canvases. This avoids transparency/depth
      // artefacts and leaves every texture available in the offline HTML build.
      const tex = canvas(768, Math.max(256, Math.round(768 * h / w)), (c, W, H) => {
        c.fillStyle = id === 'atlas' ? '#17373e' : '#d8cbae'; c.fillRect(0, 0, W, H);
        c.strokeStyle = '#8f947b'; c.lineWidth = 4; c.strokeRect(18, 18, W - 36, H - 36);
      });
      const mesh = new T.Mesh(planeG, new T.MeshStandardMaterial({ map: tex, roughness: .95 }));
      mesh.scale.set(w, h, 1); if (parent) parent.add(mesh);
      if (window.LastSignal.Art) {
        const img = new Image();
        img.onload = () => {
          if (id === 'photo') { this.photoImage = img; this.photoTexture = tex; this.drawPhoto(); }
          else {
            const c = tex.image.getContext('2d'), W = tex.image.width, H = tex.image.height;
            const scale = Math.min(W / img.width, H / img.height), dw = img.width * scale, dh = img.height * scale;
            c.fillStyle = id === 'atlas' ? '#17373e' : id === 'paintingUV' ? '#283443' : id === 'painting' ? '#918263' : '#d8cbae'; c.fillRect(0, 0, W, H);
            c.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh); tex.needsUpdate = true;
          }
        };
        img.src = window.LastSignal.Art.url(id, options);
      }
      return mesh;
    }
    drawPhoto() {
      if (!this.photoImage || !this.photoTexture) return;
      const tex = this.photoTexture, c = tex.image.getContext('2d'), W = tex.image.width, H = tex.image.height;
      const order = this.photoOrder || [4, 0, 5, 2, 1, 3], img = this.photoImage;
      c.fillStyle = '#b8ad93'; c.fillRect(0, 0, W, H);
      for (let n = 0; n < 6; n++) {
        const tile = order[n]; c.drawImage(img, tile % 3 * img.width / 3, Math.floor(tile / 3) * img.height / 2, img.width / 3, img.height / 2, n % 3 * W / 3 + 2, Math.floor(n / 3) * H / 2 + 2, W / 3 - 4, H / 2 - 4);
      }
      tex.needsUpdate = true;
    }
    icon(name, w = .11, h = .16) {
      // The room and close-up instruments share the exact same engraved SVG.
      name = ({ hex: 'notch', grid: 'relay', wave: 'waves' })[name] || name;
      this.iconTextures = this.iconTextures || new Map();
      if (this.iconTextures.has(name)) {
        const mesh = new T.Mesh(planeG, new T.MeshBasicMaterial({ map: this.iconTextures.get(name), transparent: true, depthWrite: false })); mesh.scale.set(w, h, 1); return mesh;
      }
      const tex = canvas(180, 240, (c, W, H) => {
        c.clearRect(0, 0, W, H); c.strokeStyle = '#d8bc7b'; c.fillStyle = '#d8bc7b'; c.lineWidth = 8; c.lineCap = 'round'; c.lineJoin = 'round';
        c.save(); c.translate(W / 2, H / 2);
        if (name === 'anchor') { c.beginPath(); c.arc(0, -55, 14, 0, 2 * PI); c.moveTo(0, -40); c.lineTo(0, 62); c.moveTo(-29, -20); c.lineTo(29, -20); c.moveTo(-50, 12); c.quadraticCurveTo(-48, 66, 0, 62); c.quadraticCurveTo(48, 66, 50, 12); c.moveTo(-50, 12); c.lineTo(-30, 26); c.moveTo(50, 12); c.lineTo(30, 26); c.stroke(); }
        else if (name === 'moon') { c.beginPath(); c.arc(-8, 0, 55, .5, 5.8); c.quadraticCurveTo(-35, -4, 40, 28); c.closePath(); c.fill(); }
        else if (name === 'bird') { c.beginPath(); c.moveTo(-65, 24); c.quadraticCurveTo(-35, -33, 0, 0); c.quadraticCurveTo(35, -33, 65, 24); c.stroke(); }
        else if (name === 'lighthouse') { c.beginPath(); c.moveTo(-28, 65); c.lineTo(-20, -36); c.lineTo(20, -36); c.lineTo(28, 65); c.closePath(); c.stroke(); c.strokeRect(-29, -60, 58, 25); c.beginPath(); c.moveTo(-39, -63); c.lineTo(0, -83); c.lineTo(39, -63); c.moveTo(-15, 8); c.lineTo(20, 8); c.stroke(); }
        else if (name === 'shell') { c.beginPath(); c.moveTo(-50, 30); c.quadraticCurveTo(-64, -65, 0, -62); c.quadraticCurveTo(64, -65, 50, 30); c.lineTo(13, 58); c.lineTo(-13, 58); c.closePath(); c.stroke(); for (const x of [-35, 0, 35]) { c.beginPath(); c.moveTo(x, -48); c.lineTo(0, 44); c.stroke(); } }
        else if (name === 'fish') { c.beginPath(); c.moveTo(-47, 0); c.quadraticCurveTo(0, -49, 43, 0); c.quadraticCurveTo(0, 49, -47, 0); c.lineTo(-71, -31); c.lineTo(-71, 31); c.closePath(); c.stroke(); c.beginPath(); c.arc(25, -3, 4, 0, 2 * PI); c.fill(); }
        else if (name === 'relay') { c.strokeRect(-60, -60, 120, 120); for (let r = 0; r < 3; r++) for (let col = 0; col < 3; col++) { c.beginPath(); c.arc((col - 1) * 32, (r - 1) * 32, 7, 0, 2 * PI); c.fill(); } }
        else if (name === 'register') { c.beginPath(); c.moveTo(-60, -35); c.lineTo(-35, -60); c.lineTo(60, -60); c.lineTo(60, 60); c.lineTo(-60, 60); c.closePath(); c.stroke(); for (const yy of [-25, 0, 25]) { c.beginPath(); c.moveTo(-35, yy); c.lineTo(38, yy); c.stroke(); } }
        else if (name === 'compass') { c.beginPath(); c.moveTo(0, -67); c.lineTo(22, -8); c.lineTo(0, 57); c.lineTo(-22, -8); c.closePath(); c.stroke(); c.beginPath(); c.arc(0, -8, 56, 0, 2 * PI); c.stroke(); }
        else if (name === 'notch') { c.beginPath(); for (const [x,y] of [[-58,-35],[-35,-58],[35,-58],[58,-35],[58,35],[35,58],[-35,58],[-58,35]]) { if (x === -58 && y === -35) c.moveTo(x,y); else c.lineTo(x,y); } c.closePath(); c.stroke(); c.beginPath(); c.moveTo(-58,-15); c.lineTo(-35,0); c.lineTo(-58,15); c.stroke(); }
        else if (name === 'waves') { for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(-65, k * 32); c.bezierCurveTo(-20, k * 32 - 32, 20, k * 32 + 32, 65, k * 32); c.stroke(); } }
        else if (name === 'circle') { c.beginPath(); c.arc(0, 0, 52, 0, PI * 2); c.fill(); }
        c.restore();
      });
      this.iconTextures.set(name, tex);
      if (window.LastSignal.Art && window.LastSignal.Art.icon && typeof Image !== 'undefined') {
        const img = new Image(); img.onload = () => { const c = tex.image.getContext('2d'); c.clearRect(0,0,tex.image.width,tex.image.height); c.drawImage(img,0,0,tex.image.width,tex.image.height); tex.needsUpdate = true; };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(window.LastSignal.Art.icon(name, { color: '#d8bc7b', size: 240 }));
      }
      const mesh = new T.Mesh(planeG, new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); mesh.scale.set(w, h, 1); return mesh;
    }
    rod(m, from, to, r, parent) {
      const a = new T.Vector3(...from), b = new T.Vector3(...to), d = b.clone().sub(a);
      const mesh = this.mesh(cylG, m, ...a.clone().add(b).multiplyScalar(.5).toArray(), r, d.length(), r, parent);
      mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); return mesh;
    }
    sign(text, subtitle, w = 1, h = .35, color = '#d9c08a', bg = '#142b30') {
      const tex = canvas(768, Math.round(768 * h / w), (c, W, H) => {
        c.fillStyle = bg; c.fillRect(0, 0, W, H); c.strokeStyle = color; c.lineWidth = 3; c.strokeRect(9, 9, W - 18, H - 18);
        textLine(c, text, W / 2, subtitle ? H * .37 : H * .52, subtitle ? H * .29 : H * .43, color, 700);
        if (subtitle) textLine(c, subtitle, W / 2, H * .76, H * .13, color, 500);
      });
      const m = new T.MeshBasicMaterial({ map: tex }); const p = new T.Mesh(planeG, m); p.scale.set(w, h, 1); return p;
    }
    placeSign(text, subtitle, x, y, z, w, h, angle = 0, parent = this.scene) {
      const p = this.sign(text, subtitle, w, h); p.position.set(x, y, z); p.rotation.y = angle; parent.add(p); return p;
    }
    relabel(mesh, text, subtitle) {
      const texture = mesh.material.map, c = texture.image.getContext('2d'), W = texture.image.width, H = texture.image.height;
      c.fillStyle = '#142b30'; c.fillRect(0, 0, W, H); c.strokeStyle = '#d9c08a'; c.lineWidth = 3; c.strokeRect(9, 9, W - 18, H - 18);
      textLine(c, text, W / 2, subtitle ? H * .37 : H * .52, subtitle ? H * .29 : H * .43, '#d9c08a', 700);
      if (subtitle) textLine(c, subtitle, W / 2, H * .76, H * .13, '#d9c08a', 500);
      texture.needsUpdate = true;
    }
    shadow(x, z, sx, sz, opacity = .32, parent = this.scene) {
      if (!this.shadowTexture) this.shadowTexture = canvas(128, 128, c => { const grad = c.createRadialGradient(64, 64, 1, 64, 64, 62); grad.addColorStop(0, 'rgba(0,0,0,.8)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = grad; c.fillRect(0, 0, 128, 128); });
      const p = new T.Mesh(planeG, new T.MeshBasicMaterial({ map: this.shadowTexture, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
      p.rotation.x = -PI / 2; p.position.set(x, .015, z); p.scale.set(sx, sz, 1); parent.add(p); return p;
    }
    room() {
      const tex = canvas(1024, 1024, (c, w, h) => {
        c.fillStyle = '#72513b'; c.fillRect(0, 0, w, h);
        let seed = 4; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        for (let row = 0; row < 16; row++) {
          const yy = row * 64; c.fillStyle = ['#74513b', '#7e5a42', '#694a37', '#826047'][row % 4]; c.fillRect(0, yy + 2, w, 61);
          for (let k = 0; k < 25; k++) { c.strokeStyle = `rgba(32,19,12,${.03 + rnd() * .1})`; c.beginPath(); c.moveTo(rnd() * w, yy + rnd() * 63); c.lineTo(rnd() * w, yy + rnd() * 63); c.stroke(); }
          for (let xx = (row % 3) * 112; xx < w; xx += 340) { c.fillStyle = '#493526'; c.fillRect(xx, yy, 2, 64); c.fillRect(xx + 7, yy + 8, 2, 2); c.fillRect(xx + 7, yy + 54, 2, 2); }
        }
      }); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(2, 2);
      const floor = new T.MeshStandardMaterial({ map: tex, roughness: .75 }); this.box(floor, 0, -.12, .5, 10.2, .22, 9.2);
      this.box('teal', -5.05, 1.9, .5, .16, 3.8, 9.15); this.box('teal', 5.05, 1.9, .5, .16, 3.8, 9.15);
      this.box('teal', 0, .54, -4.05, 10.2, 1.08, .18); this.box('teal', 0, 3.55, -4.05, 10.2, .5, .18);
      this.box('teal', -4.52, 2.18, -4.05, 1.15, 2.2, .18); this.box('teal', 4.52, 2.18, -4.05, 1.15, 2.2, .18);
      for (const x of [-2.98, 0, 2.98]) {
        this.box('wood', x, 2.13, -3.97, .1, 2.25, .18);
        this.box('brass', x, 2.13, -3.86, .035, 2.22, .035);
      }
      this.box('wood', 0, 1.07, -3.9, 8.0, .12, .35); this.box('brass', 0, 1.14, -3.78, 8.0, .025, .06);
      this.box('wood', 0, 3.27, -3.95, 8.0, .13, .22);
      const glass = new T.MeshPhysicalMaterial({ color: 0x81b7c3, transparent: true, opacity: .055, roughness: .25, metalness: .12, side: T.DoubleSide, depthWrite: false });
      this.box(glass, 0, 2.2, -4.02, 7.9, 2.12, .025);
      for (const s of [-1, 1]) {
        this.box('wood', s * 5.0, .14, .5, .1, .25, 9.0);
        this.box('wood', s * 5.0, 1.02, .5, .06, .085, 9.0);
        for (const z of [-3.1, -1.1, .9, 2.9, 4.7]) this.box('tealLight', s * 4.94, .58, z, .04, .76, .045);
      }
      this.box('wood', 0, .14, -3.91, 10, .25, .10);
      this.box('teal', -2.98, 1.9, 5.05, 4.1, 3.8, .16); this.box('teal', 2.98, 1.9, 5.05, 4.1, 3.8, .16);
      this.box('teal', 0, 3.46, 5.05, 1.9, .68, .16);
      this.box('wood', -3, .14, 4.94, 4, .25, .1); this.box('wood', 3, .14, 4.94, 4, .25, .1);
      this.box('teal', 0, 3.89, .5, 10.2, .18, 9.2);
      for (const z of [-3.55, .25, 4.45]) this.box('wood', 0, 3.68, z, 10, .26, .24);
      for (const x of [-4.65, 4.65]) this.box('wood', x, 3.68, .5, .22, .26, 9.1);
      this.collider(-5.2, -4.9, -4.2, 5.2); this.collider(4.9, 5.2, -4.2, 5.2); this.collider(-5.2, 5.2, -4.2, -3.9);
      this.collider(-5.2, -.98, 4.9, 5.2); this.collider(.98, 5.2, 4.9, 5.2);
      const rugTex = canvas(512, 512, (c, w, h) => {
        c.fillStyle = '#945e45'; c.fillRect(0, 0, w, h); c.strokeStyle = '#caa67b'; c.lineWidth = 9; c.strokeRect(19, 19, w - 38, h - 38);
        c.lineWidth = 2; c.strokeRect(33, 33, w - 66, h - 66); c.save(); c.translate(w / 2, h / 2); c.rotate(PI / 4); c.strokeStyle = '#bf9666'; c.lineWidth = 11; c.strokeRect(-113, -113, 226, 226); c.lineWidth = 4; c.strokeRect(-90, -90, 180, 180); c.restore();
        for (let i = 0; i < 12; i++) { c.fillStyle = 'rgba(230,200,155,.035)'; c.fillRect(0, i * 45, 512, 1); }
      });
      const rug = new T.Mesh(planeG, new T.MeshStandardMaterial({ map: rugTex, roughness: 1 })); rug.rotation.x = -PI / 2; rug.position.set(0, .014, .45); rug.scale.set(3.35, 3.3, 1); rug.receiveShadow = true; this.scene.add(rug);
    }
    exterior() {
      const ocean = new T.MeshStandardMaterial({ color: 0x264754, roughness: .42, metalness: .33 }); this.box(ocean, 0, -.7, -31, 110, .05, 64);
      const foam = new T.MeshBasicMaterial({ color: 0x94bfc2, transparent: true, opacity: .12 });
      for (let i = 0; i < 14; i++) { const p = this.box(foam, (i % 3 - 1) * 8, -.66, -8 - i * 2.1, 14 + (i % 4) * 5, .005, .035); p.rotation.y = .05 * Math.sin(i); p.castShadow = false; }
      const islandMat = new T.MeshStandardMaterial({ color: 0x1c343c, roughness: 1 });
      for (const [x, z, sx, sy, sz] of [[-12, -27, 8, 2.0, 3], [12, -32, 10, 3.0, 3], [-1, -44, 7, 2.6, 4]]) this.mesh(new T.IcosahedronGeometry(1, 1), islandMat, x, -.6, z, sx, sy, sz).castShadow = false;
      const lighthouse = this.group(10.5, .8, -31.5);
      this.mesh(new T.CylinderGeometry(.48, .75, 3.4, 12), 'cream', 0, 1.7, 0, 1, 1, 1, lighthouse).castShadow = false;
      this.cyl('rug', 0, 2.3, 0, .57, .30, lighthouse).castShadow = false;
      this.cyl('dark', 0, 3.50, 0, .73, .15, lighthouse).castShadow = false;
      this.cyl(new T.MeshBasicMaterial({ color: 0xd7dbac }), 0, 3.79, 0, .44, .42, lighthouse).castShadow = false;
      for (let i = 0; i < 6; i++) { const a = i * PI / 3; this.box('dark', Math.sin(a) * .48, 3.80, Math.cos(a) * .48, .055, .50, .055, lighthouse).castShadow = false; }
      this.mesh(new T.ConeGeometry(.80, .48, 12), 'dark', 0, 4.2, 0, 1, 1, 1, lighthouse).castShadow = false;
      const moon = new T.MeshBasicMaterial({ color: 0xf4e9ca }); this.mesh(sphereG, moon, -7, 6.0, -28, 1.25, 1.25, 1.25).castShadow = false;
      this.shadow(-3, -3, 1, 1, .001);
      const moonHalo = new T.Mesh(planeG, new T.MeshBasicMaterial({ map: this.shadowTexture, color: 0xe0e1cc, transparent: true, opacity: .10, blending: T.AdditiveBlending, depthWrite: false }));
      moonHalo.position.set(-7, 6, -28.05); moonHalo.scale.set(6, 6, 1); this.scene.add(moonHalo);
      const positions = []; for (let i = 0; i < 170; i++) { const f = Math.sin(i * 92.27) * 4357.8; const q = f - Math.floor(f); positions.push((q - .5) * 90, 5 + ((i * .618) % 1) * 32, -27 - ((i * .37) % 1) * 35); }
      const starsG = new T.BufferGeometry(); starsG.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      const stars = new T.Points(starsG, new T.PointsMaterial({ color: 0xd7e4de, size: .065, transparent: true, opacity: .7, sizeAttenuation: true })); this.scene.add(stars);
      this.placeSign('해무 관측소', 'HAEMU COASTAL OBSERVATORY  ·  EST. 1974', 0, .62, -3.785, 2.7, .45);
    }
    desk() {
      this.shadow(0, -2, 4.5, 2.8, .48);
      this.box('wood', 0, .91, -2.05, 3.2, .14, 1.5); this.box('woodLight', 0, .99, -2.05, 3.26, .04, 1.54);
      for (const x of [-1.36, 1.36]) for (const z of [-2.58, -1.52]) this.box('wood', x, .45, z, .16, .9, .16);
      this.box('wood', -.92, .72, -1.50, .86, .35, .13);
      this.drawerGroup = this.group(-.92, .72, -1.41);
      this.box('woodLight', 0, 0, 0, .80, .29, .12, this.drawerGroup);
      this.box('brass', .15, .02, .085, .23, .025, .045, this.drawerGroup);
      this.cyl('brass', -.22, 0, .073, .04, .018, this.drawerGroup).rotation.x = PI / 2;
      this.box('black', -.22, -.009, .086, .013, .033, .005, this.drawerGroup);
      this.target('drawer', '서랍', this.drawerGroup);
      this.box('wood', .92, .72, -1.48, .82, .31, .15); this.box('brass', .92, .73, -1.38, .23, .025, .04);
      const photo = this.group(.42, 1.029, -1.80, -.12);
      this.box('dark', 0, .02, 0, .77, .045, .59, photo); this.box('paper', 0, .047, 0, .73, .017, .55, photo);
      const picture = this.art('photo', .69, .47, photo); picture.rotation.x = -PI / 2; picture.position.y = .059;
      const binding = this.icon('anchor', .055, .07); binding.rotation.x = -PI / 2; binding.position.set(-.335, .064, .235); photo.add(binding);
      this.target('photo', '사진 조각', photo);
      const light = this.group(-.66, 1.04, -1.96, -.045);
      this.box('iron', 0, 0, 0, .87, .08, .68, light); this.box('brass', 0, .045, 0, .81, .025, .62, light);
      this.lightTableSurface = this.box(new T.MeshStandardMaterial({ color: 0x9bafa3, emissive: 0xd1e7c9, emissiveIntensity: 0, roughness: .65 }), 0, .062, 0, .75, .012, .56, light);
      this.box('dark', -.329, .073, -.22, .065, .004, .055, light);
      const notch = this.icon('notch', .065, .065); notch.rotation.x = -PI / 2; notch.position.set(.36, .08, .23); light.add(notch);
      const registration = this.icon('diamond', .095, .095); registration.rotation.x = -PI / 2; registration.position.set(0, .075, 0); light.add(registration);
      this.stripAVisual = this.art('stripA', .68, .30, light); this.stripAVisual.rotation.x = -PI / 2; this.stripAVisual.position.y = .079; this.stripAVisual.visible = false;
      this.stripBVisual = this.art('stripB', .68, .30, light); this.stripBVisual.rotation.x = -PI / 2; this.stripBVisual.position.y = .082; this.stripBVisual.visible = false;
      this.finaleVisual = this.art('finale', .68, .30, light); this.finaleVisual.rotation.x = -PI / 2; this.finaleVisual.position.y = .085; this.finaleVisual.visible = false;
      this.target('lighttable', '투광판', light);
      this.box('brass', .08, 1.04, -2.46, .018, .018, .40).rotation.y = .65;
      this.cyl('cream', 1.1, 1.13, -2.28, .105, .25); this.cyl('black', 1.1, 1.258, -2.28, .083, .005);
      const handle = new T.Mesh(new T.TorusGeometry(.085, .018, 7, 16), this.materials.cream); handle.position.set(1.22, 1.13, -2.28); handle.rotation.y = PI / 2; this.scene.add(handle);
      this.cyl('brass', -1.10, 1.04, -2.55, .18, .07); this.cyl('brass', -1.10, 1.35, -2.55, .022, .59);
      const shade = new T.Mesh(new T.ConeGeometry(.31, .27, 24, 1, true), new T.MeshStandardMaterial({ color: 0x42655a, roughness: .45, metalness: .4, side: T.DoubleSide })); shade.position.set(-1.10, 1.67, -2.55); this.scene.add(shade);
      this.cyl(new T.MeshBasicMaterial({ color: 0xffd99a }), -1.10, 1.54, -2.55, .18, .015);
      const lamp = new T.PointLight(0xffca7e, 2.0, 4.5, 2); lamp.position.set(-1.10, 1.5, -2.55); this.scene.add(lamp); this.lights.push(lamp);
      this.collider(-1.65, 1.65, -2.85, -1.26);
      const stool = this.group(0, 0, -.93); this.cyl('wood', 0, .51, 0, .34, .11, stool);
      for (const x of [-.23, .23]) for (const z of [-.2, .2]) this.box('wood', x, .25, z, .06, .5, .06, stool);
      this.collider(-.36, .36, -1.23, -.58);
    }
    locker() {
      const g = this.group(-4.28, 0, -1.1, PI / 2); this.shadow(-4.24, -1.1, 1.8, 2.0, .46);
      this.box('iron', 0, 1.22, 0, 1.28, 2.42, 1.12, g);
      this.cabinetDoor = this.group(-.58, 0, .578, 0, g);
      this.box('tealLight', .58, 1.28, 0, 1.16, 2.20, .07, this.cabinetDoor);
      this.box('brass', .58, 2.36, .044, 1.12, .035, .03, this.cabinetDoor);
      for (const yy of [1.95, 2.02, 2.09]) this.box('dark', .58, yy, .046, .69, .017, .012, this.cabinetDoor);
      const motif = this.icon('register', .20, .20); motif.position.set(.58, 1.68, .044); this.cabinetDoor.add(motif);
      this.box('black', .58, 1.13, .07, .65, .27, .08, this.cabinetDoor);
      for (let i = 0; i < 4; i++) {
        this.cyl('brass', .37 + i * .14, 1.13, .145, .062, .10, this.cabinetDoor).rotation.x = PI / 2;
        this.box('cream', .37 + i * .14, 1.13, .20, .015, .045, .006, this.cabinetDoor);
      }
      this.box('brass', 1.0, 1.12, .102, .055, .35, .075, this.cabinetDoor);
      for (const yy of [.38, 2.12]) this.box('brass', 0, yy, .04, .07, .19, .06, this.cabinetDoor);
      for (const x of [-.45, .45]) this.box('iron', x, .10, 0, .15, .2, .8, g);
      this.target('cabinet', '금속 보관함', g); this.collider(-4.91, -3.60, -1.77, -.43);
    }
    power() {
      const g = this.group(-4.86, 1.68, 2.05, PI / 2);
      this.box('iron', 0, 0, -.035, 1.18, 1.62, .17, g); this.box('dark', 0, 0, .065, 1.07, 1.50, .025, g);
      const motif = this.icon('relay', .16, .16); motif.position.set(-.34, .58, .09); g.add(motif);
      this.powerButtons = [];
      for (let i = 0; i < 9; i++) {
        const x = (i % 3 - 1) * .27, y = .22 - Math.floor(i / 3) * .27;
        this.box('iron', x, y, .10, .22, .22, .06, g);
        const button = this.box(new T.MeshStandardMaterial({ color: 0x3c6664, emissive: 0x58bf9a, emissiveIntensity: 0, roughness: .5, metalness: .2 }), x, y, .144, .165, .165, .036, g); this.powerButtons.push(button);
      }
      this.powerLight = this.mesh(sphereG, new T.MeshStandardMaterial({ color: 0x925241, emissive: 0x7d2216, emissiveIntensity: .3 }), .35, .58, .12, .055, .055, .035, g);
      this.box('black', 0, -.55, .095, .67, .18, .045, g);
      for (const x of [-.23, .23]) this.box('brass', x, -.55, .125, .09, .15, .06, g);
      this.fuseMesh = this.group(0, -.55, .16, 0, g); this.cyl('cream', 0, 0, 0, .051, .39, this.fuseMesh).rotation.z = PI / 2;
      for (const x of [-.18, .18]) this.cyl('brass', x, 0, 0, .056, .08, this.fuseMesh).rotation.z = PI / 2;
      this.fuseMesh.visible = false;
      for (const x of [-.49, .49]) for (const y of [-.68, .68]) this.cyl('brass', x, y, .09, .025, .018, g).rotation.x = PI / 2;
      this.box('iron', 0, .98, -.07, .12, .36, .1, g);
      this.target('power', '배전반', g);
    }
    gauges() {
      const g = this.group(4.86, 2.05, -1.12, -PI / 2);
      this.box('wood', 0, 0, -.055, 2.55, 1.37, .16, g); this.box('dark', 0, 0, .038, 2.45, 1.27, .035, g);
      const motif = this.icon('wave', .20, .13); motif.position.set(0, .48, .064); g.add(motif);
      this.gaugeNeedles = [];
      for (let i = 0; i < 4; i++) {
        const x = (i - 1.5) * .59;
        this.cyl('brass', x, .04, .09, .246, .075, g).rotation.x = PI / 2;
        const tex = canvas(256, 256, c => {
          c.fillStyle = '#e3d7b8'; c.fillRect(0, 0, 256, 256); c.strokeStyle = '#354e4a'; c.lineWidth = 3;
          for (let k = 0; k < 6; k++) {
            const a = (-.75 + k * .30) * PI;
            c.beginPath(); c.moveTo(128 + Math.sin(a) * 88, 128 - Math.cos(a) * 88); c.lineTo(128 + Math.sin(a) * 103, 128 - Math.cos(a) * 103); c.stroke();
            textLine(c, String(k + 1), 128 + Math.sin(a) * 72, 128 - Math.cos(a) * 72, 23, '#203e3b', 600);
          }
          textLine(c, ['▲', '●', '◆', '■'][i], 128, 212, 31, '#675e49', 700);
        });
        const face = new T.Mesh(new T.CircleGeometry(.220, 32), new T.MeshBasicMaterial({ map: tex })); face.position.set(x, .04, .132); g.add(face);
        const needle = this.group(x, .04, .142, 0, g); this.box('rug', 0, .065, 0, .018, .15, .008, needle); this.mesh(sphereG, 'brass', 0, 0, .009, .031, .031, .012, needle); this.gaugeNeedles.push(needle);
        const valve = this.cyl('iron', x, -.38, .11, .10, .09, g); valve.rotation.x = PI / 2;
        this.box('brass', x, -.38, .165, .16, .023, .018, g);
      }
      this.box('black', 0, -1.0, .025, .80, .45, .035, g);
      this.pressureHatch = this.group(0, -.78, .07, 0, g); this.box('iron', 0, -.22, 0, .84, .44, .07, this.pressureHatch); this.box('brass', 0, -.30, .06, .22, .025, .045, this.pressureHatch);
      this.target('gauges', '압력 조절기', g);
    }
    radio() {
      const furniture = this.group(3.77, 0, 2.14, -PI / 2); this.shadow(3.76, 2.14, 2.5, 3, .43);
      this.box('wood', 0, .91, 0, 2.20, .14, 1.32, furniture); this.box('woodLight', 0, 1, 0, 2.26, .04, 1.36, furniture);
      for (const x of [-.91, .91]) for (const z of [-.46, .46]) this.box('wood', x, .44, z, .12, .88, .12, furniture);
      this.box('wood', 0, .4, -.3, 1.9, .07, .60, furniture);
      const g = this.group(0, 1.45, -.08, 0, furniture);
      this.box('iron', 0, 0, 0, 1.77, .87, .72, g); this.box('brass', 0, 0, .37, 1.68, .79, .035, g); this.box('dark', 0, 0, .398, 1.61, .73, .018, g);
      this.radioDisplayTexture = canvas(640, 210, (c, w, h) => { c.fillStyle = '#152c2b'; c.fillRect(0, 0, w, h); textLine(c, '—  —  —', w / 2, h / 2, 42, '#566653'); });
      const display = new T.Mesh(planeG, new T.MeshBasicMaterial({ map: this.radioDisplayTexture })); display.position.set(-.15, .15, .415); display.scale.set(1.13, .37, 1); g.add(display);
      for (const x of [-.5, .15]) { this.cyl('brass', x, -.22, .445, .105, .09, g).rotation.x = PI / 2; this.box('cream', x, -.18, .495, .012, .07, .008, g); }
      const speakerTex = canvas(128, 128, c => { c.fillStyle = '#263635'; c.fillRect(0, 0, 128, 128); for (let y = 8; y < 128; y += 9) for (let x = 8; x < 128; x += 9) { c.fillStyle = '#101d1d'; c.beginPath(); c.arc(x, y, 2, 0, 2 * PI); c.fill(); } });
      const speaker = new T.Mesh(planeG, new T.MeshStandardMaterial({ map: speakerTex })); speaker.position.set(.63, 0, .418); speaker.scale.set(.26, .57, 1); g.add(speaker);
      this.radioLight = this.mesh(sphereG, new T.MeshStandardMaterial({ color: 0xc09248, emissive: 0xaa4d12, emissiveIntensity: .2 }), -.72, -.22, .43, .034, .034, .021, g);
      this.cyl('iron', .67, .78, -.13, .016, .75, g).rotation.z = -.15;
      this.box('brass', 0, .49, 0, .64, .06, .10, g); this.box('brass', -.31, .45, 0, .04, .16, .10, g); this.box('brass', .31, .45, 0, .04, .16, .10, g);
      this.target('radio', '무전기', g); this.collider(3.05, 4.47, .97, 3.30);
      for (const [i, col] of [0x9b6246, 0xa59569, 0x365e58].entries()) this.box(new T.MeshStandardMaterial({ color: col, roughness: 1 }), -.62 + i * .27, .54, -.28, .23, .25 + i * .035, .47, furniture);
    }
    exit() {
      const assembly = this.group(0, 0, 0);
      this.box('wood', -1.02, 1.5, 4.94, .13, 3.0, .25, assembly); this.box('wood', 1.02, 1.5, 4.94, .13, 3.0, .25, assembly); this.box('wood', 0, 3.04, 4.94, 2.16, .15, .25, assembly);
      this.door = this.group(0, 0, 5.04, 0, assembly);
      this.box('tealLight', 0, 1.48, 0, 1.88, 2.92, .15, this.door); this.box('wood', 0, 1.48, -.095, 1.69, 2.73, .055, this.door); this.box('teal', 0, 1.48, -.131, 1.55, 2.58, .03, this.door);
      for (const yy of [.68, 1.8]) this.box('brass', 0, yy, -.155, 1.39, .025, .018, this.door);
      this.box('black', 0, 2.15, -.155, 1.05, .61, .022, this.door); this.box('iron', 0, 2.15, -.173, .96, .51, .025, this.door);
      this.placeSign('해안 통로', 'LIGHTHOUSE PASSAGE', 0, 2.16, -.193, .88, .34, PI, this.door);
      this.box('brass', -.58, 1.30, -.23, .055, .34, .13, this.door);
      this.doorCollider = { minX: -.97, maxX: .97, minZ: 4.88, maxZ: 5.23 };
      this.placeSign('출구', 'EXIT', 0, 3.34, 4.942, 1.65, .37, PI, assembly);
      const console = this.group(-2.06, 1.42, 4.89, PI, assembly);
      this.box('iron', 0, 0, 0, 1.76, .74, .10, console); this.box('black', 0, 0, .06, 1.64, .64, .03, console);
      this.exitLight = this.mesh(sphereG, new T.MeshStandardMaterial({ color: 0xa75143, emissive: 0x8c2418, emissiveIntensity: .4 }), .69, .23, .10, .04, .04, .025, console);
      const motif = this.icon('notch', .13, .13); motif.position.set(-.68, .23, .094); console.add(motif);
      this.doorPowerLight = this.mesh(sphereG, new T.MeshStandardMaterial({ color: 0x735348, emissive: 0x562b20, emissiveIntensity: .1 }), .50, .23, .10, .035, .035, .025, console);
      this.exitWheels = [];
      for (let i = 0; i < 6; i++) {
        const x = -.65 + i * .26;
        const wheel = this.cyl('brass', x, -.06, .12, .112, .11, console); wheel.rotation.x = PI / 2;
        const face = this.icon('circle', .072, .072); face.position.set(x, -.06, .18); console.add(face); this.exitWheels.push(face);
        this.box('cream', x, .10, .18, .025, .028, .008, console);
      }
      this.hydraulics(this.scene);
      this.target('exit', '출입문', assembly);
      this.box('wood', 0, -.08, 6.7, 2.95, .16, 3.5); this.box('teal', -1.50, 1.8, 6.73, .15, 3.6, 3.5); this.box('teal', 1.50, 1.8, 6.73, .15, 3.6, 3.5); this.box('teal', 0, 3.61, 6.7, 3.1, .13, 3.5);
      this.collider(-1.65, -1.4, 5.1, 8.5); this.collider(1.4, 1.65, 5.1, 8.5); this.collider(-1.65, 1.65, 8.3, 8.5);
      this.box(new T.MeshBasicMaterial({ color: 0x789c9d }), 0, 1.7, 8.38, 2.8, 3.4, .02);
      this.placeSign('등대 연결 통로', 'THE SIGNAL IS HOME', 0, 2.60, 8.33, 2.2, .55, PI);
      const corridorLight = new T.PointLight(0x9ccbc4, 2.4, 6.5, 2); corridorLight.position.set(0, 2.8, 7.3); this.scene.add(corridorLight);
    }
    hydraulics(assembly) {
      // A continuous pressure line makes the relationship between the remote
      // regulator and the door's safety bolt visible from within the room.
      const points = [[4.74, 1.02, -1.12], [4.74, .57, -1.12], [4.74, .57, 4.73], [1.42, .57, 4.73], [1.42, 1.27, 4.73]];
      for (let i = 0; i < points.length - 1; i++) this.rod('brass', points[i], points[i + 1], .037, assembly);
      for (const p of points) this.mesh(sphereG, 'brass', ...p, .052, .052, .052, assembly);
      for (const z of [-.4, 1.5, 3.5]) { this.box('iron', 4.80, .57, z, .08, .17, .12, assembly); }
      for (const x of [2.1, 3.7]) this.box('iron', x, .57, 4.80, .12, .17, .08, assembly);
      this.rod('iron', [1.07, 1.27, 4.72], [1.52, 1.27, 4.72], .10, assembly);
      this.rod('brass', [1.42, 1.27, 4.73], [1.42, 1.43, 4.73], .035, assembly);
      this.hydraulicBolt = this.rod('brass', [.78, 1.27, 4.72], [1.12, 1.27, 4.72], .034, assembly);
      this.box('iron', 1.16, 1.27, 4.85, .62, .28, .07, assembly);
      const gauge = this.group(1.42, 1.68, 4.73, PI, assembly);
      this.cyl('brass', 0, 0, 0, .19, .07, gauge).rotation.x = PI / 2;
      const tex = canvas(256, 256, c => {
        c.fillStyle = '#e4d7b8'; c.fillRect(0, 0, 256, 256);
        c.lineWidth = 20; c.strokeStyle = '#996b52'; c.beginPath(); c.arc(128, 128, 91, PI * .66, PI * 1.28); c.stroke();
        c.strokeStyle = '#5f8870'; c.beginPath(); c.arc(128, 128, 91, PI * 1.35, PI * 1.94); c.stroke();
        for (let i = 0; i < 9; i++) { const a = PI * (.66 + i * .16); c.strokeStyle = '#465b51'; c.lineWidth = 3; c.beginPath(); c.moveTo(128 + Math.cos(a) * 72, 128 + Math.sin(a) * 72); c.lineTo(128 + Math.cos(a) * 86, 128 + Math.sin(a) * 86); c.stroke(); }
      });
      const face = new T.Mesh(new T.CircleGeometry(.17, 32), new T.MeshBasicMaterial({ map: tex })); face.position.z = .043; gauge.add(face);
      this.doorPressureNeedle = this.group(0, 0, .052, 0, gauge); this.box('rug', 0, .057, 0, .015, .13, .009, this.doorPressureNeedle);
      this.mesh(sphereG, 'dark', 0, 0, .013, .024, .024, .014, this.doorPressureNeedle);
      this.doorPressureLight = this.mesh(sphereG, new T.MeshStandardMaterial({ color: 0x735348, emissive: 0x562b20, emissiveIntensity: .1 }), 1.42, 1.05, 4.69, .04, .04, .025, assembly);
      // A separate dark electrical conduit runs from the west-wall relay to the lock.
      const cable = [[-4.73, 2.47, 2.05], [-4.73, 2.91, 2.05], [-4.73, 2.91, 4.75], [-2.06, 2.91, 4.75], [-2.06, 1.80, 4.75]];
      for (let i = 0; i < cable.length - 1; i++) this.rod('black', cable[i], cable[i + 1], .022, assembly);
      for (const p of cable) this.mesh(sphereG, 'iron', ...p, .038, .038, .038, assembly);
    }
    decor() {
      // Distinct paper, framed canvas, bound book, and instrument silhouettes make
      // clues discoverable as objects rather than a row of identical terminals.
      const atlas = this.group(4.87, 2.13, -3.03, -PI / 2);
      this.box('wood', 0, 0, -.02, 1.43, 1.50, .10, atlas);
      const atlasArt = this.art('atlas', 1.31, 1.38, atlas); atlasArt.position.z = .041;
      this.target('atlas', '성도', atlas);
      const tide = this.group(-4.87, 2.22, -2.42, PI / 2);
      this.box('wood', 0, 0, -.03, 1.17, 1.17, .07, tide); const tideArt = this.art('tide', 1.08, 1.08, tide); tideArt.position.z = .014;
      const register = this.icon('register', .13, .13); register.position.set(.43, -.44, .025); tide.add(register);
      for (const x of [-.51, .51]) this.cyl('brass', x, .51, .027, .021, .016, tide).rotation.x = PI / 2;
      this.target('tide', '조위 기록표', tide);
      const painting = this.group(-4.87, 2.08, .27, PI / 2);
      this.box('wood', 0, 0, -.02, 1.37, 1.10, .10, painting); this.box('brass', 0, 0, .034, 1.29, 1.02, .016, painting);
      this.paintingPlain = this.art('painting', 1.20, .93, painting); this.paintingPlain.position.z = .048;
      this.paintingUV = this.art('paintingUV', 1.20, .93, painting); this.paintingUV.position.z = .05; this.paintingUV.visible = false;
      this.target('painting', '추상화', painting);
      const weather = this.group(-2.40, 1.17, -3.67, .07);
      this.box('wood', 0, 0, 0, .71, .025, .49, weather); const weatherPaper = this.art('weather', .65, .43, weather); weatherPaper.rotation.x = -PI / 2; weatherPaper.position.y = .018;
      this.box('iron', 0, .033, -.20, .22, .025, .06, weather); this.target('weather', '기상 기록지', weather);
      const shelf = this.group(-4.1, 0, -3.23); this.shadow(-4.1, -3.2, 1.8, 1.5, .35);
      this.box('wood', 0, .75, -.18, 1.36, 1.5, .12, shelf); this.box('wood', -.68, .75, 0, .08, 1.5, .55, shelf); this.box('wood', .68, .75, 0, .08, 1.5, .55, shelf);
      for (const y of [.10, .76, 1.49]) this.box('woodLight', 0, y, 0, 1.45, .08, .59, shelf);
      const colors = [0x355754, 0xa07e52, 0x7c4d3c, 0x777b65, 0x263f4a, 0x8e6953], symbols = ['shell', 'bird', 'anchor', 'fish', 'lighthouse', 'moon'];
      for (let i = 0; i < 6; i++) {
        const x = -.52 + i * .208, height = .50 + (i % 3) * .035;
        const m = new T.MeshStandardMaterial({ color: colors[i], roughness: .95 }); this.box(m, x, .81 + height / 2, .04, .178, height, .38, shelf);
        for (const y of [.89, 1.24]) this.box('brass', x, y, .237, .128, .011, .006, shelf);
        const symbol = this.icon(symbols[i], .118, .19); symbol.position.set(x, 1.08, .240); shelf.add(symbol);
      }
      this.booksCompartment = this.group(0, .12, .04, 0, shelf); this.box('tealLight', 0, .27, .20, 1.19, .52, .055, this.booksCompartment);
      this.recessBooks = [];
      for (let i = 0; i < 4; i++) {
        const x = -.45 + i * .30; this.box('black', x, .27, .234, .24, .43, .018, this.booksCompartment);
        this.box('brass', x, .06, .249, .25, .018, .03, this.booksCompartment);
        const inserted = this.group(x, .27, .255, 0, this.booksCompartment); this.box(['woodLight','leaf','rug','cushion'][i], 0, 0, 0, .18, .36, .025, inserted);
        const symbol = this.icon(['anchor','moon','bird','lighthouse'][i], .13, .14); symbol.position.z = .019; inserted.add(symbol); inserted.visible = false; this.recessBooks.push(inserted);
      }
      this.target('shelf', '책장', shelf); this.collider(-4.84, -3.35, -3.65, -2.86);
      this.plant(-3.15, -3.25, .80); this.plant(-4.15, 4.10, .92);
      const clock = this.group(-2.6, 2.57, 4.92, PI);
      this.box('wood', 0, -.18, -.025, .76, 1.05, .13, clock); this.box('brass', 0, -.63, .045, .65, .05, .07, clock);
      this.clockFaceGroup = this.group(0, 0, .045, 0, clock); this.cyl('brass', 0, 0, 0, .36, .055, this.clockFaceGroup).rotation.x = PI / 2;
      const clockTex = canvas(256, 256, c => { c.fillStyle = '#d9cfb3'; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 12; i++) { const a = i * PI / 6; textLine(c, String(i || 12), 128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96, 20, '#2a4440', 600); } });
      const face = new T.Mesh(new T.CircleGeometry(.323, 32), new T.MeshBasicMaterial({ map: clockTex })); face.position.z = .035; this.clockFaceGroup.add(face);
      this.clockHourHand = this.group(0, 0, .042, 0, this.clockFaceGroup); this.box('dark', 0, .075, 0, .018, .15, .008, this.clockHourHand);
      this.clockMinuteHand = this.group(0, 0, .048, 0, this.clockFaceGroup); this.box('dark', 0, .112, 0, .012, .23, .008, this.clockMinuteHand);
      this.mesh(sphereG, 'rug', 0, 0, .058, .026, .026, .012, this.clockFaceGroup);
      this.cyl('brass', 0, -.43, .065, .08, .04, clock).rotation.x = PI / 2;
      this.target('clock', '벽시계', clock);
      const morse = this.group(-2.25, 0, 3.59, -.10); this.shadow(-2.25, 3.59, 1.4, 1.1, .3);
      this.box('wood', 0, .73, 0, 1.02, .09, .72, morse); for (const x of [-.41, .41]) for (const z of [-.25, .25]) this.box('wood', x, .35, z, .07, .7, .07, morse);
      const book = this.group(0, .80, -.02, PI - .10, morse); this.box('dark', 0, 0, 0, .75, .055, .49, book); this.box('paper', 0, .035, 0, .71, .025, .46, book);
      const morseArt = this.art('morse', .69, .44, book); morseArt.rotation.x = -PI / 2; morseArt.position.y = .05; this.target('morse', '통신 편람', book);
      this.collider(-2.80, -1.70, 3.19, 3.99);
      const nautical = this.group(2.65, 2.36, 4.92, PI); this.box('wood', 0, 0, 0, 2.03, 1.28, .08, nautical);
      const chart = this.art('chart', 1.92, 1.17, nautical); chart.position.z = .049; this.target('chart', '해도', nautical);
      this.safe(); this.telescope();
      for (const [x, z] of [[-4.87, .70], [4.87, .6]]) {
        const g = this.group(x, 2.90, z, x < 0 ? PI / 2 : -PI / 2);
        this.box('brass', 0, 0, 0, .20, .44, .12, g); this.cyl('brass', 0, -.17, .18, .17, .06, g);
        this.cyl(new T.MeshBasicMaterial({ color: 0xffdda0 }), 0, .03, .18, .105, .36, g); this.cyl('brass', 0, .23, .18, .18, .06, g);
        const light = new T.PointLight(0xffcd83, 1.25, 4.4, 2); light.position.set(x < 0 ? -4.52 : 4.52, 2.9, z); this.scene.add(light); this.lights.push(light);
      }
      this.placeSign('07  ·  해무 관측소', 'NIGHT WATCH OBSERVATORY', 0, 3.42, -3.93, 2.15, .23);
    }
    telescope() {
      const g = this.group(2.35, 0, -2.73, -.12); this.shadow(2.35, -2.73, 1.9, 1.6, .4);
      for (let i = 0; i < 3; i++) { const a = i * PI * 2 / 3; this.rod('iron', [0, 1.0, 0], [Math.sin(a) * .53, .06, Math.cos(a) * .48], .029, g); this.box('black', Math.sin(a) * .53, .04, Math.cos(a) * .48, .13, .07, .13, g); }
      this.cyl('brass', 0, 1.03, 0, .14, .14, g); this.rod('brass', [-.22, 1.04, 0], [-.22, 1.33, 0], .028, g); this.rod('brass', [.22, 1.04, 0], [.22, 1.33, 0], .028, g);
      this.telescopeBody = this.group(0, 1.35, -.04, 0, g); this.telescopeBody.rotation.x = -.13;
      this.cyl('tealLight', 0, 0, 0, .145, .90, this.telescopeBody).rotation.x = PI / 2;
      for (const z of [-.43, .25]) this.cyl('brass', 0, 0, z, .165, .07, this.telescopeBody).rotation.x = PI / 2;
      this.cyl('black', 0, 0, .51, .068, .20, this.telescopeBody).rotation.x = PI / 2;
      this.cyl('brass', 0, 0, .62, .082, .04, this.telescopeBody).rotation.x = PI / 2;
      this.cyl('black', 0, 0, -.477, .135, .013, this.telescopeBody).rotation.x = PI / 2;
      this.telescopeLens = this.cyl(new T.MeshStandardMaterial({ color: 0x65aeba, metalness: .7, roughness: .2, emissive: 0x2c6268, emissiveIntensity: .25 }), 0, 0, -.485, .122, .008, this.telescopeBody); this.telescopeLens.rotation.x = PI / 2; this.telescopeLens.visible = false;
      this.telescopeSignal = this.mesh(sphereG, new T.MeshStandardMaterial({ color: 0x526b64, emissive: 0x73b898, emissiveIntensity: 0 }), -.20, 1.14, .08, .025, .025, .025, g);
      for (const x of [-.24, .24]) this.cyl('brass', x, 1.21, 0, .105, .06, g).rotation.z = PI / 2;
      this.target('telescope', '망원경', g); this.collider(1.80, 2.91, -3.24, -2.20);
    }
    safe() {
      const g = this.group(3.90, 0, 3.92, -PI / 2); this.shadow(3.90, 3.92, 1.6, 1.3, .4);
      this.box('wood', 0, .15, 0, 1.12, .28, .91, g); this.box('iron', 0, .66, 0, .99, .83, .79, g); this.box('dark', 0, .66, .402, .88, .72, .024, g);
      this.safeDoor = this.group(-.43, 0, .425, 0, g); this.box('tealLight', .43, .66, 0, .85, .69, .06, this.safeDoor);
      const motif = this.icon('compass', .12, .14); motif.position.set(.20, .82, .04); this.safeDoor.add(motif);
      const pad = this.group(.52, .63, .058, 0, this.safeDoor); this.box('black', 0, 0, 0, .38, .35, .055, pad);
      for (const [x, y, z] of [[0,.11,0],[.11,0,-PI/2],[0,-.11,PI],[-.11,0,PI/2]]) {
        const arrow = new T.Mesh(new T.ConeGeometry(.042, .08, 3), this.materials.brass); arrow.position.set(x, y, .047); arrow.rotation.z = z; pad.add(arrow);
      }
      this.box('brass', .79, .64, .067, .025, .27, .06, this.safeDoor);
      for (const yy of [.45, .87]) this.box('brass', 0, yy, .04, .055, .13, .035, this.safeDoor);
      this.target('safe', '소형 금고', g); this.collider(3.26, 4.55, 3.37, 4.47);
    }
    plant(x, z, scale) {
      this.collider(x-.25*scale,x+.25*scale,z-.25*scale,z+.25*scale);
      const g = this.group(x, 0, z); g.scale.setScalar(scale); this.shadow(x, z, 1.2 * scale, 1.2 * scale, .35);
      const pot = new T.Mesh(new T.CylinderGeometry(.28, .20, .44, 18), this.materials.rug); pot.position.y = .23; g.add(pot); this.cyl('dark', 0, .457, 0, .25, .01, g);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4; const yy = .75 + (i % 3) * .14; const stem = this.cyl('leaf', Math.sin(a) * .06, yy - .10, Math.cos(a) * .06, .013, yy - .3, g); stem.rotation.z = Math.sin(a) * .2;
        const leaf = this.mesh(sphereG, 'leaf', Math.sin(a) * .22, yy + .13, Math.cos(a) * .22, .13, .34, .055, g); leaf.rotation.set(Math.cos(a) * .6, a, Math.sin(a) * .7);
      }
    }
    lighting() {
      this.scene.background = new T.Color(0x162e3d); this.scene.fog = new T.FogExp2(0x1a303a, .007);
      this.scene.add(new T.HemisphereLight(0xb7d4d3, 0x674d35, 1.75));
      const moon = new T.DirectionalLight(0x9bcad9, 1.5); moon.position.set(-3, 7, -5); this.scene.add(moon);
      const key = new T.SpotLight(0xffd5a0, 42, 13, PI / 2.8, .7, 1.8); key.position.set(0, 3.48, .1); key.target.position.set(0, 0, -.8); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0005; key.shadow.normalBias = .025; key.shadow.camera.near = .4; key.shadow.camera.far = 13; this.scene.add(key); this.scene.add(key.target); this.keyLight = key;
      const ceiling = this.cyl('iron', 0, 3.52, .1, .33, .09); this.cyl(new T.MeshBasicMaterial({ color: 0xffe0ad }), 0, 3.46, .1, .27, .025);
      const fill = new T.PointLight(0x87bdc0, 2.5, 9, 2); fill.position.set(0, 2.7, -3); this.scene.add(fill);
    }
    update(dt, time, state) {
      state = state || {};
      const open = state.doorUnlocked ? 1 : 0, powered = !!state.powered, solved = powered && Number(state.frequency) === 1037;
      this.doorProgress = T.MathUtils.damp(this.doorProgress, open, 2.8, Math.min(dt, .08)); this.door.position.x = this.doorProgress * 1.88;
      this.drawerGroup.position.z = T.MathUtils.damp(this.drawerGroup.position.z, state.drawerOpened ? -1.22 : -1.41, 5, dt);
      this.cabinetDoor.rotation.y = T.MathUtils.damp(this.cabinetDoor.rotation.y, state.cabinetOpened ? -.30 : 0, 4, dt);
      this.safeDoor.rotation.y = T.MathUtils.damp(this.safeDoor.rotation.y, state.safeOpened ? -.55 : 0, 4, dt);
      this.booksCompartment.position.z = T.MathUtils.damp(this.booksCompartment.position.z, state.booksOpened ? .19 : .04, 4, dt);
      this.recessBooks.forEach(book => { book.visible = !!state.booksOpened; });
      this.pressureHatch.rotation.x = T.MathUtils.damp(this.pressureHatch.rotation.x, state.pressureSolved ? -.8 : 0, 4, dt);
      this.clockFaceGroup.rotation.y = T.MathUtils.damp(this.clockFaceGroup.rotation.y, state.clockOpened ? -.17 : 0, 4, dt);
      const photoKey = (state.photoOrder || [4, 0, 5, 2, 1, 3]).join(',');
      if (photoKey !== this.lastPhotoKey) { this.lastPhotoKey = photoKey; this.photoOrder = (state.photoOrder || [4, 0, 5, 2, 1, 3]).slice(); this.drawPhoto(); }
      this.fuseMesh.visible = !!state.fuseInstalled; this.telescopeLens.visible = !!state.lensInstalled;
      this.telescopeBody.rotation.y = ((Number(state.telescopeX) || 5) - 5) * .032;
      this.telescopeBody.rotation.x = -.13 - ((Number(state.telescopeY) || 5) - 5) * .018;
      const uvActive = state.selected === 'uv' && (state.inventory || []).includes('uv') && (state.seen || []).includes('paintingUV'); this.paintingPlain.visible = !uvActive; this.paintingUV.visible = uvActive;
      for (const target of this.targets) { if (['photo','tide','weather','atlas','morse','chart'].includes(target.id)) { const held = (state.collected || []).includes(target.id); target.enabled = !held; target.mesh.visible = !held; } }
      this.stripAVisual.visible = !!state.stripAPlaced && !state.lighttableReady; this.stripBVisual.visible = !!state.stripBPlaced && !state.lighttableReady; this.finaleVisual.visible = !!state.lighttableReady;
      this.lightTableSurface.material.emissiveIntensity = powered ? .62 : 0;
      for (let i = 0; i < 9; i++) { const on = !!(state.powerCells && state.powerCells[i]), m = this.powerButtons[i].material; m.color.setHex(on ? 0xc0dcab : 0x3c6664); m.emissiveIntensity = on ? .6 : 0; }
      for (let i = 0; i < 4; i++) { const v = state.pressureValues && state.pressureValues[i] || 1; this.gaugeNeedles[i].rotation.z = -(-.75 + (v - 1) * .30) * PI; }
      if (Number.isFinite(state.clockHour)) this.clockHourHand.rotation.z = -((state.clockHour % 12) + (state.clockMinute || 0) / 60) * PI / 6;
      if (Number.isFinite(state.clockMinute)) this.clockMinuteHand.rotation.z = -state.clockMinute * PI / 30;
      const radioView = String(powered) + ':' + solved + ':' + state.frequency;
      if (this.lastRadioView !== radioView) {
        this.lastRadioView = radioView; const c = this.radioDisplayTexture.image.getContext('2d'); c.fillStyle = powered ? '#193e34' : '#152c2b'; c.fillRect(0, 0, 640, 210);
        const freq = typeof state.frequency === 'number' ? (state.frequency / 10).toFixed(1) : '—';
        textLine(c, powered ? freq + ' MHz' : '—  —  —', 320, 75, 45, powered ? '#e2d993' : '#566653', 600);
        if (powered && solved) textLine(c, 'QRUWK', 320, 147, 40, '#b9d8b0', 600);
        else for (let i = 0; i < 41; i++) { c.fillStyle = powered ? '#a3b489' : '#43543e'; c.fillRect(27 + i * 14.5, 145, 2, i % 5 === 0 ? 30 : 14); }
        this.radioDisplayTexture.needsUpdate = true;
      }
      this.powerLight.material.color.setHex(powered ? 0x8ed6ab : 0x925241); this.powerLight.material.emissive.setHex(powered ? 0x3abb78 : 0x7d2216); this.powerLight.material.emissiveIntensity = powered ? .8 : .3;
      this.radioLight.material.color.setHex(solved ? 0x9ce6bd : powered ? 0xe5bf64 : 0x6d694b); this.radioLight.material.emissive.setHex(solved ? 0x51ba82 : 0xaa741a); this.radioLight.material.emissiveIntensity = solved ? 1 : powered ? .5 + Math.sin(time * 2.8) * .2 : .08;
      const telescopeLive = !!state.lensInstalled && Number(state.telescopeX) === 7 && Number(state.telescopeY) === 3;
      this.telescopeSignal.material.emissiveIntensity = telescopeLive ? .8 + Math.sin(time * 7) * .25 : 0;
      this.telescopeSignal.material.color.setHex(telescopeLive ? 0xa4d6b2 : 0x526b64);
      this.telescopeLens.material.emissiveIntensity = telescopeLive ? .65 : .03;
      this.doorPressureNeedle.rotation.z = state.pressureSolved ? -.88 : 2.35;
      this.hydraulicBolt.position.x = T.MathUtils.damp(this.hydraulicBolt.position.x, state.pressureSolved ? 1.20 : .95, 5, dt);
      this.doorPressureLight.material.color.setHex(state.pressureSolved ? 0x9de9b8 : 0x94614a); this.doorPressureLight.material.emissive.setHex(state.pressureSolved ? 0x3fbe76 : 0x562b20); this.doorPressureLight.material.emissiveIntensity = state.pressureSolved ? .7 : .12;
      this.doorPowerLight.material.color.setHex(powered ? 0x9de9b8 : 0x94614a); this.doorPowerLight.material.emissive.setHex(powered ? 0x3fbe76 : 0x562b20); this.doorPowerLight.material.emissiveIntensity = powered ? .7 : .12;
      this.exitLight.material.color.setHex(open ? 0x9de9b8 : 0xa75143); this.exitLight.material.emissive.setHex(open ? 0x3fbe76 : 0x8c2418); this.exitLight.material.emissiveIntensity = open ? .85 : .35;
    }
    setQuality(level) { if (this.keyLight) { this.keyLight.castShadow = level !== 'low'; if (this.keyLight.shadow.mapSize.x !== (level === 'high' ? 2048 : 1024)) { this.keyLight.shadow.mapSize.set(level === 'high' ? 2048 : 1024, level === 'high' ? 2048 : 1024); if (this.keyLight.shadow.map) this.keyLight.shadow.map.dispose(); this.keyLight.shadow.map = null; } } }
  }
  window.LastSignal.World = World;
})();
