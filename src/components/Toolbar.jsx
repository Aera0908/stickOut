import { MousePointer2, Minus, Square, Type, Paintbrush, Eraser, Image as ImageIcon, Plus, Pencil, X as XIcon, FunctionSquare, Ruler, Circle } from 'lucide-react';
import { TOOLS, CMOS_DEVICES } from '../constants';
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
  if (kind === 'vdd') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
        <line x1="5" y1="7" x2="19" y2="7" />
        <line x1="12" y1="7" x2="12" y2="19" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
      <line x1="12" y1="4" x2="12" y2="13" />
      <line x1="5" y1="13" x2="19" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="10.5" y1="20.5" x2="13.5" y2="20.5" />
    </svg>
  );
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
  setCustomLayerColors,
  paletteItems,
  removeMetalLayer,
  addMetalLayer,
  customCanvasLayers,
  activeCanvasLayerId,
  setActiveCanvasLayerId,
  triggerImageImport,
  openBooleanModal
}) {
  if (mode === 'cmos') {
    return (
      <div className="left-toolbar">
        <button className={`tool-btn ${activeTool === TOOLS.select ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.select)} title="Select (V)"><MousePointer2 size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.line ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.line)} title="Wire (W)"><Minus size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.junction ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.junction)} title="Connection Dot (D)"><Circle size={12} fill="currentColor" /></button>
        <button className={`tool-btn ${activeTool === TOOLS.label ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.label)} title="Label (L / T)"><Type size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.rect ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.rect)} title="Rectangle (R)"><Square size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.eraser ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.eraser)} title="Eraser (E)"><Eraser size={18} /></button>
        <button className={`tool-btn ${activeTool === TOOLS.measure ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.measure)} title="Ruler / Measure (M)"><Ruler size={18} /></button>
        <button className="tool-btn" onClick={triggerImageImport} title="Import Image"><ImageIcon size={18} /></button>

        <div className="toolbar-divider" />

        <div className="layer-palette-scroll" style={{ alignItems: 'center' }}>
          <div className="palette-divider-label" style={{ fontSize: '6px', marginBottom: '4px' }}>PLACE</div>
          {Object.keys(CMOS_DEVICES).map(kind => {
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

          <div className="palette-divider-label" style={{ fontSize: '6px', marginTop: '8px', marginBottom: '4px' }}>GATES</div>
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
        <button className={`tool-btn ${activeTool === TOOLS.rect ? 'active' : ''}`} onClick={() => setActiveTool(TOOLS.rect)} title="Rectangle (R)"><Square size={18} /></button>
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
              style={{ width: '30px', height: '30px', marginBottom: '6px', borderRadius: '4px', border: '1px solid var(--ui-border)', background: 'var(--ui-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
            >
              <span style={{
                width: '24px', height: '18px', borderRadius: '2px',
                background: item.color === 'transparent' ? 'transparent' : item.color,
                border: `1.5px solid ${item.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '6px', fontWeight: 'bold',
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
      <button className={`tool-btn ${activeTool === TOOLS.rect ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.rect); }} title="Rectangle (R)"><Square size={18} /></button>
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
              borderRadius: '4px',
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
