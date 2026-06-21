import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MousePointer2, Minus, Square, Type,
  RotateCw, Trash2, Cpu, Grid3X3, FileText, Layers,
  Eye, EyeOff, Lock, Unlock, HelpCircle, Sun, Moon,
  Bug, Paintbrush, Image as ImageIcon
} from 'lucide-react';
import './App.css';

// ─── Constants ───────────────────────────────────────────────────────
const GRID_PITCH = 20;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.1;
const LINE_WIDTH = 3;
const UNDO_LIMIT = 50;
const AUTOSAVE_KEY = 'stickdiagram-autosave';
const AUTOSAVE_EXPIRY_DAYS = 30;

const COLORS = {
  metal:    { label: 'Metal / Net',      hex: '#4A90E2' },
  nmos:     { label: 'NMOS / Pull-Down', hex: '#27AE60' },
  pmos:     { label: 'PMOS / Pull-Up',   hex: '#F1C40F' },
  poly:     { label: 'Polysilicon',      hex: '#9B59B6' },
};

// VIA_COLOR is resolved dynamically per theme in the render code

const TOOLS = {
  select: 'select',
  line:   'line',
  via:    'via',
  label:  'label',
  brush:  'brush',
};

// ─── Helpers ─────────────────────────────────────────────────────────
let nextId = 1;
const uid = () => `el-${nextId++}`;

function snapToGrid(val, pitch) {
  return Math.round(val / pitch) * pitch;
}

function screenToWorld(sx, sy, pan, zoom) {
  return {
    x: (sx - pan.x) / zoom,
    y: (sy - pan.y) / zoom,
  };
}

function worldToScreen(wx, wy, pan, zoom) {
  return {
    x: wx * zoom + pan.x,
    y: wy * zoom + pan.y,
  };
}

function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function distPointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function getViaSize(el) {
  const sz = el.size || 'small';
  if (sz === 'medium') return 0.8 * GRID_PITCH;
  if (sz === 'big') return 1.2 * GRID_PITCH;
  return 0.5 * GRID_PITCH; // default/small
}

function getElementBounds(el) {
  if (el.type === 'line') {
    const minX = Math.min(el.x1, el.x2);
    const minY = Math.min(el.y1, el.y2);
    const maxX = Math.max(el.x1, el.x2);
    const maxY = Math.max(el.y1, el.y2);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  if (el.type === 'via') {
    const s = getViaSize(el);
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

function drawLabelOnContext(ctx, el, isSelected, options = {}) {
  const {
    forceTextColor = null,
    forceHasBg = null
  } = options;

  const hasBg = forceHasBg !== null ? forceHasBg : (el.hasBg !== false);
  const text = el.text || '';
  const align = el.align || 'left';

  // Parse subscript like V_{DD}, V_DD, V_{SS}, V_SS, or any Word_{Sub}
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

  // Choose text color
  let textColor = forceTextColor;
  if (!textColor) {
    // In editor: use white text on pills, otherwise inherit from theme via CSS variable
    // We check the document theme attribute to pick the right fallback
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

function drawElement(ctx, el, isSelected, options = {}) {
  const { isExport = false, exportTextColor = null, exportHasBg = null } = options;

  if (el.type === 'line') {
    ctx.strokeStyle = el.color;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';

    const { crossoverXCoords = [] } = options;
    const isHorizontal = el.y1 === el.y2;

    if (isHorizontal && crossoverXCoords.length > 0) {
      const xStart = Math.min(el.x1, el.x2);
      const xEnd = Math.max(el.x1, el.x2);
      const y = el.y1;
      const R = 6; // Arc radius (world units)

      const sortedCrossovers = [...crossoverXCoords]
        .filter(cx => cx > xStart + R && cx < xEnd - R)
        .sort((a, b) => a - b);

      ctx.beginPath();
      ctx.moveTo(xStart, y);
      
      sortedCrossovers.forEach(cx => {
        ctx.lineTo(cx - R, y);
        ctx.arc(cx, y, R, Math.PI, 0, true);
      });

      ctx.lineTo(xEnd, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(el.x1, el.y1);
      ctx.lineTo(el.x2, el.y2);
      ctx.stroke();
    }

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
  } else if (el.type === 'via') {
    const s = getViaSize(el);
    const isDarkForVia = document.documentElement.getAttribute('data-theme') !== 'light';
    const shape = el.shape || 'square';

    if (shape === 'x') {
      const half = s / 2;
      ctx.save();
      // Draw backing (light shadow/glow) in dark mode so the black X is visible on dark canvas
      if (isDarkForVia) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(2.5, s * 0.25) + 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        // Line 1
        ctx.moveTo(el.x - half, el.y - half);
        ctx.lineTo(el.x + half, el.y + half);
        // Line 2
        ctx.moveTo(el.x + half, el.y - half);
        ctx.lineTo(el.x - half, el.y + half);
        ctx.stroke();
      }

      // Draw black X
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(2.5, s * 0.25);
      ctx.lineCap = 'round';
      ctx.beginPath();
      // Line 1
      ctx.moveTo(el.x - half, el.y - half);
      ctx.lineTo(el.x + half, el.y + half);
      // Line 2
      ctx.moveTo(el.x + half, el.y - half);
      ctx.lineTo(el.x - half, el.y + half);
      ctx.stroke();
      ctx.restore();
    } else {
      // 'square' shape
      ctx.fillStyle = '#000000';
      ctx.fillRect(el.x - s / 2, el.y - s / 2, s, s);
      ctx.strokeStyle = isDarkForVia ? '#FFFFFF' : '#333333';
      ctx.lineWidth = 1;
      ctx.strokeRect(el.x - s / 2, el.y - s / 2, s, s);
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
        if (options.triggerRedraw) {
          options.triggerRedraw();
        }
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

function createTemplateElements() {
  const cx = 300; // center x in world coords
  const topY = 100;
  const g = GRID_PITCH;

  const vddLine = { id: uid(), type: 'line', x1: cx - 10 * g, y1: topY, x2: cx + 10 * g, y2: topY, color: '#4A90E2', label: '' };
  const vssLine = { id: uid(), type: 'line', x1: cx - 10 * g, y1: topY + 12 * g, x2: cx + 10 * g, y2: topY + 12 * g, color: '#4A90E2', label: '' };
  const pmosLine = { id: uid(), type: 'line', x1: cx - 10 * g, y1: topY + 3 * g, x2: cx + 10 * g, y2: topY + 3 * g, color: '#F1C40F', label: '' };
  const nmosLine = { id: uid(), type: 'line', x1: cx - 10 * g, y1: topY + 9 * g, x2: cx + 10 * g, y2: topY + 9 * g, color: '#27AE60', label: '' };
  
  const vddLabel = { id: uid(), type: 'label', x: cx, y: topY - 14, text: 'V_{DD}', align: 'center', hasBg: false };
  const vssLabel = { id: uid(), type: 'label', x: cx, y: topY + 12 * g + 24, text: 'V_{SS}', align: 'center', hasBg: false };

  return [vddLine, vssLine, pmosLine, nmosLine, vddLabel, vssLabel];
}

function getContentBounds(elementsList) {
  if (elementsList.length === 0) return { x: 0, y: 0, w: 200, h: 200 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elementsList.forEach(el => {
    const b = getElementBounds(el);
    if (b.w === 0 && b.h === 0 && b.x === 0 && b.y === 0) return;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  });

  if (minX === Infinity) {
    return { x: 0, y: 0, w: 200, h: 200 };
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY
  };
}

function getElementLayer(el) {
  if (el.type === 'via') return 'via';
  if (el.type === 'label') return 'label';
  if (el.type === 'image') return 'image';
  if (el.type === 'brush') return 'brush';
  if (el.type === 'line') {
    if (el.color === COLORS.metal.hex) return 'metal';
    if (el.color === COLORS.pmos.hex) return 'pmos';
    if (el.color === COLORS.nmos.hex) return 'nmos';
    if (el.color === COLORS.poly.hex) return 'poly';
    return 'custom';
  }
  return 'metal';
}

function getCrossovers(elementsList) {
  const crossovers = [];
  const horizontalLines = elementsList.filter(el => el.type === 'line' && el.y1 === el.y2);
  const verticalLines = elementsList.filter(el => el.type === 'line' && el.x1 === el.x2);

  horizontalLines.forEach(h => {
    const hLayer = getElementLayer(h);
    verticalLines.forEach(v => {
      const vLayer = getElementLayer(v);
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

// ─── Main App ────────────────────────────────────────────────────────
export default function App() {
  // State
  const [elements, setElements] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeTool, setActiveTool] = useState(TOOLS.select);
  const [viaSize, setViaSize] = useState('small'); // 'small' | 'medium' | 'big'
  const [viaShape, setViaShape] = useState('x');   // 'x' | 'square'
  const [showViaSubmenu, setShowViaSubmenu] = useState(false);
  const [activeColor, setActiveColor] = useState('metal');
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showModal, setShowModal] = useState(true);
  const [openMenu, setOpenMenu] = useState(null);
  const [cursorGrid, setCursorGrid] = useState({ x: 0, y: 0 });

  // PNG Export states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportBgType, setExportBgType] = useState('transparent'); // 'transparent' | 'white' | 'dark'
  const [exportTextColor, setExportTextColor] = useState('dark');   // 'dark' | 'light' | 'pill'
  const [exportMargin, setExportMargin] = useState(4);             // in grid units (3 or 4 or 0)
  const previewCanvasRef = useRef(null);

  // Feedback modal states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDesc, setFeedbackDesc] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('idle'); // 'idle' | 'sending' | 'success' | 'error'

  // Layer Management state
  const [layers, setLayers] = useState({
    metal:  { visible: true, locked: false, opacity: 1.0 },
    pmos:   { visible: true, locked: false, opacity: 1.0 },
    nmos:   { visible: true, locked: false, opacity: 1.0 },
    poly:   { visible: true, locked: false, opacity: 1.0 },
    via:    { visible: true, locked: false, opacity: 1.0 },
    label:  { visible: true, locked: false, opacity: 1.0 },
    custom: { visible: true, locked: false, opacity: 1.0 },
    image:  { visible: true, locked: false, opacity: 1.0 },
    brush:  { visible: true, locked: false, opacity: 1.0 },
  });

  // Custom Color State
  const [customColor, setCustomColor] = useState('#E67E22'); // Default orange

  // Brush Tool States
  const [brushColor, setBrushColor] = useState('#FF453A'); // Default brush color (red)
  const [brushSize, setBrushSize] = useState(5);           // Default brush size (px)
  const [brushOpacity, setBrushOpacity] = useState(0.8);   // Default brush opacity
  const [brushStroke, setBrushStroke] = useState(null);    // Active preview path { points: [{x, y}], color, size, opacity }
  const brushStrokeRef = useRef(null);

  // Image Cache & Redraw Trigger
  const imageCacheRef = useRef({});
  const [, setRedrawTrigger] = useState(0);
  const triggerRedraw = useCallback(() => setRedrawTrigger(n => n + 1), []);

  // Jump Overrides (Connections) state
  const [jumpOverrides, setJumpOverrides] = useState(new Set()); // Stores "${x},${y}" crossover coordinates that are connections (no jump)

  // Shortcuts HUD state
  const [showShortcutsHUD, setShowShortcutsHUD] = useState(true);

  // Theme state (dark default)
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('stickdiagram-theme') || 'dark'; }
    catch { return 'dark'; }
  });

  // Mobile sidebar drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Touch gesture refs
  const touchStartDistRef = useRef(null);
  const touchStartPanRef = useRef(null);
  const touchStartZoomRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const lastTouchTimeRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const isTouchPanningRef = useRef(false);
  const isTouchDrawingRef = useRef(false);

  // Drawing state
  const [lineStart, setLineStart] = useState(null);
  const [linePreview, setLinePreview] = useState(null);
  const [labelInput, setLabelInput] = useState(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const [resizeState, setResizeState] = useState(null); // { id: string, handle: 'p1'|'p2', currentWorldPos: {x,y} }

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [spaceHeld, setSpaceHeld] = useState(false);

  // Undo/Redo
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const labelInputRef = useRef(null);
  const clipboardRef = useRef(null);
  const labelReadyRef = useRef(false);
  const saveProjectFnRef = useRef(null);
  const loadProjectFnRef = useRef(null);

  // Auto-save state
  const [hasAutosave, setHasAutosave] = useState(false);

  // ─── Undo/Redo helpers ──────────────────────────────────────
  const pushUndo = useCallback((snapshot) => {
    setUndoStack(prev => {
      const next = [...prev, snapshot];
      if (next.length > UNDO_LIMIT) next.shift();
      return next;
    });
    setRedoStack([]);
  }, []);

  const doUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const stack = [...prev];
      const snapshot = stack.pop();
      setRedoStack(rs => [...rs, JSON.parse(JSON.stringify(elements))]);
      setElements(snapshot);
      setSelectedIds(new Set());
      return stack;
    });
  }, [elements]);

  const doRedo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const stack = [...prev];
      const snapshot = stack.pop();
      setUndoStack(us => [...us, JSON.parse(JSON.stringify(elements))]);
      setElements(snapshot);
      setSelectedIds(new Set());
      return stack;
    });
  }, [elements]);

  // ─── Element operations ─────────────────────────────────────
  const addElement = useCallback((el) => {
    pushUndo(JSON.parse(JSON.stringify(elements)));
    setElements(prev => [...prev, el]);
  }, [elements, pushUndo]);

  const updateElements = useCallback((newElements) => {
    pushUndo(JSON.parse(JSON.stringify(elements)));
    setElements(newElements);
  }, [elements, pushUndo]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    
    // Only delete elements whose layer is not locked
    const deletableElements = elements.filter(e => selectedIds.has(e.id) && !layers[getElementLayer(e)].locked);
    if (deletableElements.length === 0) return;

    pushUndo(JSON.parse(JSON.stringify(elements)));
    setElements(prev => prev.filter(e => !selectedIds.has(e.id) || layers[getElementLayer(e)].locked));
    setSelectedIds(prev => {
      const next = new Set(prev);
      deletableElements.forEach(el => next.delete(el.id));
      return next;
    });
  }, [elements, selectedIds, pushUndo, layers]);

  // ─── Hit testing ────────────────────────────────────────────
  const hitTest = useCallback((wx, wy) => {
    const threshold = 8 / zoom;
    // Reverse order for top-most first
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const layerId = getElementLayer(el);
      // Skip if layer is hidden or locked
      if (!layers[layerId].visible || layers[layerId].locked) continue;

      if (el.type === 'line') {
        const d = distPointToSegment(wx, wy, el.x1, el.y1, el.x2, el.y2);
        if (d < threshold) return el;
      } else if (el.type === 'via') {
        const s = getViaSize(el) / 2;
        if (Math.abs(wx - el.x) < s + 4 / zoom && Math.abs(wy - el.y) < s + 4 / zoom) return el;
      } else if (el.type === 'label') {
        const bounds = getElementBounds(el);
        if (pointInRect(wx, wy, bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8)) return el;
      } else if (el.type === 'image') {
        const bounds = getElementBounds(el);
        if (pointInRect(wx, wy, bounds.x, bounds.y, bounds.w, bounds.h)) return el;
      } else if (el.type === 'brush') {
        const threshold = (el.size || 5) / 2 + 8 / zoom;
        for (let j = 0; j < el.points.length - 1; j++) {
          const p1 = el.points[j];
          const p2 = el.points[j+1];
          const d = distPointToSegment(wx, wy, el.x + p1.x, el.y + p1.y, el.x + p2.x, el.y + p2.y);
          if (d < threshold) return el;
        }
      }
    }
    return null;
  }, [elements, zoom, layers]);

  // ─── Theme effect ─────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('stickdiagram-theme', theme); } catch {}
  }, [theme]);

  // ─── Auto-save: check on mount ─────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        const age = Date.now() - (data.timestamp || 0);
        const expiryMs = AUTOSAVE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        if (age < expiryMs && data.elements && data.elements.length > 0) {
          setHasAutosave(true);
        } else {
          localStorage.removeItem(AUTOSAVE_KEY);
        }
      }
    } catch {}
  }, []);

  // ─── Auto-save: persist on changes (debounced 1s) ──────────
  useEffect(() => {
    if (showModal) return;
    if (elements.length === 0) return;
    const timer = setTimeout(() => {
      try {
        const data = {
          format: 'stickdiagram',
          version: 1,
          timestamp: Date.now(),
          elements,
          jumpOverrides: [...jumpOverrides],
          layers,
        };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
      } catch {}
    }, 1000);
    return () => clearTimeout(timer);
  }, [elements, jumpOverrides, layers, showModal]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  // ─── Canvas rendering ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear — theme-aware canvas background
    const isDark = theme === 'dark';
    ctx.fillStyle = isDark ? '#121214' : '#FAF9F6';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid
    if (showGrid) {
      const pitch = GRID_PITCH * zoom;
      if (pitch >= 4) {
        ctx.strokeStyle = isDark ? '#222226' : '#E6E2D8';
        ctx.lineWidth = 1;

        const startX = pan.x % pitch;
        const startY = pan.y % pitch;

        ctx.beginPath();
        for (let x = startX; x < rect.width; x += pitch) {
          ctx.moveTo(Math.round(x) + 0.5, 0);
          ctx.lineTo(Math.round(x) + 0.5, rect.height);
        }
        for (let y = startY; y < rect.height; y += pitch) {
          ctx.moveTo(0, Math.round(y) + 0.5);
          ctx.lineTo(rect.width, Math.round(y) + 0.5);
        }
        ctx.stroke();

        // Draw origin crosshair
        const origin = worldToScreen(0, 0, pan, zoom);
        ctx.strokeStyle = isDark ? '#3A3A40' : '#C2BEB5';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(origin.x) + 0.5, 0);
        ctx.lineTo(Math.round(origin.x) + 0.5, rect.height);
        ctx.moveTo(0, Math.round(origin.y) + 0.5);
        ctx.lineTo(rect.width, Math.round(origin.y) + 0.5);
        ctx.stroke();
      }
    }

    // Draw elements
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Compute preview elements (with dragging/resizing applied)
    let renderElements = elements;
    if (isDragging && dragOffset && (dragOffset.x !== 0 || dragOffset.y !== 0)) {
      renderElements = elements.map(el => {
        if (!selectedIds.has(el.id)) return el;
        // Do not move if layer is locked
        if (layers[getElementLayer(el)].locked) return el;
        if (el.type === 'line') {
          return { ...el, x1: el.x1 + dragOffset.x, y1: el.y1 + dragOffset.y, x2: el.x2 + dragOffset.x, y2: el.y2 + dragOffset.y };
        }
        if (el.type === 'via' || el.type === 'label' || el.type === 'image' || el.type === 'brush') {
          return { ...el, x: el.x + dragOffset.x, y: el.y + dragOffset.y };
        }
        return el;
      });
    } else if (resizeState) {
      renderElements = elements.map(el => {
        if (el.id !== resizeState.id) return el;
        if (el.type === 'line') {
          if (resizeState.handle === 'p1') {
            return { ...el, x1: resizeState.currentWorldPos.x, y1: resizeState.currentWorldPos.y };
          } else {
            return { ...el, x2: resizeState.currentWorldPos.x, y2: resizeState.currentWorldPos.y };
          }
        }
        if (el.type === 'image') {
          const dx = resizeState.currentWorldPos.x - resizeState.startWorld.x;
          const dy = resizeState.currentWorldPos.y - resizeState.startWorld.y;

          let nextX = resizeState.startX;
          let nextY = resizeState.startY;
          let nextW = resizeState.startW;
          let nextH = resizeState.startH;
          let nextCropX = resizeState.startCropX;
          let nextCropY = resizeState.startCropY;
          let nextCropW = resizeState.startCropW;
          let nextCropH = resizeState.startCropH;

          // Corner resizing handles
          if (resizeState.handle === 'br') {
            nextW = Math.max(10, resizeState.startW + dx);
            nextH = Math.max(10, resizeState.startH + dy);
          } else if (resizeState.handle === 'bl') {
            const possibleW = resizeState.startW - dx;
            if (possibleW >= 10) {
              nextX = resizeState.startX + dx;
              nextW = possibleW;
            }
            nextH = Math.max(10, resizeState.startH + dy);
          } else if (resizeState.handle === 'tr') {
            nextW = Math.max(10, resizeState.startW + dx);
            const possibleH = resizeState.startH - dy;
            if (possibleH >= 10) {
              nextY = resizeState.startY + dy;
              nextH = possibleH;
            }
          } else if (resizeState.handle === 'tl') {
            const possibleW = resizeState.startW - dx;
            if (possibleW >= 10) {
              nextX = resizeState.startX + dx;
              nextW = possibleW;
            }
            const possibleH = resizeState.startH - dy;
            if (possibleH >= 10) {
              nextY = resizeState.startY + dy;
              nextH = possibleH;
            }
          }
          // Center edge cropping handles
          else if (resizeState.handle === 'rc') {
            const possibleW = resizeState.startW + dx;
            if (possibleW >= 10) {
              nextW = possibleW;
              nextCropW = Math.max(0.01, Math.min(1.0, resizeState.startCropW * (nextW / resizeState.startW)));
              if (nextCropX + nextCropW > 1.0) {
                nextCropW = 1.0 - nextCropX;
              }
            }
          } else if (resizeState.handle === 'lc') {
            const possibleW = resizeState.startW - dx;
            if (possibleW >= 10) {
              nextX = resizeState.startX + dx;
              nextW = possibleW;
              const cropDelta = resizeState.startCropW * (dx / resizeState.startW);
              nextCropX = Math.max(0.0, Math.min(1.0, resizeState.startCropX + cropDelta));
              nextCropW = Math.max(0.01, Math.min(1.0 - nextCropX, resizeState.startCropW * (nextW / resizeState.startW)));
            }
          } else if (resizeState.handle === 'bc') {
            const possibleH = resizeState.startH + dy;
            if (possibleH >= 10) {
              nextH = possibleH;
              nextCropH = Math.max(0.01, Math.min(1.0, resizeState.startCropH * (nextH / resizeState.startH)));
              if (nextCropY + nextCropH > 1.0) {
                nextCropH = 1.0 - nextCropY;
              }
            }
          } else if (resizeState.handle === 'tc') {
            const possibleH = resizeState.startH - dy;
            if (possibleH >= 10) {
              nextY = resizeState.startY + dy;
              nextH = possibleH;
              const cropDelta = resizeState.startCropH * (dy / resizeState.startH);
              nextCropY = Math.max(0.0, Math.min(1.0, resizeState.startCropY + cropDelta));
              nextCropH = Math.max(0.01, Math.min(1.0 - nextCropY, resizeState.startCropH * (nextH / resizeState.startH)));
            }
          }

          return {
            ...el,
            x: nextX,
            y: nextY,
            w: nextW,
            h: nextH,
            cropX: nextCropX,
            cropY: nextCropY,
            cropW: nextCropW,
            cropH: nextCropH
          };
        }
        return el;
      });
    }

    const crossovers = getCrossovers(renderElements);
    const activeCrossovers = crossovers.filter(c => !jumpOverrides.has(`${c.x},${c.y}`));

    const originalCrossovers = getCrossovers(elements);
    const activeOriginalCrossovers = originalCrossovers.filter(c => !jumpOverrides.has(`${c.x},${c.y}`));

    renderElements.forEach((el, index) => {
      const originalEl = elements[index];
      const isSelected = selectedIds.has(originalEl.id);
      const layerId = getElementLayer(originalEl);
      const layer = layers[layerId];

      // Skip rendering if layer is hidden
      if (!layer.visible) return;

      // Ghosting: Draw original position semi-transparently if dragging or resizing
      const isCurrentlyDragged = isDragging && isSelected && dragOffset && (dragOffset.x !== 0 || dragOffset.y !== 0);
      const isCurrentlyResized = resizeState && originalEl.id === resizeState.id;
      if (isCurrentlyDragged || isCurrentlyResized) {
        ctx.save();
        ctx.globalAlpha = 0.35 * layer.opacity;
        let ghostOptions = {
          imageCache: imageCacheRef.current,
          triggerRedraw: triggerRedraw,
        };
        if (originalEl.type === 'line' && originalEl.y1 === originalEl.y2) {
          ghostOptions.crossoverXCoords = activeOriginalCrossovers
            .filter(c => c.hId === originalEl.id)
            .map(c => c.x);
        }
        drawElement(ctx, originalEl, false, ghostOptions);
        ctx.restore();
      }

      // Draw current position (with drag/resize preview applied)
      ctx.save();
      ctx.globalAlpha *= layer.opacity;
      let options = {
        imageCache: imageCacheRef.current,
        triggerRedraw: triggerRedraw,
      };
      if (el.type === 'line' && el.y1 === el.y2) {
        options.crossoverXCoords = activeCrossovers
          .filter(c => c.hId === el.id)
          .map(c => c.x);
      }
      drawElement(ctx, el, isSelected, options);
      ctx.restore();

      // Draw extend/resize handles if selected line
      if (isSelected && el.type === 'line' && activeTool === TOOLS.select) {
        ctx.save();
        ctx.fillStyle = '#FF5500';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        const handleRadius = 5 / zoom;

        // p1 Handle
        ctx.beginPath();
        ctx.arc(el.x1, el.y1, handleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // p2 Handle
        ctx.beginPath();
        ctx.arc(el.x2, el.y2, handleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }

      if (isSelected && el.type === 'image' && activeTool === TOOLS.select) {
        ctx.save();
        const handleRadius = 5 / zoom;
        const halfBarW = 5 / zoom;
        const halfBarH = 1.5 / zoom;

        // Corner resizing handles (orange circles with white borders)
        ctx.fillStyle = '#FF5500';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;

        const corners = [
          { x: el.x, y: el.y },         // tl
          { x: el.x + el.w, y: el.y },   // tr
          { x: el.x, y: el.y + el.h },   // bl
          { x: el.x + el.w, y: el.y + el.h } // br
        ];

        corners.forEach(c => {
          ctx.beginPath();
          ctx.arc(c.x, c.y, handleRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });

        // Center edge cropping handles (dark gray/black bars with orange borders)
        ctx.fillStyle = '#111111';
        ctx.strokeStyle = '#FF5500';
        ctx.lineWidth = 1.5;

        // tc
        ctx.beginPath();
        ctx.rect(el.x + el.w / 2 - halfBarW, el.y - halfBarH, halfBarW * 2, halfBarH * 2);
        ctx.fill();
        ctx.stroke();

        // bc
        ctx.beginPath();
        ctx.rect(el.x + el.w / 2 - halfBarW, el.y + el.h - halfBarH, halfBarW * 2, halfBarH * 2);
        ctx.fill();
        ctx.stroke();

        // lc
        ctx.beginPath();
        ctx.rect(el.x - halfBarH, el.y + el.h / 2 - halfBarW, halfBarH * 2, halfBarW * 2);
        ctx.fill();
        ctx.stroke();

        // rc
        ctx.beginPath();
        ctx.rect(el.x + el.w - halfBarH, el.y + el.h / 2 - halfBarW, halfBarH * 2, halfBarW * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
    });

    // Draw line preview
    if (lineStart && linePreview) {
      ctx.strokeStyle = activeColor === 'custom' ? customColor : COLORS[activeColor].hex;
      ctx.lineWidth = LINE_WIDTH;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(lineStart.x, lineStart.y);
      ctx.lineTo(linePreview.x, linePreview.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Draw brush preview
    if (brushStroke && brushStroke.points && brushStroke.points.length > 0) {
      ctx.save();
      ctx.strokeStyle = brushStroke.color;
      ctx.lineWidth = brushStroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = brushStroke.opacity;
      ctx.beginPath();
      ctx.moveTo(brushStroke.points[0].x, brushStroke.points[0].y);
      for (let i = 1; i < brushStroke.points.length; i++) {
        ctx.lineTo(brushStroke.points[i].x, brushStroke.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // Draw selection box
    if (selectionBox) {
      const s1 = worldToScreen(selectionBox.x1, selectionBox.y1, pan, zoom);
      const s2 = worldToScreen(selectionBox.x2, selectionBox.y2, pan, zoom);
      const bx = Math.min(s1.x, s2.x);
      const by = Math.min(s1.y, s2.y);
      const bw = Math.abs(s2.x - s1.x);
      const bh = Math.abs(s2.y - s1.y);
      ctx.strokeStyle = 'rgba(255, 85, 0, 0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = 'rgba(255, 85, 0, 0.08)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.setLineDash([]);
    }

  }, [elements, selectedIds, showGrid, zoom, pan, lineStart, linePreview, activeColor, customColor, jumpOverrides, selectionBox, isDragging, dragOffset, layers, theme, brushStroke, resizeState, activeTool]);

  // ─── Resize observer ───────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      // Trigger re-render by slightly updating pan (force canvas resize)
      setPan(p => ({ ...p }));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ─── Mouse handlers ────────────────────────────────────────
  const getWorldPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    let { x, y } = screenToWorld(sx, sy, pan, zoom);
    if (snapEnabled) {
      x = snapToGrid(x, GRID_PITCH);
      y = snapToGrid(y, GRID_PITCH);
    }
    return { x, y };
  }, [pan, zoom, snapEnabled]);

  const getOrthoEnd = useCallback((start, end) => {
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    if (dx >= dy) {
      return { x: end.x, y: start.y };
    } else {
      return { x: start.x, y: end.y };
    }
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (sidebarOpen) setSidebarOpen(false);
    if (showModal) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Right click
    if (e.button === 2) {
      e.preventDefault();
      // If drawing a wire, stop the wire drawing continuity
      if (lineStart) {
        setLineStart(null);
        setLinePreview(null);
        return;
      }

      // Otherwise, toggle connection override (crossover override)
      const world = getWorldPos(e);
      const crossovers = getCrossovers(elements);
      if (crossovers.length > 0) {
        let closest = null;
        let minDist = Infinity;
        crossovers.forEach(c => {
          const dist = Math.hypot(world.x - c.x, world.y - c.y);
          if (dist < minDist) {
            minDist = dist;
            closest = c;
          }
        });

        const threshold = 15; // 0.75 of a grid pitch
        if (closest && minDist < threshold) {
          const key = `${closest.x},${closest.y}`;
          setJumpOverrides(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
              next.delete(key);
            } else {
              next.add(key);
            }
            return next;
          });
          return;
        }
      }
      return;
    }

    // Middle click or space+click for panning
    if (e.button === 1 || (spaceHeld && e.button === 0)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return;
    const world = getWorldPos(e);

    if (activeTool === TOOLS.select) {
      // Check if we hit any endpoint handle of a selected line first
      if (selectedIds.size > 0) {
        const handleThreshold = 10 / zoom; // 10 screen pixels hit tolerance
        for (const el of elements) {
          if (selectedIds.has(el.id)) {
            if (el.type === 'line') {
              const dist1 = Math.hypot(world.x - el.x1, world.y - el.y1);
              if (dist1 < handleThreshold) {
                setResizeState({ id: el.id, handle: 'p1', currentWorldPos: { x: el.x1, y: el.y1 } });
                return;
              }
              const dist2 = Math.hypot(world.x - el.x2, world.y - el.y2);
              if (dist2 < handleThreshold) {
                setResizeState({ id: el.id, handle: 'p2', currentWorldPos: { x: el.x2, y: el.y2 } });
                return;
              }
            } else if (el.type === 'image') {
              // 4 corners (resize)
              const tlDist = Math.hypot(world.x - el.x, world.y - el.y);
              if (tlDist < handleThreshold) {
                setResizeState({
                  id: el.id,
                  handle: 'tl',
                  startWorld: { ...world },
                  startX: el.x,
                  startY: el.y,
                  startW: el.w,
                  startH: el.h,
                  startCropX: el.cropX !== undefined ? el.cropX : 0,
                  startCropY: el.cropY !== undefined ? el.cropY : 0,
                  startCropW: el.cropW !== undefined ? el.cropW : 1.0,
                  startCropH: el.cropH !== undefined ? el.cropH : 1.0,
                  currentWorldPos: { ...world }
                });
                return;
              }
              const trDist = Math.hypot(world.x - (el.x + el.w), world.y - el.y);
              if (trDist < handleThreshold) {
                setResizeState({
                  id: el.id,
                  handle: 'tr',
                  startWorld: { ...world },
                  startX: el.x,
                  startY: el.y,
                  startW: el.w,
                  startH: el.h,
                  startCropX: el.cropX !== undefined ? el.cropX : 0,
                  startCropY: el.cropY !== undefined ? el.cropY : 0,
                  startCropW: el.cropW !== undefined ? el.cropW : 1.0,
                  startCropH: el.cropH !== undefined ? el.cropH : 1.0,
                  currentWorldPos: { ...world }
                });
                return;
              }
              const blDist = Math.hypot(world.x - el.x, world.y - (el.y + el.h));
              if (blDist < handleThreshold) {
                setResizeState({
                  id: el.id,
                  handle: 'bl',
                  startWorld: { ...world },
                  startX: el.x,
                  startY: el.y,
                  startW: el.w,
                  startH: el.h,
                  startCropX: el.cropX !== undefined ? el.cropX : 0,
                  startCropY: el.cropY !== undefined ? el.cropY : 0,
                  startCropW: el.cropW !== undefined ? el.cropW : 1.0,
                  startCropH: el.cropH !== undefined ? el.cropH : 1.0,
                  currentWorldPos: { ...world }
                });
                return;
              }
              const brDist = Math.hypot(world.x - (el.x + el.w), world.y - (el.y + el.h));
              if (brDist < handleThreshold) {
                setResizeState({
                  id: el.id,
                  handle: 'br',
                  startWorld: { ...world },
                  startX: el.x,
                  startY: el.y,
                  startW: el.w,
                  startH: el.h,
                  startCropX: el.cropX !== undefined ? el.cropX : 0,
                  startCropY: el.cropY !== undefined ? el.cropY : 0,
                  startCropW: el.cropW !== undefined ? el.cropW : 1.0,
                  startCropH: el.cropH !== undefined ? el.cropH : 1.0,
                  currentWorldPos: { ...world }
                });
                return;
              }

              // 4 center edges (crop)
              const tcDist = Math.hypot(world.x - (el.x + el.w / 2), world.y - el.y);
              if (tcDist < handleThreshold) {
                setResizeState({
                  id: el.id,
                  handle: 'tc',
                  startWorld: { ...world },
                  startX: el.x,
                  startY: el.y,
                  startW: el.w,
                  startH: el.h,
                  startCropX: el.cropX !== undefined ? el.cropX : 0,
                  startCropY: el.cropY !== undefined ? el.cropY : 0,
                  startCropW: el.cropW !== undefined ? el.cropW : 1.0,
                  startCropH: el.cropH !== undefined ? el.cropH : 1.0,
                  currentWorldPos: { ...world }
                });
                return;
              }
              const bcDist = Math.hypot(world.x - (el.x + el.w / 2), world.y - (el.y + el.h));
              if (bcDist < handleThreshold) {
                setResizeState({
                  id: el.id,
                  handle: 'bc',
                  startWorld: { ...world },
                  startX: el.x,
                  startY: el.y,
                  startW: el.w,
                  startH: el.h,
                  startCropX: el.cropX !== undefined ? el.cropX : 0,
                  startCropY: el.cropY !== undefined ? el.cropY : 0,
                  startCropW: el.cropW !== undefined ? el.cropW : 1.0,
                  startCropH: el.cropH !== undefined ? el.cropH : 1.0,
                  currentWorldPos: { ...world }
                });
                return;
              }
              const lcDist = Math.hypot(world.x - el.x, world.y - (el.y + el.h / 2));
              if (lcDist < handleThreshold) {
                setResizeState({
                  id: el.id,
                  handle: 'lc',
                  startWorld: { ...world },
                  startX: el.x,
                  startY: el.y,
                  startW: el.w,
                  startH: el.h,
                  startCropX: el.cropX !== undefined ? el.cropX : 0,
                  startCropY: el.cropY !== undefined ? el.cropY : 0,
                  startCropW: el.cropW !== undefined ? el.cropW : 1.0,
                  startCropH: el.cropH !== undefined ? el.cropH : 1.0,
                  currentWorldPos: { ...world }
                });
                return;
              }
              const rcDist = Math.hypot(world.x - (el.x + el.w), world.y - (el.y + el.h / 2));
              if (rcDist < handleThreshold) {
                setResizeState({
                  id: el.id,
                  handle: 'rc',
                  startWorld: { ...world },
                  startX: el.x,
                  startY: el.y,
                  startW: el.w,
                  startH: el.h,
                  startCropX: el.cropX !== undefined ? el.cropX : 0,
                  startCropY: el.cropY !== undefined ? el.cropY : 0,
                  startCropW: el.cropW !== undefined ? el.cropW : 1.0,
                  startCropH: el.cropH !== undefined ? el.cropH : 1.0,
                  currentWorldPos: { ...world }
                });
                return;
              }
            }
          }
        }
      }

      const hit = hitTest(world.x, world.y);
      if (hit) {
        if (e.shiftKey) {
          setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(hit.id)) next.delete(hit.id);
            else next.add(hit.id);
            return next;
          });
        } else if (!selectedIds.has(hit.id)) {
          setSelectedIds(new Set([hit.id]));
        }
        // Start drag
        setIsDragging(true);
        setDragStart(world);
        setDragOffset({ x: 0, y: 0 });
      } else {
        if (!e.shiftKey) setSelectedIds(new Set());
        // Start selection box
        const rawWorld = screenToWorld(sx, sy, pan, zoom);
        setSelectionBox({ x1: rawWorld.x, y1: rawWorld.y, x2: rawWorld.x, y2: rawWorld.y });
      }
    } else if (activeTool === TOOLS.line) {
      if (!lineStart) {
        setLineStart(world);
        setLinePreview(world);
      } else {
        const end = getOrthoEnd(lineStart, world);
        if (end.x !== lineStart.x || end.y !== lineStart.y) {
          const line = {
            id: uid(),
            type: 'line',
            x1: lineStart.x, y1: lineStart.y,
            x2: end.x, y2: end.y,
            color: activeColor === 'custom' ? customColor : COLORS[activeColor].hex,
            label: '',
          };
          addElement(line);
        }
        // Continue polyline from endpoint
        setLineStart(end);
        setLinePreview(end);
      }
    } else if (activeTool === TOOLS.via) {
      const via = {
        id: uid(),
        type: 'via',
        x: world.x,
        y: world.y,
        size: viaSize,
        shape: viaShape,
      };
      addElement(via);
    } else if (activeTool === TOOLS.label) {
      // Prevent default to stop canvas from stealing focus from the label input
      e.preventDefault();
      const screenPos = worldToScreen(world.x, world.y, pan, zoom);
      setLabelInput({ worldX: world.x, worldY: world.y, screenX: screenPos.x, screenY: screenPos.y, text: '' });
    } else if (activeTool === TOOLS.brush) {
      const rawWorld = screenToWorld(sx, sy, pan, zoom);
      const stroke = {
        x: 0,
        y: 0,
        points: [{ x: rawWorld.x, y: rawWorld.y }],
        color: brushColor,
        size: brushSize,
        opacity: brushOpacity,
      };
      brushStrokeRef.current = stroke;
      setBrushStroke(stroke);
    }
  }, [showModal, activeTool, spaceHeld, pan, zoom, getWorldPos, hitTest, selectedIds, lineStart, activeColor, customColor, addElement, getOrthoEnd, elements, jumpOverrides, sidebarOpen, viaSize, viaShape, brushColor, brushSize, brushOpacity]);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Update cursor grid position
    let rawWorld = screenToWorld(sx, sy, pan, zoom);
    const gridX = Math.round(rawWorld.x / GRID_PITCH);
    const gridY = Math.round(rawWorld.y / GRID_PITCH);
    setCursorGrid({ x: gridX, y: gridY });

    if (isPanning && panStart) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (resizeState) {
      const world = getWorldPos(e);
      const el = elements.find(item => item.id === resizeState.id);
      if (el) {
        if (el.type === 'line') {
          const isHorizontal = el.y1 === el.y2;
          let nextPos = { ...world };
          if (isHorizontal) {
            nextPos.y = el.y1;
          } else {
            nextPos.x = el.x1;
          }
          setResizeState(prev => prev ? { ...prev, currentWorldPos: nextPos } : null);
        } else if (el.type === 'image') {
          setResizeState(prev => prev ? { ...prev, currentWorldPos: world } : null);
        }
      }
      return;
    }

    const world = getWorldPos(e);

    if (isDragging && dragStart && selectedIds.size > 0) {
      const dx = world.x - dragStart.x;
      const dy = world.y - dragStart.y;
      if (dx !== 0 || dy !== 0) {
        setDragOffset({ x: dx, y: dy });
      }
    }

    if (selectionBox) {
      const raw = screenToWorld(sx, sy, pan, zoom);
      setSelectionBox(prev => prev ? { ...prev, x2: raw.x, y2: raw.y } : null);
    }

    if (activeTool === TOOLS.line && lineStart) {
      const ortho = getOrthoEnd(lineStart, world);
      setLinePreview(ortho);
    } else if (activeTool === TOOLS.brush && brushStrokeRef.current) {
      const rawWorld = screenToWorld(sx, sy, pan, zoom);
      const lastPt = brushStrokeRef.current.points[brushStrokeRef.current.points.length - 1];
      const dist = Math.hypot(rawWorld.x - lastPt.x, rawWorld.y - lastPt.y);
      if (dist > 1.5) {
        brushStrokeRef.current.points.push({ x: rawWorld.x, y: rawWorld.y });
        setBrushStroke({ ...brushStrokeRef.current });
      }
    }
  }, [isPanning, panStart, pan, zoom, isDragging, dragStart, selectedIds, selectionBox, activeTool, lineStart, getWorldPos, getOrthoEnd, resizeState, elements]);

  const handleMouseUp = useCallback((e) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (resizeState) {
      pushUndo(JSON.parse(JSON.stringify(elements)));
      setElements(prev => prev.map(el => {
        if (el.id === resizeState.id) {
          if (el.type === 'line') {
            if (resizeState.handle === 'p1') {
              return { ...el, x1: resizeState.currentWorldPos.x, y1: resizeState.currentWorldPos.y };
            } else {
              return { ...el, x2: resizeState.currentWorldPos.x, y2: resizeState.currentWorldPos.y };
            }
          }
          if (el.type === 'image') {
            const dx = resizeState.currentWorldPos.x - resizeState.startWorld.x;
            const dy = resizeState.currentWorldPos.y - resizeState.startWorld.y;

            let nextX = resizeState.startX;
            let nextY = resizeState.startY;
            let nextW = resizeState.startW;
            let nextH = resizeState.startH;
            let nextCropX = resizeState.startCropX;
            let nextCropY = resizeState.startCropY;
            let nextCropW = resizeState.startCropW;
            let nextCropH = resizeState.startCropH;

            // Corner resizing handles
            if (resizeState.handle === 'br') {
              nextW = Math.max(10, resizeState.startW + dx);
              nextH = Math.max(10, resizeState.startH + dy);
            } else if (resizeState.handle === 'bl') {
              const possibleW = resizeState.startW - dx;
              if (possibleW >= 10) {
                nextX = resizeState.startX + dx;
                nextW = possibleW;
              }
              nextH = Math.max(10, resizeState.startH + dy);
            } else if (resizeState.handle === 'tr') {
              nextW = Math.max(10, resizeState.startW + dx);
              const possibleH = resizeState.startH - dy;
              if (possibleH >= 10) {
                nextY = resizeState.startY + dy;
                nextH = possibleH;
              }
            } else if (resizeState.handle === 'tl') {
              const possibleW = resizeState.startW - dx;
              if (possibleW >= 10) {
                nextX = resizeState.startX + dx;
                nextW = possibleW;
              }
              const possibleH = resizeState.startH - dy;
              if (possibleH >= 10) {
                nextY = resizeState.startY + dy;
                nextH = possibleH;
              }
            }
            // Center edge cropping handles
            else if (resizeState.handle === 'rc') {
              const possibleW = resizeState.startW + dx;
              if (possibleW >= 10) {
                nextW = possibleW;
                nextCropW = Math.max(0.01, Math.min(1.0, resizeState.startCropW * (nextW / resizeState.startW)));
                if (nextCropX + nextCropW > 1.0) {
                  nextCropW = 1.0 - nextCropX;
                }
              }
            } else if (resizeState.handle === 'lc') {
              const possibleW = resizeState.startW - dx;
              if (possibleW >= 10) {
                nextX = resizeState.startX + dx;
                nextW = possibleW;
                const cropDelta = resizeState.startCropW * (dx / resizeState.startW);
                nextCropX = Math.max(0.0, Math.min(1.0, resizeState.startCropX + cropDelta));
                nextCropW = Math.max(0.01, Math.min(1.0 - nextCropX, resizeState.startCropW * (nextW / resizeState.startW)));
              }
            } else if (resizeState.handle === 'bc') {
              const possibleH = resizeState.startH + dy;
              if (possibleH >= 10) {
                nextH = possibleH;
                nextCropH = Math.max(0.01, Math.min(1.0, resizeState.startCropH * (nextH / resizeState.startH)));
                if (nextCropY + nextCropH > 1.0) {
                  nextCropH = 1.0 - nextCropY;
                }
              }
            } else if (resizeState.handle === 'tc') {
              const possibleH = resizeState.startH - dy;
              if (possibleH >= 10) {
                nextY = resizeState.startY + dy;
                nextH = possibleH;
                const cropDelta = resizeState.startCropH * (dy / resizeState.startH);
                nextCropY = Math.max(0.0, Math.min(1.0, resizeState.startCropY + cropDelta));
                nextCropH = Math.max(0.01, Math.min(1.0 - nextCropY, resizeState.startCropH * (nextH / resizeState.startH)));
              }
            }

            return {
              ...el,
              x: nextX,
              y: nextY,
              w: nextW,
              h: nextH,
              cropX: nextCropX,
              cropY: nextCropY,
              cropW: nextCropW,
              cropH: nextCropH
            };
          }
        }
        return el;
      }));
      setResizeState(null);
      return;
    }

    if (activeTool === TOOLS.brush && brushStrokeRef.current) {
      const stroke = brushStrokeRef.current;
      if (stroke.points.length > 1) {
        const newBrush = {
          id: uid(),
          type: 'brush',
          x: 0,
          y: 0,
          points: stroke.points,
          color: stroke.color,
          size: stroke.size,
          opacity: stroke.opacity,
        };
        addElement(newBrush);
      }
      brushStrokeRef.current = null;
      setBrushStroke(null);
      return;
    }

    if (isDragging && dragOffset && (dragOffset.x !== 0 || dragOffset.y !== 0)) {
      // Apply drag
      const dx = dragOffset.x;
      const dy = dragOffset.y;
      pushUndo(JSON.parse(JSON.stringify(elements)));
      setElements(prev => prev.map(el => {
        if (!selectedIds.has(el.id)) return el;
        // Do not move if the layer is locked
        if (layers[getElementLayer(el)].locked) return el;
        if (el.type === 'line') {
          return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
        }
        if (el.type === 'via' || el.type === 'label' || el.type === 'image' || el.type === 'brush') {
          return { ...el, x: el.x + dx, y: el.y + dy };
        }
        return el;
      }));
    }
    setIsDragging(false);
    setDragStart(null);
    setDragOffset(null);

    if (selectionBox) {
      // Find elements within selection box
      const bx1 = Math.min(selectionBox.x1, selectionBox.x2);
      const by1 = Math.min(selectionBox.y1, selectionBox.y2);
      const bx2 = Math.max(selectionBox.x1, selectionBox.x2);
      const by2 = Math.max(selectionBox.y1, selectionBox.y2);
      const selected = elements.filter(el => {
        const b = getElementBounds(el);
        return b.x >= bx1 && b.y >= by1 && b.x + b.w <= bx2 && b.y + b.h <= by2;
      });
      if (e.shiftKey) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          selected.forEach(el => next.add(el.id));
          return next;
        });
      } else {
        setSelectedIds(new Set(selected.map(el => el.id)));
      }
      setSelectionBox(null);
    }
  }, [isPanning, isDragging, dragOffset, elements, selectedIds, selectionBox, pushUndo, layers, activeTool, addElement, resizeState]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const oldZoom = zoom;
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, oldZoom + delta));

    // Zoom toward cursor
    const wx = (sx - pan.x) / oldZoom;
    const wy = (sy - pan.y) / oldZoom;
    const newPanX = sx - wx * newZoom;
    const newPanY = sy - wy * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);

  // Attach wheel listener with passive: false
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleDoubleClick = useCallback((e) => {
    if (activeTool !== TOOLS.select) return;
    const world = getWorldPos(e);
    const hit = hitTest(world.x, world.y);
    if (hit && hit.type === 'label') {
      const screenPos = worldToScreen(hit.x, hit.y, pan, zoom);
      setLabelInput({ worldX: hit.x, worldY: hit.y, screenX: screenPos.x, screenY: screenPos.y, text: hit.text, editId: hit.id });
    }
  }, [activeTool, getWorldPos, hitTest, pan, zoom]);

  // ─── Keyboard handlers ─────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle when typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape' && labelInput) {
          setLabelInput(null);
        }
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        setSpaceHeld(true);
        return;
      }

      if (e.key === 'Escape') {
        if (lineStart) {
          setLineStart(null);
          setLinePreview(null);
        } else {
          setSelectedIds(new Set());
          setActiveTool(TOOLS.select);
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); doUndo(); return; }
        if (e.key === 'y') { e.preventDefault(); doRedo(); return; }
        if (e.key === 's') { e.preventDefault(); saveProjectFnRef.current?.(); return; }
        if (e.key === 'o') { e.preventDefault(); loadProjectFnRef.current?.(); return; }
        if (e.key === 'a') {
          e.preventDefault();
          const selectable = elements.filter(el => {
            const layer = layers[getElementLayer(el)];
            return layer.visible && !layer.locked;
          });
          setSelectedIds(new Set(selectable.map(el => el.id)));
          setActiveTool(TOOLS.select);
          return;
        }
        if (e.key === 'c') {
          e.preventDefault();
          if (selectedIds.size > 0) {
            clipboardRef.current = JSON.parse(JSON.stringify(
              elements.filter(el => selectedIds.has(el.id))
            ));
          }
          return;
        }
        if (e.key === 'x') {
          e.preventDefault();
          if (selectedIds.size > 0) {
            clipboardRef.current = JSON.parse(JSON.stringify(
              elements.filter(el => selectedIds.has(el.id))
            ));
            deleteSelected();
          }
          return;
        }
        if (e.key === 'v') {
          if (clipboardRef.current && clipboardRef.current.length > 0) {
            e.preventDefault();
            const offset = GRID_PITCH;
            pushUndo(JSON.parse(JSON.stringify(elements)));
            const newEls = clipboardRef.current.map(el => {
              const n = JSON.parse(JSON.stringify(el));
              n.id = uid();
              if (n.type === 'line') {
                n.x1 += offset; n.y1 += offset;
                n.x2 += offset; n.y2 += offset;
              } else if (n.type === 'via' || n.type === 'label' || n.type === 'image' || n.type === 'brush') {
                n.x += offset; n.y += offset;
              }
              return n;
            });
            setElements(prev => [...prev, ...newEls]);
            setSelectedIds(new Set(newEls.map(el => el.id)));
            setActiveTool(TOOLS.select);
          }
          return;
        }
        if (e.key === 'd') {
          e.preventDefault();
          if (selectedIds.size > 0) {
            const selected = elements.filter(el => selectedIds.has(el.id));
            const offset = GRID_PITCH;
            pushUndo(JSON.parse(JSON.stringify(elements)));
            const newEls = selected.map(el => {
              const n = JSON.parse(JSON.stringify(el));
              n.id = uid();
              if (n.type === 'line') {
                n.x1 += offset; n.y1 += offset;
                n.x2 += offset; n.y2 += offset;
              } else if (n.type === 'via' || n.type === 'label' || n.type === 'image' || n.type === 'brush') {
                n.x += offset; n.y += offset;
              }
              return n;
            });
            setElements(prev => [...prev, ...newEls]);
            setSelectedIds(new Set(newEls.map(el => el.id)));
            setActiveTool(TOOLS.select);
          }
          return;
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'v') setActiveTool(TOOLS.select);
      else if (key === 'w') { setActiveTool(TOOLS.line); setLineStart(null); setLinePreview(null); }
      else if (key === 'p') setActiveTool(TOOLS.via);
      else if (key === 'l' || key === 't') setActiveTool(TOOLS.label);
      else if (key === 'b') setActiveTool(TOOLS.brush);
      else if (key === 'g') setShowGrid(prev => !prev);
      else if (key === 's') setSnapEnabled(prev => !prev);
    };

    const handleKeyUp = (e) => {
      if (e.key === ' ') {
        setSpaceHeld(false);
        setIsPanning(false);
        setPanStart(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [lineStart, labelInput, deleteSelected, doUndo, doRedo, elements, layers, selectedIds, pushUndo]);

  // ─── Touch gesture handlers ──────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    if (sidebarOpen) setSidebarOpen(false);
    if (showModal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Prevent default scroll/zoom behaviors on canvas
    e.preventDefault();

    const touches = e.touches;
    if (touches.length === 1) {
      // Single finger
      isTouchDrawingRef.current = true;
      isTouchPanningRef.current = false;
      const touch = touches[0];
      
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;

      // Handle Double Tap for Double Click (Label edit)
      const now = Date.now();
      if (now - lastTouchTimeRef.current < 300) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        const fakeEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: () => {},
        };
        handleDoubleClick(fakeEvent);
        lastTouchTimeRef.current = 0;
        return;
      }
      lastTouchTimeRef.current = now;

      // Setup Long Press for connection toggle (acts as Right Click)
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        const fakeEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY,
          button: 2,
          preventDefault: () => {},
        };
        handleMouseDown(fakeEvent);
        isTouchDrawingRef.current = false; // Prevent drawing after long press
      }, 500);

      // Trigger virtual Mouse Down
      const fakeEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        shiftKey: e.shiftKey,
        preventDefault: () => {},
      };
      handleMouseDown(fakeEvent);

    } else if (touches.length === 2) {
      // Two fingers: Panning & Zooming
      isTouchDrawingRef.current = false;
      isTouchPanningRef.current = true;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      const t1 = touches[0];
      const t2 = touches[1];

      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;

      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      touchStartPanRef.current = {
        x: pan.x,
        y: pan.y,
        cx,
        cy
      };
    }
  }, [showModal, handleMouseDown, handleDoubleClick, zoom, pan, sidebarOpen]);

  const handleTouchMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();

    const touches = e.touches;
    if (touches.length === 1 && isTouchDrawingRef.current) {
      const touch = touches[0];

      // If user moves significantly, cancel long press
      const dx = touch.clientX - touchStartXRef.current;
      const dy = touch.clientY - touchStartYRef.current;
      if (Math.hypot(dx, dy) > 8) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      const fakeEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {},
      };
      handleMouseMove(fakeEvent);

    } else if (touches.length === 2 && isTouchPanningRef.current && touchStartPanRef.current) {
      const t1 = touches[0];
      const t2 = touches[1];

      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;

      let newZoom = zoom;
      if (touchStartDistRef.current) {
        const newDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const ratio = newDist / touchStartDistRef.current;
        newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, touchStartZoomRef.current * ratio));
        setZoom(newZoom);
      }

      const startPan = touchStartPanRef.current;
      const wxStart = (startPan.cx - startPan.x) / touchStartZoomRef.current;
      const wyStart = (startPan.cy - startPan.y) / touchStartZoomRef.current;
      const panXCalculated = cx - wxStart * newZoom;
      const panYCalculated = cy - wyStart * newZoom;

      setPan({ x: panXCalculated, y: panYCalculated });
    }
  }, [handleMouseMove, zoom]);

  const handleTouchEnd = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isTouchDrawingRef.current) {
      isTouchDrawingRef.current = false;
      const fakeEvent = {
        preventDefault: () => {},
      };
      handleMouseUp(fakeEvent);
    }

    isTouchPanningRef.current = false;
    touchStartDistRef.current = null;
    touchStartPanRef.current = null;
    touchStartZoomRef.current = null;
  }, [handleMouseUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // ─── Label input ────────────────────────────────────────────
  useEffect(() => {
    if (labelInput && labelInputRef.current) {
      labelReadyRef.current = false;
      // Delay focus to next animation frame so the browser's
      // focus state has settled after the canvas mousedown event
      const frame = requestAnimationFrame(() => {
        if (labelInputRef.current) {
          labelInputRef.current.focus();
          labelReadyRef.current = true;
        }
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [labelInput]);

  const confirmLabel = useCallback((text) => {
    if (!text || !text.trim()) {
      setLabelInput(null);
      return;
    }
    if (labelInput.editId) {
      // Editing existing label
      pushUndo(JSON.parse(JSON.stringify(elements)));
      setElements(prev => prev.map(el =>
        el.id === labelInput.editId ? { ...el, text: text.trim() } : el
      ));
    } else {
      addElement({
        id: uid(),
        type: 'label',
        x: labelInput.worldX,
        y: labelInput.worldY,
        text: text.trim(),
        hasBg: false,
      });
    }
    setLabelInput(null);
  }, [labelInput, addElement, pushUndo, elements]);

  // ─── Properties panel actions ───────────────────────────────
  const selectedElements = elements.filter(el => selectedIds.has(el.id));

  const updateProp = useCallback((prop, value) => {
    const editableElements = elements.filter(el => selectedIds.has(el.id) && !layers[getElementLayer(el)].locked);
    if (editableElements.length === 0) return;

    pushUndo(JSON.parse(JSON.stringify(elements)));
    setElements(prev => prev.map(el => {
      if (!selectedIds.has(el.id) || layers[getElementLayer(el)].locked) return el;
      return { ...el, [prop]: value };
    }));
  }, [selectedIds, elements, pushUndo, layers]);

  const rotateSelected = useCallback(() => {
    const editableElements = elements.filter(el => selectedIds.has(el.id) && el.type === 'line' && !layers[getElementLayer(el)].locked);
    if (editableElements.length === 0) return;

    pushUndo(JSON.parse(JSON.stringify(elements)));
    setElements(prev => prev.map(el => {
      if (!selectedIds.has(el.id) || el.type !== 'line' || layers[getElementLayer(el)].locked) return el;
      // Rotate 90° around center
      const cx = (el.x1 + el.x2) / 2;
      const cy = (el.y1 + el.y2) / 2;
      const dx1 = el.x1 - cx;
      const dy1 = el.y1 - cy;
      const dx2 = el.x2 - cx;
      const dy2 = el.y2 - cy;
      return {
        ...el,
        x1: cx - dy1,
        y1: cy + dx1,
        x2: cx - dy2,
        y2: cy + dx2,
      };
    }));
  }, [selectedIds, elements, pushUndo]);

  const updateLineLength = useCallback((lengthGridUnits) => {
    if (selectedElements.length !== 1 || selectedElements[0].type !== 'line') return;
    const el = selectedElements[0];
    const len = lengthGridUnits * GRID_PITCH;
    const isHorizontal = el.y1 === el.y2;
    pushUndo(JSON.parse(JSON.stringify(elements)));
    setElements(prev => prev.map(e => {
      if (e.id !== el.id) return e;
      if (isHorizontal) {
        const dir = el.x2 >= el.x1 ? 1 : -1;
        return { ...e, x2: e.x1 + len * dir };
      } else {
        const dir = el.y2 >= el.y1 ? 1 : -1;
        return { ...e, y2: e.y1 + len * dir };
      }
    }));
  }, [selectedElements, elements, pushUndo]);

  // ─── Template/Modal ─────────────────────────────────────────
  const startBlank = useCallback(() => {
    setElements([]);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedIds(new Set());
    setShowModal(false);
  }, []);

  const startTemplate = useCallback(() => {
    const templateEls = createTemplateElements();
    setElements(templateEls);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedIds(new Set());

    // Center template on screen
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const bounds = getContentBounds(templateEls);
      const contentCenterX = bounds.x + bounds.w / 2;
      const contentCenterY = bounds.y + bounds.h / 2;
      setPan({
        x: rect.width / 2 - contentCenterX,
        y: rect.height / 2 - contentCenterY
      });
    } else {
      setPan({ x: 50, y: 50 });
    }
    setZoom(1);
    setShowModal(false);
  }, []);

  const handleNew = useCallback(() => {
    setShowModal(true);
    setOpenMenu(null);
  }, []);

  const handleClear = useCallback(() => {
    pushUndo(JSON.parse(JSON.stringify(elements)));
    setElements([]);
    setSelectedIds(new Set());
    setOpenMenu(null);
  }, [elements, pushUndo]);

  // ─── Save / Load Project (.stk) ────────────────────────────
  const handleSaveProject = useCallback(() => {
    const data = {
      format: 'stickdiagram',
      version: 1,
      savedAt: new Date().toISOString(),
      elements,
      jumpOverrides: [...jumpOverrides],
      layers,
      pan,
      zoom,
      showGrid,
      snapEnabled,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = 'stick-diagram.stk';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    setOpenMenu(null);
  }, [elements, jumpOverrides, layers, pan, zoom, showGrid, snapEnabled]);

  const handleLoadProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.stk,.json';
    input.onchange = (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        try {
          const data = JSON.parse(readerEvent.target.result);
          if (data.format !== 'stickdiagram') {
            alert('Invalid file format. Please select a valid .stk file.');
            return;
          }
          setElements(data.elements || []);
          setJumpOverrides(new Set(data.jumpOverrides || []));
          if (data.layers) setLayers(data.layers);
          if (data.pan) setPan(data.pan);
          if (data.zoom) setZoom(data.zoom);
          if (data.showGrid !== undefined) setShowGrid(data.showGrid);
          if (data.snapEnabled !== undefined) setSnapEnabled(data.snapEnabled);
          const maxId = (data.elements || []).reduce((max, el) => {
            const num = parseInt(el.id.replace('el-', ''));
            return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          nextId = maxId + 1;
          setUndoStack([]);
          setRedoStack([]);
          setSelectedIds(new Set());
          setShowModal(false);
        } catch (err) {
          alert('Failed to load file: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
    setOpenMenu(null);
  }, []);

  const resumeAutosave = useCallback(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setElements(data.elements || []);
        setJumpOverrides(new Set(data.jumpOverrides || []));
        if (data.layers) setLayers(prev => ({ ...prev, ...data.layers }));
        const maxId = (data.elements || []).reduce((max, el) => {
          const num = parseInt(el.id.replace('el-', ''));
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        nextId = maxId + 1;
        setUndoStack([]);
        setRedoStack([]);
        setSelectedIds(new Set());
        const container = containerRef.current;
        if (container && data.elements && data.elements.length > 0) {
          const rect = container.getBoundingClientRect();
          const bounds = getContentBounds(data.elements);
          setPan({
            x: rect.width / 2 - (bounds.x + bounds.w / 2),
            y: rect.height / 2 - (bounds.y + bounds.h / 2),
          });
        }
        setZoom(1);
      }
    } catch {}
    setShowModal(false);
    setHasAutosave(false);
  }, []);

  const triggerImageImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const dataUrl = readerEvent.target.result;
        const img = new window.Image();
        img.src = dataUrl;
        img.onload = () => {
          const canvas = canvasRef.current;
          let worldX = 0, worldY = 0;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const world = screenToWorld(rect.width / 2, rect.height / 2, pan, zoom);
            worldX = world.x - img.naturalWidth / 4;
            worldY = world.y - img.naturalHeight / 4;
          }
          const newImageEl = {
            id: uid(),
            type: 'image',
            x: worldX,
            y: worldY,
            w: img.naturalWidth / 2 || 200,
            h: img.naturalHeight / 2 || 200,
            src: dataUrl,
          };
          pushUndo(JSON.parse(JSON.stringify(elements)));
          setElements(prev => [...prev, newImageEl]);
          setSelectedIds(new Set([newImageEl.id]));
          setActiveTool(TOOLS.select);
        };
      };
      reader.readAsDataURL(file);
    };
    input.click();
    setOpenMenu(null);
  }, [pan, zoom, elements, pushUndo]);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target.result;
              const img = new window.Image();
              img.src = dataUrl;
              img.onload = () => {
                const canvas = canvasRef.current;
                let worldX = 0, worldY = 0;
                if (canvas) {
                  const rect = canvas.getBoundingClientRect();
                  const world = screenToWorld(rect.width / 2, rect.height / 2, pan, zoom);
                  worldX = world.x - img.naturalWidth / 4;
                  worldY = world.y - img.naturalHeight / 4;
                }
                const newImageEl = {
                  id: uid(),
                  type: 'image',
                  x: worldX,
                  y: worldY,
                  w: img.naturalWidth / 2 || 200,
                  h: img.naturalHeight / 2 || 200,
                  src: dataUrl,
                };
                pushUndo(JSON.parse(JSON.stringify(elements)));
                setElements(prev => [...prev, newImageEl]);
                setSelectedIds(new Set([newImageEl.id]));
                setActiveTool(TOOLS.select);
              };
            };
            reader.readAsDataURL(file);
            e.preventDefault();
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [pan, zoom, elements, pushUndo]);

  // Keep refs current for keyboard shortcuts
  saveProjectFnRef.current = handleSaveProject;
  loadProjectFnRef.current = handleLoadProject;

  // ─── PNG Export Functions ───────────────────────────────────
  const handleExportPNG = useCallback(() => {
    if (elements.length === 0) {
      alert("Canvas is empty. Draw something before exporting!");
      return;
    }
    setShowExportModal(true);
    setOpenMenu(null);
  }, [elements]);

  const updateExportPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || elements.length === 0) return;

    const bounds = getContentBounds(elements);
    const marginVal = exportMargin * GRID_PITCH;
    const w = bounds.w + marginVal * 2;
    const h = bounds.h + marginVal * 2;

    const maxPreviewSize = 240;
    const scale = Math.min(maxPreviewSize / w, maxPreviewSize / h, 1.5);

    canvas.width = w * scale;
    canvas.height = h * scale;
    canvas.style.width = (w * scale) + 'px';
    canvas.style.height = (h * scale) + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background preview
    if (exportBgType === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (exportBgType === 'dark') {
      ctx.fillStyle = '#1A1A2E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // Checkerboard pattern for transparent preview
      const sz = 8;
      for (let x = 0; x < canvas.width; x += sz * 2) {
        for (let y = 0; y < canvas.height; y += sz * 2) {
          ctx.fillStyle = '#f0f0f5';
          ctx.fillRect(x, y, sz, sz);
          ctx.fillRect(x + sz, y + sz, sz, sz);
          ctx.fillStyle = '#dcdce5';
          ctx.fillRect(x + sz, y, sz, sz);
          ctx.fillRect(x, y + sz, sz, sz);
        }
      }
    }

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-bounds.x + marginVal, -bounds.y + marginVal);

    // Determine export settings
    let textColor = '#FFFFFF';
    let hasPill = true;
    if (exportTextColor === 'dark') {
      textColor = '#111111';
      hasPill = false;
    } else if (exportTextColor === 'light') {
      textColor = '#FFFFFF';
      hasPill = false;
    } else {
      textColor = '#FFFFFF';
      hasPill = true;
    }

    const crossovers = getCrossovers(elements);
    const activeCrossovers = crossovers.filter(c => !jumpOverrides.has(`${c.x},${c.y}`));

    elements.forEach(el => {
      const layerId = getElementLayer(el);
      const layer = layers[layerId];
      if (!layer.visible) return;

      ctx.save();
      ctx.globalAlpha *= layer.opacity;

      let options = {
        isExport: true,
        exportTextColor: textColor,
        exportHasBg: hasPill,
        imageCache: imageCacheRef.current,
        triggerRedraw: triggerRedraw
      };
      if (el.type === 'line' && el.y1 === el.y2) {
        options.crossoverXCoords = activeCrossovers
          .filter(c => c.hId === el.id)
          .map(c => c.x);
      }

      drawElement(ctx, el, false, options);
      ctx.restore();
    });

    ctx.restore();
  }, [elements, exportBgType, exportTextColor, exportMargin, layers, jumpOverrides, triggerRedraw]);

  // Update preview when settings change
  useEffect(() => {
    if (showExportModal) {
      const t = setTimeout(updateExportPreview, 50);
      return () => clearTimeout(t);
    }
  }, [showExportModal, updateExportPreview]);

  const handleDownloadPNG = useCallback(() => {
    if (elements.length === 0) return;

    const bounds = getContentBounds(elements);
    const marginVal = exportMargin * GRID_PITCH;
    const w = bounds.w + marginVal * 2;
    const h = bounds.h + marginVal * 2;

    const scale = 2; // Crisp rendering

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = w * scale;
    exportCanvas.height = h * scale;

    const ctx = exportCanvas.getContext('2d');
    ctx.scale(scale, scale);

    if (exportBgType === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
    } else if (exportBgType === 'dark') {
      ctx.fillStyle = '#1A1A2E';
      ctx.fillRect(0, 0, w, h);
    }

    ctx.translate(-bounds.x + marginVal, -bounds.y + marginVal);

    let textColor = '#FFFFFF';
    let hasPill = true;
    if (exportTextColor === 'dark') {
      textColor = '#111111';
      hasPill = false;
    } else if (exportTextColor === 'light') {
      textColor = '#FFFFFF';
      hasPill = false;
    } else {
      textColor = '#FFFFFF';
      hasPill = true;
    }

    const crossovers = getCrossovers(elements);
    const activeCrossovers = crossovers.filter(c => !jumpOverrides.has(`${c.x},${c.y}`));

    elements.forEach(el => {
      const layerId = getElementLayer(el);
      const layer = layers[layerId];
      if (!layer.visible) return;

      ctx.save();
      ctx.globalAlpha *= layer.opacity;

      let options = {
        isExport: true,
        exportTextColor: textColor,
        exportHasBg: hasPill,
        imageCache: imageCacheRef.current,
        triggerRedraw: triggerRedraw
      };
      if (el.type === 'line' && el.y1 === el.y2) {
        options.crossoverXCoords = activeCrossovers
          .filter(c => c.hId === el.id)
          .map(c => c.x);
      }

      drawElement(ctx, el, false, options);
      ctx.restore();
    });

    const link = document.createElement('a');
    link.download = 'stick-diagram.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();

    setShowExportModal(false);
  }, [elements, exportBgType, exportTextColor, exportMargin, layers, jumpOverrides]);

  // Close menus when clicking outside
  useEffect(() => {
    if (!openMenu) return;
    const handler = () => setOpenMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [openMenu]);

  // ─── Computed values for rendering ──────────────────────────
  const canvasClass = `canvas-container ${activeTool === TOOLS.select ? 'tool-select' : ''} ${isPanning || spaceHeld ? 'panning' : ''}`;

  // Render drag preview: offset elements visually during drag
  const renderElements = isDragging && dragOffset && (dragOffset.x !== 0 || dragOffset.y !== 0)
    ? elements.map(el => {
      if (!selectedIds.has(el.id)) return el;
      if (el.type === 'line') return { ...el, x1: el.x1 + dragOffset.x, y1: el.y1 + dragOffset.y, x2: el.x2 + dragOffset.x, y2: el.y2 + dragOffset.y };
      if (el.type === 'via' || el.type === 'label') return { ...el, x: el.x + dragOffset.x, y: el.y + dragOffset.y };
      return el;
    })
    : elements;

  // Re-render with drag offsets
  useEffect(() => {
    if (!isDragging) return;
    // Force re-render via pan identity (the main useEffect handles it)
    setPan(p => ({ ...p }));
  }, [isDragging, dragOffset]);

  // ─── JSX ────────────────────────────────────────────────────
  const singleLine = selectedElements.length === 1 && selectedElements[0].type === 'line' ? selectedElements[0] : null;
  const lineLength = singleLine
    ? Math.round(Math.max(Math.abs(singleLine.x2 - singleLine.x1), Math.abs(singleLine.y2 - singleLine.y1)) / GRID_PITCH)
    : null;

  const toolNames = {
    [TOOLS.select]: 'Select',
    [TOOLS.line]: 'Wire / Line',
    [TOOLS.via]: 'Via',
    [TOOLS.label]: 'Label',
    [TOOLS.brush]: 'Brush',
  };

  return (
    <div className="app-container">
      {/* ─── Top Menu Bar ─── */}
      <div className="menu-bar">
        <span className="app-title">
          <Cpu size={14} />
          StickDiagram
        </span>

        {/* File menu */}
        <div className="menu-item">
          <button
            className={openMenu === 'file' ? 'active' : ''}
            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'file' ? null : 'file'); }}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div className="menu-dropdown" onClick={e => e.stopPropagation()}>
              <button onClick={handleNew}>
                <span>New…</span>
              </button>
              <button onClick={handleClear}>
                <span>Clear Canvas</span>
              </button>
              <div className="separator" />
              <button onClick={handleSaveProject}>
                <span>Save Project (.stk)</span>
                <span className="shortcut">Ctrl+S</span>
              </button>
              <button onClick={handleLoadProject}>
                <span>Open Project…</span>
                <span className="shortcut">Ctrl+O</span>
              </button>
              <div className="separator" />
              <button onClick={handleExportPNG}>
                <span>Export PNG…</span>
              </button>
              <div className="separator" />
              <button onClick={triggerImageImport}>
                <span>Import Image…</span>
              </button>
            </div>
          )}
        </div>

        {/* View menu */}
        <div className="menu-item">
          <button
            className={openMenu === 'view' ? 'active' : ''}
            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'view' ? null : 'view'); }}
          >
            View
          </button>
          {openMenu === 'view' && (
            <div className="menu-dropdown" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setShowGrid(g => !g); setOpenMenu(null); }}>
                <span>{showGrid ? '✓' : '  '} Show Grid</span>
                <span className="shortcut">G</span>
              </button>
              <button onClick={() => { setSnapEnabled(s => !s); setOpenMenu(null); }}>
                <span>{snapEnabled ? '✓' : '  '} Snap to Grid</span>
                <span className="shortcut">S</span>
              </button>
            </div>
          )}
        </div>

        {/* Edit menu */}
        <div className="menu-item">
          <button
            className={openMenu === 'edit' ? 'active' : ''}
            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'edit' ? null : 'edit'); }}
          >
            Edit
          </button>
          {openMenu === 'edit' && (
            <div className="menu-dropdown" onClick={e => e.stopPropagation()}>
              <button onClick={() => { doUndo(); setOpenMenu(null); }}>
                <span>Undo</span>
                <span className="shortcut">Ctrl+Z</span>
              </button>
              <button onClick={() => { doRedo(); setOpenMenu(null); }}>
                <span>Redo</span>
                <span className="shortcut">Ctrl+Y</span>
              </button>
              <div className="separator" />
              <button onClick={() => {
                if (selectedIds.size > 0) {
                  clipboardRef.current = JSON.parse(JSON.stringify(elements.filter(el => selectedIds.has(el.id))));
                }
                setOpenMenu(null);
              }}>
                <span>Copy</span>
                <span className="shortcut">Ctrl+C</span>
              </button>
              <button onClick={() => {
                if (selectedIds.size > 0) {
                  clipboardRef.current = JSON.parse(JSON.stringify(elements.filter(el => selectedIds.has(el.id))));
                  deleteSelected();
                }
                setOpenMenu(null);
              }}>
                <span>Cut</span>
                <span className="shortcut">Ctrl+X</span>
              </button>
              <button onClick={() => {
                if (clipboardRef.current && clipboardRef.current.length > 0) {
                  const offset = GRID_PITCH;
                  pushUndo(JSON.parse(JSON.stringify(elements)));
                  const newEls = clipboardRef.current.map(el => {
                    const n = JSON.parse(JSON.stringify(el));
                    n.id = uid();
                    if (n.type === 'line') {
                      n.x1 += offset; n.y1 += offset;
                      n.x2 += offset; n.y2 += offset;
                    } else if (n.type === 'via' || n.type === 'label') {
                      n.x += offset; n.y += offset;
                    }
                    return n;
                  });
                  setElements(prev => [...prev, ...newEls]);
                  setSelectedIds(new Set(newEls.map(el => el.id)));
                  setActiveTool(TOOLS.select);
                }
                setOpenMenu(null);
              }}>
                <span>Paste</span>
                <span className="shortcut">Ctrl+V</span>
              </button>
              <button onClick={() => {
                if (selectedIds.size > 0) {
                  const selected = elements.filter(el => selectedIds.has(el.id));
                  const offset = GRID_PITCH;
                  pushUndo(JSON.parse(JSON.stringify(elements)));
                  const newEls = selected.map(el => {
                    const n = JSON.parse(JSON.stringify(el));
                    n.id = uid();
                    if (n.type === 'line') {
                      n.x1 += offset; n.y1 += offset;
                      n.x2 += offset; n.y2 += offset;
                    } else if (n.type === 'via' || n.type === 'label') {
                      n.x += offset; n.y += offset;
                    }
                    return n;
                  });
                  setElements(prev => [...prev, ...newEls]);
                  setSelectedIds(new Set(newEls.map(el => el.id)));
                  setActiveTool(TOOLS.select);
                }
                setOpenMenu(null);
              }}>
                <span>Duplicate</span>
                <span className="shortcut">Ctrl+D</span>
              </button>
              <div className="separator" />
              <button onClick={() => { setSelectedIds(new Set(elements.map(el => el.id))); setActiveTool(TOOLS.select); setOpenMenu(null); }}>
                <span>Select All</span>
                <span className="shortcut">Ctrl+A</span>
              </button>
              <button onClick={() => { deleteSelected(); setOpenMenu(null); }}>
                <span>Delete Selected</span>
                <span className="shortcut">Del</span>
              </button>
            </div>
          )}
        </div>

        {/* Bug / Feedback button */}
        <button
          className="feedback-btn"
          onClick={() => {
            setFeedbackName('');
            setFeedbackTitle('');
            setFeedbackDesc('');
            setShowFeedbackModal(true);
          }}
          title="Report Bug / Send Feedback"
        >
          <Bug size={16} />
        </button>

        {/* Theme toggle */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* ─── Main Area ─── */}
      <div className="main-area">
        {/* ─── Left Toolbar ─── */}
        <div className="left-toolbar">
          <button
            className={`tool-btn ${activeTool === TOOLS.select ? 'active' : ''}`}
            onClick={() => { setActiveTool(TOOLS.select); setLineStart(null); setLinePreview(null); }}
            data-tooltip="Select (V)"
            title="Select (V)"
          >
            <MousePointer2 size={18} />
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.line ? 'active' : ''}`}
            onClick={() => { setActiveTool(TOOLS.line); setLineStart(null); setLinePreview(null); }}
            data-tooltip="Wire / Line (W)"
            title="Wire / Line (W)"
          >
            <Minus size={18} />
          </button>
          <div
            className="via-tool-wrapper"
            onMouseEnter={() => setShowViaSubmenu(true)}
            onMouseLeave={() => setShowViaSubmenu(false)}
            style={{ position: 'relative' }}
          >
            <button
              className={`tool-btn ${activeTool === TOOLS.via ? 'active' : ''}`}
              onClick={() => { setActiveTool(TOOLS.via); setLineStart(null); setLinePreview(null); }}
              onMouseDown={() => setShowViaSubmenu(true)}
              data-tooltip={showViaSubmenu ? undefined : "Via (P) [Hover/Hold]"}
              title={showViaSubmenu ? undefined : "Via (P) [Hover/Hold]"}
            >
              {viaShape === 'x' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ display: 'block' }}>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <Square size={18} />
              )}
            </button>
            {showViaSubmenu && (
              <div className="via-submenu-popup">
                <button
                  className={`via-submenu-btn ${viaShape === 'x' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setViaShape('x');
                    setActiveTool(TOOLS.via);
                    setLineStart(null);
                    setLinePreview(null);
                  }}
                  title="X Style Via"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
                <button
                  className={`via-submenu-btn ${viaShape === 'square' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setViaShape('square');
                    setActiveTool(TOOLS.via);
                    setLineStart(null);
                    setLinePreview(null);
                  }}
                  title="Square Style Via"
                >
                  <div style={{ width: '10px', height: '10px', border: '2px solid currentColor', borderRadius: '1.5px' }} />
                </button>
              </div>
            )}
          </div>
          <button
            className={`tool-btn ${activeTool === TOOLS.label ? 'active' : ''}`}
            onClick={() => { setActiveTool(TOOLS.label); setLineStart(null); setLinePreview(null); }}
            data-tooltip="Label (L / T)"
            title="Label (L / T)"
          >
            <Type size={18} />
          </button>
          <button
            className={`tool-btn ${activeTool === TOOLS.brush ? 'active' : ''}`}
            onClick={() => { setActiveTool(TOOLS.brush); setLineStart(null); setLinePreview(null); }}
            data-tooltip="Brush (B)"
            title="Brush (B)"
          >
            <Paintbrush size={18} />
          </button>
          <button
            className="tool-btn"
            onClick={triggerImageImport}
            data-tooltip="Import Image"
            title="Import Image"
          >
            <ImageIcon size={18} />
          </button>

          <div className="toolbar-divider" />

          {/* Color Palette */}
          {Object.entries(COLORS).map(([key, { label, hex }]) => (
            <div
              key={key}
              className={`color-swatch ${activeColor === key ? 'active' : ''}`}
              style={{ backgroundColor: hex }}
              onClick={() => setActiveColor(key)}
              title={label}
              data-tooltip={label}
            />
          ))}

          {/* Custom Color Swatch */}
          <div
            className={`color-swatch custom-swatch ${activeColor === 'custom' ? 'active' : ''}`}
            style={{ backgroundColor: customColor }}
            onClick={() => setActiveColor('custom')}
            title="Custom Color"
            data-tooltip="Custom Color"
          >
            <input
              type="color"
              className="custom-color-picker-input"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                setActiveColor('custom');
              }}
            />
          </div>
        </div>

        {/* ─── Canvas ─── */}
        <div className={canvasClass} ref={containerRef}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onContextMenu={e => e.preventDefault()}
          />

          {/* Floating Sidebar Toggle on Mobile */}
          <button
            className="mobile-sidebar-toggle-btn"
            onClick={(e) => {
              e.stopPropagation();
              setSidebarOpen(prev => !prev);
            }}
            title="Toggle Sidebar Layers & Properties"
          >
            <Layers size={18} />
          </button>

          {/* Floating Canvas Done Button for wire drawing */}
          {lineStart && (
            <button
              className="canvas-floating-btn"
              onClick={(e) => {
                e.stopPropagation();
                setLineStart(null);
                setLinePreview(null);
              }}
              title="Finish Wire Drawing (Esc)"
            >
              Done / Finish Wire
            </button>
          )}

          {/* Inline label input */}
          {labelInput && (
            <input
              ref={labelInputRef}
              className="inline-label-input"
              style={{
                left: labelInput.screenX,
                top: labelInput.screenY - 10,
              }}
              value={labelInput.text}
              onChange={e => setLabelInput(prev => ({ ...prev, text: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmLabel(labelInput.text);
                if (e.key === 'Escape') setLabelInput(null);
              }}
              onBlur={() => {
                if (labelReadyRef.current) {
                  confirmLabel(labelInput.text);
                }
              }}
              placeholder="Label…"
            />
          )}

          {/* Collapsible Keyboard Shortcuts HUD */}
          <div className={`shortcuts-hud ${showShortcutsHUD ? 'expanded' : 'collapsed'}`}>
            <button
              className="hud-toggle-btn"
              onClick={() => setShowShortcutsHUD(prev => !prev)}
              title={showShortcutsHUD ? "Hide Shortcuts" : "Show Keyboard Shortcuts"}
            >
              <HelpCircle size={14} />
              {!showShortcutsHUD && <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Shortcuts</span>}
            </button>
            {showShortcutsHUD && (
              <div className="hud-content">
                <div className="hud-header">Keyboard Shortcuts</div>
                <div className="hud-grid">
                  <div className="hud-row"><kbd>V</kbd> <span>Select Tool</span></div>
                  <div className="hud-row"><kbd>W</kbd> <span>Wire Tool</span></div>
                  <div className="hud-row"><kbd>P</kbd> <span>Via Tool</span></div>
                  <div className="hud-row"><kbd>L</kbd> / <kbd>T</kbd> <span>Label Tool</span></div>
                  <div className="hud-row"><kbd>B</kbd> <span>Brush Tool</span></div>
                  <div className="hud-row"><kbd>G</kbd> <span>Toggle Grid</span></div>
                  <div className="hud-row"><kbd>S</kbd> <span>Toggle Snap</span></div>
                  <div className="hud-row"><kbd>Space</kbd> + Drag <span>Pan Canvas</span></div>
                  <div className="hud-row"><kbd>Del</kbd> / <kbd>Backspace</kbd> <span>Delete</span></div>
                  <div className="hud-row"><kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Y</kbd> <span>Undo / Redo</span></div>
                  <div className="hud-row"><kbd>Ctrl</kbd> + <kbd>A</kbd> <span>Select All</span></div>
                  <div className="hud-row"><kbd>Ctrl</kbd> + <kbd>C</kbd> / <kbd>X</kbd> / <kbd>V</kbd> <span>Copy / Cut / Paste</span></div>
                  <div className="hud-row"><kbd>Ctrl</kbd> + <kbd>D</kbd> <span>Duplicate</span></div>
                  <div className="hud-row"><kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>O</kbd> <span>Save / Open Project</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Panel ─── */}
        <div className={`right-panel ${sidebarOpen ? 'open' : ''}`}>
          {/* Properties Header */}
          <div className="panel-header">
            <Layers size={11} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Properties
          </div>

          {selectedElements.length === 0 ? (
            activeTool === TOOLS.via ? (
              <div className="panel-content">
                <div className="panel-header-sub" style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Via Tool Settings
                </div>
                <div className="prop-group">
                  <span className="prop-label">Default Size</span>
                  <div className="prop-btn-row">
                    <button
                      className={`prop-btn ${viaSize === 'small' ? 'active' : ''}`}
                      style={{
                        background: viaSize === 'small' ? 'var(--accent)' : 'var(--surface)',
                        color: viaSize === 'small' ? '#fff' : 'var(--text-primary)'
                      }}
                      onClick={() => setViaSize('small')}
                    >
                      Small
                    </button>
                    <button
                      className={`prop-btn ${viaSize === 'medium' ? 'active' : ''}`}
                      style={{
                        background: viaSize === 'medium' ? 'var(--accent)' : 'var(--surface)',
                        color: viaSize === 'medium' ? '#fff' : 'var(--text-primary)'
                      }}
                      onClick={() => setViaSize('medium')}
                    >
                      Medium
                    </button>
                    <button
                      className={`prop-btn ${viaSize === 'big' ? 'active' : ''}`}
                      style={{
                        background: viaSize === 'big' ? 'var(--accent)' : 'var(--surface)',
                        color: viaSize === 'big' ? '#fff' : 'var(--text-primary)'
                      }}
                      onClick={() => setViaSize('big')}
                    >
                      Big
                    </button>
                  </div>
                </div>

                <div className="prop-group">
                  <span className="prop-label">Default Style</span>
                  <div className="prop-btn-row">
                    <button
                      className={`prop-btn ${viaShape === 'x' ? 'active' : ''}`}
                      style={{
                        background: viaShape === 'x' ? 'var(--accent)' : 'var(--surface)',
                        color: viaShape === 'x' ? '#fff' : 'var(--text-primary)'
                      }}
                      onClick={() => setViaShape('x')}
                    >
                      X
                    </button>
                    <button
                      className={`prop-btn ${viaShape === 'square' ? 'active' : ''}`}
                      style={{
                        background: viaShape === 'square' ? 'var(--accent)' : 'var(--surface)',
                        color: viaShape === 'square' ? '#fff' : 'var(--text-primary)'
                      }}
                      onClick={() => setViaShape('square')}
                    >
                      Square
                    </button>
                  </div>
                </div>
              </div>
            ) : activeTool === TOOLS.brush ? (
              <div className="panel-content">
                <div className="panel-header-sub" style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Brush Tool Settings
                </div>
                <div className="prop-group">
                  <span className="prop-label">Brush Color</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      className="color-swatch active"
                      style={{ backgroundColor: brushColor, width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer', border: '2px solid var(--accent)', position: 'relative' }}
                    >
                      <input
                        type="color"
                        value={brushColor}
                        onChange={(e) => setBrushColor(e.target.value)}
                        style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{brushColor}</span>
                  </div>
                </div>
                <div className="prop-group">
                  <span className="prop-label">Brush Size: {brushSize}px</span>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="prop-group">
                  <span className="prop-label">Brush Opacity: {Math.round(brushOpacity * 100)}%</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={Math.round(brushOpacity * 100)}
                    onChange={(e) => setBrushOpacity(parseFloat(e.target.value) / 100)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ) : (
              <div className="panel-empty">
                Select an element to edit its properties.
              </div>
            )
          ) : (
            <div className="panel-content">
              <div className="prop-group">
                <span className="prop-label">Type</span>
                <span style={{ color: 'var(--text-primary)', fontSize: 11 }}>
                  {selectedElements.length > 1
                    ? `${selectedElements.length} elements`
                    : selectedElements[0].type.charAt(0).toUpperCase() + selectedElements[0].type.slice(1)
                  }
                </span>
              </div>

              {/* Label property */}
              {selectedElements.length === 1 && selectedElements[0].type === 'line' && (
                <div className="prop-group">
                  <span className="prop-label">Net Label</span>
                  <input
                    className="prop-input"
                    value={selectedElements[0].label || ''}
                    onChange={e => updateProp('label', e.target.value)}
                    placeholder="e.g. VDD, VSS, OUT"
                  />
                </div>
              )}

              {selectedElements.length === 1 && selectedElements[0].type === 'label' && (
                <>
                  <div className="prop-group">
                    <span className="prop-label">Text</span>
                    <input
                      className="prop-input"
                      value={selectedElements[0].text || ''}
                      onChange={e => updateProp('text', e.target.value)}
                      placeholder="Label text"
                    />
                  </div>
                  
                  <div className="prop-group">
                    <span className="prop-label">Alignment</span>
                    <div className="prop-btn-row">
                      <button
                        className={`prop-btn ${selectedElements[0].align !== 'center' ? 'active' : ''}`}
                        style={{
                          background: selectedElements[0].align !== 'center' ? 'var(--accent)' : 'var(--surface)',
                          color: selectedElements[0].align !== 'center' ? '#fff' : 'var(--text-primary)'
                        }}
                        onClick={() => updateProp('align', 'left')}
                      >
                        Left
                      </button>
                      <button
                        className={`prop-btn ${selectedElements[0].align === 'center' ? 'active' : ''}`}
                        style={{
                          background: selectedElements[0].align === 'center' ? 'var(--accent)' : 'var(--surface)',
                          color: selectedElements[0].align === 'center' ? '#fff' : 'var(--text-primary)'
                        }}
                        onClick={() => updateProp('align', 'center')}
                      >
                        Center
                      </button>
                    </div>
                  </div>

                  <div className="prop-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      id="prop-has-bg"
                      checked={selectedElements[0].hasBg !== false}
                      onChange={e => updateProp('hasBg', e.target.checked)}
                      style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                    />
                    <label htmlFor="prop-has-bg" style={{ fontSize: '11px', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>
                      Background Pill
                    </label>
                  </div>
                </>
              )}

              {/* Via properties */}
              {selectedElements.length >= 1 && selectedElements.every(el => el.type === 'via') && (
                <>
                  <div className="prop-group">
                    <span className="prop-label">Size</span>
                    <div className="prop-btn-row">
                      <button
                        className={`prop-btn ${selectedElements.every(el => el.size === 'small' || !el.size) ? 'active' : ''}`}
                        style={{
                          background: selectedElements.every(el => el.size === 'small' || !el.size) ? 'var(--accent)' : 'var(--surface)',
                          color: selectedElements.every(el => el.size === 'small' || !el.size) ? '#fff' : 'var(--text-primary)'
                        }}
                        onClick={() => updateProp('size', 'small')}
                      >
                        Small
                      </button>
                      <button
                        className={`prop-btn ${selectedElements.every(el => el.size === 'medium') ? 'active' : ''}`}
                        style={{
                          background: selectedElements.every(el => el.size === 'medium') ? 'var(--accent)' : 'var(--surface)',
                          color: selectedElements.every(el => el.size === 'medium') ? '#fff' : 'var(--text-primary)'
                        }}
                        onClick={() => updateProp('size', 'medium')}
                      >
                        Medium
                      </button>
                      <button
                        className={`prop-btn ${selectedElements.every(el => el.size === 'big') ? 'active' : ''}`}
                        style={{
                          background: selectedElements.every(el => el.size === 'big') ? 'var(--accent)' : 'var(--surface)',
                          color: selectedElements.every(el => el.size === 'big') ? '#fff' : 'var(--text-primary)'
                        }}
                        onClick={() => updateProp('size', 'big')}
                      >
                        Big
                      </button>
                    </div>
                  </div>

                  <div className="prop-group">
                    <span className="prop-label">Style</span>
                    <div className="prop-btn-row">
                      <button
                        className={`prop-btn ${selectedElements.every(el => el.shape === 'x') ? 'active' : ''}`}
                        style={{
                          background: selectedElements.every(el => el.shape === 'x') ? 'var(--accent)' : 'var(--surface)',
                          color: selectedElements.every(el => el.shape === 'x') ? '#fff' : 'var(--text-primary)'
                        }}
                        onClick={() => updateProp('shape', 'x')}
                      >
                        X
                      </button>
                      <button
                        className={`prop-btn ${selectedElements.every(el => el.shape === 'square' || !el.shape) ? 'active' : ''}`}
                        style={{
                          background: selectedElements.every(el => el.shape === 'square' || !el.shape) ? 'var(--accent)' : 'var(--surface)',
                          color: selectedElements.every(el => el.shape === 'square' || !el.shape) ? '#fff' : 'var(--text-primary)'
                        }}
                        onClick={() => updateProp('shape', 'square')}
                      >
                        Square
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Color for lines */}
              {selectedElements.some(el => el.type === 'line') && (
                <div className="prop-group">
                  <span className="prop-label">Layer / Color</span>
                  {Object.entries(COLORS).map(([key, { label, hex }]) => (
                    <div
                      key={key}
                      className={`color-option ${selectedElements.every(el => el.type !== 'line' || el.color === hex) ? 'active' : ''}`}
                      onClick={() => {
                        pushUndo(JSON.parse(JSON.stringify(elements)));
                        setElements(prev => prev.map(el =>
                          selectedIds.has(el.id) && el.type === 'line' ? { ...el, color: hex } : el
                        ));
                      }}
                    >
                      <span className="color-dot" style={{ backgroundColor: hex }} />
                      <span style={{ fontSize: 10 }}>{label}</span>
                    </div>
                  ))}
                  {/* Custom Color Option */}
                  <div
                    className={`color-option ${selectedElements.every(el => el.type !== 'line' || el.color === customColor) ? 'active' : ''}`}
                    onClick={() => {
                      pushUndo(JSON.parse(JSON.stringify(elements)));
                      setElements(prev => prev.map(el =>
                        selectedIds.has(el.id) && el.type === 'line' ? { ...el, color: customColor } : el
                      ));
                    }}
                  >
                    <span className="color-dot" style={{ backgroundColor: customColor }} />
                    <span style={{ fontSize: 10 }}>Custom Color</span>
                  </div>
                </div>
              )}

              {/* Length for single line */}
              {singleLine && (
                <div className="prop-group">
                  <span className="prop-label">Length (grid units)</span>
                  <input
                    className="prop-input"
                    type="number"
                    min={1}
                    value={lineLength}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      if (val > 0) updateLineLength(val);
                    }}
                  />
                </div>
              )}

              {/* Image properties */}
              {selectedElements.length === 1 && selectedElements[0].type === 'image' && (
                <>
                  <div className="prop-group">
                    <span className="prop-label">Width (px)</span>
                    <input
                      className="prop-input"
                      type="number"
                      value={selectedElements[0].w || 100}
                      onChange={e => updateProp('w', parseInt(e.target.value) || 100)}
                    />
                  </div>
                  <div className="prop-group">
                    <span className="prop-label">Height (px)</span>
                    <input
                      className="prop-input"
                      type="number"
                      value={selectedElements[0].h || 100}
                      onChange={e => updateProp('h', parseInt(e.target.value) || 100)}
                    />
                  </div>
                  <div className="prop-group">
                    <span className="prop-label">X Position</span>
                    <input
                      className="prop-input"
                      type="number"
                      value={Math.round(selectedElements[0].x)}
                      onChange={e => updateProp('x', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="prop-group">
                    <span className="prop-label">Y Position</span>
                    <input
                      className="prop-input"
                      type="number"
                      value={Math.round(selectedElements[0].y)}
                      onChange={e => updateProp('y', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="prop-group" style={{ marginTop: '4px' }}>
                    <button
                      className="prop-btn"
                      onClick={() => {
                        pushUndo(JSON.parse(JSON.stringify(elements)));
                        setElements(prev => prev.map(el => {
                          if (el.id === selectedElements[0].id) {
                            return {
                              ...el,
                              cropX: 0,
                              cropY: 0,
                              cropW: 1.0,
                              cropH: 1.0
                            };
                          }
                          return el;
                        }));
                      }}
                    >
                      Reset Crop
                    </button>
                  </div>
                </>
              )}

              {/* Brush properties */}
              {selectedElements.length === 1 && selectedElements[0].type === 'brush' && (
                <>
                  <div className="prop-group">
                    <span className="prop-label">Brush Color</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        className="color-swatch active"
                        style={{ backgroundColor: selectedElements[0].color || '#FF453A', width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer', border: '2px solid var(--accent)', position: 'relative' }}
                      >
                        <input
                          type="color"
                          value={selectedElements[0].color || '#FF453A'}
                          onChange={(e) => updateProp('color', e.target.value)}
                          style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{selectedElements[0].color || '#FF453A'}</span>
                    </div>
                  </div>
                  <div className="prop-group">
                    <span className="prop-label">Brush Size: {selectedElements[0].size || 5}px</span>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={selectedElements[0].size || 5}
                      onChange={(e) => updateProp('size', parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="prop-group">
                    <span className="prop-label">Brush Opacity: {Math.round((selectedElements[0].opacity !== undefined ? selectedElements[0].opacity : 0.8) * 100)}%</span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="10"
                      value={Math.round((selectedElements[0].opacity !== undefined ? selectedElements[0].opacity : 0.8) * 100)}
                      onChange={(e) => updateProp('opacity', parseFloat(e.target.value) / 100)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </>
              )}

              {/* Rotate & Delete */}
              <div className="prop-btn-row">
                {selectedElements.some(el => el.type === 'line') && (
                  <button className="prop-btn" onClick={rotateSelected}>
                    <RotateCw size={12} />
                    Rotate 90°
                  </button>
                )}
              </div>

              <button className="prop-btn danger" onClick={deleteSelected}>
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          )}

          {/* ─── Layers Section ─── */}
          <div className="layers-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Layers size={11} style={{ marginRight: 6 }} />
              Layers
            </div>
            <button
              className="layers-toggle-all-btn"
              onClick={() => {
                const anyVisible = Object.values(layers).some(l => l.visible);
                setLayers(prev => {
                  const next = {};
                  Object.keys(prev).forEach(k => {
                    next[k] = { ...prev[k], visible: !anyVisible };
                  });
                  return next;
                });
                if (anyVisible) {
                  setSelectedIds(new Set());
                }
              }}
              title="Toggle Show/Hide All Layers"
            >
              {Object.values(layers).some(l => l.visible) ? "Hide All" : "Show All"}
            </button>
          </div>
          <div className="layers-list">
            {(() => {
              const layerDefs = [
                { id: 'metal', label: 'Metal (Blue)', color: COLORS.metal.hex },
                { id: 'pmos',  label: 'PMOS (Yellow)', color: COLORS.pmos.hex },
                { id: 'nmos',  label: 'NMOS (Green)', color: COLORS.nmos.hex },
                { id: 'poly',  label: 'Polysilicon (Purple)', color: COLORS.poly.hex },
                { id: 'custom', label: 'Custom Layer', color: customColor },
                { id: 'via',   label: 'Vias / Contacts', color: '#FFFFFF', isViaSymbol: true },
                { id: 'label', label: 'Labels / Text', color: '#8888A8', isLabelSymbol: true },
                { id: 'image', label: 'Imported Images', color: '#E74C3C', isImageSymbol: true },
                { id: 'brush', label: 'Brush Drawings', color: '#1ABC9C', isBrushSymbol: true }
              ];

              return layerDefs.map(layer => {
                const layerState = layers[layer.id];
                return (
                  <div key={layer.id} className="layer-row">
                    <div className="layer-info">
                      {layer.isViaSymbol ? (
                        <span className="layer-color-indicator via-symbol" />
                      ) : layer.isLabelSymbol ? (
                        <span className="layer-color-indicator label-symbol">T</span>
                      ) : layer.isImageSymbol ? (
                        <span className="layer-color-indicator image-symbol" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📷</span>
                      ) : layer.isBrushSymbol ? (
                        <span className="layer-color-indicator brush-symbol" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖌️</span>
                      ) : (
                        <span className="layer-color-indicator" style={{ backgroundColor: layer.color }} />
                      )}
                      <span className="layer-name">{layer.label}</span>
                    </div>
                    <div className="layer-controls">
                      {/* Visibility toggle */}
                      <button
                        className={`layer-ctrl-btn ${!layerState.visible ? 'inactive' : ''}`}
                        onClick={() => {
                          setLayers(prev => ({
                            ...prev,
                            [layer.id]: { ...prev[layer.id], visible: !prev[layer.id].visible }
                          }));
                          // Clear selection of elements on hidden layer
                          setSelectedIds(prevSelected => {
                            const nextSelected = new Set(prevSelected);
                            elements.forEach(el => {
                              if (getElementLayer(el) === layer.id) {
                                nextSelected.delete(el.id);
                              }
                            });
                            return nextSelected;
                          });
                        }}
                        title={layerState.visible ? "Hide Layer" : "Show Layer"}
                      >
                        {layerState.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>

                      {/* Lock toggle */}
                      <button
                        className={`layer-ctrl-btn ${layerState.locked ? 'active' : ''}`}
                        onClick={() => {
                          setLayers(prev => ({
                            ...prev,
                            [layer.id]: { ...prev[layer.id], locked: !prev[layer.id].locked }
                          }));
                          // Clear selection of elements on locked layer
                          setSelectedIds(prevSelected => {
                            const nextSelected = new Set(prevSelected);
                            elements.forEach(el => {
                              if (getElementLayer(el) === layer.id) {
                                nextSelected.delete(el.id);
                              }
                            });
                            return nextSelected;
                          });
                        }}
                        title={layerState.locked ? "Unlock Layer" : "Lock Layer"}
                      >
                        {layerState.locked ? <Lock size={12} style={{ color: 'var(--danger)' }} /> : <Unlock size={12} />}
                      </button>

                      {/* Opacity range slider */}
                      <div className="layer-opacity-control" title={`Opacity: ${Math.round(layerState.opacity * 100)}%`}>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="10"
                          value={Math.round(layerState.opacity * 100)}
                          onChange={e => {
                            const val = parseFloat(e.target.value) / 100;
                            setLayers(prev => ({
                              ...prev,
                              [layer.id]: { ...prev[layer.id], opacity: val }
                            }));
                          }}
                          className="layer-opacity-slider"
                        />
                        <span className="layer-opacity-percent">{Math.round(layerState.opacity * 100)}%</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* ─── Status Bar ─── */}
      <div className="status-bar">
        <div className="status-left">
          <span className="status-item">{toolNames[activeTool] || 'Select'}</span>
          <span className="status-separator" />
          <span className="status-item">
            X: {cursorGrid.x} &nbsp; Y: {cursorGrid.y}
          </span>
          <span className="status-separator" />
          <span className="status-item">
            Zoom: {Math.round(zoom * 100)}%
          </span>
          <span className="status-separator" />
          <span className="status-item">
            <span className={`dot ${snapEnabled ? 'on' : 'off'}`} />
            Snap {snapEnabled ? 'ON' : 'OFF'}
          </span>
          <span className="status-separator" />
          <span className="status-item">
            <span className={`dot ${showGrid ? 'on' : 'off'}`} />
            Grid {showGrid ? 'ON' : 'OFF'}
          </span>
        </div>
        <div className="status-right">
          <span>Created by <a href="https://www.linkedin.com/in/aira-josh-ynte/" target="_blank" rel="noopener noreferrer" className="credit-link">Aira Josh Ynte</a></span>
          <span className="status-separator" />
          <a href="https://aera0908.github.io" target="_blank" rel="noopener noreferrer" className="credit-icon" title="Web Resume">Portfolio</a>
          <span className="status-separator" />
          <a href="https://github.com/Aera0908" target="_blank" rel="noopener noreferrer" className="credit-icon" title="GitHub">GitHub</a>
          <span className="status-separator" />
          <a href="https://x.com/aera0908" target="_blank" rel="noopener noreferrer" className="credit-icon" title="X (Twitter)">X</a>
          <span className="status-separator" />
          <a href="https://discord.com/users/aeradynamics" target="_blank" rel="noopener noreferrer" className="credit-icon" title="Discord: aeradynamics">Discord</a>
        </div>
      </div>

      {/* ─── Template Modal ─── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <Cpu size={20} />
              <h2>New Stick Diagram</h2>
            </div>
            <div className="modal-body">
              {hasAutosave && (
                <div className="template-option" onClick={resumeAutosave} style={{ borderColor: 'var(--accent)' }}>
                  <div className="tpl-icon" style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}>
                    <Layers size={20} />
                  </div>
                  <div className="tpl-info">
                    <h3>Resume Previous Session</h3>
                    <p>Your last session was auto-saved. Pick up right where you left off.</p>
                  </div>
                </div>
              )}
              <div className="template-option" onClick={startBlank}>
                <div className="tpl-icon">
                  <Grid3X3 size={20} />
                </div>
                <div className="tpl-info">
                  <h3>Blank Canvas</h3>
                  <p>Start with an empty canvas. Draw your stick diagram from scratch.</p>
                </div>
              </div>
              <div className="template-option" onClick={startTemplate}>
                <div className="tpl-icon">
                  <FileText size={20} />
                </div>
                <div className="tpl-info">
                  <h3>Basic Stick Diagram Template</h3>
                  <p>Pre-loaded VDD/VSS rails, PMOS & NMOS diffusion, and a polysilicon gate. All elements are editable.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Export Modal ─── */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal export-modal" onClick={e => e.stopPropagation()} style={{ width: '600px', maxWidth: '95vw' }}>
            <div className="modal-header">
              <Cpu size={20} />
              <h2>Export PNG</h2>
            </div>
            <div className="modal-body export-layout">
              {/* Preview canvas */}
              <div className="export-preview-container">
                <div className="export-preview-title">Preview</div>
                <div className="export-preview-box">
                  <canvas ref={previewCanvasRef} />
                </div>
                <div className="export-preview-dims">
                  {(() => {
                    const bounds = getContentBounds(elements);
                    const marginVal = exportMargin * GRID_PITCH;
                    return `Dimensions: ${(bounds.w + marginVal * 2) * 2} × ${(bounds.h + marginVal * 2) * 2} px (2x High-Res)`;
                  })()}
                </div>
              </div>

              {/* Options panel */}
              <div className="export-options-container">
                <div className="export-option-group">
                  <span className="export-label">Background</span>
                  <div className="export-btn-group">
                    <button
                      className={`export-btn ${exportBgType === 'transparent' ? 'active' : ''}`}
                      onClick={() => setExportBgType('transparent')}
                    >
                      Transparent
                    </button>
                    <button
                      className={`export-btn ${exportBgType === 'white' ? 'active' : ''}`}
                      onClick={() => setExportBgType('white')}
                    >
                      White
                    </button>
                    <button
                      className={`export-btn ${exportBgType === 'dark' ? 'active' : ''}`}
                      onClick={() => setExportBgType('dark')}
                    >
                      Dark
                    </button>
                  </div>
                </div>

                <div className="export-option-group">
                  <span className="export-label">Label Text Style</span>
                  <div className="export-btn-group vertical">
                    <button
                      className={`export-btn ${exportTextColor === 'dark' ? 'active' : ''}`}
                      onClick={() => setExportTextColor('dark')}
                    >
                      Dark Text (for light bg)
                    </button>
                    <button
                      className={`export-btn ${exportTextColor === 'light' ? 'active' : ''}`}
                      onClick={() => setExportTextColor('light')}
                    >
                      Light Text (for dark bg)
                    </button>
                    <button
                      className={`export-btn ${exportTextColor === 'pill' ? 'active' : ''}`}
                      onClick={() => setExportTextColor('pill')}
                    >
                      Pill Background (Universal)
                    </button>
                  </div>
                </div>

                <div className="export-option-group">
                  <span className="export-label">Margin Size</span>
                  <div className="export-btn-group">
                    <button
                      className={`export-btn ${exportMargin === 4 ? 'active' : ''}`}
                      onClick={() => setExportMargin(4)}
                    >
                      4 Grids
                    </button>
                    <button
                      className={`export-btn ${exportMargin === 3 ? 'active' : ''}`}
                      onClick={() => setExportMargin(3)}
                    >
                      3 Grids
                    </button>
                    <button
                      className={`export-btn ${exportMargin === 0 ? 'active' : ''}`}
                      onClick={() => setExportMargin(0)}
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="export-actions">
                  <button className="export-action-btn primary" onClick={handleDownloadPNG}>
                    Download PNG
                  </button>
                  <button className="export-action-btn secondary" onClick={() => setShowExportModal(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Feedback / Bug Report Modal ─── */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => feedbackStatus !== 'sending' && setShowFeedbackModal(false)}>
          <div className="modal feedback-modal" onClick={e => e.stopPropagation()} style={{ width: '450px', maxWidth: '90vw' }}>
            <div className="modal-header">
              <Bug size={20} />
              <h2>Report Bug / Send Feedback</h2>
            </div>
            {feedbackStatus === 'success' ? (
              <div className="modal-body" style={{ textAlign: 'center', padding: '30px 20px' }}>
                <div style={{ color: 'var(--success)', fontSize: '40px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '16px' }}>Thank You!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5' }}>
                  Your report has been sent successfully!
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!feedbackTitle.trim() || !feedbackDesc.trim()) return;

                  setFeedbackStatus('sending');

                  const today = new Date().toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  fetch("https://formsubmit.co/ajax/c0c70ee7fc10829bb28cbc968004e253", {
                    method: "POST",
                    headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                      name: feedbackName.trim() ? feedbackName.trim() : 'Anonymous',
                      _subject: `[StickDiagram Bug/Feedback] ${feedbackTitle.trim()}`,
                      date: today,
                      message: feedbackDesc.trim()
                    })
                  })
                  .then(res => {
                    if (res.ok) {
                      setFeedbackStatus('success');
                      setFeedbackName('');
                      setFeedbackTitle('');
                      setFeedbackDesc('');
                      setTimeout(() => {
                        setShowFeedbackModal(false);
                        setFeedbackStatus('idle');
                      }, 2500);
                    } else {
                      setFeedbackStatus('error');
                    }
                  })
                  .catch(() => {
                    setFeedbackStatus('error');
                  });
                }}
                className="modal-body feedback-form"
              >
                {feedbackStatus === 'error' && (
                  <div style={{
                    background: 'rgba(255, 69, 58, 0.1)',
                    border: '1px solid var(--danger)',
                    color: 'var(--danger)',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    marginBottom: '12px',
                    textAlign: 'center'
                  }}>
                    Failed to send report. Please try again.
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>Date (Automatic)</label>
                  <input
                    type="text"
                    className="form-input read-only"
                    value={new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid var(--ui-border)',
                      background: 'var(--ui-border)',
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>Your Name (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={feedbackName}
                    onChange={e => setFeedbackName(e.target.value)}
                    placeholder="e.g. John Doe"
                    disabled={feedbackStatus === 'sending'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid var(--ui-border)',
                      background: 'var(--surface)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      opacity: feedbackStatus === 'sending' ? 0.6 : 1
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Title <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={feedbackTitle}
                    onChange={e => setFeedbackTitle(e.target.value)}
                    placeholder="Short summary of the bug/feedback"
                    required
                    disabled={feedbackStatus === 'sending'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid var(--ui-border)',
                      background: 'var(--surface)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      opacity: feedbackStatus === 'sending' ? 0.6 : 1
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Description <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <textarea
                    className="form-input"
                    value={feedbackDesc}
                    onChange={e => setFeedbackDesc(e.target.value)}
                    placeholder="Describe the issue or feedback in detail..."
                    rows="4"
                    required
                    disabled={feedbackStatus === 'sending'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid var(--ui-border)',
                      background: 'var(--surface)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      resize: 'vertical',
                      minHeight: '80px',
                      fontFamily: 'inherit',
                      opacity: feedbackStatus === 'sending' ? 0.6 : 1
                    }}
                  />
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="export-action-btn secondary"
                    onClick={() => setShowFeedbackModal(false)}
                    disabled={feedbackStatus === 'sending'}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="export-action-btn primary"
                    disabled={feedbackStatus === 'sending' || !feedbackTitle.trim() || !feedbackDesc.trim()}
                  >
                    {feedbackStatus === 'sending' ? 'Sending...' : 'Send Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
