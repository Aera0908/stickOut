import { useState, useRef, useCallback } from 'react';
import {
  MousePointer2,
  Minus,
  Square,
  Type,
  Paintbrush,
  Eraser,
  Image as ImageIcon,
  Plus,
  X as XIcon,
  FunctionSquare,
  Ruler,
  Circle,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { TOOLS, CMOS_DEVICES, CMOS_CATEGORIES } from '../constants';
import { GATE_PRESETS } from '../cmos/gates';

// Miniature previews for the CMOS palette buttons.
function DeviceGlyph({ kind }) {
  const stroke = 'currentColor';
  if (kind === 'pmos' || kind === 'nmos') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <line x1="2" y1="12" x2={kind === 'pmos' ? '6.4' : '9'} y2="12" />
        {kind === 'pmos' && <circle cx="7.7" cy="12" r="1.3" />}
        <line x1="9" y1="6" x2="9" y2="18" />
        <line x1="12" y1="6" x2="12" y2="18" />
        <path d="M12 6 H17 V2" />
        <path d="M12 18 H17 V22" />
      </svg>
    );
  }
  if (kind === 'tgate') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <line x1="2" y1="12" x2="6" y2="12" />
        <path d="M6 12 L9 6 H15 L18 12" />
        <path d="M6 12 L9 18 H15 L18 12" />
        <line x1="18" y1="12" x2="22" y2="12" />
        <circle cx="12" cy="4" r="1.2" />
        <line x1="12" y1="2" x2="12" y2="2.8" />
        <line x1="12" y1="18" x2="12" y2="22" />
      </svg>
    );
  }
  if (kind === 'bjt') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <line x1="3" y1="12" x2="8" y2="12" />
        <line x1="8" y1="5" x2="8" y2="19" />
        <line x1="8" y1="8" x2="16" y2="3" />
        <line x1="8" y1="16" x2="16" y2="21" />
        <path d="M13 18 L16 21 L13 22" fill={stroke} />
      </svg>
    );
  }
  if (kind === 'varactor') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <line x1="12" y1="2" x2="12" y2="8" />
        <line x1="6" y1="8" x2="18" y2="8" />
        <line x1="6" y1="12" x2="18" y2="12" />
        <line x1="12" y1="12" x2="12" y2="22" />
        <line x1="5" y1="19" x2="19" y2="5" />
        <path d="M15 5 H19 V9" />
      </svg>
    );
  }
  if (kind === 'resistor') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <line x1="12" y1="2" x2="12" y2="6" />
        <path d="M12 6 L16 8 L8 11 L16 14 L8 17 L12 19" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    );
  }
  if (kind === 'capacitor') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <line x1="12" y1="2" x2="12" y2="9" />
        <line x1="6" y1="9" x2="18" y2="9" />
        <line x1="6" y1="15" x2="18" y2="15" />
        <line x1="12" y1="15" x2="12" y2="22" />
      </svg>
    );
  }
  if (kind === 'inductor') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <line x1="12" y1="2" x2="12" y2="5" />
        <path d="M12 5 C17 5 17 9 12 9 C17 9 17 13 12 13 C17 13 17 17 12 17 C17 17 17 21 12 21" />
        <line x1="12" y1="21" x2="12" y2="22" />
      </svg>
    );
  }
  if (kind === 'diode') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <line x1="12" y1="2" x2="12" y2="7" />
        <path d="M6 7 H18 L12 16 Z" />
        <line x1="6" y1="16" x2="18" y2="16" />
        <line x1="12" y1="16" x2="12" y2="22" />
      </svg>
    );
  }
  if (kind === 'esd_diode') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <line x1="12" y1="2" x2="12" y2="7" />
        <path d="M6 7 H18 L12 16 Z" />
        <path d="M6 18 V16 H18 V14" />
        <line x1="12" y1="16" x2="12" y2="22" />
      </svg>
    );
  }
  if (kind === 'scr') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <line x1="12" y1="2" x2="12" y2="7" />
        <path d="M6 7 H18 L12 16 Z" />
        <line x1="6" y1="16" x2="18" y2="16" />
        <line x1="12" y1="16" x2="12" y2="22" />
        <path d="M9 13.5 L4 17" />
      </svg>
    );
  }
  if (kind === 'pad') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (kind === 'well_tap') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <rect x="5" y="5" width="14" height="14" />
        <line x1="8" y1="8" x2="16" y2="16" />
        <line x1="16" y1="8" x2="8" y2="16" />
      </svg>
    );
  }
  if (kind === 'port') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <path d="M4 6 H14 L20 12 L14 18 H4 Z" />
      </svg>
    );
  }
  return <Circle size={14} style={{ flexShrink: 0 }} />;
}

export default function Toolbar({
  mode = 'stick',
  insertFloorplanShape,
  armCmosDevice,
  insertGatePreset,
  deviceKind,
  activeTool,
  setActiveTool,
  contactShape,
  setContactShape,
  showContactSubmenu,
  setShowContactSubmenu,
  activeLayerId,
  selectLayerFromPalette,
  customLayerColors,
  paletteItems,
  removeMetalLayer,
  addMetalLayer,
  customCanvasLayers,
  activeCanvasLayerId,
  setActiveCanvasLayerId,
  triggerImageImport,
  openBooleanModal
}) {
  const [cmosCategory, setCmosCategory] = useState('all');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  // Expanded and Resizing state (persisted to localStorage)
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      return localStorage.getItem('stickout_toolbar_expanded') === 'true';
    } catch {
      return false;
    }
  });

  const [toolbarWidth, setToolbarWidth] = useState(() => {
    try {
      const isExp = localStorage.getItem('stickout_toolbar_expanded') === 'true';
      const saved = parseInt(localStorage.getItem('stickout_toolbar_width'), 10);
      if (!isNaN(saved) && saved >= 48) {
        return isExp ? Math.max(120, saved) : 48;
      }
      return isExp ? 180 : 48;
    } catch {
      return 48;
    }
  });

  const [isDraggingResizer, setIsDraggingResizer] = useState(false);
  const dragStartRef = useRef({ x: 0, w: 48 });

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => {
      const next = !prev;
      let nextWidth;
      if (next) {
        const saved = parseInt(localStorage.getItem('stickout_toolbar_width'), 10);
        nextWidth = (!isNaN(saved) && saved >= 120) ? saved : 180;
      } else {
        nextWidth = 48;
      }
      setToolbarWidth(nextWidth);
      try {
        localStorage.setItem('stickout_toolbar_expanded', String(next));
        if (next) localStorage.setItem('stickout_toolbar_width', String(nextWidth));
      } catch {}
      setTimeout(() => window.dispatchEvent(new Event('resize')), 20);
      return next;
    });
  }, []);

  const handleResizerMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingResizer(true);
    dragStartRef.current = { x: e.clientX, w: toolbarWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (me) => {
      const delta = me.clientX - dragStartRef.current.x;
      let newW = dragStartRef.current.w + delta;
      if (newW < 75) {
        newW = 48;
        setIsExpanded(false);
      } else {
        newW = Math.min(320, Math.max(90, newW));
        setIsExpanded(true);
      }
      setToolbarWidth(newW);
      window.dispatchEvent(new Event('resize'));
    };

    const onMouseUp = () => {
      setIsDraggingResizer(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      setToolbarWidth(cur => {
        try {
          localStorage.setItem('stickout_toolbar_width', String(cur));
          localStorage.setItem('stickout_toolbar_expanded', String(cur >= 75));
        } catch {}
        return cur;
      });
      window.dispatchEvent(new Event('resize'));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [toolbarWidth]);

  // Render CMOS Schematic toolbar
  if (mode === 'cmos') {
    const categoryOptions = [
      { id: 'all', label: 'All', title: 'All Mixed-Signal Components' },
      ...CMOS_CATEGORIES
    ];
    const currentCategory = categoryOptions.find(c => c.id === cmosCategory) || categoryOptions[0];
    const triggerLabel = cmosCategory === 'all' ? 'ALL' : currentCategory.label.substring(0, 4).toUpperCase();

    return (
      <div
        className={`left-toolbar ${isExpanded ? 'expanded' : ''}`}
        style={{ width: `${toolbarWidth}px`, minWidth: `${toolbarWidth}px` }}
      >
        {/* Header with expand / collapse toggle */}
        <div className="toolbar-header">
          {isExpanded && <span className="toolbar-header-title">CMOS PALETTE</span>}
          <button
            className="toolbar-toggle-btn"
            onClick={toggleExpanded}
            title={isExpanded ? "Collapse toolbar" : "Expand toolbar"}
          >
            {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        <button className={`tool-btn ${activeTool === TOOLS.select ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.select)} title="Select (V)">
          <MousePointer2 size={16} />
          {isExpanded && <span className="tool-btn-label">Select (V)</span>}
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.line ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.line)} title="Wire (W)">
          <Minus size={16} />
          {isExpanded && <span className="tool-btn-label">Wire (W)</span>}
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.junction ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.junction)} title="Connection Dot (D)">
          <Circle size={10} fill="currentColor" />
          {isExpanded && <span className="tool-btn-label">Dot (D)</span>}
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.label ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.label)} title="Label (L / T)">
          <Type size={16} />
          {isExpanded && <span className="tool-btn-label">Label (L)</span>}
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.rect ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.rect)} title="Rectangle (Q)">
          <Square size={16} />
          {isExpanded && <span className="tool-btn-label">Rectangle (Q)</span>}
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.eraser ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.eraser)} title="Eraser (E)">
          <Eraser size={16} />
          {isExpanded && <span className="tool-btn-label">Eraser (E)</span>}
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.measure ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.measure)} title="Ruler / Measure (M)">
          <Ruler size={16} />
          {isExpanded && <span className="tool-btn-label">Measure (M)</span>}
        </button>
        <button className="tool-btn" onClick={triggerImageImport} title="Import Image">
          <ImageIcon size={16} />
          {isExpanded && <span className="tool-btn-label">Import Image</span>}
        </button>

        <div className="toolbar-divider" />

        {/* Category Filter Selector with Flyout Menu */}
        <div
          className="cmos-category-wrapper"
          onMouseEnter={() => setShowCategoryMenu(true)}
          onMouseLeave={() => setShowCategoryMenu(false)}
        >
          <button
            className={`cmos-cat-trigger ${cmosCategory !== 'all' ? 'active' : ''}`}
            onClick={() => setShowCategoryMenu(prev => !prev)}
            title={`Filter Component Category: ${currentCategory.title}`}
          >
            <span>{isExpanded ? currentCategory.label : triggerLabel}</span>
            <ChevronDown size={8} style={{ opacity: 0.8 }} />
          </button>

          {showCategoryMenu && (
            <div className="cmos-cat-popup">
              <div style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px 4px' }}>
                Filter Library
              </div>
              {categoryOptions.map(cat => (
                <button
                  key={cat.id}
                  className={`cmos-cat-popup-item ${cmosCategory === cat.id ? 'active' : ''}`}
                  onClick={() => {
                    setCmosCategory(cat.id);
                    setShowCategoryMenu(false);
                  }}
                >
                  <span>{cat.title}</span>
                  {cmosCategory === cat.id && <span style={{ fontSize: '10px' }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="layer-palette-scroll" style={{ marginTop: '4px' }}>
          {/* Active Devices */}
          {(cmosCategory === 'all' || cmosCategory === 'active') && (
            <>
              <div className="palette-divider-label" style={{ fontSize: '8px', marginBottom: '4px', textAlign: isExpanded ? 'left' : 'center', width: '100%', paddingLeft: isExpanded ? '4px' : 0 }}>ACTIVE</div>
              {Object.keys(CMOS_DEVICES).filter(k => CMOS_DEVICES[k].category === 'active').map(kind => {
                const armed = activeTool === TOOLS.device && deviceKind === kind;
                const dev = CMOS_DEVICES[kind];
                return (
                  <button
                    key={kind}
                    className={`tool-btn ${armed ? 'active' : ''}`}
                    title={dev.title}
                    onClick={() => armCmosDevice && armCmosDevice(kind)}
                    style={{ marginBottom: '4px' }}
                  >
                    <DeviceGlyph kind={kind} />
                    {isExpanded && <span className="tool-btn-label">{dev.label || dev.title}</span>}
                  </button>
                );
              })}
            </>
          )}

          {/* Passive Devices */}
          {(cmosCategory === 'all' || cmosCategory === 'passive') && (
            <>
              <div className="palette-divider-label" style={{ fontSize: '8px', marginTop: cmosCategory === 'all' ? '6px' : '0', marginBottom: '4px', textAlign: isExpanded ? 'left' : 'center', width: '100%', paddingLeft: isExpanded ? '4px' : 0 }}>PASSIVE</div>
              {Object.keys(CMOS_DEVICES).filter(k => CMOS_DEVICES[k].category === 'passive').map(kind => {
                const armed = activeTool === TOOLS.device && deviceKind === kind;
                const dev = CMOS_DEVICES[kind];
                return (
                  <button
                    key={kind}
                    className={`tool-btn ${armed ? 'active' : ''}`}
                    title={dev.title}
                    onClick={() => armCmosDevice && armCmosDevice(kind)}
                    style={{ marginBottom: '4px' }}
                  >
                    <DeviceGlyph kind={kind} />
                    {isExpanded && <span className="tool-btn-label">{dev.label || dev.title}</span>}
                  </button>
                );
              })}
            </>
          )}

          {/* Protection & Interface Devices */}
          {(cmosCategory === 'all' || cmosCategory === 'protect') && (
            <>
              <div className="palette-divider-label" style={{ fontSize: '8px', marginTop: cmosCategory === 'all' ? '6px' : '0', marginBottom: '4px', textAlign: isExpanded ? 'left' : 'center', width: '100%', paddingLeft: isExpanded ? '4px' : 0 }}>PROTECT</div>
              {Object.keys(CMOS_DEVICES).filter(k => CMOS_DEVICES[k].category === 'protect').map(kind => {
                const armed = activeTool === TOOLS.device && deviceKind === kind;
                const dev = CMOS_DEVICES[kind];
                return (
                  <button
                    key={kind}
                    className={`tool-btn ${armed ? 'active' : ''}`}
                    title={dev.title}
                    onClick={() => armCmosDevice && armCmosDevice(kind)}
                    style={{ marginBottom: '4px' }}
                  >
                    <DeviceGlyph kind={kind} />
                    {isExpanded && <span className="tool-btn-label">{dev.label || dev.title}</span>}
                  </button>
                );
              })}
            </>
          )}

          {/* Power & References */}
          {(cmosCategory === 'all' || cmosCategory === 'power') && (
            <>
              <div className="palette-divider-label" style={{ fontSize: '8px', marginTop: cmosCategory === 'all' ? '6px' : '0', marginBottom: '4px', textAlign: isExpanded ? 'left' : 'center', width: '100%', paddingLeft: isExpanded ? '4px' : 0 }}>POWER</div>
              {Object.keys(CMOS_DEVICES).filter(k => CMOS_DEVICES[k].category === 'power').map(kind => {
                const armed = activeTool === TOOLS.device && deviceKind === kind;
                const dev = CMOS_DEVICES[kind];
                return (
                  <button
                    key={kind}
                    className={`tool-btn ${armed ? 'active' : ''}`}
                    title={dev.title}
                    onClick={() => armCmosDevice && armCmosDevice(kind)}
                    style={{ marginBottom: '4px' }}
                  >
                    <DeviceGlyph kind={kind} />
                    {isExpanded && <span className="tool-btn-label">{dev.label || dev.title}</span>}
                  </button>
                );
              })}
            </>
          )}

          {/* Logic Gate Presets */}
          {(cmosCategory === 'all' || cmosCategory === 'gates') && (
            <>
              <div className="palette-divider-label" style={{ fontSize: '8px', marginTop: cmosCategory === 'all' ? '6px' : '0', marginBottom: '4px', textAlign: isExpanded ? 'left' : 'center', width: '100%', paddingLeft: isExpanded ? '4px' : 0 }}>GATES</div>
              {GATE_PRESETS.map(gate => (
                <button
                  key={gate.id}
                  className="tool-btn gate-preset-btn"
                  title={gate.title}
                  onClick={() => insertGatePreset && insertGatePreset(gate.id)}
                  style={{ marginBottom: '4px', fontSize: '9px', fontWeight: 700, letterSpacing: '-0.02em' }}
                >
                  <span>{gate.label}</span>
                  {isExpanded && <span className="tool-btn-label" style={{ fontSize: '10px' }}>{gate.title}</span>}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Draggable Resizer Edge */}
        <div
          className={`toolbar-resizer ${isDraggingResizer ? 'dragging' : ''}`}
          onMouseDown={handleResizerMouseDown}
          onDoubleClick={toggleExpanded}
          title="Drag to resize toolbar (double-click to toggle)"
        />
      </div>
    );
  }

  // Render Floorplan mode toolbar
  if (mode === 'floorplan') {
    const fpItems = [
      { kind: 'boundary', label: 'Chip Boundary', color: 'transparent', border: 'var(--text-primary)', text: 'BND' },
      { kind: 'block',    label: 'Macro Block',   color: 'transparent', border: 'var(--text-primary)', text: 'BLK' },
      { kind: 'input',    label: 'Input Pin',     color: '#C8E6C9',     border: '#2E7D32',            text: 'IN' },
      { kind: 'output',   label: 'Output Pin',    color: '#BBDEFB',     border: '#1565C0',            text: 'OUT' },
      { kind: 'power',    label: 'Power Pin (VDD)', color: '#FFE0B2',   border: '#EF6C00',            text: 'VDD' },
      { kind: 'ground',   label: 'Ground Pin (VSS)', color: '#FFF9C4',  border: '#F9A825',            text: 'VSS' },
    ];
    return (
      <div
        className={`left-toolbar ${isExpanded ? 'expanded' : ''}`}
        style={{ width: `${toolbarWidth}px`, minWidth: `${toolbarWidth}px` }}
      >
        {/* Header with expand / collapse toggle */}
        <div className="toolbar-header">
          {isExpanded && <span className="toolbar-header-title">FLOORPLAN</span>}
          <button
            className="toolbar-toggle-btn"
            onClick={toggleExpanded}
            title={isExpanded ? "Collapse toolbar" : "Expand toolbar"}
          >
            {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        <button className={`tool-btn ${activeTool === TOOLS.select ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.select)} title="Select (V)">
          <MousePointer2 size={16} />
          {isExpanded && <span className="tool-btn-label">Select (V)</span>}
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.rect ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.rect)} title="Rectangle (Q)">
          <Square size={16} />
          {isExpanded && <span className="tool-btn-label">Rectangle (Q)</span>}
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.line ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.line)} title="Power/Ground Line (W)">
          <Minus size={16} />
          {isExpanded && <span className="tool-btn-label">Power/Ground (W)</span>}
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.label ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.label)} title="Label (L / T)">
          <Type size={16} />
          {isExpanded && <span className="tool-btn-label">Label (L)</span>}
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.eraser ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.eraser)} title="Eraser (E)">
          <Eraser size={16} />
          {isExpanded && <span className="tool-btn-label">Eraser (E)</span>}
        </button>
        <button className={`tool-btn ${activeTool === TOOLS.measure ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.measure)} title="Ruler / Measure (M)">
          <Ruler size={16} />
          {isExpanded && <span className="tool-btn-label">Measure (M)</span>}
        </button>
        <button className="tool-btn" onClick={triggerImageImport} title="Import Image">
          <ImageIcon size={16} />
          {isExpanded && <span className="tool-btn-label">Import Image</span>}
        </button>

        <div className="toolbar-divider" />

        <div className="layer-palette-scroll">
          <div className="palette-divider-label" style={{ fontSize: '8px', marginBottom: '4px', width: '100%', textAlign: isExpanded ? 'left' : 'center', paddingLeft: isExpanded ? '4px' : 0 }}>
            {isExpanded ? 'INSERT SHAPES' : 'SHAPES'}
          </div>
          {fpItems.map(item => (
            <button
              key={item.kind}
              className="fp-insert-btn"
              title={item.label}
              onClick={() => insertFloorplanShape && insertFloorplanShape(item.kind)}
              style={{
                width: isExpanded ? '100%' : '30px',
                height: '30px',
                marginBottom: '6px',
                borderRadius: '2px',
                border: '1px solid var(--ui-border)',
                background: 'var(--surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isExpanded ? 'flex-start' : 'center',
                padding: isExpanded ? '0 6px' : 0,
                gap: isExpanded ? '8px' : 0,
                cursor: 'pointer'
              }}
            >
              <span style={{
                width: '24px',
                height: '18px',
                minWidth: '24px',
                borderRadius: '2px',
                background: item.color === 'transparent' ? 'transparent' : item.color,
                border: `1.5px solid ${item.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '7px',
                fontWeight: 'bold',
                color: item.color === 'transparent' ? 'var(--text-primary)' : '#111'
              }}>{item.text}</span>
              {isExpanded && (
                <span className="fp-btn-label">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Draggable Resizer Edge */}
        <div
          className={`toolbar-resizer ${isDraggingResizer ? 'dragging' : ''}`}
          onMouseDown={handleResizerMouseDown}
          onDoubleClick={toggleExpanded}
          title="Drag to resize toolbar (double-click to toggle)"
        />
      </div>
    );
  }

  // Render Stick Diagram Mode (Default)
  return (
    <div
      className={`left-toolbar ${isExpanded ? 'expanded' : ''}`}
      style={{ width: `${toolbarWidth}px`, minWidth: `${toolbarWidth}px` }}
    >
      {/* Header with expand / collapse toggle */}
      <div className="toolbar-header">
        {isExpanded && <span className="toolbar-header-title">VLSI TOOLS</span>}
        <button
          className="toolbar-toggle-btn"
          onClick={toggleExpanded}
          title={isExpanded ? "Collapse toolbar" : "Expand toolbar (show layer names)"}
        >
          {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Tool Buttons */}
      <button className={`tool-btn ${activeTool === TOOLS.select ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.select); }} title="Select (V)">
        <MousePointer2 size={16} />
        {isExpanded && <span className="tool-btn-label">Select (V)</span>}
      </button>

      <button className={`tool-btn ${activeTool === TOOLS.line ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.line); }} title="Wire / Line (W)">
        <Minus size={16} />
        {isExpanded && <span className="tool-btn-label">Wire (W)</span>}
      </button>

      <div className="via-tool-wrapper" onMouseEnter={() => setShowContactSubmenu(true)} onMouseLeave={() => setShowContactSubmenu(false)}>
        <button className={`tool-btn ${activeTool === TOOLS.contact ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.contact); }} title="Contact (P)">
          {contactShape === 'x' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ display: 'block', flexShrink: 0 }}>
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'block', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="9"></circle>
              <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"></circle>
            </svg>
          )}
          {isExpanded && <span className="tool-btn-label">Contact ({contactShape === 'x' ? 'X' : 'Square'})</span>}
        </button>
        {showContactSubmenu && (
          <div className="via-submenu-popup">
            <button className={`via-submenu-btn ${contactShape === 'x' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setContactShape('x'); setActiveTool(TOOLS.contact); }} title="X Style">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <button className={`via-submenu-btn ${contactShape === 'square' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setContactShape('square'); setActiveTool(TOOLS.contact); }} title="Square Style">
              <div style={{ width: '10px', height: '10px', border: '2px solid currentColor', borderRadius: '1.5px' }} />
            </button>
          </div>
        )}
      </div>

      <button className={`tool-btn ${activeTool === TOOLS.rect ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.rect); }} title="Rectangle (Q)">
        <Square size={16} />
        {isExpanded && <span className="tool-btn-label">Rectangle (Q)</span>}
      </button>

      <button className={`tool-btn ${activeTool === TOOLS.label ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.label); }} title="Label (L / T)">
        <Type size={16} />
        {isExpanded && <span className="tool-btn-label">Label (L)</span>}
      </button>

      <button className={`tool-btn ${activeTool === TOOLS.brush ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.brush); }} title="Brush (B)">
        <Paintbrush size={16} />
        {isExpanded && <span className="tool-btn-label">Brush (B)</span>}
      </button>

      <button className={`tool-btn ${activeTool === TOOLS.eraser ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.eraser); }} title="Eraser (E)">
        <Eraser size={16} />
        {isExpanded && <span className="tool-btn-label">Eraser (E)</span>}
      </button>

      <button className={`tool-btn ${activeTool === TOOLS.measure ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.measure); }} title="Ruler / Measure (M)">
        <Ruler size={16} />
        {isExpanded && <span className="tool-btn-label">Measure (M)</span>}
      </button>

      <button className="tool-btn" onClick={triggerImageImport} title="Import Image">
        <ImageIcon size={16} />
        {isExpanded && <span className="tool-btn-label">Import Image</span>}
      </button>

      <button className="tool-btn" onClick={openBooleanModal} title="Generate from Boolean Expression">
        <FunctionSquare size={16} />
        {isExpanded && <span className="tool-btn-label">Boolean Synth</span>}
      </button>

      <div className="toolbar-divider" />

      {/* Layer Palette (Shows colored button + layer name when expanded) */}
      <div className="layer-palette-scroll">
        {isExpanded && (
          <div className="palette-section-header">
            <span>VLSI LAYERS</span>
          </div>
        )}

        {paletteItems.map(item => {
          const isSelected = activeLayerId === item.id;
          const swatchColor = customLayerColors[item.id] || item.hex;
          return (
            <div
              key={item.id}
              className={`palette-row ${isSelected ? 'active' : ''}`}
              onClick={() => selectLayerFromPalette(item.id)}
              title={item.label}
            >
              <span
                className="palette-swatch"
                style={{
                  backgroundColor: swatchColor,
                }}
              />

              {isExpanded && (
                <span className="palette-layer-name">
                  {item.label}
                </span>
              )}

              {item.isDynamic && (
                <button
                  className="palette-remove-btn"
                  onClick={(e) => { e.stopPropagation(); removeMetalLayer(item.id); }}
                  title="Remove Metal Layer"
                >
                  <XIcon size={8} />
                </button>
              )}
            </div>
          );
        })}
        
        <button
          className="palette-add-metal-btn"
          onClick={addMetalLayer}
          title="Add Metal Layer"
        >
          <Plus size={12} />
          {isExpanded && <span>Add Metal Layer</span>}
        </button>

        {/* Custom layers divider */}
        {customCanvasLayers.length > 0 && (
          <>
            <div className="palette-divider-label" style={{ fontSize: '8px', marginTop: '8px', marginBottom: '4px', width: '100%', textAlign: isExpanded ? 'left' : 'center', paddingLeft: isExpanded ? '4px' : 0 }}>
              {isExpanded ? 'CUSTOM LAYERS' : 'CST'}
            </div>
            {customCanvasLayers.map(cl => {
              const isSelected = activeCanvasLayerId === cl.id;
              return (
                <div
                  key={cl.id}
                  className={`palette-row ${isSelected ? 'active' : ''}`}
                  onClick={() => { setActiveCanvasLayerId(cl.id); }}
                  title={cl.name}
                >
                  <span
                    className="palette-swatch"
                    style={{
                      backgroundColor: cl.color,
                    }}
                  />
                  {isExpanded && (
                    <span className="palette-layer-name">
                      {cl.name}
                    </span>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Draggable Resizer Edge */}
      <div
        className={`toolbar-resizer ${isDraggingResizer ? 'dragging' : ''}`}
        onMouseDown={handleResizerMouseDown}
        onDoubleClick={toggleExpanded}
        title="Drag to resize toolbar (double-click to toggle)"
      />
    </div>
  );
}
