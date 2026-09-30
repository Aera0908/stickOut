import { useState } from 'react';
import { MousePointer2, Minus, Square, Type, Paintbrush, Eraser, Image as ImageIcon, Plus, X as XIcon, FunctionSquare, Ruler, Circle, ChevronDown } from 'lucide-react';
import { TOOLS, CMOS_DEVICES, CMOS_CATEGORIES } from '../constants';
import { GATE_PRESETS } from '../cmos/gates';

// Miniature previews for the CMOS palette buttons.
function DeviceGlyph({ kind }) {
  const stroke = 'currentColor';
  if (kind === 'pmos' || kind === 'nmos') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="2" x2="12" y2="6" />
        <path d="M12 6 L16 8 L8 11 L16 14 L8 17 L12 19" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    );
  }
  if (kind === 'capacitor') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="9" />
        <line x1="6" y1="9" x2="18" y2="9" />
        <line x1="6" y1="15" x2="18" y2="15" />
        <line x1="12" y1="15" x2="12" y2="22" />
      </svg>
    );
  }
  if (kind === 'inductor') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="5" />
        <path d="M12 5 C17 5 17 9 12 9 C17 9 17 13 12 13 C17 13 17 17 12 17 C17 17 17 21 12 21" />
        <line x1="12" y1="21" x2="12" y2="22" />
      </svg>
    );
  }
  if (kind === 'diode') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="7" />
        <path d="M6 7 H18 L12 16 Z" />
        <line x1="6" y1="16" x2="18" y2="16" />
        <line x1="12" y1="16" x2="12" y2="22" />
      </svg>
    );
  }
  if (kind === 'esd_diode') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="7" />
        <path d="M6 7 H18 L12 16 Z" />
        <path d="M6 18 V16 H18 V14" />
        <line x1="12" y1="16" x2="12" y2="22" />
      </svg>
    );
  }
  if (kind === 'scr') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="7" />
        <path d="M6 7 H18 L12 16 Z" />
        <line x1="6" y1="16" x2="18" y2="16" />
        <path d="M5 20 L9 16" />
        <line x1="12" y1="16" x2="12" y2="22" />
      </svg>
    );
  }
  if (kind === 'pad') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <rect x="5" y="4" width="14" height="14" rx="2" />
        <circle cx="12" cy="11" r="3" />
        <line x1="12" y1="18" x2="12" y2="22" />
      </svg>
    );
  }
  if (kind === 'vdd') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <line x1="5" y1="7" x2="19" y2="7" />
        <line x1="12" y1="7" x2="12" y2="19" />
      </svg>
    );
  }
  if (kind === 'vss') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <line x1="12" y1="4" x2="12" y2="13" />
        <line x1="5" y1="13" x2="19" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
        <line x1="10.5" y1="20.5" x2="13.5" y2="20.5" />
      </svg>
    );
  }
  if (kind === 'well_tap') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <rect x="4" y="4" width="16" height="16" />
        <line x1="7" y1="7" x2="17" y2="17" />
        <line x1="17" y1="7" x2="7" y2="17" />
      </svg>
    );
  }
  if (kind === 'port') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <path d="M4 6 H14 L20 12 L14 18 H4 Z" />
      </svg>
    );
  }
  return <Circle size={14} />;
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

  if (mode === 'cmos') {
    const categoryOptions = [
      { id: 'all', label: 'All', title: 'All Mixed-Signal Components' },
      ...CMOS_CATEGORIES
    ];
    const currentCategory = categoryOptions.find(c => c.id === cmosCategory) || categoryOptions[0];
    const triggerLabel = cmosCategory === 'all' ? 'ALL' : currentCategory.label.substring(0, 4).toUpperCase();

    return (
      <div className="left-toolbar">
        <button className={`tool-btn ${activeTool === TOOLS.select ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.select)} title="Select (V)"><MousePointer2 size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.line ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.line)} title="Wire (W)"><Minus size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.junction ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.junction)} title="Connection Dot (D)"><Circle size={12} fill="currentColor" /></button>
        <button className={`tool-btn ${activeTool === TOOLS.label ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.label)} title="Label (L / T)"><Type size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.rect ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.rect)} title="Rectangle (Q)"><Square size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.eraser ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.eraser)} title="Eraser (E)"><Eraser size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.measure ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.measure)} title="Ruler / Measure (M)"><Ruler size={18} /></button>
        <button className="tool-btn" onClick={triggerImageImport} title="Import Image"><ImageIcon size={18} /></button>

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
            title={`Filter Component Category: ${currentCategory.title} (Click or hover to change)`}
          >
            <span>{triggerLabel}</span>
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

        <div className="layer-palette-scroll" style={{ alignItems: 'center', marginTop: '4px' }}>
          {/* Active Devices */}
          {(cmosCategory === 'all' || cmosCategory === 'active') && (
            <>
              <div className="palette-divider-label" style={{ fontSize: '6px', marginBottom: '4px', textAlign: 'center' }}>ACTIVE</div>
              {Object.keys(CMOS_DEVICES).filter(k => CMOS_DEVICES[k].category === 'active').map(kind => {
                const armed = activeTool === TOOLS.device && deviceKind === kind;
                return (
                  <button
                    key={kind}
                    className={`tool-btn ${armed ? 'active' : ''}`}
                    title={CMOS_DEVICES[kind].title}
                    onClick={() => armCmosDevice && armCmosDevice(kind)}
                    style={{ marginBottom: '4px' }}
                  >
                    <DeviceGlyph kind={kind} />
                  </button>
                );
              })}
            </>
          )}

          {/* Passive Devices */}
          {(cmosCategory === 'all' || cmosCategory === 'passive') && (
            <>
              <div className="palette-divider-label" style={{ fontSize: '6px', marginTop: cmosCategory === 'all' ? '6px' : '0', marginBottom: '4px', textAlign: 'center' }}>PASSIVE</div>
              {Object.keys(CMOS_DEVICES).filter(k => CMOS_DEVICES[k].category === 'passive').map(kind => {
                const armed = activeTool === TOOLS.device && deviceKind === kind;
                return (
                  <button
                    key={kind}
                    className={`tool-btn ${armed ? 'active' : ''}`}
                    title={CMOS_DEVICES[kind].title}
                    onClick={() => armCmosDevice && armCmosDevice(kind)}
                    style={{ marginBottom: '4px' }}
                  >
                    <DeviceGlyph kind={kind} />
                  </button>
                );
              })}
            </>
          )}

          {/* Protection & Interface Devices */}
          {(cmosCategory === 'all' || cmosCategory === 'protect') && (
            <>
              <div className="palette-divider-label" style={{ fontSize: '6px', marginTop: cmosCategory === 'all' ? '6px' : '0', marginBottom: '4px', textAlign: 'center' }}>PROTECT</div>
              {Object.keys(CMOS_DEVICES).filter(k => CMOS_DEVICES[k].category === 'protect').map(kind => {
                const armed = activeTool === TOOLS.device && deviceKind === kind;
                return (
                  <button
                    key={kind}
                    className={`tool-btn ${armed ? 'active' : ''}`}
                    title={CMOS_DEVICES[kind].title}
                    onClick={() => armCmosDevice && armCmosDevice(kind)}
                    style={{ marginBottom: '4px' }}
                  >
                    <DeviceGlyph kind={kind} />
                  </button>
                );
              })}
            </>
          )}

          {/* Power & References */}
          {(cmosCategory === 'all' || cmosCategory === 'power') && (
            <>
              <div className="palette-divider-label" style={{ fontSize: '6px', marginTop: cmosCategory === 'all' ? '6px' : '0', marginBottom: '4px', textAlign: 'center' }}>POWER</div>
              {Object.keys(CMOS_DEVICES).filter(k => CMOS_DEVICES[k].category === 'power').map(kind => {
                const armed = activeTool === TOOLS.device && deviceKind === kind;
                return (
                  <button
                    key={kind}
                    className={`tool-btn ${armed ? 'active' : ''}`}
                    title={CMOS_DEVICES[kind].title}
                    onClick={() => armCmosDevice && armCmosDevice(kind)}
                    style={{ marginBottom: '4px' }}
                  >
                    <DeviceGlyph kind={kind} />
                  </button>
                );
              })}
            </>
          )}

          {/* Logic Gate Presets */}
          {(cmosCategory === 'all' || cmosCategory === 'gates') && (
            <>
              <div className="palette-divider-label" style={{ fontSize: '6px', marginTop: cmosCategory === 'all' ? '6px' : '0', marginBottom: '4px', textAlign: 'center' }}>GATES</div>
              {GATE_PRESETS.map(gate => (
                <button
                  key={gate.id}
                  className="tool-btn gate-preset-btn"
                  title={gate.title}
                  onClick={() => insertGatePreset && insertGatePreset(gate.id)}
                  style={{ marginBottom: '4px', fontSize: '9px', fontWeight: 700, letterSpacing: '-0.02em' }}
                >
                  {gate.label}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'floorplan') {
    const fpItems = [
      { kind: 'boundary', label: 'Chip Boundary', color: 'transparent', border: 'var(--text-primary)', text: 'BND' },
      { kind: 'block',    label: 'Block',         color: 'transparent', border: 'var(--text-primary)', text: 'BLK' },
      { kind: 'input',    label: 'Input Pin',     color: '#C8E6C9',     border: '#2E7D32',            text: 'IN' },
      { kind: 'output',   label: 'Output Pin',    color: '#BBDEFB',     border: '#1565C0',            text: 'OUT' },
      { kind: 'power',    label: 'Power Pin',     color: '#FFE0B2',     border: '#EF6C00',            text: 'VDD' },
      { kind: 'ground',   label: 'Ground Pin',    color: '#FFF9C4',     border: '#F9A825',            text: 'VSS' },
    ];
    return (
      <div className="left-toolbar">
        <button className={`tool-btn ${activeTool === TOOLS.select ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.select)} title="Select (V)"><MousePointer2 size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.rect ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.rect)} title="Rectangle (Q)"><Square size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.line ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.line)} title="Power/Ground Line (W)"><Minus size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.label ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.label)} title="Label (L / T)"><Type size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.eraser ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.eraser)} title="Eraser (E)"><Eraser size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.measure ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.measure)} title="Ruler / Measure (M)"><Ruler size={18} /></button>
        <button className="tool-btn" onClick={triggerImageImport} title="Import Image"><ImageIcon size={18} /></button>

        <div className="toolbar-divider" />

        <div className="layer-palette-scroll" style={{ alignItems: 'center' }}>
          <div className="palette-divider-label" style={{ fontSize: '6px', marginBottom: '4px' }}>INSERT</div>
          {fpItems.map(item => (
            <button
              key={item.kind}
              className="fp-insert-btn"
              title={item.label}
              onClick={() => insertFloorplanShape && insertFloorplanShape(item.kind)}
              style={{ width: '30px', height: '30px', marginBottom: '6px', borderRadius: '2px', border: '1px solid var(--ui-border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
            >
              <span style={{
                width: '24px', height: '18px', borderRadius: '2px',
                background: item.color === 'transparent' ? 'transparent' : item.color,
                border: `1.5px solid ${item.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '7px', fontWeight: 'bold',
                color: item.color === 'transparent' ? 'var(--text-primary)' : '#111'
              }}>{item.text}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="left-toolbar">
      <button className={`tool-btn ${activeTool === TOOLS.select ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.select); }} title="Select (V)"><MousePointer2 size={18} /></button>
      <button className={`tool-btn ${activeTool === TOOLS.line ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.line); }} title="Wire / Line (W)"><Minus size={18} /></button>
      <div className="via-tool-wrapper" onMouseEnter={() => setShowContactSubmenu(true)} onMouseLeave={() => setShowContactSubmenu(false)} style={{ position: 'relative' }}>
        <button className={`tool-btn ${activeTool === TOOLS.contact ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.contact); }} title="Contact (P)">
          {contactShape === 'x' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ display: 'block' }}>
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'block' }}>
              <circle cx="12" cy="12" r="9"></circle>
              <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"></circle>
            </svg>
          )}
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
      <button className={`tool-btn ${activeTool === TOOLS.rect ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.rect); }} title="Rectangle (Q)"><Square size={18} /></button>
      <button className={`tool-btn ${activeTool === TOOLS.label ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.label); }} title="Label (L / T)"><Type size={18} /></button>
      <button className={`tool-btn ${activeTool === TOOLS.brush ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.brush); }} title="Brush (B)"><Paintbrush size={18} /></button>
      <button className={`tool-btn ${activeTool === TOOLS.eraser ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.eraser); }} title="Eraser (E)"><Eraser size={18} /></button>
      <button className={`tool-btn ${activeTool === TOOLS.measure ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.measure); }} title="Ruler / Measure (M)"><Ruler size={18} /></button>
      <button className="tool-btn" onClick={triggerImageImport} title="Import Image"><ImageIcon size={18} /></button>
      <button className="tool-btn" onClick={openBooleanModal} title="Generate from Boolean Expression"><FunctionSquare size={18} /></button>

      <div className="toolbar-divider" />

      {/* Layer Palette (Color grid stack, text labels removed) */}
      <div className="layer-palette-scroll" style={{ alignItems: 'center' }}>
        {paletteItems.map(item => (
          <div key={item.id}
            className={`palette-row ${activeLayerId === item.id ? 'active' : ''}`}
            onClick={() => selectLayerFromPalette(item.id)}
            title={item.label}
            style={{
              position: 'relative',
              width: '28px',
              height: '28px',
              borderRadius: '2px',
              border: '1px solid var(--ui-border)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              marginBottom: '4px',
              background: activeLayerId === item.id ? 'var(--accent)' : 'var(--ui-bg)',
              boxSizing: 'border-box'
            }}
          >
            <span className="palette-swatch" style={{
              backgroundColor: customLayerColors[item.id] || item.hex,
              width: '20px',
              height: '20px',
              borderRadius: '2px',
              border: '1px solid rgba(0,0,0,0.15)'
            }} />

            {item.isDynamic && (
              <button className="palette-remove-btn" onClick={(e) => { e.stopPropagation(); removeMetalLayer(item.id); }} title="Remove">
                <XIcon size={8} />
              </button>
            )}
          </div>
        ))}
        
        <button className="palette-add-metal-btn" onClick={addMetalLayer} title="Add Metal Layer" style={{ padding: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={12} />
        </button>

        {/* Custom layers divider */}
        {customCanvasLayers.length > 0 && (
          <>
            <div className="palette-divider-label" style={{ fontSize: '6px', marginTop: '8px', marginBottom: '4px' }}>CST</div>
            {customCanvasLayers.map(cl => (
              <div key={cl.id}
                className={`palette-row ${activeCanvasLayerId === cl.id ? 'active' : ''}`}
                onClick={() => { setActiveCanvasLayerId(cl.id); }}
                title={cl.name}
                style={{
                  position: 'relative',
                  width: '28px',
                  height: '28px',
                  borderRadius: '4px',
                  border: '1px solid var(--ui-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  marginBottom: '4px',
                  background: activeCanvasLayerId === cl.id ? 'var(--accent)' : 'var(--ui-bg)',
                  boxSizing: 'border-box'
                }}
              >
                <span className="palette-swatch" style={{
                  backgroundColor: cl.color,
                  width: '20px',
                  height: '20px',
                  borderRadius: '2px',
                  border: '1px solid rgba(0,0,0,0.15)'
                }} />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
