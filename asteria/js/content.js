/* Asteria — original vector evidence, no network or external image dependencies. */
(function (root) {
  'use strict';
  var NS = root.LastSignal = root.LastSignal || {};
  var ink = '#263e4a', muted = '#77827d', gold = '#a78047', paper = '#e6dec9';
  var names = { map: '찢어진 천체 지도', decoder: '천체 기호 해독표', journal: '헤일의 연구일지', telescope: '망원경 접안렌즈', mirrorGuide: '연구일지의 광학 기록', mirrors: '빛 반사 장치', sky: '책장 뒤의 밤하늘', blueprint: '비밀 연구실의 설계도와 기록', ending: '마지막 녹음' };
  var cache = new Map();
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]; }); }
  function txt(s, x, y, size, color, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 24) + '" fill="' + (color || ink) + '" ' + (extra || '') + '>' + esc(s) + '</text>'; }
  function line(x1, y1, x2, y2, color, width, extra) { return '<path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '" stroke="' + (color || ink) + '" stroke-width="' + (width || 2) + '" fill="none" ' + (extra || '') + '/>'; }
  function shell(body, label, dark) {
    var bg = dark ? '#10242d' : paper;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600" role="img" aria-label="' + esc(label) + '"><defs><linearGradient id="page" x2="1" y2="1"><stop stop-color="' + bg + '"/><stop offset="1" stop-color="' + (dark ? '#081921' : '#cfc3a4') + '"/></linearGradient><pattern id="grain" width="31" height="29" patternUnits="userSpaceOnUse"><circle cx="4" cy="8" r=".6" fill="' + (dark ? '#b4cfce' : '#76684d') + '" opacity=".18"/><path d="M18 20h4M7 25h3" stroke="' + (dark ? '#b4cfce' : '#76684d') + '" opacity=".12" stroke-width=".6"/></pattern><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5 0 10Z" fill="' + gold + '"/></marker></defs><rect width="900" height="600" rx="10" fill="url(#page)"/><rect x="21" y="21" width="858" height="558" rx="4" fill="none" stroke="' + (dark ? '#91a7a3' : ink) + '" opacity=".25"/><rect width="900" height="600" fill="url(#grain)"/><g font-family="Segoe UI, Malgun Gothic, Arial, sans-serif" stroke-linecap="round" stroke-linejoin="round">' + body + '</g></svg>';
  }
  function header(label, sub) { return txt(label, 58, 65, 18, muted, 'letter-spacing="3"') + line(58, 82, 842, 82, ink, 1, 'opacity=".25"') + (sub ? txt(sub, 842, 65, 13, muted, 'text-anchor="end"') : ''); }
  var patterns = {
    cygnus: { points: [[-53, 1], [-25, -5], [0, 0], [26, 7], [52, 13], [4, -39], [-7, 38]], paths: [[0, 1, 2, 3, 4], [5, 2, 6]] },
    lyra: { points: [[-42, -35], [-21, 5], [18, -7], [39, 30], [-1, 40]], paths: [[0, 1, 2, 3, 4, 1]] },
    aquila: { points: [[-61, 25], [-28, 10], [0, -3], [31, -17], [60, -31], [-4, 33], [9, -39]], paths: [[0, 1, 2, 3, 4], [5, 2, 6]] },
    orion: { points: [[-34, -41], [31, -36], [-13, -3], [1, 0], [15, 4], [-29, 43], [36, 40]], paths: [[0, 2, 3, 4, 1], [2, 5, 6, 4], [0, 1]] }
  };
  function constellation(id, x, y, scale, color, rotation) {
    var p = patterns[id] || patterns.cygnus; scale = scale || 1; color = color || ink;
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + (rotation || 0) + ') scale(' + scale + ')">' + p.paths.map(function (path) { return '<path d="' + path.map(function (n, i) { return (i ? 'L' : 'M') + p.points[n].join(' '); }).join('') + '" fill="none" stroke="' + color + '" stroke-width="1.7" opacity=".75"/>'; }).join('') + p.points.map(function (point, i) { return '<circle cx="' + point[0] + '" cy="' + point[1] + '" r="' + (i === 2 ? 4 : 2.7) + '" fill="' + color + '"/><circle cx="' + point[0] + '" cy="' + point[1] + '" r="' + (i === 2 ? 9 : 6) + '" fill="' + color + '" opacity=".07"/>'; }).join('') + '</g>';
  }
  function icon(id, x, y, size, color) {
    x = x || 0; y = y || 0; size = size || 40; color = color || ink;
    var paths = {
      moon: '<path d="M12-28A30 30 0 1 0 12 28A31 31 0 0 1 12-28Z"/>',
      triangle: '<path d="M0-29L28 24H-28Z" fill="none" stroke="currentColor" stroke-width="4"/>',
      diamond: '<path d="M0-31L27 0 0 31-27 0Z" fill="none" stroke="currentColor" stroke-width="4"/>',
      star: '<path d="M0-31L8-11 27-16 16 2 27 19 7 15 0 32-8 13-27 18-16 0-27-18-8-12Z"/>',
      eye: '<path d="M-34 0Q0-29 34 0Q0 29-34 0Z" fill="none" stroke="currentColor" stroke-width="3"/><circle r="10"/>',
      clock: '<circle r="29" fill="none" stroke="currentColor" stroke-width="3"/><path d="M0-19V0L15 9M0-29V-24M29 0H24M0 29V24M-29 0H-24" fill="none" stroke="currentColor" stroke-width="3"/>',
      book: '<path d="M-29-24Q-13-30 0-20Q13-30 29-24V25Q13 18 0 28Q-13 18-29 25ZM0-20V28" fill="none" stroke="currentColor" stroke-width="3"/>',
      telescope: '<path d="M-31 0L22-16 30 12-23 28ZM21-16L18-27 29-30 33-18M-4 16L-17 38M-4 16L12 36M-4 16V38" fill="none" stroke="currentColor" stroke-width="3"/>',
      mirror: '<path d="M-23 23L23-23M-26 14L-14 26M-16 4L-4 16M-6-6L6 6M4-16L16-4M14-26L26-14" fill="none" stroke="currentColor" stroke-width="3"/>',
      blueprint: '<path d="M-27-28H27V28H-27ZM-18-18H18V0H-18ZM-18 8H4V19H-18M12 10H19M12 18H19" fill="none" stroke="currentColor" stroke-width="3"/>'
    };
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + (size / 64) + ')" fill="' + color + '" color="' + color + '">' + (paths[id] || paths.star) + '</g>';
  }
  function mapArt() {
    var s = header('ASTERIA · 천체 관측도', 'E. HALE / 1927');
    for (var i = 0; i <= 12; i++) { var x = 60 + i * 65; s += line(x, 103, x, 511, ink, 1, 'opacity=".12"') + txt(String(i * 30) + '°', x, 535, 12, muted, 'text-anchor="middle"'); }
    for (var r = 0; r <= 8; r++) { var y = 103 + r * 51; s += line(60, y, 840, y, ink, 1, 'opacity=".12"') + txt(String(90 - r * 10), 45, y + 4, 11, muted, 'text-anchor="end"'); }
    s += '<path d="M115 177L159 184M320 185C380 159 520 159 577 185M688 244C719 274 719 325 688 355M584 414C519 445 381 445 321 414" fill="none" stroke="' + gold + '" stroke-width="3" marker-end="url(#arrow)"/>';
    s += icon('eye', 88, 174, 42, gold);
    s += constellation('cygnus', 239, 190, 1.2) + constellation('lyra', 662, 190, 1.2) + constellation('aquila', 662, 414, 1.2) + constellation('orion', 239, 414, 1.2);
    s += txt('백조', 239, 127, 22, ink, 'text-anchor="middle"') + txt('수평 40° · 고도 25°', 239, 268, 20, ink, 'text-anchor="middle"');
    s += txt('거문고', 662, 127, 22, ink, 'text-anchor="middle"') + txt('수평 110° · 고도 45°', 662, 268, 20, ink, 'text-anchor="middle"');
    s += txt('오리온', 239, 347, 22, ink, 'text-anchor="middle"') + txt('수평 310° · 고도 60°', 239, 493, 20, ink, 'text-anchor="middle"');
    s += txt('독수리', 662, 347, 22, ink, 'text-anchor="middle"') + txt('수평 200° · 고도 30°', 662, 493, 20, ink, 'text-anchor="middle"');
    s += txt('새벽의 눈부터 따라가라.', 450, 308, 21, gold, 'text-anchor="middle"');
    // The seams cross both a navigation line and coordinate grid: placing a piece
    // by an isolated word is insufficient, while a correct seam is unambiguous.
    s += '<path d="M72 104C155 321 348 367 444 512M450 104C573 165 653 315 827 512M62 294Q235 319 450 289T838 311" fill="none" stroke="' + ink + '" stroke-width="1" opacity=".22"/>';
    s += txt('북', 450, 112, 13, muted, 'text-anchor="middle"') + txt('도면의 눈금과 연결선은 같은 관측면을 따른다.', 450, 566, 14, muted, 'text-anchor="middle"');
    return shell(s, names.map);
  }
  function decoderArt() {
    var s = header('관측 기호 대조표', '자료실 / 표준 기록 양식 04');
    ['moon', 'triangle', 'diamond', 'star'].forEach(function (id, i) {
      var x = 180 + i * 180; s += icon(id, x, 183, 66) + txt('=', x, 253, 25, muted, 'text-anchor="middle"') + txt([2, 7, 4, 9][i], x, 309, 44, ink, 'text-anchor="middle"');
    });
    s += line(100, 345, 800, 345, ink, 1, 'opacity=".3"') + txt('천체 시각 기록', 102, 387, 20, muted);
    s += '<rect x="105" y="409" width="143" height="57" rx="3" fill="none" stroke="' + ink + '" stroke-width="2"/><rect x="277" y="409" width="143" height="57" rx="3" fill="none" stroke="' + ink + '" stroke-width="2"/>';
    s += txt('HH', 176, 449, 33, ink, 'text-anchor="middle"') + txt(':', 261, 448, 35, ink, 'text-anchor="middle"') + txt('MM', 348, 449, 33, ink, 'text-anchor="middle"');
    s += txt('처음 두 숫자: 시간', 470, 425, 20) + txt('나머지 두 숫자: 분', 470, 458, 20);
    s += '<path d="M160 528C215 483 346 488 392 527" fill="none" stroke="' + gold + '" stroke-width="2" marker-end="url(#arrow)"/>' + txt('24h = 하루', 277, 530, 19, gold, 'text-anchor="middle"');
    s += txt('시간이 하루를 넘어서면 다음 날로 돌아간다.', 450, 566, 20, ink, 'text-anchor="middle"');
    return shell(s, names.decoder);
  }
  function journalArt(opticsOnly) {
    var s = header(opticsOnly ? '광학 실험 기록' : 'EDWARD HALE · 연구일지', '1927. 11. 06');
    if (!opticsOnly) {
      s += txt('하늘을 관측하는 자는 별을 찾지만,', 90, 147, 27) + txt('별을 이해하는 자는 하늘을 의심한다.', 90, 190, 27);
      s += line(90, 222, 810, 222, ink, 1, 'opacity=".25"');
      s += txt('렌즈 검사 중', 92, 263, 16, muted) + txt('하늘의 상징을 땅의 시간으로 바꾸어라.', 92, 305, 24, gold);
    }
    var dy = opticsOnly ? -150 : 0;
    s += txt('반사 장치 관찰', 92, 365 + dy, 16, muted) + txt('네 번째 빛을 좇지 마라.', 92, 405 + dy, 25) + txt('첫 번째 별이 마지막에 도착하는 곳을 보아라.', 92, 445 + dy, 25);
    s += icon('star', 150, 516 + dy, 45, gold) + txt('I', 150, 566 + dy, 20, gold, 'text-anchor="middle"');
    s += line(197, 517 + dy, 373, 517 + dy, gold, 3, 'marker-end="url(#arrow)"');
    s += icon('mirror', 420, 516 + dy, 48, ink) + line(461, 517 + dy, 614, 517 + dy, gold, 3, 'marker-end="url(#arrow)"');
    s += icon('star', 743, 515 + dy, 45, muted) + txt('IV', 743, 564 + dy, 20, muted, 'text-anchor="middle"') + line(716, 489 + dy, 769, 541 + dy, '#9a5e48', 3);
    if (opticsOnly) s += txt('시계의 구동축이 반사면을 제 위치로 돌린다.', 92, 470, 21, muted) + txt('광원은 둘. 처음의 표식은 빛이 지나간 자리를 남긴다.', 92, 510, 20, muted);
    return shell(s, opticsOnly ? names.mirrorGuide : names.journal);
  }
  function telescopeArt(options) {
    var o = options || {}, symbol = o.symbol || (o.observation && o.observation.symbol) || '';
    var glyph = { '☾': 'moon', '△': 'triangle', '◇': 'diamond', '✶': 'star' }[symbol];
    var s = txt('ASTERIA / 접안부', 55, 58, 17, '#829994', 'letter-spacing="3"');
    s += '<circle cx="450" cy="305" r="244" fill="#08151c" stroke="#8c896e" stroke-width="15"/><circle cx="450" cy="305" r="220" fill="#142a34" stroke="#2d4550" stroke-width="7"/>';
    for (var i = 0; i < 72; i++) { var a = i * 2.399963, radius = 27 + (i * 41) % 171, x = 450 + Math.cos(a) * radius, y = 305 + Math.sin(a) * radius; s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (i % 11 ? 1.1 : 2) + '" fill="#bfd2cd" opacity="' + (i % 4 ? '.35' : '.65') + '"/>'; }
    s += '<path d="M230 305H330M570 305H670M450 85V185M450 425V525" stroke="#86a3a4" stroke-width="1" opacity=".4" fill="none"/><circle cx="450" cy="305" r="137" fill="none" stroke="#7c9a9f" stroke-width="1" opacity=".2"/>';
    if (glyph) s += icon(glyph, 450, 305, 130, '#d1d7bb') + '<path d="M399 231L405 234M497 374L503 376M389 361L395 360" stroke="#7b9090" stroke-width="2"/>';
    else s += '<circle cx="450" cy="305" r="9" fill="#d1d7bb" opacity=".06"/>';
    s += txt('수평 ' + (Number.isFinite(o.azimuth) ? o.azimuth : 0) + '°', 95, 558, 21, '#b5c6be') + txt('고도 ' + (Number.isFinite(o.altitude) ? o.altitude : 0) + '°', 806, 558, 21, '#b5c6be', 'text-anchor="end"');
    return shell(s, names.telescope, true);
  }
  function mirrorsArt() {
    // The room owns all physical beam geometry. The machine carries its source
    // markings; source-selection instructions remain in the separate journal.
    var s = txt('ASTERIA / OPTICAL DRIVE', 59, 64, 20, '#b9c9be', 'letter-spacing="3"');
    s += '<rect x="66" y="105" width="768" height="413" rx="12" fill="#0c1b22" stroke="#79908c" stroke-width="2"/>';
    ['I', 'II', 'III', 'IV'].forEach(function (id, i) {
      var x = 168 + i * 188;
      s += '<rect x="' + (x - 67) + '" y="170" width="134" height="258" rx="8" fill="#1b3239" stroke="#637d7b" stroke-width="2"/><circle cx="' + x + '" cy="244" r="39" fill="#0a1820" stroke="#9b936c" stroke-width="6"/>';
      s += icon('star', x, 244, 28, '#b2c5ba') + txt(id, x, 346, 32, '#c8c9ad', 'text-anchor="middle"');
      s += '<circle cx="' + x + '" cy="390" r="6" fill="#9da99b" opacity=".5"/>';
    });
    s += txt('1927', 450, 559, 17, '#829c94', 'text-anchor="middle" letter-spacing="6"');
    return shell(s, names.mirrors, true);
  }
  function skyArt() {
    var s = txt('背面 / 천구 투영판', 58, 62, 17, '#8da49d', 'letter-spacing="3"');
    for (var i = 0; i < 97; i++) { var x = 45 + (i * 137) % 810, y = 91 + (i * 71) % 421; s += '<circle cx="' + x + '" cy="' + y + '" r="' + (i % 8 ? '.8' : '1.5') + '" fill="#7b9597" opacity=".3"/>'; }
    s += '<g transform="rotate(180 450 300)">' + constellation('cygnus', 239, 190, 1.5, '#d7dec8') + constellation('lyra', 662, 190, 1.5, '#d7dec8') + constellation('aquila', 662, 414, 1.5, '#d7dec8') + constellation('orion', 239, 414, 1.5, '#d7dec8') + '</g>';
    [[239, 190], [662, 190], [239, 414], [662, 414]].forEach(function (v) { s += '<circle cx="' + v[0] + '" cy="' + v[1] + '" r="90" fill="none" stroke="#78928d" stroke-width="1" opacity=".35"/>'; });
    s += txt('하늘을 올려다보지 말고, 하늘의 뒤편에서 보아라.', 450, 557, 23, '#e5d6af', 'text-anchor="middle"');
    return shell(s, names.sky, true);
  }
  function blueprintArt() {
    var c = '#d0e2d4', fine = '#688c94';
    var s = txt('ASTERIA / 인공 천구 실험 장치', 53, 56, 19, c, 'letter-spacing="2"') + line(53, 76, 848, 76, fine, 1);
    s += '<path d="M80 310A205 205 0 0 1 490 310M80 310H490V452H80ZM105 310V430H465V310" fill="none" stroke="' + c + '" stroke-width="2"/>';
    s += '<path d="M113 293A173 173 0 0 1 457 293" fill="none" stroke="' + fine + '" stroke-width="9" stroke-dasharray="3 13"/>';
    s += '<path d="M285 245L130 170M285 245L238 115M285 245L395 138M285 245L451 230" stroke="#d2bd81" stroke-width="1.8" stroke-dasharray="6 5"/>';
    s += '<circle cx="285" cy="245" r="25" fill="none" stroke="' + c + '" stroke-width="2"/><rect x="274" y="271" width="23" height="58" fill="none" stroke="' + c + '" stroke-width="2"/><path d="M285 329L254 379M285 329L316 379" stroke="' + c + '" stroke-width="3" fill="none"/>';
    s += line(285, 245, 505, 187, fine, 1) + txt('교환식 기호 필름', 515, 183, 17, c) + line(395, 137, 505, 117, fine, 1) + txt('천장 내부의 인공 별판', 515, 121, 17, c);
    s += line(110, 419, 505, 384, fine, 1) + txt('시계 → 캠축 → 반사 장치', 515, 389, 17, c);
    s += txt('실험 기록 / 27호', 530, 243, 19, '#e2cea2') + txt('실제 천체의 관측 자료: 없음', 530, 280, 18, c) + txt('기호, 시간, 빛의 순서를 연결할 것.', 530, 314, 18, c) + txt('피험자는 주어진 배열을', 530, 438, 18, c) + txt('어떤 시점에서 뒤집어 읽는가?', 530, 468, 18, c);
    s += line(55, 492, 845, 492, fine, 1) + txt('관측소 전체가 인공 별자리를 이용한 인지 실험 장치였다.', 450, 534, 21, '#e5d5ae', 'text-anchor="middle"') + txt('기록 재생이 끝나면 비상 출입구를 해제한다.', 450, 568, 16, c, 'text-anchor="middle"');
    return shell(s, names.blueprint, true);
  }
  function endingArt() {
    var s = txt('E. HALE / 마지막 기록', 67, 72, 17, '#9cafaa', 'letter-spacing="3"');
    s += '<circle cx="450" cy="230" r="102" fill="none" stroke="#e4d4a6" stroke-width="1" opacity=".3"/>' + constellation('cygnus', 450, 230, 1.45, '#dfdec2');
    s += txt('별은 언제나 그 자리에 있었다.', 450, 396, 29, '#e6dec5', 'text-anchor="middle"') + txt('달라진 것은 별을 바라보는 인간의 해석이었다.', 450, 449, 26, '#e6dec5', 'text-anchor="middle"');
    s += txt('비상 출입구에서 새벽 공기가 들어온다.', 450, 547, 18, '#99ada5', 'text-anchor="middle"');
    return shell(s, names.ending, true);
  }
  function svg(id, options) {
    switch (id) {
      case 'map': return mapArt();
      case 'decoder': return decoderArt();
      case 'journal': return journalArt(false);
      case 'mirrorGuide': return journalArt(true);
      case 'telescope': return telescopeArt(options);
      case 'mirrors': return mirrorsArt();
      case 'sky': return skyArt();
      case 'blueprint': return blueprintArt();
      case 'ending': return endingArt();
      default: return shell(header('ASTERIA') + icon('star', 450, 300, 110, gold), names[id] || '아스테리아');
    }
  }
  function url(id, options) { var key = id + JSON.stringify(options || {}); if (!cache.has(key)) cache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(id, options))); return cache.get(key); }
  NS.Art = { names: names, svg: svg, url: url, icon: icon, constellation: constellation, patterns: patterns, skyGrid: ['aquila', 'orion', 'lyra', 'cygnus'] };
})(typeof globalThis !== 'undefined' ? globalThis : window);
