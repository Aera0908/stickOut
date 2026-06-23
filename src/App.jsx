import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

// ─── Imports ─────────────────────────────────────────────────────────
import {
  GRID_PITCH,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
  LINE_WIDTH,
  UNDO_LIMIT,
  AUTOSAVE_KEY,
  AUTOSAVE_EXPIRY_DAYS,
  BASE_LAYERS,
  HIGHER_METAL_COLORS,
  PALETTE_ORDER_BEFORE_METALS,
  PALETTE_ORDER_AFTER_METALS,
  TOOLS
} from './constants';

import {
  uid,
  layerUid,
  setNextId,
  setNextLayerId,
  snapToGrid,
  screenToWorld,
  worldToScreen,
  getElementBounds,
  resolveLayerColor,
  drawElement,
  createTemplateElements,
  getContentBounds,
  getCrossovers,
  getContactSize,
  pointInRect,
  distPointToSegment
} from './helpers';

import MenuBar from './components/MenuBar';
import Toolbar from './components/Toolbar';
import CanvasArea from './components/CanvasArea';
import PropertiesPanel from './components/PropertiesPanel';
import LayersPanel from './components/LayersPanel';
import StatusBar from './components/StatusBar';
import Modals from './components/Modals';

// ─── Main App ────────────────────────────────────────────────────────
export default function App() {
  // ─── State ──────────────────────────────────────────────────
  const [elements, setElements] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeTool, setActiveTool] = useState(TOOLS.select);
  const [contactSize, setContactSize] = useState('small');
  const [contactShape, setContactShape] = useState('square');
  const [showContactSubmenu, setShowContactSubmenu] = useState(false);
  const [activeLayerId, setActiveLayerId] = useState('metal1');
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showModal, setShowModal] = useState(true);
  const [openMenu, setOpenMenu] = useState(null);
  const [cursorGrid, setCursorGrid] = useState({ x: 0, y: 0 });

  // PNG Export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportBgType, setExportBgType] = useState('transparent');
  const [exportTextColor, setExportTextColor] = useState('dark');
  const [exportMargin, setExportMargin] = useState(4);
  const previewCanvasRef = useRef(null);

  // Feedback
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDesc, setFeedbackDesc] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('idle');

  // Custom Layer Colors (for customizable layers like via, higher metals)
  const [customLayerColors, setCustomLayerColors] = useState({ via: '#FF00FF' });

  // Extra metal layers (M3, M4, M5, ...)
  const [extraMetalLayers, setExtraMetalLayers] = useState([]);

  // Canvas Layers (Photoshop-style z-order layers)
  const initialLayerId = 'layer_1';
  const [canvasLayers, setCanvasLayers] = useState([
    { id: initialLayerId, name: 'Layer 1', visible: true, opacity: 1.0, isCustom: true }
  ]);
  const [activeCanvasLayerId, setActiveCanvasLayerId] = useState(initialLayerId);

  // Right panel tab
  const [rightTab, setRightTab] = useState('properties');

  // Custom layer creation form
  const [customLayerForm, setCustomLayerForm] = useState(null);

  // Layer panel options dropdown
  const [layerOptionsOpen, setLayerOptionsOpen] = useState(null);

  // Layer drag state (for reorder)
  const [layerDragState, setLayerDragState] = useState(null);

  // Layer rename inline edit
  const [renamingLayerId, setRenamingLayerId] = useState(null);
  const [renameText, setRenameText] = useState('');

  // Group Scale state
  const [groupScaleState, setGroupScaleState] = useState(null);

  // Brush Tool
  const [brushColor, setBrushColor] = useState('#FF453A');
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(0.8);
  const [brushStroke, setBrushStroke] = useState(null);
  const brushStrokeRef = useRef(null);
  const isErasingRef = useRef(false);

  // Image Cache & Redraw
  const imageCacheRef = useRef({});
  const [, setRedrawTrigger] = useState(0);
  const triggerRedraw = useCallback(() => setRedrawTrigger(n => n + 1), []);

  // Jump Overrides
  const [jumpOverrides, setJumpOverrides] = useState(new Set());

  // Shortcuts HUD
  const [showShortcutsHUD, setShowShortcutsHUD] = useState(true);

  // Theme
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('stickdiagram-theme') || 'dark'; }
    catch { return 'dark'; }
  });

  // Mobile sidebar drawer
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
  const [resizeState, setResizeState] = useState(null);

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
  const customLayerCreatingRef = useRef(false);

  // Auto-save
  const [hasAutosave, setHasAutosave] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);
  const showToast = useCallback((msg, duration = 3000) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), duration);
  }, []);

  // Status bar message (for auto-switch notifications)
  const [statusMessage, setStatusMessage] = useState(null);
  const statusTimerRef = useRef(null);
  const showStatusMessage = useCallback((msg, duration = 2000) => {
    setStatusMessage(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatusMessage(null), duration);
  }, []);

  // ─── Computed: Resolve all layers ───────────────────────────
  const allLayers = { ...BASE_LAYERS };
  extraMetalLayers.forEach(ml => {
    allLayers[ml.id] = {
      label: ml.label,
      hex: customLayerColors[ml.id] || ml.hex,
      dash: null,
      customizable: true,
    };
  });

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
      setRedoStack(rs => [...rs, { elements: JSON.parse(JSON.stringify(elements)), canvasLayers: JSON.parse(JSON.stringify(canvasLayers)) }]);
      setElements(snapshot.elements || snapshot);
      if (snapshot.canvasLayers) setCanvasLayers(snapshot.canvasLayers);
      setSelectedIds(new Set());
      return stack;
    });
  }, [elements, canvasLayers]);

  const doRedo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const stack = [...prev];
      const snapshot = stack.pop();
      setUndoStack(us => [...us, { elements: JSON.parse(JSON.stringify(elements)), canvasLayers: JSON.parse(JSON.stringify(canvasLayers)) }]);
      setElements(snapshot.elements || snapshot);
      if (snapshot.canvasLayers) setCanvasLayers(snapshot.canvasLayers);
      setSelectedIds(new Set());
      return stack;
    });
  }, [elements, canvasLayers]);

  const pushUndoSnapshot = useCallback(() => {
    pushUndo({ elements: JSON.parse(JSON.stringify(elements)), canvasLayers: JSON.parse(JSON.stringify(canvasLayers)) });
  }, [elements, canvasLayers, pushUndo]);

  const eraseBrushPoints = useCallback((ex, ey, radius) => {
    let changed = false;
    let newElements = [];
    
    setElements(prev => {
      prev.forEach(el => {
        if (el.type !== 'brush') {
          newElements.push(el);
          return;
        }
        
        const keptSegments = [];
        let currentSegment = [];
        
        el.points.forEach(pt => {
          const wx = el.x + pt.x;
          const wy = el.y + pt.y;
          const dist = Math.hypot(wx - ex, wy - ey);
          
          if (dist > radius) {
            currentSegment.push(pt);
          } else {
            if (currentSegment.length > 0) {
              keptSegments.push(currentSegment);
              currentSegment = [];
            }
            changed = true;
          }
        });
        
        if (currentSegment.length > 0) {
          keptSegments.push(currentSegment);
        }
        
        if (keptSegments.length === 0) {
          changed = true;
        } else {
          keptSegments.forEach((seg, index) => {
            if (index === 0) {
              newElements.push({ ...el, points: seg });
            } else {
              newElements.push({
                ...el,
                id: uid(),
                points: seg
              });
            }
          });
        }
      });
      
      return changed ? newElements : prev;
    });
  }, []);

  // ─── Element operations ─────────────────────────────────────
  const addElement = useCallback((el) => {
    pushUndoSnapshot();
    
    // Auto-routing to standard VLSI canvas layers
    let canvasLayerId = el.canvasLayerId || activeCanvasLayerId;
    if (['line', 'contact', 'via'].includes(el.type) && el.layerId) {
      canvasLayerId = `canvas_vlsi_${el.layerId}`;
      
      // Auto-create canvas layer if it doesn't exist
      setCanvasLayers(prev => {
        if (prev.some(l => l.id === canvasLayerId)) return prev;
        const layerDef = allLayers[el.layerId] || BASE_LAYERS[el.layerId];
        const cleanName = layerDef.label.split('(')[0].trim();
        return [...prev, {
          id: canvasLayerId,
          name: cleanName,
          visible: true,
          opacity: 1.0,
          isCustom: false
        }];
      });
    }

    const newEl = { ...el, canvasLayerId };
    setElements(prev => [...prev, newEl]);
  }, [pushUndoSnapshot, activeCanvasLayerId, allLayers]);

  const updateProp = useCallback((prop, value) => {
    pushUndoSnapshot();

    // Custom action to ensure canvas layer exists for standard components
    if (prop === '_ensure_vlsi_canvas_layer') {
      const canvasLayerId = `canvas_vlsi_${value}`;
      setCanvasLayers(prev => {
        if (prev.some(l => l.id === canvasLayerId)) return prev;
        const layerDef = allLayers[value] || BASE_LAYERS[value];
        const cleanName = layerDef.label.split('(')[0].trim();
        return [...prev, {
          id: canvasLayerId,
          name: cleanName,
          visible: true,
          opacity: 1.0,
          isCustom: false
        }];
      });
      return;
    }

    setElements(prev => prev.map(el => selectedIds.has(el.id) ? { ...el, [prop]: value } : el));
  }, [selectedIds, pushUndoSnapshot, allLayers]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    pushUndoSnapshot();
    setElements(prev => prev.filter(e => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
  }, [selectedIds, pushUndoSnapshot]);

  // ─── Hit testing ────────────────────────────────────────────
  const hitTest = useCallback((wx, wy) => {
    const threshold = 8 / zoom;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const cLayer = canvasLayers.find(l => l.id === el.canvasLayerId);
      if (cLayer && !cLayer.visible) continue;

      if (el.type === 'line') {
        const d = distPointToSegment(wx, wy, el.x1, el.y1, el.x2, el.y2);
        if (d < threshold) return el;
      } else if (el.type === 'contact' || el.type === 'via') {
        const s = getContactSize(el) / 2;
        if (Math.abs(wx - el.x) < s + 4 / zoom && Math.abs(wy - el.y) < s + 4 / zoom) return el;
      } else if (el.type === 'label') {
        const bounds = getElementBounds(el);
        if (pointInRect(wx, wy, bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8)) return el;
      } else if (el.type === 'image') {
        const bounds = getElementBounds(el);
        if (pointInRect(wx, wy, bounds.x, bounds.y, bounds.w, bounds.h)) return el;
      } else if (el.type === 'brush') {
        const bThreshold = (el.size || 5) / 2 + 8 / zoom;
        for (let j = 0; j < el.points.length - 1; j++) {
          const p1 = el.points[j];
          const p2 = el.points[j + 1];
          const d = distPointToSegment(wx, wy, el.x + p1.x, el.y + p1.y, el.x + p2.x, el.y + p2.y);
          if (d < bThreshold) return el;
        }
      }
    }
    return null;
  }, [elements, zoom, canvasLayers]);

  // ─── Theme effect ─────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('stickdiagram-theme', theme); } catch {}
  }, [theme]);

  // ─── Auto-save: silent restore on mount ─────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        const age = Date.now() - (data.timestamp || 0);
        const expiryMs = AUTOSAVE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        if (age < expiryMs && data.elements && data.elements.length > 0) {
          // Silently restore the saved state
          let finalCanvasLayers = data.canvasLayers || [];
          // Inline layer restoration (can't use restoreCanvasLayers since allLayers depends on state)
          (data.elements || []).forEach(el => {
            if (['line', 'contact', 'via'].includes(el.type) && el.layerId) {
              const canvasLayerId = `canvas_vlsi_${el.layerId}`;
              if (!finalCanvasLayers.some(l => l.id === canvasLayerId)) {
                const layerDef = BASE_LAYERS[el.layerId];
                const cleanName = layerDef?.label.split('(')[0].trim() || el.layerId;
                finalCanvasLayers.push({ id: canvasLayerId, name: cleanName, visible: true, opacity: 1.0, isCustom: false });
              }
            }
          });
          setCanvasLayers(finalCanvasLayers);
          const elementsMapped = (data.elements || []).map(el => {
            if (['line', 'contact', 'via'].includes(el.type) && el.layerId) {
              return { ...el, canvasLayerId: `canvas_vlsi_${el.layerId}` };
            }
            return el;
          });
          setElements(elementsMapped);
          setJumpOverrides(new Set(data.jumpOverrides || []));
          if (data.extraMetalLayers) setExtraMetalLayers(data.extraMetalLayers);
          if (data.customLayerColors) {
            const restored = { ...data.customLayerColors };
            // Migrate old via color (purple) to new default (magenta)
            if (!restored.via || restored.via === '#9C27B0') restored.via = '#FF00FF';
            setCustomLayerColors(restored);
          }
          const maxId = (data.elements || []).reduce((max, el) => {
            const num = parseInt(el.id.replace('el-', ''));
            return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          setNextId(maxId + 1);
          // Restore layer IDs
          const maxLayerId = finalCanvasLayers.reduce((max, l) => {
            const match = l.id.match(/^layer_(\d+)$/);
            return match ? Math.max(max, parseInt(match[1])) : max;
          }, 0);
          if (maxLayerId > 0) setNextLayerId(maxLayerId + 1);
          setUndoStack([]); setRedoStack([]); setSelectedIds(new Set());
          setShowModal(false); setHasAutosave(false);
          showToast('Session restored');
          return;
        } else {
          localStorage.removeItem(AUTOSAVE_KEY);
        }
      }
    } catch {
      // Corrupt data — discard silently
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch {}
    }
    // If we get here, no valid autosave — check flag for modal
    setHasAutosave(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-save: persist (debounced 500ms) ───────────────────
  useEffect(() => {
    if (showModal) return;
    const timer = setTimeout(() => {
      try {
        const data = {
          format: 'stickdiagram', version: 2, timestamp: Date.now(),
          elements, jumpOverrides: [...jumpOverrides],
          canvasLayers, extraMetalLayers, customLayerColors,
        };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [elements, jumpOverrides, canvasLayers, extraMetalLayers, customLayerColors, showModal]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  // Helper to resolve layer names from elements on restore
  const restoreCanvasLayers = useCallback((loadedElements, loadedCanvasLayers) => {
    let layers = [...(loadedCanvasLayers || [])];
    loadedElements.forEach(el => {
      if (['line', 'contact', 'via'].includes(el.type) && el.layerId) {
        const canvasLayerId = `canvas_vlsi_${el.layerId}`;
        if (!layers.some(l => l.id === canvasLayerId)) {
          const layerDef = allLayers[el.layerId] || BASE_LAYERS[el.layerId];
          const cleanName = layerDef?.label.split('(')[0].trim() || el.layerId;
          layers.push({
            id: canvasLayerId,
            name: cleanName,
            visible: true,
            opacity: 1.0,
            isCustom: false
          });
        }
      }
    });
    return layers;
  }, [allLayers]);

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

    // Draw elements ordered by canvas layers (bottom to top)
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Build render elements with dragging/resizing applied
    let renderElements = elements;
    if (isDragging && dragOffset && (dragOffset.x !== 0 || dragOffset.y !== 0)) {
      renderElements = elements.map(el => {
        if (!selectedIds.has(el.id)) return el;
        if (el.type === 'line') {
          return { ...el, x1: el.x1 + dragOffset.x, y1: el.y1 + dragOffset.y, x2: el.x2 + dragOffset.x, y2: el.y2 + dragOffset.y };
        }
        if (el.type === 'contact' || el.type === 'via' || el.type === 'label' || el.type === 'image' || el.type === 'brush') {
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
          let nextX = resizeState.startX, nextY = resizeState.startY;
          let nextW = resizeState.startW, nextH = resizeState.startH;
          let nextCropX = resizeState.startCropX, nextCropY = resizeState.startCropY;
          let nextCropW = resizeState.startCropW, nextCropH = resizeState.startCropH;

          if (resizeState.handle === 'br') { nextW = Math.max(10, resizeState.startW + dx); nextH = Math.max(10, resizeState.startH + dy); }
          else if (resizeState.handle === 'bl') { const pw = resizeState.startW - dx; if (pw >= 10) { nextX = resizeState.startX + dx; nextW = pw; } nextH = Math.max(10, resizeState.startH + dy); }
          else if (resizeState.handle === 'tr') { nextW = Math.max(10, resizeState.startW + dx); const ph = resizeState.startH - dy; if (ph >= 10) { nextY = resizeState.startY + dy; nextH = ph; } }
          else if (resizeState.handle === 'tl') { const pw = resizeState.startW - dx; if (pw >= 10) { nextX = resizeState.startX + dx; nextW = pw; } const ph = resizeState.startH - dy; if (ph >= 10) { nextY = resizeState.startY + dy; nextH = ph; } }
          else if (resizeState.handle === 'rc') { const pw = resizeState.startW + dx; if (pw >= 10) { nextW = pw; nextCropW = Math.max(0.01, Math.min(1.0, resizeState.startCropW * (nextW / resizeState.startW))); if (nextCropX + nextCropW > 1.0) nextCropW = 1.0 - nextCropX; } }
          else if (resizeState.handle === 'lc') { const pw = resizeState.startW - dx; if (pw >= 10) { nextX = resizeState.startX + dx; nextW = pw; const cd = resizeState.startCropW * (dx / resizeState.startW); nextCropX = Math.max(0, Math.min(1, resizeState.startCropX + cd)); nextCropW = Math.max(0.01, Math.min(1.0 - nextCropX, resizeState.startCropW * (nextW / resizeState.startW))); } }
          else if (resizeState.handle === 'bc') { const ph = resizeState.startH + dy; if (ph >= 10) { nextH = ph; nextCropH = Math.max(0.01, Math.min(1.0, resizeState.startCropH * (nextH / resizeState.startH))); if (nextCropY + nextCropH > 1.0) nextCropH = 1.0 - nextCropY; } }
          else if (resizeState.handle === 'tc') { const ph = resizeState.startH - dy; if (ph >= 10) { nextY = resizeState.startY + dy; nextH = ph; const cd = resizeState.startCropH * (dy / resizeState.startH); nextCropY = Math.max(0, Math.min(1, resizeState.startCropY + cd)); nextCropH = Math.max(0.01, Math.min(1.0 - nextCropY, resizeState.startCropH * (nextH / resizeState.startH))); } }

          return { ...el, x: nextX, y: nextY, w: nextW, h: nextH, cropX: nextCropX, cropY: nextCropY, cropW: nextCropW, cropH: nextCropH };
        }
        return el;
      });
    } else if (groupScaleState) {
      renderElements = elements.map(el => {
        const scaled = groupScaleState.scaledPositions?.[el.id];
        if (scaled) return { ...el, ...scaled };
        return el;
      });
    }

    const crossovers = getCrossovers(renderElements);
    const activeCrossovers = crossovers.filter(c => !jumpOverrides.has(`${c.x},${c.y}`));
    const originalCrossovers = getCrossovers(elements);
    const activeOriginalCrossovers = originalCrossovers.filter(c => !jumpOverrides.has(`${c.x},${c.y}`));

    const drawOpts = {
      imageCache: imageCacheRef.current,
      triggerRedraw: triggerRedraw,
      allLayers,
      customLayerColors,
      canvasLayers,
    };

    // Detect co-located via+contact pairs for stacked rendering
    const stackedOffsets = {};
    const contacts = renderElements.filter(el => el.type === 'contact');
    const vias = renderElements.filter(el => el.type === 'via');
    const STACK_OFFSET = 1;
    contacts.forEach(c => {
      vias.forEach(v => {
        if (c.x === v.x && c.y === v.y) {
          // Contact goes bottom-right, via goes top-left
          stackedOffsets[c.id] = { x: STACK_OFFSET, y: STACK_OFFSET };
          stackedOffsets[v.id] = { x: -STACK_OFFSET, y: -STACK_OFFSET };
        }
      });
    });

    // Draw in canvas layer order (bottom to top)
    canvasLayers.forEach(cLayer => {
      if (!cLayer.visible) return;

      const layerElements = renderElements.filter(el => el.canvasLayerId === cLayer.id);

      ctx.save();
      // Apply layer opacity dynamically!
      ctx.globalAlpha = cLayer.opacity !== undefined ? cLayer.opacity : 1.0;

      layerElements.forEach((el) => {
        const originalEl = elements.find(oe => oe.id === el.id);
        if (!originalEl) return;
        const isSelected = selectedIds.has(originalEl.id);

        // Ghost during drag/resize
        const isCurrentlyDragged = isDragging && isSelected && dragOffset && (dragOffset.x !== 0 || dragOffset.y !== 0);
        const isCurrentlyResized = resizeState && originalEl.id === resizeState.id;
        const isGroupScaled = groupScaleState && groupScaleState.scaledPositions?.[originalEl.id];

        if (isCurrentlyDragged || isCurrentlyResized || isGroupScaled) {
          ctx.save();
          ctx.globalAlpha = 0.35 * (cLayer.opacity !== undefined ? cLayer.opacity : 1.0);
          let ghostOptions = { ...drawOpts };
          if (originalEl.type === 'line' && originalEl.y1 === originalEl.y2) {
            ghostOptions.crossoverXCoords = activeOriginalCrossovers.filter(c => c.hId === originalEl.id).map(c => c.x);
          }
          drawElement(ctx, originalEl, false, ghostOptions);
          ctx.restore();
        }

        ctx.save();
        let options = { ...drawOpts };
        if (el.type === 'line' && el.y1 === el.y2) {
          options.crossoverXCoords = activeCrossovers.filter(c => c.hId === el.id).map(c => c.x);
        }
        // Apply stacked offset for co-located via+contact pairs
        if (stackedOffsets[el.id]) {
          options.stackOffset = stackedOffsets[el.id];
        }
        drawElement(ctx, el, isSelected, options);
        ctx.restore();

        // Draw endpoint handles for selected lines
        if (isSelected && el.type === 'line' && activeTool === TOOLS.select) {
          ctx.save();
          ctx.fillStyle = '#FF5500';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          const handleRadius = 5 / zoom;
          ctx.beginPath(); ctx.arc(el.x1, el.y1, handleRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(el.x2, el.y2, handleRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.restore();
        }

        // Draw image resize/crop handles
        if (isSelected && el.type === 'image' && activeTool === TOOLS.select) {
          ctx.save();
          const handleRadius = 5 / zoom;
          const halfBarW = 5 / zoom;
          const halfBarH = 1.5 / zoom;
          ctx.fillStyle = '#FF5500'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5;
          [{ x: el.x, y: el.y }, { x: el.x + el.w, y: el.y }, { x: el.x, y: el.y + el.h }, { x: el.x + el.w, y: el.y + el.h }].forEach(c => {
            ctx.beginPath(); ctx.arc(c.x, c.y, handleRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          });
          ctx.fillStyle = '#111111'; ctx.strokeStyle = '#FF5500'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.rect(el.x + el.w / 2 - halfBarW, el.y - halfBarH, halfBarW * 2, halfBarH * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.rect(el.x + el.w / 2 - halfBarW, el.y + el.h - halfBarH, halfBarW * 2, halfBarH * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.rect(el.x - halfBarH, el.y + el.h / 2 - halfBarW, halfBarH * 2, halfBarW * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.rect(el.x + el.w - halfBarH, el.y + el.h / 2 - halfBarW, halfBarH * 2, halfBarW * 2); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
      });
      ctx.restore();
    });

    // Draw elements without a canvas layer (fallback)
    const assignedIds = new Set(canvasLayers.map(l => l.id));
    renderElements.filter(el => !assignedIds.has(el.canvasLayerId)).forEach(el => {
      const originalEl = elements.find(oe => oe.id === el.id);
      if (!originalEl) return;
      const isSelected = selectedIds.has(originalEl.id);
      ctx.save();
      let options = { ...drawOpts };
      if (el.type === 'line' && el.y1 === el.y2) {
        options.crossoverXCoords = activeCrossovers.filter(c => c.hId === el.id).map(c => c.x);
      }
      drawElement(ctx, el, isSelected, options);
      ctx.restore();
    });

    // Group scale endpoint handles
    if (groupScaleState && selectedIds.size > 1) {
      const selectedLines = renderElements.filter(el => selectedIds.has(el.id) && el.type === 'line');
      selectedLines.forEach(el => {
        ctx.save();
        ctx.fillStyle = '#4A90E2';
        const hs = 3 / zoom;
        ctx.fillRect(el.x1 - hs, el.y1 - hs, hs * 2, hs * 2);
        ctx.fillRect(el.x2 - hs, el.y2 - hs, hs * 2, hs * 2);
        ctx.restore();
      });
    }

    // Line preview
    if (lineStart && linePreview) {
      const layerDef = allLayers[activeLayerId];
      const color = customLayerColors[activeLayerId] || layerDef?.hex || '#4A90E2';
      ctx.strokeStyle = color;
      ctx.lineWidth = LINE_WIDTH;
      ctx.lineCap = 'round';
      if (layerDef?.dash) ctx.setLineDash(layerDef.dash);
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(lineStart.x, lineStart.y);
      ctx.lineTo(linePreview.x, linePreview.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    // Brush preview
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

    // Group scale tooltip
    if (groupScaleState && groupScaleState.ratio != null) {
      const label = groupScaleState.integerMode
        ? `Scale: ${Math.round(groupScaleState.ratio)}×`
        : `Scale: ${Math.round(groupScaleState.ratio * 100)}%`;
      ctx.save();
      ctx.font = '12px "Roboto Mono", monospace';
      const tw = ctx.measureText(label).width;
      const tx = groupScaleState.screenX || 100;
      const ty = (groupScaleState.screenY || 100) - 30;
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      const pillPad = 6;
      ctx.beginPath();
      ctx.roundRect(tx - tw / 2 - pillPad, ty - 8 - pillPad, tw + pillPad * 2, 16 + pillPad * 2, 4);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, tx, ty);
      ctx.restore();
    }

    // Selection box
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

  }, [elements, selectedIds, showGrid, zoom, pan, lineStart, linePreview, activeLayerId, customLayerColors, jumpOverrides, selectionBox, isDragging, dragOffset, theme, brushStroke, resizeState, activeTool, canvasLayers, allLayers, groupScaleState, triggerRedraw]);

  // ─── Resize observer ───────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => setPan(p => ({ ...p })));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ─── Mouse handlers ────────────────────────────────────────
  const getWorldPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    let { x, y } = screenToWorld(sx, sy, pan, zoom);
    if (snapEnabled) { x = snapToGrid(x, GRID_PITCH); y = snapToGrid(y, GRID_PITCH); }
    return { x, y };
  }, [pan, zoom, snapEnabled]);

  const getOrthoEnd = useCallback((start, end) => {
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    return dx >= dy ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (sidebarOpen) setSidebarOpen(false);
    if (showModal) return;

    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;

    // Right click
    if (e.button === 2) {
      e.preventDefault();
      if (lineStart) { setLineStart(null); setLinePreview(null); return; }
      const world = getWorldPos(e);
      const crossovers = getCrossovers(elements);
      if (crossovers.length > 0) {
        let closest = null, minDist = Infinity;
        crossovers.forEach(c => { const dist = Math.hypot(world.x - c.x, world.y - c.y); if (dist < minDist) { minDist = dist; closest = c; } });
        if (closest && minDist < 15) {
          const key = `${closest.x},${closest.y}`;
          setJumpOverrides(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
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
      // Check endpoint handles for resize/group scale
      if (selectedIds.size > 0) {
        const handleThreshold = 10 / zoom;
        const selectedLines = elements.filter(el => selectedIds.has(el.id) && el.type === 'line');

        // Group scale: if multiple lines selected and we hit an endpoint
        if (selectedLines.length >= 2) {
          for (const el of selectedLines) {
            const dist1 = Math.hypot(world.x - el.x1, world.y - el.y1);
            if (dist1 < handleThreshold) {
              const origEls = {};
              selectedLines.forEach(sl => { origEls[sl.id] = { x1: sl.x1, y1: sl.y1, x2: sl.x2, y2: sl.y2 }; });
              setGroupScaleState({
                dragLineId: el.id, handleEnd: 'p1', originalElements: origEls,
                startPos: { x: el.x1, y: el.y1 }, isMulti: true,
                scaledPositions: {}, ratio: 1, screenX: e.clientX - r.left, screenY: e.clientY - r.top,
                integerMode: false,
              });
              return;
            }
            const dist2 = Math.hypot(world.x - el.x2, world.y - el.y2);
            if (dist2 < handleThreshold) {
              const origEls = {};
              selectedLines.forEach(sl => { origEls[sl.id] = { x1: sl.x1, y1: sl.y1, x2: sl.x2, y2: sl.y2 }; });
              setGroupScaleState({
                dragLineId: el.id, handleEnd: 'p2', originalElements: origEls,
                startPos: { x: el.x2, y: el.y2 }, isMulti: true,
                scaledPositions: {}, ratio: 1, screenX: e.clientX - r.left, screenY: e.clientY - r.top,
                integerMode: false,
              });
              return;
            }
          }
        }

        // Single line endpoint resize or image resize handles
        for (const el of elements) {
          if (!selectedIds.has(el.id)) continue;
          if (el.type === 'line') {
            const dist1 = Math.hypot(world.x - el.x1, world.y - el.y1);
            if (dist1 < handleThreshold) { setResizeState({ id: el.id, handle: 'p1', currentWorldPos: { x: el.x1, y: el.y1 } }); return; }
            const dist2 = Math.hypot(world.x - el.x2, world.y - el.y2);
            if (dist2 < handleThreshold) { setResizeState({ id: el.id, handle: 'p2', currentWorldPos: { x: el.x2, y: el.y2 } }); return; }
          } else if (el.type === 'image') {
            const makeImgResize = (handle) => ({
              id: el.id, handle, startWorld: { ...world },
              startX: el.x, startY: el.y, startW: el.w, startH: el.h,
              startCropX: el.cropX ?? 0, startCropY: el.cropY ?? 0,
              startCropW: el.cropW ?? 1.0, startCropH: el.cropH ?? 1.0,
              currentWorldPos: { ...world },
            });
            const corners = [
              { handle: 'tl', x: el.x, y: el.y }, { handle: 'tr', x: el.x + el.w, y: el.y },
              { handle: 'bl', x: el.x, y: el.y + el.h }, { handle: 'br', x: el.x + el.w, y: el.y + el.h },
            ];
            for (const c of corners) {
              if (Math.hypot(world.x - c.x, world.y - c.y) < handleThreshold) { setResizeState(makeImgResize(c.handle)); return; }
            }
            const edges = [
              { handle: 'tc', x: el.x + el.w / 2, y: el.y }, { handle: 'bc', x: el.x + el.w / 2, y: el.y + el.h },
              { handle: 'lc', x: el.x, y: el.y + el.h / 2 }, { handle: 'rc', x: el.x + el.w, y: el.y + el.h / 2 },
            ];
            for (const c of edges) {
              if (Math.hypot(world.x - c.x, world.y - c.y) < handleThreshold) { setResizeState(makeImgResize(c.handle)); return; }
            }
          }
        }
      }

      const hit = hitTest(world.x, world.y);
      if (hit) {
        if (e.shiftKey) {
          setSelectedIds(prev => { const next = new Set(prev); if (next.has(hit.id)) next.delete(hit.id); else next.add(hit.id); return next; });
        } else if (!selectedIds.has(hit.id)) {
          setSelectedIds(new Set([hit.id]));
        }
        setIsDragging(true); setDragStart(world); setDragOffset({ x: 0, y: 0 });
      } else {
        if (!e.shiftKey) setSelectedIds(new Set());
        const rawWorld = screenToWorld(sx, sy, pan, zoom);
        setSelectionBox({ x1: rawWorld.x, y1: rawWorld.y, x2: rawWorld.x, y2: rawWorld.y });
      }
    } else if (activeTool === TOOLS.line) {
      if (!lineStart) {
        setLineStart(world); setLinePreview(world);
      } else {
        const end = getOrthoEnd(lineStart, world);
        if (end.x !== lineStart.x || end.y !== lineStart.y) {
          const layerDef = allLayers[activeLayerId];
          const color = customLayerColors[activeLayerId] || layerDef?.hex || '#4A90E2';
          const line = {
            id: uid(), type: 'line',
            x1: lineStart.x, y1: lineStart.y, x2: end.x, y2: end.y,
            layerId: activeLayerId, color, label: '',
            canvasLayerId: `canvas_vlsi_${activeLayerId}`,
          };
          addElement(line);
        }
        setLineStart(null); setLinePreview(null);
      }
    } else if (activeTool === TOOLS.contact) {
      let elType = 'contact';
      if (activeLayerId === 'via') elType = 'via';

      const layerDef = allLayers[activeLayerId];
      const color = (activeLayerId === 'contact' || activeLayerId === 'buriedcontact')
        ? '#111111'
        : (customLayerColors[activeLayerId] || layerDef?.hex || '#FF00FF');

      const newEl = {
        id: uid(), type: elType,
        x: world.x, y: world.y,
        size: contactSize, shape: contactShape,
        layerId: activeLayerId, color,
        canvasLayerId: `canvas_vlsi_${activeLayerId}`,
      };
      addElement(newEl);
    } else if (activeTool === TOOLS.label) {
      e.preventDefault();
      const screenPos = worldToScreen(world.x, world.y, pan, zoom);
      setLabelInput({ worldX: world.x, worldY: world.y, screenX: screenPos.x, screenY: screenPos.y, text: '' });
    } else if (activeTool === TOOLS.brush) {
      const rawWorld = screenToWorld(sx, sy, pan, zoom);
      const stroke = { x: 0, y: 0, points: [{ x: rawWorld.x, y: rawWorld.y }], color: brushColor, size: brushSize, opacity: brushOpacity };
      brushStrokeRef.current = stroke;
      setBrushStroke(stroke);
    } else if (activeTool === TOOLS.eraser) {
      pushUndoSnapshot();
      isErasingRef.current = true;
      const rawWorld = screenToWorld(sx, sy, pan, zoom);
      eraseBrushPoints(rawWorld.x, rawWorld.y, brushSize);
    }
  }, [showModal, activeTool, spaceHeld, pan, zoom, getWorldPos, hitTest, selectedIds, lineStart, activeLayerId, customLayerColors, addElement, getOrthoEnd, elements, sidebarOpen, contactSize, contactShape, brushColor, brushSize, brushOpacity, allLayers, activeCanvasLayerId, eraseBrushPoints]);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;

    let rawWorld = screenToWorld(sx, sy, pan, zoom);
    setCursorGrid({ x: Math.round(rawWorld.x / GRID_PITCH), y: Math.round(rawWorld.y / GRID_PITCH) });

    if (isPanning && panStart) { setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); return; }

    // Group scale drag
    if (groupScaleState) {
      const world = getWorldPos(e);
      const orig = groupScaleState.originalElements;
      const dragLine = orig[groupScaleState.dragLineId];
      if (!dragLine) return;

      const isH = dragLine.y1 === dragLine.y2;
      const origLen = isH ? Math.abs(dragLine.x2 - dragLine.x1) : Math.abs(dragLine.y2 - dragLine.y1);
      if (origLen === 0) return;

      let draggedEndOrig, anchorEnd;
      if (groupScaleState.handleEnd === 'p1') {
        draggedEndOrig = isH ? dragLine.x1 : dragLine.y1;
        anchorEnd = isH ? dragLine.x2 : dragLine.y2;
      } else {
        draggedEndOrig = isH ? dragLine.x2 : dragLine.y2;
        anchorEnd = isH ? dragLine.x1 : dragLine.y1;
      }

      const draggedEndNew = isH ? world.x : world.y;
      const newLen = Math.abs(draggedEndNew - anchorEnd);
      let ratio = newLen / origLen;
      if (ratio < GRID_PITCH / origLen) ratio = GRID_PITCH / origLen;

      const integerMode = e.shiftKey;
      if (integerMode) ratio = Math.max(1, Math.round(ratio));

      const scaledPositions = {};
      if (groupScaleState.handleEnd === 'p1') {
        if (isH) scaledPositions[groupScaleState.dragLineId] = { x1: world.x, y1: dragLine.y1, x2: dragLine.x2, y2: dragLine.y2 };
        else scaledPositions[groupScaleState.dragLineId] = { x1: dragLine.x1, y1: world.y, x2: dragLine.x2, y2: dragLine.y2 };
      } else {
        if (isH) scaledPositions[groupScaleState.dragLineId] = { x1: dragLine.x1, y1: dragLine.y1, x2: world.x, y2: dragLine.y2 };
        else scaledPositions[groupScaleState.dragLineId] = { x1: dragLine.x1, y1: dragLine.y1, x2: dragLine.x2, y2: world.y };
      }

      const isDraggingLeftTop = groupScaleState.handleEnd === 'p1'
        ? (isH ? dragLine.x1 <= dragLine.x2 : dragLine.y1 <= dragLine.y2)
        : (isH ? dragLine.x2 < dragLine.x1 : dragLine.y2 < dragLine.y1);

      Object.keys(orig).forEach(id => {
        if (id === groupScaleState.dragLineId) return;
        const line = orig[id];
        const lineIsH = line.y1 === line.y2;
        const lineOrigLen = lineIsH ? Math.abs(line.x2 - line.x1) : Math.abs(line.y2 - line.y1);
        let lineNewLen = Math.max(GRID_PITCH, lineOrigLen * ratio);
        if (snapEnabled) lineNewLen = snapToGrid(lineNewLen, GRID_PITCH) || GRID_PITCH;

        let anchor, moving;
        if (lineIsH) {
          if (isDraggingLeftTop) { anchor = { x: line.x2, y: line.y1 }; moving = 'x1'; }
          else { anchor = { x: line.x1, y: line.y1 }; moving = 'x2'; }
        } else {
          if (isDraggingLeftTop) { anchor = { x: line.x1, y: line.y2 }; moving = 'y1'; }
          else { anchor = { x: line.x1, y: line.y1 }; moving = 'y2'; }
        }

        const dir = lineIsH
          ? (moving === 'x2' ? (line.x2 >= line.x1 ? 1 : -1) : (line.x1 >= line.x2 ? 1 : -1))
          : (moving === 'y2' ? (line.y2 >= line.y1 ? 1 : -1) : (line.y1 >= line.y2 ? 1 : -1));

        const newPos = lineIsH
          ? anchor.x + lineNewLen * dir
          : anchor.y + lineNewLen * dir;

        if (moving === 'x1') scaledPositions[id] = { x1: newPos, y1: line.y1, x2: line.x2, y2: line.y2 };
        else if (moving === 'x2') scaledPositions[id] = { x1: line.x1, y1: line.y1, x2: newPos, y2: line.y2 };
        else if (moving === 'y1') scaledPositions[id] = { x1: line.x1, y1: newPos, x2: line.x2, y2: line.y2 };
        else if (moving === 'y2') scaledPositions[id] = { x1: line.x1, y1: line.y1, x2: line.x2, y2: newPos };
      });

      setGroupScaleState(prev => prev ? { ...prev, scaledPositions, ratio, screenX: sx, screenY: sy, integerMode } : null);
      return;
    }

    if (resizeState) {
      const world = getWorldPos(e);
      const el = elements.find(item => item.id === resizeState.id);
      if (el) {
        if (el.type === 'line') {
          const isHorizontal = el.y1 === el.y2;
          let nextPos = { ...world };
          if (isHorizontal) nextPos.y = el.y1; else nextPos.x = el.x1;
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
      if (dx !== 0 || dy !== 0) setDragOffset({ x: dx, y: dy });
    }

    if (selectionBox) {
      const raw = screenToWorld(sx, sy, pan, zoom);
      setSelectionBox(prev => prev ? { ...prev, x2: raw.x, y2: raw.y } : null);
    }

    if (activeTool === TOOLS.line && lineStart) {
      setLinePreview(getOrthoEnd(lineStart, world));
    } else if (activeTool === TOOLS.brush && brushStrokeRef.current) {
      const rw = screenToWorld(sx, sy, pan, zoom);
      const lastPt = brushStrokeRef.current.points[brushStrokeRef.current.points.length - 1];
      if (Math.hypot(rw.x - lastPt.x, rw.y - lastPt.y) > 1.5) {
        brushStrokeRef.current.points.push({ x: rw.x, y: rw.y });
        setBrushStroke({ ...brushStrokeRef.current });
      }
    } else if (activeTool === TOOLS.eraser && isErasingRef.current) {
      const rw = screenToWorld(sx, sy, pan, zoom);
      eraseBrushPoints(rw.x, rw.y, brushSize);
    }
  }, [isPanning, panStart, pan, zoom, isDragging, dragStart, selectedIds, selectionBox, activeTool, lineStart, getWorldPos, getOrthoEnd, resizeState, elements, groupScaleState, snapEnabled, eraseBrushPoints, brushSize]);

  const handleMouseUp = useCallback((e) => {
    if (isPanning) { setIsPanning(false); setPanStart(null); return; }
    if (isErasingRef.current) {
      isErasingRef.current = false;
      return;
    }

    // Commit group scale
    if (groupScaleState && groupScaleState.scaledPositions) {
      pushUndoSnapshot();
      setElements(prev => prev.map(el => {
        const scaled = groupScaleState.scaledPositions[el.id];
        if (scaled) return { ...el, ...scaled };
        return el;
      }));
      setGroupScaleState(null);
      return;
    }

    if (resizeState) {
      pushUndoSnapshot();
      setElements(prev => prev.map(el => {
        if (el.id !== resizeState.id) return el;
        if (el.type === 'line') {
          if (resizeState.handle === 'p1') return { ...el, x1: resizeState.currentWorldPos.x, y1: resizeState.currentWorldPos.y };
          else return { ...el, x2: resizeState.currentWorldPos.x, y2: resizeState.currentWorldPos.y };
        }
        if (el.type === 'image') {
          const dx = resizeState.currentWorldPos.x - resizeState.startWorld.x;
          const dy = resizeState.currentWorldPos.y - resizeState.startWorld.y;
          let nextX = resizeState.startX, nextY = resizeState.startY, nextW = resizeState.startW, nextH = resizeState.startH;
          let nextCropX = resizeState.startCropX, nextCropY = resizeState.startCropY, nextCropW = resizeState.startCropW, nextCropH = resizeState.startCropH;
          if (resizeState.handle === 'br') { nextW = Math.max(10, resizeState.startW + dx); nextH = Math.max(10, resizeState.startH + dy); }
          else if (resizeState.handle === 'bl') { const pw = resizeState.startW - dx; if (pw >= 10) { nextX = resizeState.startX + dx; nextW = pw; } nextH = Math.max(10, resizeState.startH + dy); }
          else if (resizeState.handle === 'tr') { nextW = Math.max(10, resizeState.startW + dx); const ph = resizeState.startH - dy; if (ph >= 10) { nextY = resizeState.startY + dy; nextH = ph; } }
          else if (resizeState.handle === 'tl') { const pw = resizeState.startW - dx; if (pw >= 10) { nextX = resizeState.startX + dx; nextW = pw; } const ph = resizeState.startH - dy; if (ph >= 10) { nextY = resizeState.startY + dy; nextH = ph; } }
          else if (resizeState.handle === 'rc') { const pw = resizeState.startW + dx; if (pw >= 10) { nextW = pw; nextCropW = Math.max(0.01, Math.min(1.0, resizeState.startCropW * (nextW / resizeState.startW))); if (nextCropX + nextCropW > 1.0) nextCropW = 1.0 - nextCropX; } }
          else if (resizeState.handle === 'lc') { const pw = resizeState.startW - dx; if (pw >= 10) { nextX = resizeState.startX + dx; nextW = pw; const cd = resizeState.startCropW * (dx / resizeState.startW); nextCropX = Math.max(0, Math.min(1, resizeState.startCropX + cd)); nextCropW = Math.max(0.01, Math.min(1.0 - nextCropX, resizeState.startCropW * (nextW / resizeState.startW))); } }
          else if (resizeState.handle === 'bc') { const ph = resizeState.startH + dy; if (ph >= 10) { nextH = ph; nextCropH = Math.max(0.01, Math.min(1.0, resizeState.startCropH * (nextH / resizeState.startH))); if (nextCropY + nextCropH > 1.0) nextCropH = 1.0 - nextCropY; } }
          else if (resizeState.handle === 'tc') { const ph = resizeState.startH - dy; if (ph >= 10) { nextY = resizeState.startY + dy; nextH = ph; const cd = resizeState.startCropH * (dy / resizeState.startH); nextCropY = Math.max(0, Math.min(1, resizeState.startCropY + cd)); nextCropH = Math.max(0.01, Math.min(1.0 - nextCropY, resizeState.startCropH * (nextH / resizeState.startH))); } }
          return { ...el, x: nextX, y: nextY, w: nextW, h: nextH, cropX: nextCropX, cropY: nextCropY, cropW: nextCropW, cropH: nextCropH };
        }
        return el;
      }));
      setResizeState(null);
      return;
    }

    if (activeTool === TOOLS.brush && brushStrokeRef.current) {
      const stroke = brushStrokeRef.current;
      if (stroke.points.length > 1) {
        addElement({ id: uid(), type: 'brush', x: 0, y: 0, points: stroke.points, color: stroke.color, size: stroke.size, opacity: stroke.opacity, canvasLayerId: activeCanvasLayerId });
      }
      brushStrokeRef.current = null;
      setBrushStroke(null);
      return;
    }

    if (isDragging && dragOffset && (dragOffset.x !== 0 || dragOffset.y !== 0)) {
      const dx = dragOffset.x;
      const dy = dragOffset.y;
      pushUndoSnapshot();
      setElements(prev => prev.map(el => {
        if (!selectedIds.has(el.id)) return el;
        if (el.type === 'line') return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
        if (el.type === 'contact' || el.type === 'via' || el.type === 'label' || el.type === 'image' || el.type === 'brush') return { ...el, x: el.x + dx, y: el.y + dy };
        return el;
      }));
    }

    if (selectionBox) {
      const bx1 = Math.min(selectionBox.x1, selectionBox.x2);
      const by1 = Math.min(selectionBox.y1, selectionBox.y2);
      const bx2 = Math.max(selectionBox.x1, selectionBox.x2);
      const by2 = Math.max(selectionBox.y1, selectionBox.y2);
      const selected = elements.filter(el => {
        const b = getElementBounds(el);
        return b.x >= bx1 && b.y >= by1 && b.x + b.w <= bx2 && b.y + b.h <= by2;
      });
      if (e.shiftKey) {
        setSelectedIds(prev => { const next = new Set(prev); selected.forEach(el => next.add(el.id)); return next; });
      } else {
        setSelectedIds(new Set(selected.map(el => el.id)));
      }
      setSelectionBox(null);
    }
    setIsDragging(false); setDragStart(null); setDragOffset(null);
  }, [isPanning, isDragging, dragOffset, elements, selectedIds, selectionBox, pushUndoSnapshot, activeTool, addElement, resizeState, groupScaleState, activeCanvasLayerId]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    const oldZoom = zoom;
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, oldZoom + delta));
    const wx = (sx - pan.x) / oldZoom;
    const wy = (sy - pan.y) / oldZoom;
    setZoom(newZoom);
    setPan({ x: sx - wx * newZoom, y: sy - wy * newZoom });
  }, [zoom, pan]);

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

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape' && labelInput) setLabelInput(null);
        return;
      }

      if (e.key === ' ') { e.preventDefault(); setSpaceHeld(true); return; }

      if (e.key === 'Escape') {
        if (lineStart) { setLineStart(null); setLinePreview(null); }
        else { setSelectedIds(new Set()); setActiveTool(TOOLS.select); }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); return; }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === ']') {
          e.preventDefault();
          if (selectedIds.size > 0) {
            const elCanvasLayerId = elements.find(el => selectedIds.has(el.id))?.canvasLayerId;
            if (elCanvasLayerId) {
              const idx = canvasLayers.findIndex(l => l.id === elCanvasLayerId);
              if (idx >= 0) {
                pushUndoSnapshot();
                setCanvasLayers(prev => {
                  const arr = [...prev];
                  if (e.shiftKey) { const [item] = arr.splice(idx, 1); arr.push(item); }
                  else if (idx < arr.length - 1) { [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; }
                  return arr;
                });
              }
            }
          }
          return;
        }
        if (e.key === '[') {
          e.preventDefault();
          if (selectedIds.size > 0) {
            const elCanvasLayerId = elements.find(el => selectedIds.has(el.id))?.canvasLayerId;
            if (elCanvasLayerId) {
              const idx = canvasLayers.findIndex(l => l.id === elCanvasLayerId);
              if (idx >= 0) {
                pushUndoSnapshot();
                setCanvasLayers(prev => {
                  const arr = [...prev];
                  if (e.shiftKey) { const [item] = arr.splice(idx, 1); arr.unshift(item); }
                  else if (idx > 0) { [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]]; }
                  return arr;
                });
              }
            }
          }
          return;
        }

        if (e.key === 'z') { e.preventDefault(); doUndo(); return; }
        if (e.key === 'y') { e.preventDefault(); doRedo(); return; }
        if (e.key === 's') { e.preventDefault(); saveProjectFnRef.current?.(); return; }
        if (e.key === 'o') { e.preventDefault(); loadProjectFnRef.current?.(); return; }
        if (e.key === 'a') {
          e.preventDefault();
          setSelectedIds(new Set(elements.map(el => el.id)));
          setActiveTool(TOOLS.select);
          return;
        }
        if (e.key === 'c') {
          e.preventDefault();
          if (selectedIds.size > 0) {
            const selectedEls = elements.filter(el => selectedIds.has(el.id));
            clipboardRef.current = JSON.parse(JSON.stringify(selectedEls));
            try {
              navigator.clipboard.writeText("stickdiagram-elements:" + JSON.stringify(selectedEls));
            } catch (err) {
              console.warn("Clipboard write failed", err);
            }
          }
          return;
        }
        if (e.key === 'x') {
          e.preventDefault();
          if (selectedIds.size > 0) {
            const selectedEls = elements.filter(el => selectedIds.has(el.id));
            clipboardRef.current = JSON.parse(JSON.stringify(selectedEls));
            try {
              navigator.clipboard.writeText("stickdiagram-elements:" + JSON.stringify(selectedEls));
            } catch (err) {
              console.warn("Clipboard write failed", err);
            }
            deleteSelected();
          }
          return;
        }
        // Ctrl+V paste handling moved entirely to the window 'paste' event listener to support priority image pasting.
        if (e.key === 'd') {
          e.preventDefault();
          if (selectedIds.size > 0) {
            const selected = elements.filter(el => selectedIds.has(el.id));
            const offset = GRID_PITCH;
            pushUndoSnapshot();
            const newEls = selected.map(el => {
              const n = JSON.parse(JSON.stringify(el));
              n.id = uid();
              if (n.type === 'line') { n.x1 += offset; n.y1 += offset; n.x2 += offset; n.y2 += offset; }
              else if (['contact', 'via', 'label', 'image', 'brush'].includes(n.type)) { n.x += offset; n.y += offset; }
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
      else if (key === 'p') setActiveTool(TOOLS.contact);
      else if (key === 'l' || key === 't') setActiveTool(TOOLS.label);
      else if (key === 'b') setActiveTool(TOOLS.brush);
      else if (key === 'e') setActiveTool(TOOLS.eraser);
      else if (key === 'g') setShowGrid(prev => !prev);
      else if (key === 's') setSnapEnabled(prev => !prev);
    };

    const handleKeyUp = (e) => { if (e.key === ' ') { setSpaceHeld(false); setIsPanning(false); setPanStart(null); } };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [lineStart, labelInput, deleteSelected, doUndo, doRedo, elements, selectedIds, pushUndoSnapshot, canvasLayers, activeCanvasLayerId]);

  // Touch handlers
  const handleTouchStart = useCallback((e) => {
    if (sidebarOpen) setSidebarOpen(false);
    if (showModal) return;
    e.preventDefault();
    const touches = e.touches;
    if (touches.length === 1) {
      isTouchDrawingRef.current = true;
      isTouchPanningRef.current = false;
      const touch = touches[0];
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
      const now = Date.now();
      if (now - lastTouchTimeRef.current < 300) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        handleDoubleClick({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
        lastTouchTimeRef.current = 0;
        return;
      }
      lastTouchTimeRef.current = now;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, button: 2, preventDefault: () => {} });
        isTouchDrawingRef.current = false;
      }, 500);
      handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, button: 0, shiftKey: e.shiftKey, preventDefault: () => {} });
    } else if (touches.length === 2) {
      isTouchDrawingRef.current = false;
      isTouchPanningRef.current = true;
      if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
      const t1 = touches[0], t2 = touches[1];
      touchStartDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartZoomRef.current = zoom;
      touchStartPanRef.current = { x: pan.x, y: pan.y, cx: (t1.clientX + t2.clientX) / 2, cy: (t1.clientY + t2.clientY) / 2 };
    }
  }, [showModal, handleMouseDown, handleDoubleClick, zoom, pan, sidebarOpen]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const touches = e.touches;
    if (touches.length === 1 && isTouchDrawingRef.current) {
      const touch = touches[0];
      if (Math.hypot(touch.clientX - touchStartXRef.current, touch.clientY - touchStartYRef.current) > 8) {
        if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
      }
      handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
    } else if (touches.length === 2 && isTouchPanningRef.current && touchStartPanRef.current) {
      const t1 = touches[0], t2 = touches[1];
      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      let newZoom = zoom;
      if (touchStartDistRef.current) {
        const newDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, touchStartZoomRef.current * (newDist / touchStartDistRef.current)));
        setZoom(newZoom);
      }
      const sp = touchStartPanRef.current;
      const wxStart = (sp.cx - sp.x) / touchStartZoomRef.current;
      const wyStart = (sp.cy - sp.y) / touchStartZoomRef.current;
      setPan({ x: cx - wxStart * newZoom, y: cy - wyStart * newZoom });
    }
  }, [handleMouseMove, zoom]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    if (isTouchDrawingRef.current) { isTouchDrawingRef.current = false; handleMouseUp({ preventDefault: () => {} }); }
    isTouchPanningRef.current = false;
    touchStartDistRef.current = null; touchStartPanRef.current = null; touchStartZoomRef.current = null;
  }, [handleMouseUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => { canvas.removeEventListener('touchstart', handleTouchStart); canvas.removeEventListener('touchmove', handleTouchMove); canvas.removeEventListener('touchend', handleTouchEnd); };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Confirm inline label
  const confirmLabel = useCallback((text) => {
    if (!text || !text.trim()) { setLabelInput(null); return; }
    if (labelInput.editId) {
      pushUndoSnapshot();
      setElements(prev => prev.map(el => el.id === labelInput.editId ? { ...el, text: text.trim() } : el));
    } else {
      addElement({ id: uid(), type: 'label', x: labelInput.worldX, y: labelInput.worldY, text: text.trim(), hasBg: false, canvasLayerId: activeCanvasLayerId });
    }
    setLabelInput(null);
  }, [labelInput, addElement, pushUndoSnapshot, activeCanvasLayerId]);

  useEffect(() => {
    if (labelInput && labelInputRef.current) {
      labelReadyRef.current = false;
      const frame = requestAnimationFrame(() => { if (labelInputRef.current) { labelInputRef.current.focus(); labelReadyRef.current = true; } });
      return () => cancelAnimationFrame(frame);
    }
  }, [labelInput]);

  // Selected element properties
  const selectedElements = elements.filter(el => selectedIds.has(el.id));
  const rotateSelected = useCallback(() => {
    const editableElements = elements.filter(el => selectedIds.has(el.id) && el.type === 'line');
    if (editableElements.length === 0) return;
    pushUndoSnapshot();
    setElements(prev => prev.map(el => {
      if (!selectedIds.has(el.id) || el.type !== 'line') return el;
      const cx = (el.x1 + el.x2) / 2;
      const cy = (el.y1 + el.y2) / 2;
      const dx1 = el.x1 - cx, dy1 = el.y1 - cy;
      const dx2 = el.x2 - cx, dy2 = el.y2 - cy;
      return { ...el, x1: cx - dy1, y1: cy + dx1, x2: cx - dy2, y2: cy + dx2 };
    }));
  }, [selectedIds, elements, pushUndoSnapshot]);

  const updateLineLength = useCallback((lengthGridUnits) => {
    if (selectedElements.length !== 1 || selectedElements[0].type !== 'line') return;
    const el = selectedElements[0];
    const len = lengthGridUnits * GRID_PITCH;
    const isHorizontal = el.y1 === el.y2;
    pushUndoSnapshot();
    setElements(prev => prev.map(e => {
      if (e.id !== el.id) return e;
      if (isHorizontal) { const dir = el.x2 >= el.x1 ? 1 : -1; return { ...e, x2: e.x1 + len * dir }; }
      else { const dir = el.y2 >= el.y1 ? 1 : -1; return { ...e, y2: e.y1 + len * dir }; }
    }));
  }, [selectedElements, pushUndoSnapshot]);

  const singleLine = selectedElements.length === 1 && selectedElements[0].type === 'line' ? selectedElements[0] : null;
  const lineLength = singleLine
    ? Math.round(Math.max(Math.abs(singleLine.x2 - singleLine.x1), Math.abs(singleLine.y2 - singleLine.y1)) / GRID_PITCH)
    : null;

  // Z-Order Canvas Layers
  const moveLayerInStack = useCallback((layerId, direction) => {
    pushUndoSnapshot();
    setCanvasLayers(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(l => l.id === layerId);
      if (idx < 0) return prev;
      if (direction === 'front') { const [item] = arr.splice(idx, 1); arr.push(item); }
      else if (direction === 'back') { const [item] = arr.splice(idx, 1); arr.unshift(item); }
      else if (direction === 'forward' && idx < arr.length - 1) { [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; }
      else if (direction === 'backward' && idx > 0) { [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]]; }
      return arr;
    });
  }, [pushUndoSnapshot]);

  // Modal setups
  const startBlank = useCallback(() => {
    setElements([]);
    setCanvasLayers([{ id: 'layer_1', name: 'Layer 1', visible: true, opacity: 1.0, isCustom: true }]);
    setActiveCanvasLayerId('layer_1');
    setUndoStack([]); setRedoStack([]); setSelectedIds(new Set()); setShowModal(false);
  }, []);

  const startTemplate = useCallback(() => {
    const templateEls = createTemplateElements('canvas_vlsi_metal1');
    setCanvasLayers([
      { id: 'canvas_vlsi_metal1', name: 'Metal 1', visible: true, opacity: 1.0, isCustom: false },
      { id: 'canvas_vlsi_pdiff', name: 'P-Diffusion', visible: true, opacity: 1.0, isCustom: false },
      { id: 'canvas_vlsi_ndiff', name: 'N-Diffusion', visible: true, opacity: 1.0, isCustom: false },
      { id: 'layer_1', name: 'Layer 1', visible: true, opacity: 1.0, isCustom: true }
    ]);
    setActiveCanvasLayerId('canvas_vlsi_metal1');
    setElements(templateEls);
    setUndoStack([]); setRedoStack([]); setSelectedIds(new Set());
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const bounds = getContentBounds(templateEls);
      setPan({ x: rect.width / 2 - (bounds.x + bounds.w / 2), y: rect.height / 2 - (bounds.y + bounds.h / 2) });
    } else {
      setPan({ x: 50, y: 50 });
    }
    setZoom(1); setShowModal(false);
  }, []);

  const handleNew = useCallback(() => { setShowModal(true); setOpenMenu(null); }, []);
  const handleClear = useCallback(() => { pushUndoSnapshot(); setElements([]); setSelectedIds(new Set()); setOpenMenu(null); try { localStorage.removeItem(AUTOSAVE_KEY); } catch {} }, [pushUndoSnapshot]);

  const handleSaveProject = useCallback(() => {
    const data = {
      format: 'stickdiagram', version: 2, savedAt: new Date().toISOString(),
      elements, jumpOverrides: [...jumpOverrides],
      canvasLayers, extraMetalLayers, customLayerColors,
      pan, zoom, showGrid, snapEnabled,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = 'stick-diagram.stk';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    setOpenMenu(null);
  }, [elements, jumpOverrides, canvasLayers, extraMetalLayers, customLayerColors, pan, zoom, showGrid, snapEnabled]);

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
          if (data.format !== 'stickdiagram') { alert('Invalid file format.'); return; }
          
          let finalCanvasLayers = data.canvasLayers || [];
          finalCanvasLayers = restoreCanvasLayers(data.elements || [], finalCanvasLayers);
          setCanvasLayers(finalCanvasLayers);

          const elementsMapped = (data.elements || []).map(el => {
            if (['line', 'contact', 'via'].includes(el.type) && el.layerId) {
              return { ...el, canvasLayerId: `canvas_vlsi_${el.layerId}` };
            }
            return el;
          });
          setElements(elementsMapped);
          
          setJumpOverrides(new Set(data.jumpOverrides || []));
          if (data.extraMetalLayers) setExtraMetalLayers(data.extraMetalLayers);
          if (data.customLayerColors) {
            const restored = { ...data.customLayerColors };
            if (!restored.via || restored.via === '#9C27B0') restored.via = '#FF00FF';
            setCustomLayerColors(restored);
          }
          if (data.pan) setPan(data.pan);
          if (data.zoom) setZoom(data.zoom);
          if (data.showGrid !== undefined) setShowGrid(data.showGrid);
          if (data.snapEnabled !== undefined) setSnapEnabled(data.snapEnabled);
          const maxId = (data.elements || []).reduce((max, el) => {
            const num = parseInt(el.id.replace('el-', ''));
            return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          setNextId(maxId + 1);
          setUndoStack([]); setRedoStack([]); setSelectedIds(new Set()); setShowModal(false);
        } catch (err) { alert('Failed to load: ' + err.message); }
      };
      reader.readAsText(file);
    };
    input.click();
    setOpenMenu(null);
  }, [restoreCanvasLayers]);

  const resumeAutosave = useCallback(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        
        let finalCanvasLayers = data.canvasLayers || [];
        finalCanvasLayers = restoreCanvasLayers(data.elements || [], finalCanvasLayers);
        setCanvasLayers(finalCanvasLayers);

        const elementsMapped = (data.elements || []).map(el => {
          if (['line', 'contact', 'via'].includes(el.type) && el.layerId) {
            return { ...el, canvasLayerId: `canvas_vlsi_${el.layerId}` };
          }
          return el;
        });
        setElements(elementsMapped);

        setJumpOverrides(new Set(data.jumpOverrides || []));
        if (data.extraMetalLayers) setExtraMetalLayers(data.extraMetalLayers);
        if (data.customLayerColors) {
          const restored = { ...data.customLayerColors };
          if (!restored.via || restored.via === '#9C27B0') restored.via = '#FF00FF';
          setCustomLayerColors(restored);
        }
        const maxId = (data.elements || []).reduce((max, el) => {
          const num = parseInt(el.id.replace('el-', ''));
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        setNextId(maxId + 1);
        setUndoStack([]); setRedoStack([]); setSelectedIds(new Set());
        const container = containerRef.current;
        if (container && data.elements && data.elements.length > 0) {
          const rect = container.getBoundingClientRect();
          const bounds = getContentBounds(data.elements);
          setPan({ x: rect.width / 2 - (bounds.x + bounds.w / 2), y: rect.height / 2 - (bounds.y + bounds.h / 2) });
        }
        setZoom(1);
      }
    } catch {}
    setShowModal(false); setHasAutosave(false);
  }, [restoreCanvasLayers]);

  const triggerImageImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (ev) => {
      const file = ev.target.files[0]; if (!file) return;
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
          const newImageEl = { id: uid(), type: 'image', x: worldX, y: worldY, w: img.naturalWidth / 2 || 200, h: img.naturalHeight / 2 || 200, src: dataUrl, canvasLayerId: activeCanvasLayerId };
          pushUndoSnapshot();
          setElements(prev => [...prev, newImageEl]);
          setSelectedIds(new Set([newImageEl.id]));
          setActiveTool(TOOLS.select);
        };
      };
      reader.readAsDataURL(file);
    };
    input.click(); setOpenMenu(null);
  }, [pan, zoom, pushUndoSnapshot, activeCanvasLayerId]);

  useEffect(() => {
    const handlePaste = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // 1. Check if the system clipboard has native element JSON data (which takes priority if it was the latest copied item)
      const textData = e.clipboardData?.getData('text/plain');
      if (textData && textData.startsWith('stickdiagram-elements:')) {
        e.preventDefault();
        try {
          const jsonStr = textData.substring('stickdiagram-elements:'.length);
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const offset = GRID_PITCH;
            pushUndoSnapshot();
            const newEls = parsed.map(el => {
              const n = JSON.parse(JSON.stringify(el));
              n.id = uid();
              if (n.type === 'line') { n.x1 += offset; n.y1 += offset; n.x2 += offset; n.y2 += offset; }
              else if (['contact', 'via', 'label', 'image', 'brush'].includes(n.type)) { n.x += offset; n.y += offset; }
              return n;
            });
            setElements(prev => [...prev, ...newEls]);
            setSelectedIds(new Set(newEls.map(el => el.id)));
            setActiveTool(TOOLS.select);
            return;
          }
        } catch (err) {
          console.warn("Failed to parse pasted native elements", err);
        }
      }

      // 2. Check if the system clipboard contains an image/screenshot
      const items = e.clipboardData?.items;
      let hasImage = false;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            hasImage = true;
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
                  const newImageEl = { id: uid(), type: 'image', x: worldX, y: worldY, w: img.naturalWidth / 2 || 200, h: img.naturalHeight / 2 || 200, src: dataUrl, canvasLayerId: activeCanvasLayerId };
                  pushUndoSnapshot();
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
      }

      // 3. Fallback: if system clipboard does not have native element data or image, but internal clipboard does,
      // only use it if system clipboard has no other text (meaning writeText was blocked or it's a pure fallback)
      if (!hasImage && clipboardRef.current && clipboardRef.current.length > 0) {
        if (!textData) {
          e.preventDefault();
          const offset = GRID_PITCH;
          pushUndoSnapshot();
          const newEls = clipboardRef.current.map(el => {
            const n = JSON.parse(JSON.stringify(el));
            n.id = uid();
            if (n.type === 'line') { n.x1 += offset; n.y1 += offset; n.x2 += offset; n.y2 += offset; }
            else if (['contact', 'via', 'label', 'image', 'brush'].includes(n.type)) { n.x += offset; n.y += offset; }
            return n;
          });
          setElements(prev => [...prev, ...newEls]);
          setSelectedIds(new Set(newEls.map(el => el.id)));
          setActiveTool(TOOLS.select);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [pan, zoom, pushUndoSnapshot, activeCanvasLayerId]);
  saveProjectFnRef.current = handleSaveProject;
  loadProjectFnRef.current = handleLoadProject;

  // PNG Export
  const handleExportPNG = useCallback(() => {
    if (elements.length === 0) { alert("Canvas is empty."); return; }
    setShowExportModal(true); setOpenMenu(null);
  }, [elements]);

  const updateExportPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || elements.length === 0) return;
    const bounds = getContentBounds(elements);
    const marginVal = exportMargin * GRID_PITCH;
    const w = bounds.w + marginVal * 2;
    const h = bounds.h + marginVal * 2;
    const maxPS = 240;
    const scale = Math.min(maxPS / w, maxPS / h, 1.5);
    canvas.width = w * scale; canvas.height = h * scale;
    canvas.style.width = (w * scale) + 'px'; canvas.style.height = (h * scale) + 'px';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (exportBgType === 'white') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    else if (exportBgType === 'dark') { ctx.fillStyle = '#1A1A2E'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    else { const sz = 8; for (let x = 0; x < canvas.width; x += sz * 2) for (let y = 0; y < canvas.height; y += sz * 2) { ctx.fillStyle = '#f0f0f5'; ctx.fillRect(x, y, sz, sz); ctx.fillRect(x + sz, y + sz, sz, sz); ctx.fillStyle = '#dcdce5'; ctx.fillRect(x + sz, y, sz, sz); ctx.fillRect(x, y + sz, sz, sz); } }
    ctx.save(); ctx.scale(scale, scale); ctx.translate(-bounds.x + marginVal, -bounds.y + marginVal);
    let textColor = '#FFFFFF', hasPill = true;
    if (exportTextColor === 'dark') { textColor = '#111111'; hasPill = false; }
    else if (exportTextColor === 'light') { textColor = '#FFFFFF'; hasPill = false; }
    const crossovers = getCrossovers(elements);
    const activeCrossovers = crossovers.filter(c => !jumpOverrides.has(`${c.x},${c.y}`));
    const drawOpts = { isExport: true, exportTextColor: textColor, exportHasBg: hasPill, imageCache: imageCacheRef.current, triggerRedraw, allLayers, customLayerColors, canvasLayers };
    // Detect stacked via+contact pairs for export
    const exportStackedOffsets = {};
    const exportContacts = elements.filter(el => el.type === 'contact');
    const exportVias = elements.filter(el => el.type === 'via');
    const EXPORT_STACK_OFFSET = 1.5;
    exportContacts.forEach(c => { exportVias.forEach(v => { if (c.x === v.x && c.y === v.y) { exportStackedOffsets[c.id] = { x: EXPORT_STACK_OFFSET, y: EXPORT_STACK_OFFSET }; exportStackedOffsets[v.id] = { x: -EXPORT_STACK_OFFSET, y: -EXPORT_STACK_OFFSET }; } }); });
    canvasLayers.forEach(cLayer => {
      if (!cLayer.visible) return;
      ctx.save();
      // Apply layer opacity in export preview
      ctx.globalAlpha = cLayer.opacity !== undefined ? cLayer.opacity : 1.0;
      elements.filter(el => el.canvasLayerId === cLayer.id).forEach(el => {
        ctx.save();
        let options = { ...drawOpts };
        if (el.type === 'line' && el.y1 === el.y2) options.crossoverXCoords = activeCrossovers.filter(c => c.hId === el.id).map(c => c.x);
        if (exportStackedOffsets[el.id]) options.stackOffset = exportStackedOffsets[el.id];
        drawElement(ctx, el, false, options);
        ctx.restore();
      });
      ctx.restore();
    });
    ctx.restore();
  }, [elements, exportBgType, exportTextColor, exportMargin, jumpOverrides, triggerRedraw, allLayers, customLayerColors, canvasLayers]);

  useEffect(() => { if (showExportModal) { const t = setTimeout(updateExportPreview, 50); return () => clearTimeout(t); } }, [showExportModal, updateExportPreview]);

  const handleDownloadPNG = useCallback(() => {
    if (elements.length === 0) return;
    const bounds = getContentBounds(elements);
    const marginVal = exportMargin * GRID_PITCH;
    const w = bounds.w + marginVal * 2;
    const h = bounds.h + marginVal * 2;
    const scale = 2;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = w * scale; exportCanvas.height = h * scale;
    const ctx = exportCanvas.getContext('2d');
    ctx.scale(scale, scale);
    if (exportBgType === 'white') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h); }
    else if (exportBgType === 'dark') { ctx.fillStyle = '#1A1A2E'; ctx.fillRect(0, 0, w, h); }
    ctx.translate(-bounds.x + marginVal, -bounds.y + marginVal);
    let textColor = '#FFFFFF', hasPill = true;
    if (exportTextColor === 'dark') { textColor = '#111111'; hasPill = false; }
    else if (exportTextColor === 'light') { textColor = '#FFFFFF'; hasPill = false; }
    const crossovers = getCrossovers(elements);
    const activeCrossovers = crossovers.filter(c => !jumpOverrides.has(`${c.x},${c.y}`));
    const drawOpts = { isExport: true, exportTextColor: textColor, exportHasBg: hasPill, imageCache: imageCacheRef.current, triggerRedraw, allLayers, customLayerColors, canvasLayers };
    // Detect stacked via+contact pairs for full-res export
    const dlStackedOffsets = {};
    const dlContacts = elements.filter(el => el.type === 'contact');
    const dlVias = elements.filter(el => el.type === 'via');
    dlContacts.forEach(c => { dlVias.forEach(v => { if (c.x === v.x && c.y === v.y) { dlStackedOffsets[c.id] = { x: 1.5, y: 1.5 }; dlStackedOffsets[v.id] = { x: -1.5, y: -1.5 }; } }); });
    canvasLayers.forEach(cLayer => {
      if (!cLayer.visible) return;
      ctx.save();
      // Apply layer opacity in full resolution export
      ctx.globalAlpha = cLayer.opacity !== undefined ? cLayer.opacity : 1.0;
      elements.filter(el => el.canvasLayerId === cLayer.id).forEach(el => {
        ctx.save();
        let options = { ...drawOpts };
        if (el.type === 'line' && el.y1 === el.y2) options.crossoverXCoords = activeCrossovers.filter(c => c.hId === el.id).map(c => c.x);
        if (dlStackedOffsets[el.id]) options.stackOffset = dlStackedOffsets[el.id];
        drawElement(ctx, el, false, options);
        ctx.restore();
      });
      ctx.restore();
    });
    const link = document.createElement('a');
    link.download = 'stick-diagram.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
    setShowExportModal(false);
  }, [elements, exportBgType, exportTextColor, exportMargin, jumpOverrides, allLayers, customLayerColors, canvasLayers, triggerRedraw]);

  useEffect(() => { if (!openMenu) return; const handler = () => setOpenMenu(null); window.addEventListener('click', handler); return () => window.removeEventListener('click', handler); }, [openMenu]);

  // Canvas layers management
  const addCustomCanvasLayer = useCallback((formData) => {
    // Guard against double-fire (React strict mode or re-render)
    if (customLayerCreatingRef.current) return;
    customLayerCreatingRef.current = true;
    const newId = layerUid();
    const newLayer = {
      id: newId, name: formData.name, visible: true, opacity: 1.0, isCustom: true,
      color: formData.color, lineWidth: formData.lineWidth, strokeStyle: formData.strokeStyle,
    };
    setCustomLayerForm(null);
    pushUndoSnapshot();
    setCanvasLayers(prev => [...prev, newLayer]);
    setActiveCanvasLayerId(newId);
    // Release guard after a tick
    setTimeout(() => { customLayerCreatingRef.current = false; }, 0);
  }, [pushUndoSnapshot]);

  const deleteCanvasLayer = useCallback((layerId) => {
    if (canvasLayers.length <= 1) return;
    pushUndoSnapshot();
    setElements(prev => prev.filter(el => el.canvasLayerId !== layerId));
    setCanvasLayers(prev => prev.filter(l => l.id !== layerId));
    if (activeCanvasLayerId === layerId) {
      setActiveCanvasLayerId(canvasLayers.find(l => l.id !== layerId)?.id || canvasLayers[0].id);
    }
  }, [canvasLayers, activeCanvasLayerId, pushUndoSnapshot]);

  const duplicateCanvasLayer = useCallback((layerId) => {
    const layer = canvasLayers.find(l => l.id === layerId);
    if (!layer) return;
    const newId = layerUid();
    const newLayer = { ...layer, id: newId, name: layer.name + ' Copy' };
    const layerEls = elements.filter(el => el.canvasLayerId === layerId);
    const newEls = layerEls.map(el => ({ ...JSON.parse(JSON.stringify(el)), id: uid(), canvasLayerId: newId }));
    pushUndoSnapshot();
    const idx = canvasLayers.findIndex(l => l.id === layerId);
    setCanvasLayers(prev => { const arr = [...prev]; arr.splice(idx + 1, 0, newLayer); return arr; });
    setElements(prev => [...prev, ...newEls]);
  }, [canvasLayers, elements, pushUndoSnapshot]);

  const mergeDownCanvasLayer = useCallback((layerId) => {
    const idx = canvasLayers.findIndex(l => l.id === layerId);
    if (idx <= 0) return;
    const belowId = canvasLayers[idx - 1].id;
    pushUndoSnapshot();
    setElements(prev => prev.map(el => el.canvasLayerId === layerId ? { ...el, canvasLayerId: belowId } : el));
    setCanvasLayers(prev => prev.filter(l => l.id !== layerId));
    if (activeCanvasLayerId === layerId) setActiveCanvasLayerId(belowId);
  }, [canvasLayers, activeCanvasLayerId, pushUndoSnapshot]);

  // Extra metals
  const addMetalLayer = useCallback(() => {
    const nextNum = extraMetalLayers.length > 0
      ? Math.max(...extraMetalLayers.map(m => m.number)) + 1
      : 3;
    const colorIdx = (nextNum - 3) % HIGHER_METAL_COLORS.length;
    const newMetal = {
      id: `metal${nextNum}`,
      label: `Metal ${nextNum} (M${nextNum})`,
      hex: HIGHER_METAL_COLORS[colorIdx],
      number: nextNum,
    };
    setExtraMetalLayers(prev => [...prev, newMetal]);
    setCustomLayerColors(prev => ({ ...prev, [newMetal.id]: newMetal.hex }));
  }, [extraMetalLayers]);

  const removeMetalLayer = useCallback((metalId) => {
    const hasElements = elements.some(el => el.layerId === metalId);
    if (hasElements) { alert('Cannot remove: elements still use this metal layer. Delete or reassign them first.'); return; }
    setExtraMetalLayers(prev => prev.filter(m => m.id !== metalId));
    setCustomLayerColors(prev => { const n = { ...prev }; delete n[metalId]; return n; });
    if (activeLayerId === metalId) setActiveLayerId('metal1');
  }, [elements, activeLayerId]);

  // Select VLSI layer and automatically manage active layer and active tool
  const selectLayerFromPalette = useCallback((vlsiLayerId) => {
    setActiveLayerId(vlsiLayerId);
    const canvasLayerId = `canvas_vlsi_${vlsiLayerId}`;
    setActiveCanvasLayerId(canvasLayerId);

    // Auto-switch tool based on layer type selected
    if (['via', 'buriedcontact'].includes(vlsiLayerId)) {
      setActiveTool(TOOLS.contact);
    } else if (['poly', 'ndiff', 'pdiff', 'metal1', 'metal2'].includes(vlsiLayerId) || vlsiLayerId.startsWith('metal')) {
      setActiveTool(TOOLS.line);
    }
  }, []);

  const canvasClass = `canvas-container ${activeTool === TOOLS.select ? 'tool-select' : ''} ${isPanning || spaceHeld ? 'panning' : ''}`;

  useEffect(() => { if (isDragging) setPan(p => ({ ...p })); }, [isDragging, dragOffset]);

  useEffect(() => {
    if (activeTool === TOOLS.contact) {
      if (activeLayerId !== 'via' && activeLayerId !== 'buriedcontact' && activeLayerId !== 'contact') {
        setActiveLayerId('contact');
        setActiveCanvasLayerId('canvas_vlsi_contact');
      }
    }
    // Patch 3: Auto-switch away from contact/buriedcontact when switching to Wire tool
    if (activeTool === TOOLS.line) {
      if (activeLayerId === 'contact' || activeLayerId === 'buriedcontact') {
        setActiveLayerId('metal1');
        setActiveCanvasLayerId('canvas_vlsi_metal1');
        showStatusMessage('Layer auto-set to Metal 1');
      }
    }
  }, [activeTool, activeLayerId, showStatusMessage]);

  const toolNames = {
    [TOOLS.select]: 'Select',
    [TOOLS.line]: 'Wire / Line',
    [TOOLS.contact]: 'Contact',
    [TOOLS.label]: 'Label',
    [TOOLS.brush]: 'Brush',
    [TOOLS.eraser]: 'Eraser',
  };

  // Build palette
  const paletteItems = [];
  PALETTE_ORDER_BEFORE_METALS.forEach(id => paletteItems.push({ id, ...BASE_LAYERS[id] }));
  extraMetalLayers.sort((a, b) => a.number - b.number).forEach(ml => {
    paletteItems.push({ id: ml.id, label: ml.label, hex: customLayerColors[ml.id] || ml.hex, customizable: true, isDynamic: true });
  });
  PALETTE_ORDER_AFTER_METALS.forEach(id => paletteItems.push({ id, ...BASE_LAYERS[id] }));

  const customCanvasLayers = canvasLayers.filter(l => l.isCustom);

  return (
    <div className="app-container">
      {/* Top Menu Bar */}
      <MenuBar
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        theme={theme}
        toggleTheme={toggleTheme}
        handleNew={handleNew}
        handleClear={handleClear}
        handleSaveProject={handleSaveProject}
        handleLoadProject={handleLoadProject}
        handleExportPNG={handleExportPNG}
        triggerImageImport={triggerImageImport}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        snapEnabled={snapEnabled}
        setSnapEnabled={setSnapEnabled}
        doUndo={doUndo}
        doRedo={doRedo}
        deleteSelected={deleteSelected}
        setShowFeedbackModal={setShowFeedbackModal}
        setFeedbackName={setFeedbackName}
        setFeedbackTitle={setFeedbackTitle}
        setFeedbackDesc={setFeedbackDesc}
      />

      {/* Main Area */}
      <div className="main-area">
        {/* Left Toolbar */}
        <Toolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          contactShape={contactShape}
          setContactShape={setContactShape}
          showContactSubmenu={showContactSubmenu}
          setShowContactSubmenu={setShowContactSubmenu}
          activeLayerId={activeLayerId}
          selectLayerFromPalette={selectLayerFromPalette}
          customLayerColors={customLayerColors}
          setCustomLayerColors={setCustomLayerColors}
          paletteItems={paletteItems}
          removeMetalLayer={removeMetalLayer}
          addMetalLayer={addMetalLayer}
          customCanvasLayers={customCanvasLayers}
          activeCanvasLayerId={activeCanvasLayerId}
          setActiveCanvasLayerId={setActiveCanvasLayerId}
          triggerImageImport={triggerImageImport}
        />

        {/* Canvas Area */}
        <CanvasArea
          canvasRef={canvasRef}
          containerRef={containerRef}
          canvasClass={canvasClass}
          handleMouseDown={handleMouseDown}
          handleMouseMove={handleMouseMove}
          handleMouseUp={handleMouseUp}
          handleDoubleClick={handleDoubleClick}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          lineStart={lineStart}
          setLineStart={setLineStart}
          setLinePreview={setLinePreview}
          labelInput={labelInput}
          setLabelInput={setLabelInput}
          labelInputRef={labelInputRef}
          confirmLabel={confirmLabel}
          labelReadyRef={labelReadyRef}
          showShortcutsHUD={showShortcutsHUD}
          setShowShortcutsHUD={setShowShortcutsHUD}
        />

        {/* Right Panel */}
        <div className={`right-panel ${sidebarOpen ? 'open' : ''}`}>
          {/* Tab Header */}
          <div className="panel-tabs">
            <button className={`panel-tab ${rightTab === 'properties' ? 'active' : ''}`} onClick={() => setRightTab('properties')}>Properties</button>
            <button className={`panel-tab ${rightTab === 'layers' ? 'active' : ''}`} onClick={() => setRightTab('layers')}>Layers</button>
          </div>

          {rightTab === 'properties' ? (
            <PropertiesPanel
              selectedElements={selectedElements}
              activeTool={activeTool}
              contactSize={contactSize}
              setContactSize={setContactSize}
              contactShape={contactShape}
              setContactShape={setContactShape}
              brushColor={brushColor}
              setBrushColor={setBrushColor}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              brushOpacity={brushOpacity}
              setBrushOpacity={setBrushOpacity}
              updateProp={updateProp}
              allLayers={allLayers}
              customLayerColors={customLayerColors}
              setCustomLayerColors={setCustomLayerColors}
              updateLineLength={updateLineLength}
              lineLength={lineLength}
              selectedIds={selectedIds}
              setElements={setElements}
              pushUndoSnapshot={pushUndoSnapshot}
              rotateSelected={rotateSelected}
              deleteSelected={deleteSelected}
              canvasLayers={canvasLayers}
              moveLayerInStack={moveLayerInStack}
              activeLayerId={activeLayerId}
            />
          ) : (
            <LayersPanel
              canvasLayers={canvasLayers}
              setCanvasLayers={setCanvasLayers}
              activeCanvasLayerId={activeCanvasLayerId}
              setActiveCanvasLayerId={setActiveCanvasLayerId}
              elements={elements}
              pushUndoSnapshot={pushUndoSnapshot}
              addCustomCanvasLayer={addCustomCanvasLayer}
              deleteCanvasLayer={deleteCanvasLayer}
              duplicateCanvasLayer={duplicateCanvasLayer}
              mergeDownCanvasLayer={mergeDownCanvasLayer}
              customLayerForm={customLayerForm}
              setCustomLayerForm={setCustomLayerForm}
              layerOptionsOpen={layerOptionsOpen}
              setLayerOptionsOpen={setLayerOptionsOpen}
              layerDragState={layerDragState}
              setLayerDragState={setLayerDragState}
              renamingLayerId={renamingLayerId}
              setRenamingLayerId={setRenamingLayerId}
              renameText={renameText}
              setRenameText={setRenameText}
            />
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        activeTool={activeTool}
        toolNames={toolNames}
        cursorGrid={cursorGrid}
        zoom={zoom}
        snapEnabled={snapEnabled}
        showGrid={showGrid}
        groupScaleState={groupScaleState}
        statusMessage={statusMessage}
      />

      {/* Modals Overlay */}
      <Modals
        showModal={showModal}
        hasAutosave={hasAutosave}
        resumeAutosave={resumeAutosave}
        startBlank={startBlank}
        startTemplate={startTemplate}
        showExportModal={showExportModal}
        setShowExportModal={setShowExportModal}
        previewCanvasRef={previewCanvasRef}
        exportBgType={exportBgType}
        setExportBgType={setExportBgType}
        exportTextColor={exportTextColor}
        setExportTextColor={setExportTextColor}
        exportMargin={exportMargin}
        setExportMargin={setExportMargin}
        handleDownloadPNG={handleDownloadPNG}
        showFeedbackModal={showFeedbackModal}
        setShowFeedbackModal={setShowFeedbackModal}
        feedbackName={feedbackName}
        setFeedbackName={setFeedbackName}
        feedbackTitle={feedbackTitle}
        setFeedbackTitle={setFeedbackTitle}
        feedbackDesc={feedbackDesc}
        setFeedbackDesc={setFeedbackDesc}
        feedbackStatus={feedbackStatus}
        setFeedbackStatus={setFeedbackStatus}
      />

      {/* Toast notification */}
      {toastMessage && (
        <div className="autosave-toast">{toastMessage}</div>
      )}
    </div>
  );
}
