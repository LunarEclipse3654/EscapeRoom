(function (global) {
  'use strict';
  const NS = global.LastSignal = global.LastSignal || {};
  const cache = new Map();
  const frames = {
    acetate: [250, 110, 400, 400], cipher: [190, 50, 520, 520],
    stripA: [95, 175, 715, 260], stripB: [95, 175, 715, 260]
  };
  const dataURL = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  function interior(svg) { return svg.replace(/^\s*<svg\b[^>]*>/i, '').replace(/<\/svg>\s*$/i, ''); }
  function localIds(svg, prefix) {
    return svg.replace(/\bid="([^"]+)"/g, (_, id) => 'id="' + prefix + id + '"')
      .replace(/url\(#([^)]+)\)/g, (_, id) => 'url(#' + prefix + id + ')')
      .replace(/(?:xlink:)?href="#([^"]+)"/g, (_, id) => 'href="#' + prefix + id + '"');
  }
  function permutation(raw, count) {
    return Array.isArray(raw) && raw.length === count && new Set(raw).size === count && raw.every(n => Number.isInteger(n) && n >= 0 && n < count) ? raw : null;
  }
  function pieces(id, order, columns, rows) {
    const source = interior(NS.Art.svg(id));
    const width = 900 / columns, height = 600 / rows;
    let body = '<rect width="900" height="600" fill="#28342f"/>';
    order.forEach((piece, index) => {
      const x = index % columns * width, y = Math.floor(index / columns) * height;
      const sx = piece % columns * width, sy = Math.floor(piece / columns) * height;
      body += '<svg x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '" viewBox="' + sx + ' ' + sy + ' ' + width + ' ' + height + '" overflow="hidden" preserveAspectRatio="none">' + localIds(source, 'piece' + index + '-') + '</svg>';
      // The joins describe the current pieces, including their mismatched lines.
      body += '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="' + (width - 2) + '" height="' + (height - 2) + '" fill="none" stroke="#4b4739" stroke-width="2"/>';
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600" aria-hidden="true">' + body + '</svg>';
  }
  function crop(svg, frame) {
    // The item is a physical disc or film, so exclude the presentation page.
    const body = interior(svg).replace(/<rect width="900" height="600"[^>]*\/>/g, '')
      .replace(/<rect x="20" y="20" width="860" height="560"[^>]*\/>/g, '');
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + frame[2] + '" height="' + frame[3] + '" viewBox="' + frame.join(' ') + '" aria-hidden="true">' + body + '</svg>';
  }
  function icon(id, state, fallback = '') {
    if (!NS.Art || !NS.Art.names || !Object.prototype.hasOwnProperty.call(NS.Art.names, id)) return fallback;
    state = state || {};
    const order = id === 'photo' ? permutation(state.photoOrder, 6) || [4, 0, 5, 2, 1, 3] : id === 'map' ? permutation(state.mapOrder, 4) || [2, 0, 3, 1] : null;
    const shift = id === 'cipher' ? ((Math.trunc(Number(state.discShift) || 0) % 26) + 26) % 26 : 0;
    const key = id + ':' + (order ? order.join(',') : '') + ':' + shift;
    if (!cache.has(key)) {
      let svg = order ? pieces(id, order, id === 'photo' ? 3 : 2, 2) : NS.Art.svg(id, id === 'cipher' ? { shift } : {});
      if (frames[id]) svg = crop(svg, frames[id]);
      cache.set(key, localIds(svg, 'item-' + id + '-' + (order ? order.join('') : shift) + '-'));
      if (cache.size > 64) cache.delete(cache.keys().next().value);
    }
    return cache.get(key);
  }
  function url(id, state, fallback = '') {
    const markup = icon(id, state, fallback).trim();
    if (markup.startsWith('<svg')) return dataURL(markup.includes('xmlns=') ? markup : markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
    if (markup.startsWith('data:image/')) return markup;
    const source = markup.match(/<img\b[^>]*\bsrc=["'](data:image\/[^"']+)["']/i);
    return source ? source[1].replace(/&amp;/g, '&') : '';
  }
  function aspect(id) { return frames[id] ? frames[id][2] / frames[id][3] : NS.Art?.names?.[id] ? 1.5 : 1; }
  function descriptor(item) {
    const markup = typeof item?.icon === 'string' ? item.icon.trim() : '';
    let source = markup;
    let ratio = aspect(item?.id);
    if (markup.startsWith('<svg')) {
      const box = markup.match(/\bviewBox=["']\s*([\d.\-]+)[ ,]+([\d.\-]+)[ ,]+([\d.]+)[ ,]+([\d.]+)\s*["']/i);
      if (box && Number(box[4]) > 0) ratio = Number(box[3]) / Number(box[4]);
      source = dataURL(markup.includes('xmlns=') ? markup : markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
    } else if (markup.startsWith('<img')) {
      const match = markup.match(/\bsrc=["']([^"']+)["']/i); source = match ? match[1].replace(/&amp;/g, '&') : '';
    }
    return { source: source.startsWith('data:image/') ? source : '', aspect: Math.min(4, Math.max(.25, ratio)) };
  }
  NS.ItemArt = { icon, url, aspect, descriptor };
})(globalThis);
