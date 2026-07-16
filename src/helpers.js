import { GRID_PITCH, LINE_WIDTH, WIRE_THICKNESS } from './constants.js';

let nextId = 1;
export const uid = () => `el-${nextId++}`;
export const setNextId = (id) => { nextId = id; };

// Group id generator for grouping elements together.
export const groupUid = () => `grp-${Math.random().toString(36).slice(2, 10)}`;

// Given a set of selected ids, expand it to include every element that shares
// a group with any selected element.
export function expandGroupIds(ids, elements) {
  const groups = new Set();
  elements.forEach(el => { if (ids.has(el.id) && el.groupId) groups.add(el.groupId); });
  if (groups.size === 0) return ids instanceof Set ? new Set(ids) : new Set(ids);
  const result = new Set(ids);
  elements.forEach(el => { if (el.groupId && groups.has(el.groupId)) result.add(el.id); });
  return result;
}

// Re-map group ids on a batch of cloned elements so a duplicated/pasted group
// becomes its own independent group.
export function remapGroupIds(clones) {
  const map = {};
  clones.forEach(n => {
    if (n.groupId) {
      if (!map[n.groupId]) map[n.groupId] = groupUid();
      n.groupId = map[n.groupId];
    }
  });
  return clones;
}

// Resolve the drawn thickness (px) for a wire/line element.
export function getLineWidth(el, cLayer) {
  const isOnCustomLayer = cLayer && cLayer.isCustom;
  let lw = LINE_WIDTH;
  if (isOnCustomLayer && cLayer.lineWidth) lw = cLayer.lineWidth;
  else if (el.layerId === 'thickoxide') lw = 6;
  if (el.thickness && WIRE_THICKNESS[el.thickness]) lw = WIRE_THICKNESS[el.thickness];
  return lw;
}

let nextLayerId = 1;
export const layerUid = () => `layer_${nextLayerId++}`;
export const setNextLayerId = (id) => { nextLayerId = id; };

export function snapToGrid(val, pitch) {
  return Math.round(val / pitch) * pitch;
}

export function screenToWorld(sx, sy, pan, zoom) {
  return {
    x: (sx - pan.x) / zoom,
    y: (sy - pan.y) / zoom,
  };
}

export function worldToScreen(wx, wy, pan, zoom) {
  return {
    x: wx * zoom + pan.x,
    y: wy * zoom + pan.y,
  };
}

export function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

export function distPointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function getContactSize(el) {
  const sz = el.size || 'small';
  if (sz === 'medium') return 0.8 * GRID_PITCH;
  if (sz === 'big') return 1.2 * GRID_PITCH;
  return 0.5 * GRID_PITCH;
}

export function getElementBounds(el) {
  if (el.type === 'line' || el.type === 'measure') {
    const minX = Math.min(el.x1, el.x2);
    const minY = Math.min(el.y1, el.y2);
    const maxX = Math.max(el.x1, el.x2);
    const maxY = Math.max(el.y1, el.y2);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  if (el.type === 'contact' || el.type === 'via') {
    const s = getContactSize(el);
    return { x: el.x - s / 2, y: el.y - s / 2, w: s, h: s };
  }
  if (el.type === 'label') {
    const fontSize = el.fontSize || 12;
    const scale = fontSize / 12;
    const w = (el.text?.length || 3) * 8 * scale;
    const h = 16 * scale;
    const align = el.align || 'left';
    const rx = align === 'center' ? el.x - w / 2 : el.x;
    return { x: rx, y: el.y - h / 2, w, h };
  }
  if (el.type === 'image' || el.type === 'rect') {
    return { x: el.x, y: el.y, w: el.w, h: el.h };
  }
  if (el.type === 'brush') {
    if (!el.points || el.points.length === 0) return { x: el.x, y: el.y, w: 0, h: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    el.points.forEach(p => {
      const px = el.x + p.x;
      const py = el.y + p.y;
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

export function resolveLayerColor(el, allLayers, customLayerColors, canvasLayers) {
  // Per-element color override (e.g. poly purple/red toggle)
  if (el.elementColor) return el.elementColor;
  // If element is on a custom canvas layer, use that layer's color
  if (el.canvasLayerId) {
    const cLayer = canvasLayers?.find(l => l.id === el.canvasLayerId);
    if (cLayer && cLayer.isCustom) return cLayer.color || el.color;
  }
  const lid = el.layerId;
  if (!lid) return el.color;
  if (customLayerColors && customLayerColors[lid]) return customLayerColors[lid];
  const layerDef = allLayers[lid];
  return layerDef ? layerDef.hex : (el.color || '#4A90E2');
}

export function drawLabelOnContext(ctx, el, isSelected, options = {}) {
  const {
    forceTextColor = null,
    forceHasBg = null
  } = options;

  const hasBg = forceHasBg !== null ? forceHasBg : (el.hasBg !== false);
  const text = el.text || '';
  const align = el.align || 'left';
  const fontSize = el.fontSize || 12;
  const scale = fontSize / 12;

  const subscriptRegex = /^([a-zA-Z0-9]+)_\{([a-zA-Z0-9]+)\}$|^([a-zA-Z0-9]+)_([a-zA-Z0-9]+)$/;
  const match = text.match(subscriptRegex);

  let baseText = text;
  let subText = '';
  let isSubscript = false;

  if (match) {
    isSubscript = true;
    baseText = match[1] || match[3];
    subText = match[2] || match[4];
  }

  ctx.save();

  let tw = 0;
  let baseWidth = 0;
  let subWidth = 0;

  const baseFontSize = Math.round(14 * scale);
  const subFontSize = Math.round(10 * scale);
  const monoFontSize = Math.round(12 * scale);

  if (isSubscript) {
    ctx.font = `italic ${baseFontSize}px "Times New Roman", Georgia, serif`;
    baseWidth = ctx.measureText(baseText).width;
    ctx.font = `${subFontSize}px "Times New Roman", Georgia, serif`;
    subWidth = ctx.measureText(subText).width;
    tw = baseWidth + subWidth + 1;
  } else {
    ctx.font = `${monoFontSize}px "Roboto Mono", monospace`;
    tw = ctx.measureText(text).width;
  }

  const th = 14 * scale;
  const pad = 4 * scale;
  const rx = align === 'center' ? el.x - tw / 2 - pad : el.x - pad;
  const ry = el.y - th / 2 - pad;
  const rw = tw + pad * 2;
  const rh = th + pad * 2;
  const r = 4 * scale;

  if (hasBg) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
    ctx.lineTo(rx + r, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
    ctx.fill();
  }

  let textColor = forceTextColor;
  if (!textColor) {
    // Per-element color override
    if (el.color) {
      textColor = el.color;
    } else {
      const isDarkTheme = document.documentElement.getAttribute('data-theme') !== 'light';
      textColor = hasBg ? '#FFFFFF' : (isDarkTheme ? '#FFFFFF' : '#111111');
    }
  }
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'middle';

  if (isSubscript) {
    const startX = align === 'center' ? el.x - tw / 2 : el.x;
    ctx.font = `italic ${baseFontSize}px "Times New Roman", Georgia, serif`;
    ctx.fillText(baseText, startX, el.y);
    ctx.font = `${subFontSize}px "Times New Roman", Georgia, serif`;
    ctx.fillText(subText, startX + baseWidth + 1, el.y + 4 * scale);
  } else {
    ctx.font = `${monoFontSize}px "Roboto Mono", monospace`;
    if (align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(text, el.x, el.y);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(text, el.x, el.y);
    }
  }

  ctx.restore();

  if (isSelected) {
    ctx.save();
    const isDarkSel = document.documentElement.getAttribute('data-theme') !== 'light';
    ctx.strokeStyle = isDarkSel ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(rx - 2, ry - 2, rw + 4, rh + 4);
    ctx.restore();
  }
}

export function drawElement(ctx, el, isSelected, options = {}) {
  const { isExport = false, exportTextColor = null, exportHasBg = null,
          allLayers = {}, customLayerColors = {}, canvasLayers = [] } = options;

  if (el.type === 'line') {
    const color = resolveLayerColor(el, allLayers, customLayerColors, canvasLayers);
    ctx.strokeStyle = color;

    // Check if on a custom canvas layer
    const cLayer = canvasLayers?.find(l => l.id === el.canvasLayerId);
    const isOnCustomLayer = cLayer && cLayer.isCustom;

    // Determine line width (per-wire thickness overrides layer defaults)
    ctx.lineWidth = getLineWidth(el, cLayer);
    ctx.lineCap = 'round';

    // Apply dash pattern
    const layerDef = allLayers[el.layerId];
    if (isOnCustomLayer) {
      if (cLayer.strokeStyle === 'dashed') ctx.setLineDash([8, 5]);
      else if (cLayer.strokeStyle === 'dotted') ctx.setLineDash([2, 5]);
      else ctx.setLineDash([]);
    } else if (layerDef && layerDef.dash) {
      ctx.setLineDash(layerDef.dash);
    } else {
      ctx.setLineDash([]);
    }

    const { crossoverXCoords = [] } = options;
    const isHorizontal = el.y1 === el.y2;

    if (isHorizontal && crossoverXCoords.length > 0) {
      const xStart = Math.min(el.x1, el.x2);
      const xEnd = Math.max(el.x1, el.x2);
      const y = el.y1;
      const R = 6;

      const sortedCrossovers = [...crossoverXCoords]
        .filter(cx => cx > xStart + R && cx < xEnd - R)
        .sort((a, b) => a - b);

      ctx.beginPath();
      ctx.moveTo(xStart, y);

      sortedCrossovers.forEach(cx => {
        ctx.lineTo(cx - R, y);
        ctx.arc(cx, y, R, Math.PI, 0, false);
      });

      ctx.lineTo(xEnd, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(el.x1, el.y1);
      ctx.lineTo(el.x2, el.y2);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    if (isSelected && !isExport) {
      ctx.save();
      const isDarkSel = document.documentElement.getAttribute('data-theme') !== 'light';
      ctx.strokeStyle = isDarkSel ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const b = getElementBounds(el);
      const p = 4;
      ctx.strokeRect(b.x - p, b.y - p, b.w + p * 2, b.h + p * 2);
      ctx.restore();
    }

    if (el.label) {
      const mx = (el.x1 + el.x2) / 2;
      const my = (el.y1 + el.y2) / 2;

      ctx.save();
      ctx.font = '12px "Roboto Mono", monospace';
      const metrics = ctx.measureText(el.label);
      const tw = metrics.width;
      const th = 14;
      const pad = 4;
      const rx = mx - tw / 2 - pad;
      const ry = my - th / 2 - pad + 1;
      const rw = tw + pad * 2;
      const rh = th + pad * 2;
      const r = 4;

      const showPill = exportHasBg !== false;
      if (showPill) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.moveTo(rx + r, ry);
        ctx.lineTo(rx + rw - r, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
        ctx.lineTo(rx + rw, ry + rh - r);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
        ctx.lineTo(rx + r, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
        ctx.lineTo(rx, ry + r);
        ctx.quadraticCurveTo(rx, ry, rx + r, ry);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = exportTextColor || '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.label, mx, my + 1);
      ctx.restore();
    }
  } else if (el.type === 'measure') {
    const isDarkM = document.documentElement.getAttribute('data-theme') !== 'light';
    const mColor = el.color || (isExport ? (exportTextColor || '#111111') : (isDarkM ? '#F1C40F' : '#B7791F'));
    const { x1, y1, x2, y2 } = el;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);

    ctx.save();
    ctx.strokeStyle = mColor;
    ctx.fillStyle = mColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.lineCap = 'round';

    // Main span
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrowheads at both ends
    const ah = 7;
    [{ x: x1, y: y1, a: ang }, { x: x2, y: y2, a: ang + Math.PI }].forEach(p => {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + ah * Math.cos(p.a - Math.PI / 7), p.y + ah * Math.sin(p.a - Math.PI / 7));
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + ah * Math.cos(p.a + Math.PI / 7), p.y + ah * Math.sin(p.a + Math.PI / 7));
      ctx.stroke();
    });

    // Dimension readout (px + grid units), offset perpendicular to the span
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const units = len / GRID_PITCH;
    const uStr = units % 1 === 0 ? units.toFixed(0) : units.toFixed(1);
    const text = `${Math.round(len)} px · ${uStr}u`;
    ctx.font = '11px "Roboto Mono", monospace';
    const tw = ctx.measureText(text).width;
    const pad = 4;
    const nx = len ? -dy / len : 0;
    const ny = len ? dx / len : -1;
    const off = 12;
    const tx = mx + nx * off, ty = my + ny * off;
    ctx.fillStyle = isDarkM ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.roundRect(tx - tw / 2 - pad, ty - 8 - pad, tw + pad * 2, 16 + pad * 2, 4);
    ctx.fill();
    ctx.fillStyle = mColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tx, ty);
    ctx.restore();

    if (isSelected && !isExport) {
      ctx.save();
      const isDarkSel = document.documentElement.getAttribute('data-theme') !== 'light';
      ctx.strokeStyle = isDarkSel ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const b = getElementBounds(el);
      const p = 4;
      ctx.strokeRect(b.x - p, b.y - p, b.w + p * 2, b.h + p * 2);
      ctx.restore();
    }
  } else if (el.type === 'contact') {
    const s = getContactSize(el);
    const isDarkForContact = document.documentElement.getAttribute('data-theme') !== 'light';

    const isBuried = el.layerId === 'buriedcontact';
    const stackOffset = options.stackOffset || null;
    // When stacked with a via, force square shape
    const shape = stackOffset ? 'square' : (el.shape || 'square');
    const drawX = stackOffset ? el.x + stackOffset.x : el.x;
    const drawY = stackOffset ? el.y + stackOffset.y : el.y;

    if (shape === 'x' && !isBuried) {
      const half = s / 2;
      ctx.save();
      if (isDarkForContact) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(2.5, s * 0.25) + 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(drawX - half, drawY - half);
        ctx.lineTo(drawX + half, drawY + half);
        ctx.moveTo(drawX + half, drawY - half);
        ctx.lineTo(drawX - half, drawY + half);
        ctx.stroke();
      }
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(2.5, s * 0.25);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(drawX - half, drawY - half);
      ctx.lineTo(drawX + half, drawY + half);
      ctx.moveTo(drawX + half, drawY - half);
      ctx.lineTo(drawX - half, drawY + half);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(drawX - s / 2, drawY - s / 2, s, s);
      ctx.strokeStyle = isDarkForContact ? '#FFFFFF' : '#333333';
      ctx.lineWidth = 1;
      ctx.strokeRect(drawX - s / 2, drawY - s / 2, s, s);

      if (isBuried) {
        const half = s / 2;
        ctx.save();
        ctx.strokeStyle = isDarkForContact ? '#FFFFFF' : '#CCCCCC';
        ctx.lineWidth = Math.max(1.5, s * 0.15);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(drawX - half, drawY - half);
        ctx.lineTo(drawX + half, drawY + half);
        ctx.moveTo(drawX + half, drawY - half);
        ctx.lineTo(drawX - half, drawY + half);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (isSelected && !isExport) {
      ctx.save();
      ctx.strokeStyle = isDarkForContact ? '#FFFFFF' : '#000000';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(el.x - s / 2 - 4, el.y - s / 2 - 4, s + 8, s + 8);
      ctx.restore();
    }
  } else if (el.type === 'via') {
    const s = getContactSize(el);
    const color = resolveLayerColor(el, allLayers, customLayerColors, canvasLayers);
    const isDarkForVia = document.documentElement.getAttribute('data-theme') !== 'light';
    const stackOffset = options.stackOffset || null;
    // When stacked with a contact, force square shape
    const viaShape = stackOffset ? 'square' : (el.shape || 'square');
    const drawX = stackOffset ? el.x + stackOffset.x : el.x;
    const drawY = stackOffset ? el.y + stackOffset.y : el.y;

    if (viaShape === 'x') {
      // X shape only: two diagonal crossing lines, no square background
      const half = s / 2;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2.5, s * 0.25);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(drawX - half, drawY - half);
      ctx.lineTo(drawX + half, drawY + half);
      ctx.moveTo(drawX + half, drawY - half);
      ctx.lineTo(drawX - half, drawY + half);
      ctx.stroke();
      ctx.restore();
    } else {
      // Square shape only: filled square, no X
      ctx.fillStyle = color;
      ctx.fillRect(drawX - s / 2, drawY - s / 2, s, s);
      ctx.strokeStyle = isDarkForVia ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(drawX - s / 2, drawY - s / 2, s, s);
    }

    if (isSelected && !isExport) {
      ctx.save();
      ctx.strokeStyle = isDarkForVia ? '#FFFFFF' : '#000000';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(el.x - s / 2 - 4, el.y - s / 2 - 4, s + 8, s + 8);
      ctx.restore();
    }
  } else if (el.type === 'rect') {
    const stroke = el.strokeColor || '#4A90E2';
    const sw = el.strokeWidth !== undefined ? el.strokeWidth : 2;
    const fill = el.fillColor;

    // Fill (skip when transparent / unset)
    if (fill && fill !== 'transparent') {
      ctx.save();
      ctx.fillStyle = fill;
      ctx.fillRect(el.x, el.y, el.w, el.h);
      ctx.restore();
    }
    // Outline
    if (sw > 0 && stroke && stroke !== 'transparent') {
      ctx.save();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = sw;
      ctx.setLineDash([]);
      ctx.strokeRect(el.x, el.y, el.w, el.h);
      ctx.restore();
    }
    // Label — resizable (labelSize), movable (labelOffsetX/Y) and rotatable (rotation)
    if (el.label) {
      ctx.save();
      const fontSize = el.labelSize || 12;
      ctx.font = `${fontSize}px "Roboto Mono", monospace`;
      let labelColor = el.labelColor;
      if (!labelColor) {
        if (isExport && exportTextColor) labelColor = exportTextColor;
        else labelColor = (stroke && stroke !== 'transparent') ? stroke : '#888888';
      }
      ctx.fillStyle = labelColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lx = el.x + el.w / 2 + (el.labelOffsetX || 0);
      const ly = el.y + el.h / 2 + (el.labelOffsetY || 0);
      const rot = el.rotation || 0;
      if (rot) {
        ctx.translate(lx, ly);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.fillText(el.label, 0, 0);
      } else {
        ctx.fillText(el.label, lx, ly);
      }
      ctx.restore();
    }

    if (isSelected && !isExport) {
      ctx.save();
      const isDarkSel = document.documentElement.getAttribute('data-theme') !== 'light';
      ctx.strokeStyle = isDarkSel ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(el.x - 4, el.y - 4, el.w + 8, el.h + 8);
      ctx.restore();
    }
  } else if (el.type === 'label') {
    drawLabelOnContext(ctx, el, isSelected, {
      forceTextColor: exportTextColor,
      forceHasBg: exportHasBg
    });
  } else if (el.type === 'image') {
    const cache = options.imageCache || {};
    let img = cache[el.id] || cache[el.src];
    if (!img) {
      img = new Image();
      img.src = el.src;
      img.onload = () => {
        cache[el.id] = img;
        cache[el.src] = img;
        if (options.triggerRedraw) options.triggerRedraw();
      };
      cache[el.id] = img;
    }
    if (img.complete && img.naturalWidth !== 0) {
      const cx = el.cropX !== undefined ? el.cropX : 0;
      const cy = el.cropY !== undefined ? el.cropY : 0;
      const cw = el.cropW !== undefined ? el.cropW : 1.0;
      const ch = el.cropH !== undefined ? el.cropH : 1.0;
      const sx = cx * img.naturalWidth;
      const sy = cy * img.naturalHeight;
      const sw = cw * img.naturalWidth;
      const sh = ch * img.naturalHeight;
      ctx.drawImage(img, sx, sy, sw, sh, el.x, el.y, el.w, el.h);
    } else {
      ctx.save();
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(el.x, el.y, el.w, el.h);
      ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
      ctx.fillRect(el.x, el.y, el.w, el.h);
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#888888';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Loading Image...', el.x + el.w / 2, el.y + el.h / 2);
      ctx.restore();
    }

    if (isSelected && !isExport) {
      ctx.save();
      const isDarkSel = document.documentElement.getAttribute('data-theme') !== 'light';
      ctx.strokeStyle = isDarkSel ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(el.x - 4, el.y - 4, el.w + 8, el.h + 8);
      ctx.restore();
    }
  } else if (el.type === 'brush') {
    if (!el.points || el.points.length === 0) return;
    ctx.save();
    ctx.strokeStyle = el.color || '#FF0000';
    ctx.lineWidth = el.size || 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 0.8;

    ctx.beginPath();
    ctx.moveTo(el.x + el.points[0].x, el.y + el.points[0].y);
    for (let i = 1; i < el.points.length; i++) {
      ctx.lineTo(el.x + el.points[i].x, el.y + el.points[i].y);
    }
    ctx.stroke();
    ctx.restore();

    if (isSelected && !isExport) {
      ctx.save();
      const isDarkSel = document.documentElement.getAttribute('data-theme') !== 'light';
      ctx.strokeStyle = isDarkSel ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const b = getElementBounds(el);
      ctx.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
      ctx.restore();
    }
  }
}

// Compute a resized rectangle from a resize-state snapshot and current pointer.
export function computeRectResize(rs, worldPos) {
  const dx = worldPos.x - rs.startWorld.x;
  const dy = worldPos.y - rs.startWorld.y;
  let x = rs.startX, y = rs.startY, w = rs.startW, h = rs.startH;
  const MIN = GRID_PITCH / 2;
  const hd = rs.handle;
  if (hd.includes('r')) w = Math.max(MIN, rs.startW + dx);
  if (hd.includes('l')) { const pw = rs.startW - dx; if (pw >= MIN) { x = rs.startX + dx; w = pw; } }
  if (hd.includes('b')) h = Math.max(MIN, rs.startH + dy);
  if (hd.includes('t')) { const ph = rs.startH - dy; if (ph >= MIN) { y = rs.startY + dy; h = ph; } }
  return { x, y, w, h };
}

export function createTemplateElements(defaultCanvasLayerId) {
  // A correct 2-input CMOS gate stick diagram:
  //   VDD / VSS rails (metal1, blue), P-diffusion (yellow) and N-diffusion
  //   (green) rows, two poly gate inputs A & B (purple), metal routing to an
  //   output L, and contacts at the metal ↔ diffusion junctions.
  const M = (x1, y1, x2, y2) => ({ id: uid(), type: 'line', x1, y1, x2, y2, layerId: 'metal1', color: '#4A90E2', label: '', canvasLayerId: 'canvas_vlsi_metal1' });
  const P = (x1, y1, x2, y2) => ({ id: uid(), type: 'line', x1, y1, x2, y2, layerId: 'pdiff',  color: '#F1C40F', label: '', canvasLayerId: 'canvas_vlsi_pdiff' });
  const N = (x1, y1, x2, y2) => ({ id: uid(), type: 'line', x1, y1, x2, y2, layerId: 'ndiff',  color: '#27AE60', label: '', canvasLayerId: 'canvas_vlsi_ndiff' });
  const POLY = (x1, y1, x2, y2) => ({ id: uid(), type: 'line', x1, y1, x2, y2, layerId: 'poly', color: '#9B59B6', label: '', canvasLayerId: 'canvas_vlsi_poly' });
  const C = (x, y) => ({ id: uid(), type: 'contact', x, y, size: 'small', shape: 'square', layerId: 'contact', color: '#111111', canvasLayerId: 'canvas_vlsi_contact' });
  const L = (x, y, text, align = 'left') => ({ id: uid(), type: 'label', x, y, text, align, hasBg: false, canvasLayerId: 'canvas_vlsi_metal1' });

  // Rails & diffusion rows (horizontal)
  const rails = [
    M(40, 60, 440, 60),    // VDD rail
    M(40, 300, 440, 300),  // VSS rail
    P(40, 120, 400, 120),  // P-diffusion row
    N(40, 240, 400, 240),  // N-diffusion row
    M(240, 180, 430, 180), // output metal → L
  ];

  // Poly gate inputs (vertical, crossing both diffusion rows)
  const polys = [
    POLY(160, 100, 160, 260), // gate A
    POLY(300, 100, 300, 260), // gate B
  ];

  // Metal routing (vertical)
  const metals = [
    M(100, 60, 100, 120),   // VDD → P-diff (left)
    M(360, 60, 360, 120),   // VDD → P-diff (right)
    M(240, 120, 240, 180),  // P-diff drain → output
    M(360, 180, 360, 240),  // output → N-diff (right)
    M(100, 240, 100, 300),  // N-diff → VSS (left)
    M(160, 160, 195, 160),  // A input tap
    M(300, 160, 335, 160),  // B input tap
  ];

  // Contacts at metal ↔ diffusion / rail junctions and poly taps
  const contacts = [
    C(100, 60), C(360, 60),
    C(100, 120), C(240, 120), C(360, 120),
    C(100, 240), C(360, 240),
    C(100, 300),
    C(160, 160), C(300, 160),
  ];

  const labels = [
    L(240, 46, 'V_{DD}', 'center'),
    L(240, 316, 'V_{SS}', 'center'),
    L(205, 160, 'A'),
    L(345, 160, 'B'),
    L(440, 180, 'L'),
  ];

  return [...rails, ...polys, ...metals, ...contacts, ...labels];
}

export function getContentBounds(elementsList) {
  if (elementsList.length === 0) return { x: 0, y: 0, w: 200, h: 200 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  elementsList.forEach(el => {
    const b = getElementBounds(el);
    if (b.w === 0 && b.h === 0 && b.x === 0 && b.y === 0) return;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  });

  if (minX === Infinity) return { x: 0, y: 0, w: 200, h: 200 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function getElementVlsiLayer(el) {
  return el.layerId || 'metal1';
}

export function getCrossovers(elementsList) {
  const crossovers = [];
  const horizontalLines = elementsList.filter(el => el.type === 'line' && el.y1 === el.y2);
  const verticalLines = elementsList.filter(el => el.type === 'line' && el.x1 === el.x2);

  horizontalLines.forEach(h => {
    const hLayer = getElementVlsiLayer(h);
    verticalLines.forEach(v => {
      const vLayer = getElementVlsiLayer(v);
      if (hLayer !== vLayer) return;

      const x = v.x1;
      const y = h.y1;
      const hMinX = Math.min(h.x1, h.x2);
      const hMaxX = Math.max(h.x1, h.x2);
      const vMinY = Math.min(v.y1, v.y2);
      const vMaxY = Math.max(v.y1, v.y2);

      if (x > hMinX && x < hMaxX && y > vMinY && y < vMaxY) {
        crossovers.push({ x, y, hId: h.id, vId: v.id, layerId: hLayer });
      }
    });
  });

  return crossovers;
}
