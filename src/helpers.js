import { GRID_PITCH, LINE_WIDTH } from './constants';

let nextId = 1;
export const uid = () => `el-${nextId++}`;
export const setNextId = (id) => { nextId = id; };

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
  if (el.type === 'line') {
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
    const w = (el.text?.length || 3) * 8;
    const align = el.align || 'left';
    const rx = align === 'center' ? el.x - w / 2 : el.x;
    return { x: rx, y: el.y - 8, w, h: 16 };
  }
  if (el.type === 'image') {
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

  if (isSubscript) {
    ctx.font = 'italic 14px "Times New Roman", Georgia, serif';
    baseWidth = ctx.measureText(baseText).width;
    ctx.font = '10px "Times New Roman", Georgia, serif';
    subWidth = ctx.measureText(subText).width;
    tw = baseWidth + subWidth + 1;
  } else {
    ctx.font = '12px "Roboto Mono", monospace';
    tw = ctx.measureText(text).width;
  }

  const th = 14;
  const pad = 4;
  const rx = align === 'center' ? el.x - tw / 2 - pad : el.x - pad;
  const ry = el.y - th / 2 - pad;
  const rw = tw + pad * 2;
  const rh = th + pad * 2;
  const r = 4;

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
    const isDarkTheme = document.documentElement.getAttribute('data-theme') !== 'light';
    textColor = hasBg ? '#FFFFFF' : (isDarkTheme ? '#FFFFFF' : '#111111');
  }
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'middle';

  if (isSubscript) {
    const startX = align === 'center' ? el.x - tw / 2 : el.x;
    ctx.font = 'italic 14px "Times New Roman", Georgia, serif';
    ctx.fillText(baseText, startX, el.y);
    ctx.font = '10px "Times New Roman", Georgia, serif';
    ctx.fillText(subText, startX + baseWidth + 1, el.y + 4);
  } else {
    ctx.font = '12px "Roboto Mono", monospace';
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

    // Determine line width
    let lw = LINE_WIDTH;
    if (isOnCustomLayer && cLayer.lineWidth) {
      lw = cLayer.lineWidth;
    } else if (el.layerId === 'thickoxide') {
      lw = 6; // Double thickness for thick oxide
    }
    ctx.lineWidth = lw;
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

export function createTemplateElements(defaultCanvasLayerId) {
  const cx = 300;
  const topY = 100;
  const g = GRID_PITCH;

  const vddLine = { id: uid(), type: 'line', x1: cx - 10 * g, y1: topY, x2: cx + 10 * g, y2: topY, layerId: 'metal1', color: '#4A90E2', label: '', canvasLayerId: 'canvas_vlsi_metal1' };
  const vssLine = { id: uid(), type: 'line', x1: cx - 10 * g, y1: topY + 12 * g, x2: cx + 10 * g, y2: topY + 12 * g, layerId: 'metal1', color: '#4A90E2', label: '', canvasLayerId: 'canvas_vlsi_metal1' };
  const pmosLine = { id: uid(), type: 'line', x1: cx - 10 * g, y1: topY + 3 * g, x2: cx + 10 * g, y2: topY + 3 * g, layerId: 'pdiff', color: '#F1C40F', label: '', canvasLayerId: 'canvas_vlsi_pdiff' };
  const nmosLine = { id: uid(), type: 'line', x1: cx - 10 * g, y1: topY + 9 * g, x2: cx + 10 * g, y2: topY + 9 * g, layerId: 'ndiff', color: '#27AE60', label: '', canvasLayerId: 'canvas_vlsi_ndiff' };

  const vddLabel = { id: uid(), type: 'label', x: cx, y: topY - 14, text: 'V_{DD}', align: 'center', hasBg: false, canvasLayerId: 'canvas_vlsi_metal1' };
  const vssLabel = { id: uid(), type: 'label', x: cx, y: topY + 12 * g + 24, text: 'V_{SS}', align: 'center', hasBg: false, canvasLayerId: 'canvas_vlsi_metal1' };

  return [vddLine, vssLine, pmosLine, nmosLine, vddLabel, vssLabel];
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
