import { MousePointer2, Minus, Square, Type, Paintbrush, Eraser, Image as ImageIcon, Plus, Pencil, X as XIcon } from 'lucide-react';
import { TOOLS } from '../constants';

export default function Toolbar({
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
  triggerImageImport
}) {
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
          ) : (<Square size={18} />)}
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
      <button className={`tool-btn ${activeTool === TOOLS.label ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.label); }} title="Label (L / T)"><Type size={18} /></button>
      <button className={`tool-btn ${activeTool === TOOLS.brush ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.brush); }} title="Brush (B)"><Paintbrush size={18} /></button>
      <button className={`tool-btn ${activeTool === TOOLS.eraser ? 'active' : ''}`} onClick={() => { setActiveTool(TOOLS.eraser); }} title="Eraser (E)"><Eraser size={18} /></button>
      <button className="tool-btn" onClick={triggerImageImport} title="Import Image"><ImageIcon size={18} /></button>

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
