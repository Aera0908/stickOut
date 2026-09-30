import {
  GRID_PITCH,
  LINE_WIDTH,
  WIRE_THICKNESS,
  JUNCTION_SIZES,
  SYMBOL_STROKE_WIDTH,
  RESISTOR_SUBTYPES
} from './constants.js';

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

// Schematic mixed-signal & analog component types
export const SCHEMATIC_DEVICE_TYPES = [
  'mosfet', 'supply', 'tgate', 'bjt', 'varactor',
  'resistor', 'capacitor', 'inductor',
  'diode', 'esd_diode', 'scr', 'pad',
  'well_tap', 'port'
];
export const isSchematicDevice = (el) => SCHEMATIC_DEVICE_TYPES.includes(el?.type);

// Element types anchored by a single (x, y) point — everything except lines and
// measures, which carry two endpoints. Used wherever elements are translated.
export const POINT_TYPES = [
  'contact', 'via', 'label', 'image', 'brush', 'rect',
  ...SCHEMATIC_DEVICE_TYPES,
  'junction'
];
export const isPointType = (type) => POINT_TYPES.includes(type);

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

// ─── CMOS schematic symbols ──────────────────────────────────────────
// Symbols are authored in a local frame around the element's (x, y) anchor,
// then mirrored → rotated → translated into world space. Every terminal sits a
// whole number of grid cells from the anchor, so wires drawn with snapping land
// exactly on gate / drain / source.

// Ink for schematic strokes: honours a per-element color override, follows the
// export text colour when exporting, otherwise tracks the UI theme.
export function schematicInk(el, options = {}) {
  if (el.elementColor) return el.elementColor;
  if (el.color) return el.color;
  if (options.isExport) return options.exportInk || '#111111';
  return document.documentElement.getAttribute('data-theme') !== 'light' ? '#E6E2D8' : '#111111';
}

export function normalizeRotation(rotation) {
  return (((rotation || 0) % 360) + 360) % 360;
}

// Map a point from a symbol's local frame into world coordinates.
export function transformSymbolPoint(el, lx, ly) {
  let x = el.mirror ? -lx : lx;
  let y = el.flipY ? -ly : ly;
  switch (normalizeRotation(el.rotation)) {
    case 90:  { const t = x; x = -y; y = t; break; }
    case 180: { x = -x; y = -y; break; }
    case 270: { const t = x; x = y; y = -t; break; }
    default: break;
  }
  return { x: el.x + x, y: el.y + y };
}

// Same transform applied to an axis-aligned local extent box.
function transformExtents(ext, el) {
  let { minX, minY, maxX, maxY } = ext;
  if (el.mirror) { const t = minX; minX = -maxX; maxX = -t; }
  if (el.flipY) { const t = minY; minY = -maxY; maxY = -t; }
  switch (normalizeRotation(el.rotation)) {
    case 90:  return { minX: -maxY, minY: minX, maxX: -minY, maxY: maxX };
    case 180: return { minX: -maxX, minY: -maxY, maxX: -minX, maxY: -minY };
    case 270: return { minX: minY, minY: -maxX, maxX: maxY, maxY: -minX };
    default:  return { minX, minY, maxX, maxY };
  }
}

// Terminal positions for all schematic devices. Wires drawn with snapping
// land exactly on these coordinates.
export function getDeviceTerminals(el) {
  const G = GRID_PITCH;
  if (el.type === 'mosfet') {
    const gate = transformSymbolPoint(el, -2 * G, 0);
    const top = transformSymbolPoint(el, 0, -2 * G);
    const bottom = transformSymbolPoint(el, 0, 2 * G);
    const res = el.device === 'pmos'
      ? { gate, source: top, drain: bottom }
      : { gate, drain: top, source: bottom };
    if (el.fourTerminal) {
      res.bulk = transformSymbolPoint(el, 2 * G, 0);
    }
    return res;
  }
  if (el.type === 'tgate') {
    return {
      in: transformSymbolPoint(el, -2 * G, 0),
      out: transformSymbolPoint(el, 2 * G, 0),
      enb: transformSymbolPoint(el, 0, -2 * G),
      en: transformSymbolPoint(el, 0, 2 * G),
    };
  }
  if (el.type === 'bjt') {
    return {
      base: transformSymbolPoint(el, -2 * G, 0),
      collector: transformSymbolPoint(el, 0, -2 * G),
      emitter: transformSymbolPoint(el, 0, 2 * G),
    };
  }
  if (el.type === 'scr') {
    return {
      anode: transformSymbolPoint(el, 0, -2 * G),
      cathode: transformSymbolPoint(el, 0, 2 * G),
      gate: transformSymbolPoint(el, -2 * G, G),
    };
  }
  if (el.type === 'inductor' && el.subtype === 'center_tapped') {
    return {
      port1: transformSymbolPoint(el, 0, -2 * G),
      port2: transformSymbolPoint(el, 0, 2 * G),
      ct: transformSymbolPoint(el, 2 * G, 0),
    };
  }
  if (el.type === 'esd_diode' && el.subtype === 'esd_dual') {
    return {
      vdd: transformSymbolPoint(el, 0, -2 * G),
      vss: transformSymbolPoint(el, 0, 2 * G),
      io: transformSymbolPoint(el, -2 * G, 0),
    };
  }
  if (['resistor', 'capacitor', 'inductor', 'diode', 'esd_diode', 'varactor'].includes(el.type)) {
    return {
      t1: transformSymbolPoint(el, 0, -2 * G),
      t2: transformSymbolPoint(el, 0, 2 * G),
    };
  }
  if (el.type === 'pad') {
    return { pad: transformSymbolPoint(el, 0, 2 * G) };
  }
  if (['supply', 'well_tap', 'port'].includes(el.type)) {
    return { pin: { x: el.x, y: el.y } };
  }
  return {};
}

// Backward-compatible aliases
export function getMosfetTerminals(el) { return getDeviceTerminals(el); }
export function getSupplyTerminal(el) { return { x: el.x, y: el.y }; }

function getSymbolExtents(el) {
  const G = GRID_PITCH;
  const labelLen = (el.label?.length || 0) * 7;
  const valLen = (el.value?.length || el.wl?.length || el.multiplier?.length || el.cRange?.length || el.clampVoltage?.length || 0) * 6;
  const textMaxW = Math.max(labelLen, valLen);

  if (el.type === 'mosfet') {
    const maxX = el.fourTerminal ? Math.max(2.4 * G, 0.4 * G + textMaxW) : Math.max(1.2 * G, 0.4 * G + textMaxW);
    return transformExtents({ minX: -2.2 * G, minY: -2.2 * G, maxX, maxY: 2.2 * G }, el);
  }
  if (el.type === 'tgate') {
    return transformExtents({ minX: -2.2 * G, minY: -2.2 * G, maxX: Math.max(2.2 * G, 0.8 * G + textMaxW), maxY: 2.2 * G }, el);
  }
  if (el.type === 'bjt') {
    return transformExtents({ minX: -2.2 * G, minY: -2.2 * G, maxX: Math.max(1.5 * G, 0.4 * G + textMaxW), maxY: 2.2 * G }, el);
  }
  if (el.type === 'resistor' || el.type === 'capacitor' || el.type === 'inductor' || el.type === 'varactor' || el.type === 'diode' || el.type === 'esd_diode') {
    const maxX = el.type === 'inductor' && el.subtype === 'center_tapped'
      ? Math.max(2.4 * G, 1.2 * G + textMaxW)
      : Math.max(1.2 * G, 0.8 * G + textMaxW);
    const minX = (el.type === 'esd_diode' && el.subtype === 'esd_dual') ? -2.2 * G : -1.4 * G;
    return transformExtents({ minX, minY: -2.2 * G, maxX, maxY: 2.2 * G }, el);
  }
  if (el.type === 'scr') {
    return transformExtents({ minX: -2.2 * G, minY: -2.2 * G, maxX: Math.max(1.4 * G, 0.6 * G + textMaxW), maxY: 2.2 * G }, el);
  }
  if (el.type === 'pad') {
    return transformExtents({ minX: -1.6 * G, minY: -1.6 * G, maxX: Math.max(1.6 * G, 0.4 * G + textMaxW), maxY: 2.4 * G }, el);
  }
  if (el.type === 'well_tap') {
    return transformExtents({ minX: -1.2 * G, minY: -1.2 * G, maxX: Math.max(1.2 * G, 0.8 * G + textMaxW), maxY: 1.2 * G }, el);
  }
  if (el.type === 'port') {
    return transformExtents({ minX: -1.8 * G, minY: -1.2 * G, maxX: Math.max(1.8 * G, 0.8 * G + textMaxW), maxY: 1.2 * G }, el);
  }
  // Supply: stem + bar or ground symbols
  const isVdd = (el.kind || 'vdd') === 'vdd';
  const local = isVdd
    ? { minX: -1.0 * G, minY: -2.2 * G, maxX: Math.max(1.0 * G, 0.4 * G + textMaxW), maxY: 0 }
    : { minX: -1.0 * G, minY: 0, maxX: Math.max(1.0 * G, 0.4 * G + textMaxW), maxY: 2.5 * G };
  return transformExtents(local, el);
}

export function getJunctionRadius(el) {
  return JUNCTION_SIZES[el.size] || JUNCTION_SIZES.medium;
}

// Build a CMOS palette element at (x, y). Shared by placement and the
// drag-in ghost preview, so both always agree.
export function createCmosElement(kind, x, y, extra = {}) {
  const base = { x, y, rotation: 0, mirror: false, ...extra, id: extra.id || uid() };

  // MOSFETs
  if (kind === 'pmos' || kind === 'nmos') {
    return {
      type: 'mosfet',
      device: kind,
      label: kind === 'pmos' ? 'MP1' : 'MN1',
      wl: '2u/180n',
      fourTerminal: false,
      showPins: false,
      ...base,
    };
  }

  // Transmission Gate
  if (kind === 'tgate') {
    return {
      type: 'tgate',
      label: 'TG1',
      size: '2u/180n',
      showPins: false,
      ...base,
    };
  }

  // BJT (Parasitic / Substrate)
  if (kind === 'bjt') {
    return {
      type: 'bjt',
      subtype: 'vpnp',
      label: 'Q1',
      multiplier: '1x',
      showPins: false,
      ...base,
    };
  }

  // Varactor
  if (kind === 'varactor') {
    return {
      type: 'varactor',
      subtype: 'mos_varactor',
      label: 'CVAR1',
      cRange: '100f-500fF',
      ...base,
    };
  }

  // Resistor
  if (kind === 'resistor') {
    return {
      type: 'resistor',
      subtype: 'poly_unsil',
      label: 'R1',
      value: '10kΩ',
      ...base,
    };
  }

  // Capacitor
  if (kind === 'capacitor') {
    return {
      type: 'capacitor',
      subtype: 'mim',
      label: 'C1',
      value: '1.0pF',
      ...base,
    };
  }

  // Inductor
  if (kind === 'inductor') {
    return {
      type: 'inductor',
      subtype: 'spiral',
      label: 'L1',
      value: '2.5nH',
      ...base,
    };
  }

  // PN Diode
  if (kind === 'diode') {
    return {
      type: 'diode',
      subtype: 'pn',
      label: 'D1',
      ...base,
    };
  }

  // ESD Clamp Diode
  if (kind === 'esd_diode') {
    return {
      type: 'esd_diode',
      subtype: 'esd_clamp',
      label: 'DESD1',
      clampVoltage: '5.5V',
      ...base,
    };
  }

  // SCR / Thyristor
  if (kind === 'scr') {
    return {
      type: 'scr',
      label: 'SCR1',
      showPins: false,
      ...base,
    };
  }

  // I/O Bond Pad
  if (kind === 'pad') {
    return {
      type: 'pad',
      label: 'PAD_IO',
      padType: 'wirebond',
      ...base,
    };
  }

  // VDD Supply
  if (kind === 'vdd') {
    return {
      type: 'supply',
      kind: 'vdd',
      domain: 'vdd',
      label: 'VDD',
      ...base,
    };
  }

  // VSS / Ground
  if (kind === 'vss') {
    return {
      type: 'supply',
      kind: 'vss',
      groundType: 'vss',
      label: 'VSS',
      ...base,
    };
  }

  // Bulk / Well Tap
  if (kind === 'well_tap') {
    return {
      type: 'well_tap',
      tapType: 'ntap',
      label: 'NTAP',
      ...base,
    };
  }

  // Terminal Port Pin
  if (kind === 'port') {
    return {
      type: 'port',
      portType: 'in',
      label: 'IN',
      ...base,
    };
  }

  return null;
}

// ─── Vector Symbol Drawing Functions ────────────────────────────────────────

// Helper to draw text captions in schematic symbols
function drawSymbolCaptions(ctx, el, P, topText, bottomText, defaultOffset = 0.6) {
  if (!topText && !bottomText) return;
  const G = GRID_PITCH;
  const rot = normalizeRotation(el.rotation);
  const pos = P(defaultOffset * G, 0);

  ctx.font = '11px "Roboto Mono", monospace';
  if (rot === 0 || rot === 180) {
    ctx.textAlign = pos.x >= el.x ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    if (topText && bottomText) {
      ctx.fillText(topText, pos.x, pos.y - 0.35 * G);
      ctx.font = '10px "Roboto Mono", monospace';
      ctx.fillText(bottomText, pos.x, pos.y + 0.35 * G);
    } else if (topText) {
      ctx.fillText(topText, pos.x, pos.y);
    } else if (bottomText) {
      ctx.font = '10px "Roboto Mono", monospace';
      ctx.fillText(bottomText, pos.x, pos.y);
    }
  } else {
    ctx.textAlign = 'center';
    if (pos.y >= el.y) {
      ctx.textBaseline = 'top';
      if (topText && bottomText) {
        ctx.fillText(topText, pos.x, pos.y + 4);
        ctx.font = '10px "Roboto Mono", monospace';
        ctx.fillText(bottomText, pos.x, pos.y + 17);
      } else if (topText) {
        ctx.fillText(topText, pos.x, pos.y + 4);
      } else if (bottomText) {
        ctx.font = '10px "Roboto Mono", monospace';
        ctx.fillText(bottomText, pos.x, pos.y + 4);
      }
    } else {
      ctx.textBaseline = 'bottom';
      if (topText && bottomText) {
        ctx.fillText(topText, pos.x, pos.y - 17);
        ctx.font = '10px "Roboto Mono", monospace';
        ctx.fillText(bottomText, pos.x, pos.y - 4);
      } else if (topText) {
        ctx.fillText(topText, pos.x, pos.y - 4);
      } else if (bottomText) {
        ctx.font = '10px "Roboto Mono", monospace';
        ctx.fillText(bottomText, pos.x, pos.y - 4);
      }
    }
  }
}

// 1. MOSFET (NMOS / PMOS - 3-terminal or 4-terminal with Bulk)
function drawMosfetSymbol(ctx, el, options) {
  const G = GRID_PITCH;
  const ink = schematicInk(el, options);
  const isP = el.device === 'pmos';
  const P = (lx, ly) => transformSymbolPoint(el, lx, ly);
  const seg = (ax, ay, bx, by) => {
    const a = P(ax, ay), b = P(bx, by);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  };

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = el.strokeWidth || SYMBOL_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  ctx.beginPath();
  // Gate lead — stops short of inversion bubble on PMOS
  seg(-2 * G, 0, isP ? -1.6 * G : -G, 0);
  // Gate plate and channel bar
  seg(-G, -G, -G, G);
  seg(-0.5 * G, -G, -0.5 * G, G);
  // Drain & Source leads
  seg(-0.5 * G, -G, 0, -G);
  seg(0, -G, 0, -2 * G);
  seg(-0.5 * G, G, 0, G);
  seg(0, G, 0, 2 * G);

  // 4-terminal Bulk body lead & arrow
  if (el.fourTerminal) {
    seg(-0.5 * G, 0, 2 * G, 0);
    // Arrow on bulk terminal: NMOS arrow points inward (P-substrate to N-channel)
    // PMOS arrow points outward (N-well to P-channel)
    const arrowX = isP ? 1.0 * G : 0.6 * G;
    const dir = isP ? 1 : -1;
    const aTip = P(arrowX, 0);
    const aW1 = P(arrowX - dir * 0.35 * G, -0.22 * G);
    const aW2 = P(arrowX - dir * 0.35 * G, 0.22 * G);
    ctx.moveTo(aW1.x, aW1.y); ctx.lineTo(aTip.x, aTip.y); ctx.lineTo(aW2.x, aW2.y);
  }
  ctx.stroke();

  if (isP) {
    const c = P(-1.3 * G, 0);
    ctx.beginPath();
    ctx.arc(c.x, c.y, 0.3 * G, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Captions
  drawSymbolCaptions(ctx, el, P, el.label, el.wl, el.fourTerminal ? 1.0 : 0.6);

  // Optional pin markers
  if (el.showPins) {
    ctx.font = '9px "Roboto Mono", monospace';
    const drawPin = (lbl, lx, ly) => {
      const pt = P(lx, ly);
      const dx = pt.x - el.x, dy = pt.y - el.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        ctx.textAlign = dx > 0 ? 'left' : 'right';
        ctx.textBaseline = 'middle';
      } else {
        ctx.textAlign = 'center';
        ctx.textBaseline = dy > 0 ? 'top' : 'bottom';
      }
      ctx.fillText(lbl, pt.x, pt.y);
    };
    drawPin('G', -2.35 * G, 0);
    drawPin(isP ? 'S' : 'D', 0, -2.35 * G);
    drawPin(isP ? 'D' : 'S', 0, 2.35 * G);
    if (el.fourTerminal) drawPin('B', 2.35 * G, 0);
  }
  ctx.restore();
}

// 2. Transmission Gate (T-Gate: Parallel PMOS + NMOS)
function drawTGateSymbol(ctx, el, options) {
  const G = GRID_PITCH;
  const ink = schematicInk(el, options);
  const P = (lx, ly) => transformSymbolPoint(el, lx, ly);
  const seg = (ax, ay, bx, by) => {
    const a = P(ax, ay), b = P(bx, by);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  };

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = el.strokeWidth || SYMBOL_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  ctx.beginPath();
  // Input lead and split
  seg(-2 * G, 0, -G, 0);
  seg(-G, 0, -0.6 * G, -G);
  seg(-G, 0, -0.6 * G, G);

  // Output rejoin and lead
  seg(0.6 * G, -G, G, 0);
  seg(0.6 * G, G, G, 0);
  seg(G, 0, 2 * G, 0);

  // Top PMOS branch
  seg(-0.6 * G, -G, 0.6 * G, -G);
  seg(-0.6 * G, -1.35 * G, 0.6 * G, -1.35 * G);
  seg(0, -1.75 * G, 0, -2 * G);

  // Bottom NMOS branch
  seg(-0.6 * G, G, 0.6 * G, G);
  seg(-0.6 * G, 1.35 * G, 0.6 * G, 1.35 * G);
  seg(0, 1.35 * G, 0, 2 * G);
  ctx.stroke();

  // Inversion bubble on PMOS gate
  const bubble = P(0, -1.55 * G);
  ctx.beginPath();
  ctx.arc(bubble.x, bubble.y, 0.2 * G, 0, Math.PI * 2);
  ctx.stroke();

  // Captions
  drawSymbolCaptions(ctx, el, P, el.label, el.size, 1.2);

  if (el.showPins) {
    ctx.font = '9px "Roboto Mono", monospace';
    const drawPin = (lbl, lx, ly, align, baseline) => {
      const pt = P(lx, ly);
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      ctx.fillText(lbl, pt.x, pt.y);
    };
    drawPin('IN', -2.35 * G, 0, 'right', 'middle');
    drawPin('OUT', 2.35 * G, 0, 'left', 'middle');
    drawPin('ENB', 0, -2.35 * G, 'center', 'bottom');
    drawPin('EN', 0, 2.35 * G, 'center', 'top');
  }
  ctx.restore();
}

// 3. Parasitic / Substrate BJT (NPN / PNP / Vertical PNP / Lateral PNP)
function drawBjtSymbol(ctx, el, options) {
  const G = GRID_PITCH;
  const ink = schematicInk(el, options);
  const isPnp = el.subtype === 'vpnp' || el.subtype === 'lpnp' || el.subtype === 'pnp';
  const P = (lx, ly) => transformSymbolPoint(el, lx, ly);
  const seg = (ax, ay, bx, by) => {
    const a = P(ax, ay), b = P(bx, by);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  };

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = el.strokeWidth || SYMBOL_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  ctx.beginPath();
  // Base lead & bar
  seg(-2 * G, 0, -0.8 * G, 0);
  seg(-0.8 * G, -1.2 * G, -0.8 * G, 1.2 * G);

  // Collector branch
  seg(-0.8 * G, -0.6 * G, 0, -1.2 * G);
  seg(0, -1.2 * G, 0, -2 * G);

  // Emitter branch
  seg(-0.8 * G, 0.6 * G, 0, 1.2 * G);
  seg(0, 1.2 * G, 0, 2 * G);

  // Substrate collector tie mark for Vertical PNP
  if (el.subtype === 'vpnp') {
    seg(-0.4 * G, -2 * G, 0.4 * G, -2 * G);
  }
  ctx.stroke();

  // Emitter arrow
  ctx.beginPath();
  if (isPnp) {
    // Arrow points IN towards base: tip at (-0.8G + 0.35G, 0.6G - 0.26G)
    const tip = P(-0.45 * G, 0.86 * G);
    const w1 = P(-0.35 * G, 0.55 * G);
    const w2 = P(-0.15 * G, 0.85 * G);
    ctx.moveTo(w1.x, w1.y); ctx.lineTo(tip.x, tip.y); ctx.lineTo(w2.x, w2.y);
  } else {
    // NPN: Arrow points OUT towards emitter lead: tip at (0, 1.2G)
    const tip = P(0, 1.2 * G);
    const w1 = P(-0.1 * G, 0.85 * G);
    const w2 = P(-0.35 * G, 1.05 * G);
    ctx.moveTo(w1.x, w1.y); ctx.lineTo(tip.x, tip.y); ctx.lineTo(w2.x, w2.y);
  }
  ctx.stroke();

  // Subtype badge e.g. [VPNP], [NPN]
  const badge = el.subtype ? el.subtype.toUpperCase() : (isPnp ? 'PNP' : 'NPN');
  drawSymbolCaptions(ctx, el, P, el.label || 'Q1', `${badge} ${el.multiplier || '1x'}`, 0.7);

  if (el.showPins) {
    ctx.font = '9px "Roboto Mono", monospace';
    const drawPin = (lbl, lx, ly, align, baseline) => {
      const pt = P(lx, ly);
      ctx.textAlign = align; ctx.textBaseline = baseline;
      ctx.fillText(lbl, pt.x, pt.y);
    };
    drawPin('B', -2.35 * G, 0, 'right', 'middle');
    drawPin('C', 0, -2.35 * G, 'center', 'bottom');
    drawPin('E', 0, 2.35 * G, 'center', 'top');
  }
  ctx.restore();
}

// 4. Varactor (Variable Capacitor / MOS Varactor)
function drawVaractorSymbol(ctx, el, options) {
  const G = GRID_PITCH;
  const ink = schematicInk(el, options);
  const P = (lx, ly) => transformSymbolPoint(el, lx, ly);
  const seg = (ax, ay, bx, by) => {
    const a = P(ax, ay), b = P(bx, by);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  };

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = el.strokeWidth || SYMBOL_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  ctx.beginPath();
  // Top lead and plate
  seg(0, -2 * G, 0, -0.4 * G);
  seg(-0.8 * G, -0.4 * G, 0.8 * G, -0.4 * G);

  // Bottom lead and plate
  seg(-0.8 * G, 0.4 * G, 0.8 * G, 0.4 * G);
  seg(0, 0.4 * G, 0, 2 * G);

  // If MOS varactor, draw gate-oxide channel indicator
  if (el.subtype === 'mos_varactor') {
    seg(-0.6 * G, 0.65 * G, 0.6 * G, 0.65 * G);
  }

  // Diagonal tuning arrow
  seg(-1.1 * G, 0.8 * G, 1.1 * G, -0.8 * G);
  // Arrowhead at (1.1G, -0.8G)
  const tip = P(1.1 * G, -0.8 * G);
  const a1 = P(0.75 * G, -0.85 * G);
  const a2 = P(1.05 * G, -0.55 * G);
  ctx.moveTo(a1.x, a1.y); ctx.lineTo(tip.x, tip.y); ctx.lineTo(a2.x, a2.y);
  ctx.stroke();

  drawSymbolCaptions(ctx, el, P, el.label, el.cRange || 'Varactor', 1.0);
  ctx.restore();
}

// 5. Resistor (Poly, Diffusion, Thin-Film Metal)
function drawResistorSymbol(ctx, el, options) {
  const G = GRID_PITCH;
  const ink = schematicInk(el, options);
  const P = (lx, ly) => transformSymbolPoint(el, lx, ly);
  const seg = (ax, ay, bx, by) => {
    const a = P(ax, ay), b = P(bx, by);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  };

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = el.strokeWidth || SYMBOL_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  ctx.beginPath();
  // Top lead
  seg(0, -2 * G, 0, -1.2 * G);

  // Zigzag body (6 segments)
  seg(0, -1.2 * G, 0.45 * G, -0.8 * G);
  seg(0.45 * G, -0.8 * G, -0.45 * G, -0.4 * G);
  seg(-0.45 * G, -0.4 * G, 0.45 * G, 0);
  seg(0.45 * G, 0, -0.45 * G, 0.4 * G);
  seg(-0.45 * G, 0.4 * G, 0.45 * G, 0.8 * G);
  seg(0.45 * G, 0.8 * G, 0, 1.2 * G);

  // Bottom lead
  seg(0, 1.2 * G, 0, 2 * G);
  ctx.stroke();

  // Subtype badge
  const subCode = RESISTOR_SUBTYPES[el.subtype]?.code || 'RES';
  drawSymbolCaptions(ctx, el, P, el.label, `${el.value || '10kΩ'} [${subCode}]`, 0.8);
  ctx.restore();
}

// 6. Capacitor (MIM, MOM, MOS-cap)
function drawCapacitorSymbol(ctx, el, options) {
  const G = GRID_PITCH;
  const ink = schematicInk(el, options);
  const P = (lx, ly) => transformSymbolPoint(el, lx, ly);
  const seg = (ax, ay, bx, by) => {
    const a = P(ax, ay), b = P(bx, by);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  };

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = el.strokeWidth || SYMBOL_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  ctx.beginPath();
  // Top lead & plate
  seg(0, -2 * G, 0, -0.35 * G);
  seg(-0.8 * G, -0.35 * G, 0.8 * G, -0.35 * G);

  // Bottom plate & lead
  seg(-0.8 * G, 0.35 * G, 0.8 * G, 0.35 * G);
  seg(0, 0.35 * G, 0, 2 * G);

  // Subtype nuances: MOM has interdigitated teeth; MOS-cap has channel bar
  if (el.subtype === 'mom') {
    // Interdigitated teeth
    seg(-0.5 * G, -0.35 * G, -0.5 * G, 0.15 * G);
    seg(0.5 * G, -0.35 * G, 0.5 * G, 0.15 * G);
    seg(0, 0.35 * G, 0, -0.15 * G);
  } else if (el.subtype === 'moscap') {
    seg(-0.6 * G, 0.65 * G, 0.6 * G, 0.65 * G);
  }
  ctx.stroke();

  const subLabel = el.subtype ? el.subtype.toUpperCase() : 'MIM';
  drawSymbolCaptions(ctx, el, P, el.label, `${el.value || '1.0pF'} [${subLabel}]`, 0.9);
  ctx.restore();
}

// 7. Inductor (Planar Spiral, Differential Center-Tapped)
function drawInductorSymbol(ctx, el, options) {
  const G = GRID_PITCH;
  const ink = schematicInk(el, options);
  const isCenterTapped = el.subtype === 'center_tapped';
  const P = (lx, ly) => transformSymbolPoint(el, lx, ly);
  const seg = (ax, ay, bx, by) => {
    const a = P(ax, ay), b = P(bx, by);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  };

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = el.strokeWidth || SYMBOL_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  ctx.beginPath();
  // Leads
  seg(0, -2 * G, 0, -1.2 * G);
  seg(0, 1.2 * G, 0, 2 * G);

  // If center-tapped, lead from middle out to (2G, 0)
  if (isCenterTapped) {
    seg(0, 0, 2 * G, 0);
  }
  ctx.stroke();

  // 4 coil loops stacked along the vertical lead
  const loopCenters = [-0.9, -0.3, 0.3, 0.9];
  loopCenters.forEach(cy => {
    const center = P(0, cy * G);
    ctx.beginPath();
    ctx.arc(center.x, center.y, 0.3 * G, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();
  });

  const subLabel = isCenterTapped ? 'DIFF' : 'SPIRAL';
  drawSymbolCaptions(ctx, el, P, el.label, `${el.value || '2.5nH'} [${subLabel}]`, isCenterTapped ? 1.4 : 0.8);

  if (isCenterTapped && el.showPins) {
    ctx.font = '9px "Roboto Mono", monospace';
    const ct = P(2.35 * G, 0);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('CT', ct.x, ct.y);
  }
  ctx.restore();
}

// 8. PN Junction Diode
function drawDiodeSymbol(ctx, el, options) {
  const G = GRID_PITCH;
  const ink = schematicInk(el, options);
  const P = (lx, ly) => transformSymbolPoint(el, lx, ly);
  const seg = (ax, ay, bx, by) => {
    const a = P(ax, ay), b = P(bx, by);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  };

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = el.strokeWidth || SYMBOL_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  ctx.beginPath();
  // Anode lead (top)
  seg(0, -2 * G, 0, -0.6 * G);
  // Cathode lead (bottom)
  seg(0, 0.6 * G, 0, 2 * G);
  // Cathode bar
  seg(-0.6 * G, 0.6 * G, 0.6 * G, 0.6 * G);
  ctx.stroke();

  // Triangle body
  const a1 = P(-0.6 * G, -0.6 * G);
  const a2 = P(0.6 * G, -0.6 * G);
  const tip = P(0, 0.6 * G);
  ctx.beginPath();
  ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.lineTo(tip.x, tip.y);
  ctx.closePath();
  ctx.stroke();

  drawSymbolCaptions(ctx, el, P, el.label, 'PN Diode', 0.8);
  ctx.restore();
}

// 9. ESD Protection Clamp Diode (Single or Dual Rail Clamp)
function drawEsdDiodeSymbol(ctx, el, options) {
  const G = GRID_PITCH;
  const ink = schematicInk(el, options);
  const isDual = el.subtype === 'esd_dual';
  const P = (lx, ly) => transformSymbolPoint(el, lx, ly);
  const seg = (ax, ay, bx, by) => {
    const a = P(ax, ay), b = P(bx, by);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  };

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = el.strokeWidth || SYMBOL_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  ctx.beginPath();
  if (isDual) {
    // Dual Rail ESD Clamp: VDD on top, VSS on bottom, IO on left
    seg(0, -2 * G, 0, -1.0 * G);
    seg(0, 1.0 * G, 0, 2 * G);
    seg(-2 * G, 0, 0, 0);

    // Top Diode (IO -> VDD clamp)
    seg(-0.5 * G, -1.0 * G, 0.5 * G, -1.0 * G); // cathode bar
    ctx.stroke();

    const t1 = P(-0.5 * G, -0.2 * G), t2 = P(0.5 * G, -0.2 * G), tipTop = P(0, -1.0 * G);
    ctx.beginPath();
    ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.lineTo(tipTop.x, tipTop.y);
    ctx.closePath();
    ctx.stroke();

    // Bottom Diode (VSS -> IO clamp)
    ctx.beginPath();
    seg(-0.5 * G, 0.2 * G, 0.5 * G, 0.2 * G); // cathode bar
    ctx.stroke();

    const b1 = P(-0.5 * G, 1.0 * G), b2 = P(0.5 * G, 1.0 * G), tipBot = P(0, 0.2 * G);
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(tipBot.x, tipBot.y);
    ctx.closePath();
    ctx.stroke();
  } else {
    // Single Oversized Clamp Diode with breakdown zener wings
    seg(0, -2 * G, 0, -0.6 * G);
    seg(0, 0.6 * G, 0, 2 * G);
    // Cathode bar with breakdown wings
    seg(-0.6 * G, 0.6 * G, 0.6 * G, 0.6 * G);
    seg(-0.6 * G, 0.6 * G, -0.6 * G, 0.85 * G);
    seg(0.6 * G, 0.6 * G, 0.6 * G, 0.35 * G);
    ctx.stroke();

    const a1 = P(-0.6 * G, -0.6 * G), a2 = P(0.6 * G, -0.6 * G), tip = P(0, 0.6 * G);
    ctx.beginPath();
    ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.lineTo(tip.x, tip.y);
    ctx.closePath();
    ctx.stroke();
  }

  drawSymbolCaptions(ctx, el, P, el.label, `ESD [${el.clampVoltage || '5.5V'}]`, 0.8);
  ctx.restore();
}

// 10. SCR / Thyristor (High-Current ESD Shunt)
function drawScrSymbol(ctx, el, options) {
  const G = GRID_PITCH;
  const ink = schematicInk(el, options);
  const P = (lx, ly) => transformSymbolPoint(el, lx, ly);
  const seg = (ax, ay, bx, by) => {
    const a = P(ax, ay), b = P(bx, by);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  };

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = el.strokeWidth || SYMBOL_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  ctx.beginPath();
  // Anode & Cathode leads
  seg(0, -2 * G, 0, -0.6 * G);
  seg(0, 0.6 * G, 0, 2 * G);
  // Cathode bar
  seg(-0.6 * G, 0.6 * G, 0.6 * G, 0.6 * G);
  // Gate lead coming into cathode
  seg(-2 * G, G, -0.8 * G, G);
  seg(-0.8 * G, G, -0.3 * G, 0.6 * G);
  ctx.stroke();

  // Triangle body
  const a1 = P(-0.6 * G, -0.6 * G), a2 = P(0.6 * G, -0.6 * G), tip = P(0, 0.6 * G);
  ctx.beginPath();
  ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.lineTo(tip.x, tip.y);
  ctx.closePath();
  ctx.stroke();

  drawSymbolCaptions(ctx, el, P, el.label, 'SCR Shunt', 0.8);

  if (el.showPins) {
    ctx.font = '9px "Roboto Mono", monospace';
    const drawPin = (lbl, lx, ly, align, baseline) => {
      const pt = P(lx, ly);
      ctx.textAlign = align; ctx.textBaseline = baseline;
      ctx.fillText(lbl, pt.x, pt.y);
    };
    drawPin('A', 0, -2.35 * G, 'center', 'bottom');
    drawPin('K', 0, 2.35 * G, 'center', 'top');
    drawPin('G', -2.35 * G, G, 'right', 'middle');
  }
  ctx.restore();
}

// 11. I/O Bond Pad (Wirebond / Flip-Chip)
function drawPadSymbol(ctx, el, options) {
  const G = GRID_PITCH;
  const ink = schematicInk(el, options);
  const P = (lx, ly) => transformSymbolPoint(el, lx, ly);
  const seg = (ax, ay, bx, by) => {
    const a = P(ax, ay), b = P(bx, by);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  };

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = el.strokeWidth || SYMBOL_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  // Square pad with chamfered corners
  const w = 1.1 * G, ch = 0.25 * G;
  const p1 = P(-w + ch, -w);
  const p2 = P(w - ch, -w);
  const p3 = P(w, -w + ch);
  const p4 = P(w, w - ch);
  const p5 = P(w - ch, w);
  const p6 = P(-w + ch, w);
  const p7 = P(-w, w - ch);
  const p8 = P(-w, -w + ch);

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
  ctx.lineTo(p5.x, p5.y); ctx.lineTo(p6.x, p6.y); ctx.lineTo(p7.x, p7.y); ctx.lineTo(p8.x, p8.y);
  ctx.closePath();
  ctx.stroke();

  // Concentric bond target
  const center = P(0, 0);
  ctx.beginPath();
  ctx.arc(center.x, center.y, 0.45 * G, 0, Math.PI * 2);
  ctx.stroke();

  // Bottom lead to connection terminal
  ctx.beginPath();
  seg(0, w, 0, 2 * G);
  ctx.stroke();

  drawSymbolCaptions(ctx, el, P, el.label || 'PAD_IO', el.padType === 'flipchip' ? 'FLIP-CHIP' : 'WIRE-BOND', 1.3);
  ctx.restore();
}

// 12. Power & Ground Supply Rails (Multi-domain VDD / VSS / AGND / SUB)
function drawSupplySymbol(ctx, el, options) {
  const G = GRID_PITCH;
  const ink = schematicInk(el, options);
  const isVdd = (el.kind || 'vdd') === 'vdd';
  const groundType = el.groundType || 'vss';
  const P = (lx, ly) => transformSymbolPoint(el, lx, ly);
  const seg = (ax, ay, bx, by) => {
    const a = P(ax, ay), b = P(bx, by);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  };

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = el.strokeWidth || SYMBOL_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  ctx.beginPath();
  if (isVdd) {
    // Stem up to horizontal supply bar
    seg(0, 0, 0, -G);
    seg(-0.8 * G, -G, 0.8 * G, -G);
  } else {
    // Stem down
    seg(0, 0, 0, 0.8 * G);

    if (groundType === 'agnd') {
      // Analog Ground: Triangular shield
      const b = P(-0.75 * G, 0.8 * G);
      const c = P(0.75 * G, 0.8 * G);
      const d = P(0, 1.8 * G);
      ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
      ctx.closePath();
    } else if (groundType === 'sub') {
      // Substrate Ground: Angled chassis rake hatch
      seg(-0.8 * G, 0.8 * G, 0.8 * G, 0.8 * G);
      seg(-0.6 * G, 0.8 * G, -0.9 * G, 1.4 * G);
      seg(-0.1 * G, 0.8 * G, -0.4 * G, 1.4 * G);
      seg(0.4 * G, 0.8 * G, 0.1 * G, 1.4 * G);
    } else {
      // Digital VSS: 3 descending horizontal bars
      seg(-0.75 * G, 0.8 * G, 0.75 * G, 0.8 * G);
      seg(-0.45 * G, 1.15 * G, 0.45 * G, 1.15 * G);
      seg(-0.18 * G, 1.5 * G, 0.18 * G, 1.5 * G);
    }
  }
  ctx.stroke();

  if (el.label) {
    const at = P(0, isVdd ? -1.6 * G : 2.1 * G);
    ctx.font = '11px "Roboto Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.label, at.x, at.y);
  }
  ctx.restore();
}

// 13. Bulk / Well Tap (NTAP VDD / PTAP VSS)
function drawTapSymbol(ctx, el, options) {
  const G = GRID_PITCH;
  const ink = schematicInk(el, options);
  const isPtap = el.tapType === 'ptap';
  const P = (lx, ly) => transformSymbolPoint(el, lx, ly);
  const seg = (ax, ay, bx, by) => {
    const a = P(ax, ay), b = P(bx, by);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  };

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = el.strokeWidth || SYMBOL_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  // Well boundary square
  const s = 0.7 * G;
  const p1 = P(-s, -s), p2 = P(s, -s), p3 = P(s, s), p4 = P(-s, s);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
  ctx.closePath();
  ctx.stroke();

  // Ohmic contact cross [X]
  ctx.beginPath();
  seg(-s * 0.7, -s * 0.7, s * 0.7, s * 0.7);
  seg(-s * 0.7, s * 0.7, s * 0.7, -s * 0.7);
  ctx.stroke();

  drawSymbolCaptions(ctx, el, P, el.label || (isPtap ? 'PTAP' : 'NTAP'), isPtap ? 'P-SUB' : 'N-WELL', 1.0);
  ctx.restore();
}

// 14. Terminal Port Pin (Input, Output, InOut, Clock)
function drawPortSymbol(ctx, el, options) {
  const G = GRID_PITCH;
  const ink = schematicInk(el, options);
  const pType = el.portType || 'in';
  const P = (lx, ly) => transformSymbolPoint(el, lx, ly);

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = el.strokeWidth || SYMBOL_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  ctx.beginPath();
  if (pType === 'in') {
    // Right-pointing chevron towards terminal at (0, 0)
    const p1 = P(-1.4 * G, -0.55 * G);
    const p2 = P(-0.4 * G, -0.55 * G);
    const p3 = P(0, 0);
    const p4 = P(-0.4 * G, 0.55 * G);
    const p5 = P(-1.4 * G, 0.55 * G);
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y); ctx.lineTo(p5.x, p5.y); ctx.closePath();
  } else if (pType === 'out') {
    // Pointing outwards from terminal at (0, 0)
    const p1 = P(0, 0);
    const p2 = P(0.4 * G, -0.55 * G);
    const p3 = P(1.4 * G, -0.55 * G);
    const p4 = P(1.4 * G, 0.55 * G);
    const p5 = P(0.4 * G, 0.55 * G);
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y); ctx.lineTo(p5.x, p5.y); ctx.closePath();
  } else if (pType === 'inout') {
    // Diamond bidirectional port
    const p1 = P(-1.4 * G, 0);
    const p2 = P(-0.7 * G, -0.55 * G);
    const p3 = P(0, 0);
    const p4 = P(-0.7 * G, 0.55 * G);
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y); ctx.closePath();
  } else {
    // Clock input pin with dynamic triangle clock chevron
    const p1 = P(-1.4 * G, -0.55 * G);
    const p2 = P(-0.4 * G, -0.55 * G);
    const p3 = P(0, 0);
    const p4 = P(-0.4 * G, 0.55 * G);
    const p5 = P(-1.4 * G, 0.55 * G);
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y); ctx.lineTo(p5.x, p5.y); ctx.closePath();

    // Clock chevron inside
    const c1 = P(-1.2 * G, -0.35 * G);
    const c2 = P(-0.8 * G, 0);
    const c3 = P(-1.2 * G, 0.35 * G);
    ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y);
  }
  ctx.stroke();

  // Port name label
  const labelPos = P(pType === 'out' ? 1.7 * G : -1.6 * G, 0);
  ctx.font = '11px "Roboto Mono", monospace';
  ctx.textAlign = pType === 'out' ? 'left' : 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(el.label || 'PORT', labelPos.x, labelPos.y);
  ctx.restore();
}

// Unified dispatcher for all schematic device types
export function drawSchematicDevice(ctx, el, options) {
  switch (el.type) {
    case 'mosfet':     drawMosfetSymbol(ctx, el, options); break;
    case 'supply':     drawSupplySymbol(ctx, el, options); break;
    case 'tgate':      drawTGateSymbol(ctx, el, options); break;
    case 'bjt':        drawBjtSymbol(ctx, el, options); break;
    case 'varactor':   drawVaractorSymbol(ctx, el, options); break;
    case 'resistor':   drawResistorSymbol(ctx, el, options); break;
    case 'capacitor':  drawCapacitorSymbol(ctx, el, options); break;
    case 'inductor':   drawInductorSymbol(ctx, el, options); break;
    case 'diode':      drawDiodeSymbol(ctx, el, options); break;
    case 'esd_diode':  drawEsdDiodeSymbol(ctx, el, options); break;
    case 'scr':        drawScrSymbol(ctx, el, options); break;
    case 'pad':        drawPadSymbol(ctx, el, options); break;
    case 'well_tap':   drawTapSymbol(ctx, el, options); break;
    case 'port':       drawPortSymbol(ctx, el, options); break;
    default: break;
  }
}

export function getElementBounds(el) {
  if (isSchematicDevice(el)) {
    const e = getSymbolExtents(el);
    return { x: el.x + e.minX, y: el.y + e.minY, w: e.maxX - e.minX, h: e.maxY - e.minY };
  }
  if (el.type === 'junction') {
    const r = getJunctionRadius(el);
    return { x: el.x - r, y: el.y - r, w: r * 2, h: r * 2 };
  }
  return getBaseElementBounds(el);
}

function getBaseElementBounds(el) {
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

  let tw;
  let baseWidth;
  let subWidth;

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
    // CMOS schematic wires carry no process layer — they ink with the theme.
    const color = el.schematic
      ? schematicInk(el, options)
      : resolveLayerColor(el, allLayers, customLayerColors, canvasLayers);
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
    // Floorplan pins (input, output, power, ground) are locked centered without offsets.
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
      const isPin = isFloorplanPin(el) || (el.fpKind && ['input', 'output', 'power', 'ground'].includes(el.fpKind));
      const lx = el.x + el.w / 2 + (isPin ? 0 : (el.labelOffsetX || 0));
      const ly = el.y + el.h / 2 + (isPin ? 0 : (el.labelOffsetY || 0));
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
  } else if (isSchematicDevice(el)) {
    drawSchematicDevice(ctx, el, options);

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
  } else if (el.type === 'junction') {
    // Connection dot: marks crossing wires as electrically joined.
    const r = getJunctionRadius(el);
    ctx.save();
    ctx.fillStyle = schematicInk(el, options);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(el.x, el.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (isSelected && !isExport) {
      ctx.save();
      const isDarkSel = document.documentElement.getAttribute('data-theme') !== 'light';
      ctx.strokeStyle = isDarkSel ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(el.x - r - 4, el.y - r - 4, r * 2 + 8, r * 2 + 8);
      ctx.restore();
    }
  }
}

// A floor-plan pin is a small rect inserted from the pin palette (fpKind) or,
// for legacy saves that predate fpKind, any rect no bigger than 3×3 grid cells.
export function isFloorplanPin(el) {
  if (el.type !== 'rect') return false;
  if (el.fpKind) return ['input', 'output', 'power', 'ground'].includes(el.fpKind);
  return el.w <= GRID_PITCH * 3 && el.h <= GRID_PITCH * 3;
}

// Clamp a floor-plan pin onto the nearest perimeter point of a block when it
// is dragged onto (or near) one, so pins sit on block edges/corners instead of
// floating inside. Returns the clamped top-left position, or null if no block
// captures the pin at (px, py).
export function clampPinToBlockEdge(pin, px, py, blocks) {
  const cx = px + pin.w / 2;
  const cy = py + pin.h / 2;
  let best = null;
  blocks.forEach(b => {
    const inside = cx > b.x && cx < b.x + b.w && cy > b.y && cy < b.y + b.h;
    let qx, qy, dist;
    if (!inside) {
      // Nearest point of the solid rect is on the perimeter when outside.
      qx = Math.min(Math.max(cx, b.x), b.x + b.w);
      qy = Math.min(Math.max(cy, b.y), b.y + b.h);
      dist = Math.hypot(cx - qx, cy - qy);
    } else {
      const dLeft = cx - b.x, dRight = b.x + b.w - cx;
      const dTop = cy - b.y, dBottom = b.y + b.h - cy;
      dist = Math.min(dLeft, dRight, dTop, dBottom);
      if (dist === dLeft) { qx = b.x; qy = cy; }
      else if (dist === dRight) { qx = b.x + b.w; qy = cy; }
      else if (dist === dTop) { qx = cx; qy = b.y; }
      else { qx = cx; qy = b.y + b.h; }
    }
    // Blocks capture a pin dropped anywhere inside them; every target also
    // captures within one grid cell of its perimeter. The chip boundary only
    // edge-captures, so pins can still be placed freely inside the die area.
    const captured = dist <= GRID_PITCH || (inside && b.fpKind === 'block');
    if (!captured) return;
    if (!best || dist < best.d) best = { d: dist, x: qx - pin.w / 2, y: qy - pin.h / 2 };
  });
  return best ? { x: best.x, y: best.y } : null;
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

export function createTemplateElements(_defaultCanvasLayerId) {
  void _defaultCanvasLayerId;
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

// A CMOS inverter drawn with the schematic primitives: VDD → PMOS → output
// node → NMOS → VSS, with the shared gate net tapped by a connection dot.
export function createCmosTemplateElements(canvasLayerId = 'layer_1') {
  const W = (x1, y1, x2, y2) => ({ id: uid(), type: 'line', x1, y1, x2, y2, schematic: true, thickness: 'medium', label: '', canvasLayerId });
  const D = (device, x, y, label) => ({ id: uid(), type: 'mosfet', device, x, y, rotation: 0, mirror: false, label, wl: '', canvasLayerId });
  const S = (kind, x, y) => ({ id: uid(), type: 'supply', kind, x, y, rotation: 0, label: kind === 'vdd' ? 'VDD' : 'VSS', canvasLayerId });
  const J = (x, y) => ({ id: uid(), type: 'junction', x, y, size: 'medium', canvasLayerId });
  const L = (x, y, text, align = 'left') => ({ id: uid(), type: 'label', x, y, text, align, hasBg: false, canvasLayerId });

  return [
    S('vdd', 240, 60),
    W(240, 60, 240, 100),      // VDD → PMOS source
    D('pmos', 240, 140, 'MP'),
    W(240, 180, 240, 220),     // output node
    D('nmos', 240, 260, 'MN'),
    W(240, 300, 240, 340),     // NMOS source → VSS
    S('vss', 240, 340),

    W(200, 140, 160, 140),     // PMOS gate → input rail
    W(160, 140, 160, 260),
    W(160, 260, 200, 260),     // NMOS gate → input rail
    W(160, 200, 100, 200),     // input tap
    J(160, 200),

    W(240, 200, 320, 200),     // output tap
    J(240, 200),

    L(84, 200, 'A', 'center'),
    L(336, 200, 'Y', 'center'),
  ];
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
