(function () {
  'use strict';
  const T = window.THREE, NS = window.LastSignal = window.LastSignal || {}, PI = Math.PI;
  const boxGeo = new T.BoxGeometry(1, 1, 1), cylGeo = new T.CylinderGeometry(1, 1, 1, 20), sphereGeo = new T.SphereGeometry(1, 16, 10), planeGeo = new T.PlaneGeometry(1, 1);
  const up = new T.Vector3(0, 1, 0);
  function texture(w, h, painter) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; painter(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  function lettering(c, s, x, y, size, color = '#dfc48c') { c.font = `500 ${size}px Georgia, "Malgun Gothic", serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(s, x, y); }
  class World {
    constructor(scene) {
      this.scene = scene; this.colliders = []; this.targets = []; this.materials = {}; this.staticMeshes = []; this.lights = [];
      this.spawn = { x: .1, y: 1.65, z: 3.4, yaw: .06 }; this.doorProgress = 0; this.bookProgress = 0; this.skyProgress = 0;
      this.makeMaterials(); this.architecture(); this.observation(); this.archive(); this.machine(); this.laboratory(); this.lighting(); this.batchStatic();
    }
    mat(n, c, metalness = 0, roughness = .8, extra = {}) { return this.materials[n] = new T.MeshStandardMaterial({ color: c, metalness, roughness, ...extra }); }
    makeMaterials() {
      this.mat('wall', 0x192c3e); this.mat('wallLight', 0x263e50); this.mat('cream', 0xbeb39a); this.mat('ivory', 0xe1d5b7);
      this.mat('wood', 0x3b302b); this.mat('woodLight', 0x66503b); this.mat('brass', 0xb49960, .7, .37); this.mat('bronze', 0x72573c, .65, .48);
      this.mat('black', 0x101921); this.mat('iron', 0x38454c, .6, .45); this.mat('silver', 0x7f969f, .82, .2);
      this.mat('rug', 0x523d3c); this.mat('red', 0x823e33); this.mat('teal', 0x345d59); this.mat('blue', 0x344a65);
      this.mat('lamp', 0xffd6a0, 0, .2, { emissive: 0xf7b567, emissiveIntensity: 1.4 });
      this.mat('night', 0x152c4e, 0, .8, { emissive: 0x173359, emissiveIntensity: .55 });
      this.mat('star', 0xd7ecff, 0, .5, { emissive: 0xd7ecff, emissiveIntensity: 1.5 });
      const tex = texture(512, 512, (c, w, h) => {
        c.fillStyle = '#5d4c3c'; c.fillRect(0, 0, w, h);
        for (let r = 0; r < 8; r++) { c.fillStyle = ['#594838', '#61503e', '#665341', '#534432'][r % 4]; c.fillRect(0, r * 64 + 1, w, 61); for (let i = 0; i < 8; i++) { c.fillStyle = '#352d25'; c.fillRect((r * 103 + i * 250) % w, r * 64, 2, 64); } c.strokeStyle = '#8a705138'; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(0, r * 64 + 6 + i * 7); c.lineTo(w, r * 64 + 3 + i * 7); c.stroke(); } }
      }); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(2, 2); this.materials.floor = new T.MeshStandardMaterial({ map: tex, roughness: .76 });
    }
    mesh(g, material, x, y, z, sx = 1, sy = 1, sz = 1, parent = this.scene) {
      const m = new T.Mesh(g, typeof material === 'string' ? this.materials[material] : material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; parent.add(m); this.staticMeshes.push(m); return m;
    }
    box(m, x, y, z, sx, sy, sz, parent) { return this.mesh(boxGeo, m, x, y, z, sx, sy, sz, parent); }
    cyl(m, x, y, z, r, h, parent) { return this.mesh(cylGeo, m, x, y, z, r, h, r, parent); }
    group(x = 0, y = 0, z = 0, yaw = 0, parent = this.scene, dynamic = false) { const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = yaw; g.userData.noBatch = dynamic; parent.add(g); return g; }
    rod(material, a, b, r = .025, parent = this.scene) {
      const A = new T.Vector3(...a), B = new T.Vector3(...b), delta = B.clone().sub(A), M = A.clone().add(B).multiplyScalar(.5);
      const m = this.mesh(cylGeo, material, M.x, M.y, M.z, r, delta.length(), r, parent); m.quaternion.setFromUnitVectors(up, delta.normalize()); return m;
    }
    target(id, label, mesh, available = () => true) { mesh.userData.noBatch = true; mesh.userData.interactionId = id; this.targets.push({ id, label, mesh, available, enabled: true }); return mesh; }
    collider(x1, x2, z1, z2) { this.colliders.push({ minX: x1, maxX: x2, minZ: z1, maxZ: z2 }); }
    plaque(text, w, h, x, y, z, yaw = 0, parent = this.scene) {
      const tex = texture(768, Math.round(768 * h / w), (c, W, H) => { c.fillStyle = '#172532'; c.fillRect(0, 0, W, H); c.strokeStyle = '#a58d5f'; c.lineWidth = 3; c.strokeRect(10, 10, W - 20, H - 20); lettering(c, text, W / 2, H / 2, H * .45); });
      const m = this.mesh(planeGeo, new T.MeshStandardMaterial({ map: tex, roughness: .75 }), x, y, z, w, h, 1, parent); m.rotation.y = yaw; m.userData.noBatch = true; return m;
    }
    art(id, w, h, x, y, z, yaw = 0, rx = 0, parent = this.scene) {
      const tex = texture(768, Math.max(256, Math.round(768 * h / w)), (c, W, H) => { c.fillStyle = '#d9cba8'; c.fillRect(0, 0, W, H); c.strokeStyle = '#8e7b55'; c.lineWidth = 5; c.strokeRect(18, 18, W - 36, H - 36); });
      const m = this.mesh(planeGeo, new T.MeshStandardMaterial({ map: tex, roughness: .95, side: T.DoubleSide }), x, y, z, w, h, 1, parent); m.rotation.set(rx, yaw, 0); m.userData.noBatch = true;
      if (NS.Art) { const img = new Image(); img.onload = () => {
        if (id === 'map') { this.mapImage = img; this.mapTexture = tex; this.drawMap(); }
        else { const c = tex.image.getContext('2d'), W = tex.image.width, H = tex.image.height; c.drawImage(img, 0, 0, W, H); tex.needsUpdate = true; }
      }; img.src = NS.Art.url(id); }
      return m;
    }
    drawMap() {
      if (!this.mapTexture || !this.mapImage) return;
      const tex = this.mapTexture, c = tex.image.getContext('2d'), W = tex.image.width, H = tex.image.height, img = this.mapImage, order = this.mapOrder || [2, 0, 3, 1];
      c.fillStyle = '#4f4b3f'; c.fillRect(0, 0, W, H);
      for (let n = 0; n < 4; n++) { const piece = order[n]; c.drawImage(img, piece % 2 * img.width / 2, Math.floor(piece / 2) * img.height / 2, img.width / 2, img.height / 2, n % 2 * W / 2 + 2, Math.floor(n / 2) * H / 2 + 2, W / 2 - 4, H / 2 - 4); }
      tex.needsUpdate = true;
    }
    wall(x, z, w, d, height = 3.8, material = 'wall') {
      this.box(material, x, height / 2, z, w, height, d); this.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
      this.box('wood', x, .16, z, w + .02, .3, d + .02); this.box('brass', x, 1.0, z, w + .025, .025, d + .025); this.box('woodLight', x, 3.58, z, w + .03, .12, d + .03);
    }
    doorFrame(x, z, yaw = 0, text = '') {
      const g = this.group(x, 0, z, yaw);
      this.box('woodLight', -1.08, 1.55, 0, .17, 3.1, .28, g); this.box('woodLight', 1.08, 1.55, 0, .17, 3.1, .28, g); this.box('woodLight', 0, 3.13, 0, 2.34, .2, .3, g);
      this.box('brass', -.96, 1.54, -.17, .025, 3.0, .03, g); this.box('brass', .96, 1.54, -.17, .025, 3.0, .03, g); this.box('brass', 0, 3.02, -.17, 1.95, .025, .03, g);
      if (text) this.plaque(text, 1.64, .24, 0, 3.35, -.17, PI, g);
    }
    architecture() {
      this.scene.background = new T.Color(0x101d2a); this.scene.fog = new T.Fog(0x172638, 16, 43);
      this.box('floor', 4, -.12, 4, 18, .22, 18);
      this.box('rug', .1, .008, .8, 5.2, .018, 5.4); this.box('brass', .1, .02, -1.85, 5, .01, .015); this.box('brass', .1, .02, 3.45, 5, .01, .015);
      this.box('rug', 9, .008, .4, 4, .018, 6.6);
      this.wall(-5.07, 4, .16, 18.15); this.wall(13.07, 4, .16, 18.15);
      this.wall(4, -5.07, 18.15, .16); this.wall(-.03, 13.07, 10.1, .16);
      this.wall(6.5, 13.07, 3, .16); this.wall(11.5, 13.07, 3, .16);
      // The archive and machine room have separate entrances; no diagonal bypass exists.
      this.wall(5, -3.04, .18, 4.12); this.wall(5, 3.04, .18, 4.12);
      this.box('wall', 5, 3.45, 0, .18, .7, 2.0); this.doorFrame(5, 0, PI / 2, '자료실');
      this.wall(-3.04, 5, 4.12, .18); this.wall(3.04, 5, 4.12, .18);
      this.box('wall', 0, 3.45, 5, 2, .7, .18); this.doorFrame(0, 5, 0, '기계실');
      this.wall(9.05, 5, 8.1, .18); // Archive cannot reach the laboratory directly.
      this.wall(5, 6.49, .18, 3.02); this.wall(5, 11.51, .18, 3.02);
      this.box('wall', 5, 3.45, 9, .18, .7, 2); this.doorFrame(5, 9, PI / 2);
      this.doorFrame(9, 13.0, 0, '비상 출입구');
      this.box('floor', 9, -.12, 14.55, 2.2, .22, 3.1); this.wall(7.92, 14.5, .16, 3.1); this.wall(10.08, 14.5, .16, 3.1);
      this.box('night', 9, 1.9, 16.1, 2.2, 3.8, .1);
      this.box('wall', 9.0, 3.85, 0, 8.1, .15, 10.1); this.box('wall', 0, 3.85, 9.0, 10.1, .15, 8.1); this.box('wall', 9.0, 3.85, 9.0, 8.1, .15, 8.1);
      // Observation dome with bronze meridians and a deliberately manufactured star field.
      const domeGeo = new T.SphereGeometry(6.6, 32, 16, 0, PI * 2, 0, PI / 2);
      const domeMat = new T.MeshStandardMaterial({ color: 0x13283c, side: T.BackSide, roughness: .95 });
      this.mesh(domeGeo, domeMat, 0, 3.65, 0); const rim = this.mesh(new T.TorusGeometry(5.7, .065, 6, 64), 'bronze', 0, 3.65, 0); rim.rotation.x = PI / 2;
      // Meridian ribs follow only the upper hemisphere. A full rotated torus
      // would put its lower half through the room and the walking space.
      const ringGeo = new T.TorusGeometry(6.53, .045, 6, 48, PI);
      for (let i = 0; i < 8; i++) { const r = this.mesh(ringGeo, 'bronze', 0, 3.7, 0); r.rotation.y = i * PI / 8; }
      for (let i = 0; i < 90; i++) { const a = i * 2.39996323, elevation = .15 + ((i * 37) % 79) / 100, radius = 5.58, horizontal = Math.sqrt(1 - elevation * elevation) * radius; this.mesh(sphereGeo, 'star', Math.cos(a) * horizontal, 3.65 + elevation * radius, Math.sin(a) * horizontal, .018 + i % 3 * .005, .018 + i % 3 * .005, .018 + i % 3 * .005); }
      // Wainscot rhythm, wall pilasters and neutral architectural signs.
      for (const x of [-4.88, 12.88]) for (let z = -4; z < 13; z += 2) { this.box('wallLight', x, .6, z, .06, .75, .055); this.box('brass', x, 2.24, z, .04, .6, .045); }
      for (let x = -4; x < 13; x += 2) this.box('wallLight', x, .6, -4.88, .055, .75, .06);
      this.plaque('ASTERIA · 1927', 2.8, .36, 0, 3.15, -4.93);
      for (const x of [-3.2, 3.2]) {
        this.box('woodLight', x, 2.12, -4.85, 1.6, 1.8, .16); this.box('night', x, 2.12, -4.74, 1.43, 1.63, .025);
        for (const dx of [-.7, 0, .7]) this.box('brass', x + dx, 2.12, -4.7, .035, 1.65, .025); this.box('brass', x, 2.12, -4.7, 1.45, .035, .025);
      }
      this.machineDoor = this.group(0, 0, 5, 0, this.scene, true); this.box('iron', 0, 1.5, 0, 1.92, 3.0, .18, this.machineDoor);
      for (const x of [-.64, 0, .64]) this.box('bronze', x, 1.5, -.11, .035, 2.75, .035, this.machineDoor);
      this.box('brass', .62, 1.1, -.16, .12, .25, .08, this.machineDoor);
      this.exitDoor = this.group(9, 0, 13, 0, this.scene, true); const exitPanel = this.box('wood', 0, 1.5, 0, 1.92, 3, .18, this.exitDoor);
      this.box('brass', 0, 1.1, -.12, 1.4, .08, .04, this.exitDoor); this.target('exit', '비상 출입구', exitPanel, s => !!s.skySolved);
    }
    table(x, z, w, d, yaw = 0) {
      const g = this.group(x, 0, z, yaw); this.box('woodLight', 0, .88, 0, w, .13, d, g); this.box('brass', 0, .95, 0, w + .03, .018, d + .03, g);
      for (const X of [-w / 2 + .12, w / 2 - .12]) for (const Z of [-d / 2 + .12, d / 2 - .12]) this.box('wood', X, .42, Z, .12, .8, .12, g);
      this.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2); return g;
    }
    deskLamp(x, z) {
      this.cyl('bronze', x, .98, z, .16, .04); this.rod('brass', [x, 1, z], [x, 1.45, z], .028); this.rod('brass', [x, 1.45, z], [x + .28, 1.65, z], .027);
      const m = this.mesh(new T.ConeGeometry(.23, .18, 20, 1, true), 'teal', x + .28, 1.6, z); m.rotation.z = -.2;
      this.cyl('lamp', x + .28, 1.51, z, .14, .025);
    }
    observation() {
      const desk = this.table(-2.5, -2.4, 2.65, 1.6); this.deskLamp(-3.43, -2.78);
      const map = this.art('map', 1.92, 1.28, .15, .969, .06, 0, -PI / 2, desk); this.target('map', '찢어진 천체 지도', map, s => !(s.collected || []).includes('map'));
      this.cyl('bronze', -2.0, .99, -2.98, .07, .1); this.box('ivory', -3.65, .99, -1.9, .17, .05, .27);
      const telescope = this.group(.5, 0, -1.4, -.25, this.scene, true); this.target('telescope', '대형 망원경', telescope);
      this.cyl('iron', 0, .09, 0, .8, .16, telescope); this.cyl('bronze', 0, .65, 0, .25, 1.1, telescope); this.cyl('brass', 0, 1.17, 0, .38, .1, telescope);
      this.scopeYaw = this.group(0, 1.35, 0, 0, telescope, true); this.scopeTilt = this.group(0, .25, 0, 0, this.scopeYaw, true); this.scopeTilt.rotation.x = -.55;
      const tube = this.cyl('cream', 0, 0, -.2, .28, 2.2, this.scopeTilt); tube.rotation.x = PI / 2;
      for (const z of [-1.27, -.76, .38, .92]) { const ring = this.cyl('brass', 0, 0, z, .3, .085, this.scopeTilt); ring.rotation.x = PI / 2; }
      const lens = this.cyl('night', 0, 0, -1.32, .25, .035, this.scopeTilt); lens.rotation.x = PI / 2;
      const eye = this.cyl('black', 0, 0, 1.08, .095, .32, this.scopeTilt); eye.rotation.x = PI / 2;
      this.rod('bronze', [-.6, .1, -.5], [0, .9, 0], .07, telescope); this.rod('bronze', [.6, .1, -.5], [0, .9, 0], .07, telescope); this.rod('bronze', [0, .1, .65], [0, .9, 0], .07, telescope);
      this.collider(-.1, 1.1, -2.1, -.8);
      // Two neutral mechanical scales make the telescope a visibly adjustable instrument.
      for (const x of [-.48, .48]) { const dial = this.cyl('brass', x, 1.5, .05, .19, .1, telescope); dial.rotation.z = PI / 2; const face = this.cyl('black', x + Math.sign(x) * .06, 1.5, .05, .15, .013, telescope); face.rotation.z = PI / 2; }
      this.box('wood', -4.5, .65, 2.6, .65, 1.3, 2.4); this.collider(-4.85, -4.15, 1.35, 3.85);
      for (let i = 0; i < 6; i++) { this.box(i % 2 ? 'blue' : 'red', -4.52, 1.32 + (i % 2) * .025, 1.65 + i * .32, .48, .06, .24); }
      this.plaque('관측실', 1.1, .24, -3.85, 2.65, 4.89, PI);
    }
    bookshelf(x, z, yaw, width = 2.6, parent = this.scene) {
      const g = this.group(x, 0, z, yaw, parent); this.box('wood', 0, 1.65, .24, width, 3.3, .12, g);
      for (const X of [-width / 2, width / 2]) this.box('woodLight', X, 1.65, 0, .12, 3.3, .52, g);
      for (let row = 0; row < 5; row++) {
        const Y = .12 + row * .66; this.box('woodLight', 0, Y, 0, width, .08, .54, g);
        for (let i = 0; i < 11; i++) { const X = -width / 2 + .18 + i * (width - .3) / 11, h = .34 + ((i * 7 + row * 13) % 16) / 100, w = .13 + i % 2 * .035, m = ['blue', 'red', 'teal', 'woodLight'][((i + row * 3) % 4)]; this.box(m, X, Y + .05 + h / 2, -.045, w, h, .32, g); this.box('brass', X, Y + .17, -.21, w * .72, .016, .006, g); }
      }
      this.box('woodLight', 0, 3.35, 0, width + .15, .17, .6, g); return g;
    }
    archive() {
      for (const x of [6.7, 9.2, 11.7]) this.bookshelf(x, -4.65, 0, 2.25);
      this.collider(5.5, 12.95, -4.96, -4.32);
      this.table(9.6, -1.9, 2.5, 1.5); this.deskLamp(10.4, -2.3);
      const journal = this.art('journal', 1.05, .76, 9.25, .971, -1.85, 0, -PI / 2); this.target('journal', '연구일지', journal, s => !(s.collected || []).includes('journal'));
      this.box('wood', 12.82, 1.84, -.2, .15, 2.32, 2.05); const decoder = this.art('decoder', 1.9, 2.1, 12.72, 1.84, -.2, -PI / 2); this.target('decoder', '기호 해독표', decoder, s => !(s.collected || []).includes('decoder'));
      const clock = this.group(9.2, 0, 4.55, PI, this.scene, true); this.target('clock', '천체 시계', clock);
      this.box('wood', 0, 1.5, 0, 1.65, 3, .48, clock); this.box('brass', 0, 2.09, .26, 1.45, 1.44, .08, clock);
      const dial = this.cyl('black', 0, 2.09, .32, .64, .045, clock); dial.rotation.x = PI / 2;
      const dialTex = texture(768, 768, (c, W, H) => {
        c.fillStyle = '#112334'; c.fillRect(0, 0, W, H); c.strokeStyle = '#b69a65'; c.lineWidth = 8; c.beginPath(); c.arc(W / 2, H / 2, W * .46, 0, PI * 2); c.stroke();
        for (let i = 0; i < 60; i++) { const a = i / 60 * PI * 2 - PI / 2, R = W * .43; c.lineWidth = i % 5 ? 2 : 5; c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * (R - (i % 5 ? 12 : 28)), H / 2 + Math.sin(a) * (R - (i % 5 ? 12 : 28))); c.lineTo(W / 2 + Math.cos(a) * R, H / 2 + Math.sin(a) * R); c.stroke(); }
        for (let i = 0; i < 24; i++) { const a = i / 24 * PI * 2 - PI / 2; lettering(c, String(i).padStart(2, '0'), W / 2 + Math.cos(a) * W * .32, H / 2 + Math.sin(a) * H * .32, 27); }
      }); this.mesh(planeGeo, new T.MeshStandardMaterial({ map: dialTex }), 0, 2.09, .35, 1.28, 1.28, 1, clock);
      this.hourHand = this.group(0, 2.09, .365, 0, clock, true); this.box('brass', 0, .16, 0, .045, .37, .02, this.hourHand);
      this.minuteHand = this.group(0, 2.09, .38, 0, clock, true); this.box('ivory', 0, .22, 0, .025, .5, .015, this.minuteHand); this.cyl('brass', 0, 2.09, .4, .04, .02, clock).rotation.x = PI / 2;
      this.box('black', 0, .82, .26, .75, .9, .015, clock); this.pendulum = this.group(0, 1.17, .29, 0, clock, true); this.rod('brass', [0, 0, 0], [0, -.65, 0], .015, this.pendulum); const p = this.cyl('brass', 0, -.65, 0, .15, .06, this.pendulum); p.rotation.x = PI / 2;
      this.collider(8.3, 10.1, 4.22, 4.86);
      this.plaque('자료실', 1.1, .24, 7, 2.8, 4.88, PI);
    }
    starDisk(x, y, z, parent, color = '#e5cc8b', points = 5, scale = .22) {
      const tex = texture(128, 128, (c) => { c.clearRect(0, 0, 128, 128); c.fillStyle = color; c.beginPath(); for (let i = 0; i < points * 2; i++) { const a = i * PI / points - PI / 2, r = i % 2 ? 22 : 54; i ? c.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r) : c.moveTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } c.closePath(); c.fill(); });
      const m = this.mesh(planeGeo, new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.DoubleSide }), x, y, z, scale, scale, 1, parent); m.userData.noBatch = true; return m;
    }
    machine() {
      // A wall projection and the control instrument show the same optical path.
      this.beams = this.group(0, 0, 0, 0, this.scene, true); this.beams.visible = false;
      const stars = Array.from({ length: 6 }, (_, index) => ({ index, x: 4.28, z: 8.44 + index % 3 * .56, wallY: index < 3 ? 2.6 : 1.85 }));
      this.mirrorDiagram = {
        bounds: { minX: -4.3, maxX: 4.8, minZ: 5.7, maxZ: 12.4 },
        paths: [
          { id: 'I', color: '#fff0c9', y: 1.85, points: [[-3.8, 7.1], [-1.3, 7.1], [-1.3, 11.35], [2.4, 11.35], [4.28, 9.56]], end: 5 },
          { id: 'II', color: '#89c9e5', y: 2.6, points: [[-3.8, 8.4], [-.3, 8.4], [.5, 8.44], [4.28, 8.44]], end: 0 },
          { id: 'III', color: '#d3b674', y: 2.6, points: [[-3.8, 12], [1, 12], [1, 9], [4.28, 9]], end: 1 },
          { id: 'IV', color: '#e98b76', y: 2.6, points: [[-3.8, 10.7], [-.15, 10.7], [-.15, 6.15], [3.5, 6.15], [4.28, 9.56]], end: 2 }
        ], mirrors: [], stars
      };
      for (const path of this.mirrorDiagram.paths) {
        const beamMat = new T.MeshBasicMaterial({ color: path.color, transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending });
        for (let i = 0; i < path.points.length - 1; i++) this.rod(beamMat, [path.points[i][0], path.y, path.points[i][1]], [path.points[i + 1][0], path.y, path.points[i + 1][1]], .018, this.beams);
        for (let i = 1; i < path.points.length - 1; i++) {
          const p = path.points[i], a = path.points[i - 1], b = path.points[i + 1];
          const incoming = new T.Vector2(p[0] - a[0], p[1] - a[1]).normalize(), outgoing = new T.Vector2(b[0] - p[0], b[1] - p[1]).normalize();
          const normal = incoming.sub(outgoing).normalize(), angle = Math.atan2(normal.x, normal.y);
          this.mirrorDiagram.mirrors.push({ x: p[0], z: p[1], angle, path: path.id });
          const stand = this.group(p[0], 0, p[1]); this.cyl('iron', 0, .1, 0, .17, .17, stand); this.cyl('bronze', 0, path.y / 2, 0, .022, path.y, stand);
          const holder = this.group(0, path.y, 0, angle, stand); this.box('brass', 0, 0, 0, .59, .48, .07, holder); this.box('silver', 0, 0, -.04, .52, .4, .015, holder); this.box('silver', 0, 0, .04, .52, .4, .015, holder);
          if (i === 1) { this.starDisk(0, path.y + .4, .13, stand, path.color, 5, .18); this.plaque(path.id, .29, .17, 0, path.y + .23, .19, 0, stand); }
          this.collider(p[0] - .16, p[0] + .16, p[1] - .16, p[1] + .16);
        }
        const p = path.points[0], source = this.group(p[0], 0, p[1]); this.cyl('iron', 0, .45, 0, .2, .85, source); this.cyl('bronze', 0, path.y / 2, 0, .035, path.y, source);
        const projector = this.cyl('bronze', 0, path.y, 0, .14, .48, source); projector.rotation.z = PI / 2;
        this.starDisk(0, path.y + .35, .13, source, path.color, 5, .18); this.plaque(path.id, .3, .19, 0, path.y + .15, .22, 0, source);
      }
      // The inspection console offers an orthographic view without relying on color alone.
      const console = this.table(-2.65, 9.25, 2.6, 1.5); this.box('iron', 0, 1, 0, 2.34, .19, 1.22, console);
      const optical = this.art('mirrors', 2.15, 1.13, 0, .211, 0, 0, -PI / 2, console); optical.position.y = 1.101;
      this.target('mirrors', '광학 반사 장치', optical, s => !!s.clockSolved);
      // A complete bookcase masks the star panel until the remote handle is located.
      this.bookcase = this.group(4.58, 0, 9, -PI / 2, this.scene, true); this.bookshelf(0, 0, 0, 1.88, this.bookcase);
      this.handleWall = this.group(4.28, 0, 9, -PI / 2, this.scene, true);
      const handleTarget = this.box('bronze', 0, 2.02, 0, 1.78, 2.0, .045, this.handleWall); handleTarget.material = this.materials.wood.clone(); handleTarget.material.transparent = true; handleTarget.material.opacity = .08;
      this.target('handle', '벽의 별 문양', this.handleWall, s => !!s.clockSolved && !s.mirrorSolved);
      for (const star of stars) this.starDisk(star.z - 9, star.wallY, .04, this.handleWall, '#b9a06d', 5, .25);
      this.skyPanel = this.group(4.92, 0, 9, -PI / 2, this.scene, true); const skyBody = this.box('black', 0, 1.55, 0, 1.95, 3.05, .12, this.skyPanel);
      this.art('sky', 1.78, 1.78 * 2 / 3, 0, 1.64, .071, 0, 0, this.skyPanel); this.target('sky', '별자리 벽', this.skyPanel, s => !!s.mirrorSolved && !s.skySolved);
      this.plaque('기계실', 1.1, .24, -4.88, 2.8, 9, PI / 2);
      // Floor route from the entrance to the optical instrument remains clear.
      for (const z of [6, 7.3, 8.6, 9.9, 11.2]) this.box('brass', -.25, .012, z, .045, .012, .45);
    }
    laboratory() {
      this.labGroup = this.group(0, 0, 0, 0, this.scene, true);
      this.table(9.1, 8.95, 2.9, 1.7); const blueprint = this.art('blueprint', 2.1, 1.42, 9.15, .97, 8.92, 0, -PI / 2); this.target('blueprint', '장치 설계도와 실험 기록', blueprint, s => !!s.skySolved && !(s.collected || []).includes('blueprint'));
      this.deskLamp(10.1, 8.4); this.box('iron', 11.9, 1.0, 11.6, 1.2, 2.0, 1.2); this.collider(11.3, 12.5, 11, 12.2);
      const rig = this.group(10.3, 0, 6.65); this.cyl('iron', 0, .15, 0, .8, .2, rig); this.cyl('bronze', 0, .94, 0, .18, 1.5, rig);
      this.mesh(sphereGeo, 'black', 0, 2.04, 0, .7, .7, .7, rig);
      const orbitGeo = new T.TorusGeometry(.85, .028, 6, 32);
      for (let i = 0; i < 3; i++) { const ring = this.mesh(orbitGeo, 'brass', 0, 2.04, 0, 1, 1, 1, rig); ring.rotation.x = i * PI / 3; ring.rotation.y = .5 + i * .8; }
      for (let i = 0; i < 22; i++) { const a = i * 2.3999, y = -1 + i * 2 / 21, r = Math.sqrt(1 - y * y); const p = [Math.cos(a) * r * .71, 2.04 + y * .71, Math.sin(a) * r * .71]; this.mesh(sphereGeo, 'star', ...p, .025, .025, .025, rig); }
      this.collider(9.5, 11.1, 5.9, 7.4);
      for (let i = 0; i < 4; i++) { const x = 6.5 + i * 1.42; this.box('wood', x, 1.8, 12.79, 1.2, 1.65, .1); this.art('blueprint', 1.06, 1.5, x, 1.8, 12.72, PI); }
      this.plaque('실험실 · H A L E', 2.3, .28, 9.2, 3.2, 5.13, 0);
    }
    lighting() {
      this.scene.add(new T.HemisphereLight(0x9db7d2, 0x5f4936, 1.45)); this.scene.add(new T.AmbientLight(0xc4d0db, .55));
      const key = new T.DirectionalLight(0xe1eaff, 1.2); key.position.set(-3, 9, -3); key.target.position.set(0, 0, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -7; key.shadow.camera.right = 7; key.shadow.camera.top = 7; key.shadow.camera.bottom = -7; key.shadow.camera.near = .5; key.shadow.camera.far = 22; key.shadow.bias = -.001; key.shadow.normalBias = .03; this.scene.add(key, key.target); this.keyLight = key;
      for (const [x, z, intensity] of [[-2.7, -2.2, 2.0], [9, -.3, 2.4], [0, 9, 2.1], [9, 9, 2.35]]) { const l = new T.PointLight(0xffd3a0, intensity, 13, 1.4); l.position.set(x, 3.25, z); this.scene.add(l); this.lights.push(l); this.cyl('bronze', x, 3.6, z, .23, .05); this.cyl('lamp', x, 3.43, z, .15, .25); }
      this.machineLight = this.lights[2]; this.labLight = this.lights[3]; const outside = new T.PointLight(0x8bbde4, 3.5, 8, 1.4); outside.position.set(9, 2.5, 15.5); this.scene.add(outside);
    }
    batchStatic() {
      this.scene.updateMatrixWorld(true); const buckets = new Map();
      for (const mesh of this.staticMeshes) {
        if (mesh.userData.noBatch || mesh.material.transparent || mesh.geometry === planeGeo) continue;
        let anchor = this.scene, p = mesh.parent; while (p && p !== this.scene) { if (p.userData.noBatch) { anchor = p; break; } p = p.parent; }
        const key = anchor.uuid + '/' + mesh.geometry.uuid + '/' + mesh.material.uuid;
        if (!buckets.has(key)) buckets.set(key, { anchor, meshes: [] }); buckets.get(key).meshes.push(mesh);
      }
      for (const { anchor, meshes } of buckets.values()) {
        if (meshes.length < 3) continue; const inv = anchor.matrixWorld.clone().invert(), inst = new T.InstancedMesh(meshes[0].geometry, meshes[0].material, meshes.length); inst.castShadow = true; inst.receiveShadow = true;
        meshes.forEach((mesh, i) => { inst.setMatrixAt(i, new T.Matrix4().multiplyMatrices(inv, mesh.matrixWorld)); mesh.removeFromParent(); }); inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere(); anchor.add(inst);
      }
      this.staticMeshes.length = 0;
    }
    isBlocked(x, z, s = {}) {
      const r = .25, overlap = b => x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ;
      if (x < -4.72 || x > 12.72 || z < -4.72 || z > 15.85) return true;
      if (z > 12.72 && (x < 8.28 || x > 9.72)) return true;
      if (this.colliders.some(overlap)) return true;
      if (!s.clockSolved && overlap({ minX: -1, maxX: 1, minZ: 4.85, maxZ: 5.15 })) return true;
      if (!s.skySolved && overlap({ minX: 4.25, maxX: 5.1, minZ: 7.95, maxZ: 10.05 })) return true;
      if (!s.labRead && overlap({ minX: 8, maxX: 10, minZ: 12.85, maxZ: 13.15 })) return true;
      return false;
    }
    update(dt, time, state = {}) {
      const lerp = (a, b) => a + (b - a) * Math.min(1, dt * 4);
      this.doorProgress = lerp(this.doorProgress, state.clockSolved ? 1 : 0); this.machineDoor.position.x = this.doorProgress * 2.12;
      this.bookProgress = lerp(this.bookProgress, state.mirrorSolved ? 1 : 0); this.bookcase.position.z = 9 + this.bookProgress * 2.6;
      this.skyProgress = lerp(this.skyProgress, state.skySolved ? 1 : 0); this.skyPanel.position.z = 9 - this.skyProgress * 2.55;
      this.exitDoor.position.x = 9 + (state.labRead ? 2.1 : 0);
      this.beams.visible = !!state.clockSolved; this.handleWall.visible = !!state.clockSolved && !state.mirrorSolved;
      this.machineLight.intensity = state.clockSolved ? 2.1 : .32; this.labLight.intensity = state.skySolved ? 2.35 : .45;
      this.pendulum.rotation.z = state.clockSolved ? Math.sin(time * 2.7) * .13 : 0;
      const mapKey = (state.mapOrder || [2, 0, 3, 1]).join(','); if (this.mapKey !== mapKey) { this.mapKey = mapKey; this.mapOrder = (state.mapOrder || [2, 0, 3, 1]).slice(); this.drawMap(); }
      const hour = state.clockSolved ? 3 : Number(state.clockHour ?? state.hour ?? 12), minute = state.clockSolved ? 49 : Number(state.clockMinute ?? state.minute ?? 0);
      this.hourHand.rotation.z = -(hour % 24 + minute / 60) / 24 * PI * 2; this.minuteHand.rotation.z = -minute / 60 * PI * 2;
      for (const t of this.targets) { t.enabled = !!t.available(state); if (['map','journal','decoder','blueprint'].includes(t.id)) { if(t.mesh.visible !== t.enabled)this.shadowFrames=2; t.mesh.visible=t.enabled; } if (t.id === 'sky') t.mesh.visible = !!state.mirrorSolved; }
      const az = Number(state.azimuth ?? state.telescopeAz ?? 0), alt = Number(state.altitude ?? state.telescopeAlt ?? 25); this.scopeYaw.rotation.y = -az * PI / 180; this.scopeTilt.rotation.x = -alt * PI / 180;
    }
    setQuality(level) { this.keyLight.castShadow = level !== 'low'; const size = level === 'high' ? 2048 : 1024; if (this.keyLight.shadow.mapSize.x !== size) { this.keyLight.shadow.mapSize.set(size, size); this.keyLight.shadow.map?.dispose(); this.keyLight.shadow.map = null; } }
  }
  NS.World = World;
})();
