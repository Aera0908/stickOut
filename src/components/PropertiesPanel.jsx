import { RotateCw, Trash2, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Pipette, Group, Ungroup } from 'lucide-react';
import { TOOLS, HIGHER_METAL_COLORS } from '../constants';

export default function PropertiesPanel({
  selectedElements,
  activeTool,
  contactSize,
  setContactSize,
  contactShape,
  setContactShape,
  brushColor,
  setBrushColor,
  brushSize,
  setBrushSize,
  brushOpacity,
  setBrushOpacity,
  updateProp,
  allLayers,
  customLayerColors,
  setCustomLayerColors,
  updateLineLength,
  lineLength,
  selectedIds,
  setElements,
  pushUndoSnapshot,
  rotateSelected,
  deleteSelected,
  canvasLayers,
  moveLayerInStack,
  activeLayerId,
  wireThickness,
  setWireThickness,
  rectStrokeColor,
  setRectStrokeColor,
  rectFillColor,
  setRectFillColor,
  rectStrokeWidth,
  setRectStrokeWidth,
  groupSelected,
  ungroupSelected
}) {
  const THICKNESS_OPTS = ['small', 'medium', 'large'];
  const renderThicknessRow = (current, onPick) => (
    <div className="prop-btn-row">
      {THICKNESS_OPTS.map(t => (
        <button
          key={t}
          className={`prop-btn ${current === t ? 'active' : ''}`}
          style={{ background: current === t ? 'var(--accent)' : 'var(--surface)', color: current === t ? '#fff' : 'var(--text-primary)' }}
          onClick={() => onPick(t)}
        >
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
      ))}
    </div>
  );
  const renderInlineColorPicker = (currentColor, onChangeHandler) => {
    const handleEyeDropper = async () => {
      if (!window.EyeDropper) return;
      try {
        const dropper = new window.EyeDropper();
        const result = await dropper.open();
        if (result?.sRGBHex) onChangeHandler(result.sRGBHex);
      } catch {}
    };

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
        {HIGHER_METAL_COLORS.map(color => (
          <button
            key={color}
            onClick={() => onChangeHandler(color)}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: color,
              border: currentColor === color ? '2px solid var(--accent)' : '1px solid var(--ui-border)',
              cursor: 'pointer',
              boxShadow: currentColor === color ? '0 0 0 1px var(--ui-bg)' : 'none',
              padding: 0
            }}
            title={color}
          />
        ))}
        <div style={{ position: 'relative', width: '20px', height: '20px' }}>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onChangeHandler(e.target.value)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer'
            }}
          />
          <button
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
              border: '1px solid var(--ui-border)',
              cursor: 'pointer',
              padding: 0
            }}
            title="Custom Color"
          />
        </div>
        {typeof window !== 'undefined' && window.EyeDropper && (
          <button
            onClick={handleEyeDropper}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '1px solid var(--ui-border)',
              background: 'var(--surface)',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)'
            }}
            title="Pick color from screen"
          >
            <Pipette size={12} />
          </button>
        )}
      </div>
    );
  };
  if (selectedElements.length === 0) {
    if (activeTool === TOOLS.contact) {
      return (
        <div className="panel-content">
          <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>Contact Tool Settings</div>
          <div className="prop-group">
            <span className="prop-label">Default Size</span>
            <div className="prop-btn-row">
              {['small', 'medium', 'big'].map(sz => (
                <button key={sz} className={`prop-btn ${contactSize === sz ? 'active' : ''}`} style={{ background: contactSize === sz ? 'var(--accent)' : 'var(--surface)', color: contactSize === sz ? '#fff' : 'var(--text-primary)' }} onClick={() => setContactSize(sz)}>{sz.charAt(0).toUpperCase() + sz.slice(1)}</button>
              ))}
            </div>
          </div>
          <div className="prop-group">
            <span className="prop-label">Default Style</span>
            <div className="prop-btn-row">
              <button className={`prop-btn ${contactShape === 'x' ? 'active' : ''}`} style={{ background: contactShape === 'x' ? 'var(--accent)' : 'var(--surface)', color: contactShape === 'x' ? '#fff' : 'var(--text-primary)' }} onClick={() => setContactShape('x')}>X</button>
              <button className={`prop-btn ${contactShape === 'square' ? 'active' : ''}`} style={{ background: contactShape === 'square' ? 'var(--accent)' : 'var(--surface)', color: contactShape === 'square' ? '#fff' : 'var(--text-primary)' }} onClick={() => setContactShape('square')}>Square</button>
            </div>
          </div>
          {activeLayerId && allLayers[activeLayerId]?.customizable && (
            <div className="prop-group">
              <span className="prop-label">{allLayers[activeLayerId].label.split('(')[0]}Color</span>
              {renderInlineColorPicker(customLayerColors[activeLayerId] || allLayers[activeLayerId].hex, (newColor) => {
                pushUndoSnapshot();
                setCustomLayerColors(prev => ({ ...prev, [activeLayerId]: newColor }));
              })}
            </div>
          )}
        </div>
      );
    } else if (activeTool === TOOLS.brush) {
      return (
        <div className="panel-content">
          <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>Brush Tool Settings</div>
          <div className="prop-group">
            <span className="prop-label">Brush Color</span>
            {renderInlineColorPicker(brushColor, setBrushColor)}
          </div>
          <div className="prop-group">
            <span className="prop-label">Brush Size: {brushSize}px</span>
            <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div className="prop-group">
            <span className="prop-label">Brush Opacity: {Math.round(brushOpacity * 100)}%</span>
            <input type="range" min="10" max="100" step="10" value={Math.round(brushOpacity * 100)} onChange={(e) => setBrushOpacity(parseFloat(e.target.value) / 100)} style={{ width: '100%' }} />
          </div>
        </div>
      );
    } else if (activeTool === TOOLS.eraser) {
      return (
        <div className="panel-content">
          <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>Eraser Settings</div>
          <div className="prop-group">
            <span className="prop-label">Eraser Size: {brushSize}px</span>
            <input type="range" min="2" max="100" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>
      );
    } else if (activeTool === TOOLS.rect) {
      return (
        <div className="panel-content">
          <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>Rectangle Tool Settings</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '12px' }}>Click and drag on the canvas to draw a rectangle.</div>
          <div className="prop-group">
            <span className="prop-label">Outline Color</span>
            {renderInlineColorPicker(rectStrokeColor, setRectStrokeColor)}
          </div>
          <div className="prop-group">
            <span className="prop-label">Outline Thickness: {rectStrokeWidth}px</span>
            <input type="range" min="0" max="12" value={rectStrokeWidth} onChange={(e) => setRectStrokeWidth(parseInt(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div className="prop-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <input type="checkbox" id="rect-tool-transparent" checked={!rectFillColor || rectFillColor === 'transparent'} onChange={(e) => setRectFillColor(e.target.checked ? null : '#4A90E2')} style={{ cursor: 'pointer', width: '14px', height: '14px' }} />
            <label htmlFor="rect-tool-transparent" style={{ fontSize: '11px', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>Transparent Fill</label>
          </div>
          {rectFillColor && rectFillColor !== 'transparent' && (
            <div className="prop-group">
              <span className="prop-label">Fill Color</span>
              {renderInlineColorPicker(rectFillColor, setRectFillColor)}
            </div>
          )}
        </div>
      );
    } else {
      const isCustomizable = activeLayerId && allLayers[activeLayerId]?.customizable;
      return (
        <div className="panel-content">
          <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>Active Layer Settings</div>
          <div className="prop-group">
            <span className="prop-label">Active Layer</span>
            <span style={{ color: 'var(--text-primary)', fontSize: 11 }}>
              {allLayers[activeLayerId]?.label || activeLayerId || 'None'}
            </span>
          </div>
          {isCustomizable && (
            <div className="prop-group">
              <span className="prop-label">Layer Color</span>
              {renderInlineColorPicker(customLayerColors[activeLayerId] || allLayers[activeLayerId].hex, (newColor) => {
                pushUndoSnapshot();
                setCustomLayerColors(prev => ({ ...prev, [activeLayerId]: newColor }));
              })}
            </div>
          )}
          {activeTool === TOOLS.line && (
            <div className="prop-group">
              <span className="prop-label">Wire Thickness</span>
              {renderThicknessRow(wireThickness, setWireThickness)}
            </div>
          )}
          <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Select an element to edit its properties.
          </div>
        </div>
      );
    }
  }

  const singleLine = selectedElements.length === 1 && selectedElements[0].type === 'line' ? selectedElements[0] : null;

  // Find all customizable layers among selected elements
  const selectedCustomizableLayers = [];
  selectedElements.forEach(el => {
    const lid = el.layerId || (el.type === 'via' ? 'via' : null);
    if (lid && allLayers[lid]?.customizable && !selectedCustomizableLayers.includes(lid)) {
      selectedCustomizableLayers.push(lid);
    }
  });

  return (
    <div className="panel-content">
      <div className="prop-group">
        <span className="prop-label">Type</span>
        <span style={{ color: 'var(--text-primary)', fontSize: 11 }}>
          {selectedElements.length > 1 ? `${selectedElements.length} elements` : selectedElements[0].type.charAt(0).toUpperCase() + selectedElements[0].type.slice(1)}
        </span>
      </div>

      {selectedElements.length === 1 && selectedElements[0].type === 'line' && (
        <div className="prop-group">
          <span className="prop-label">Net Label</span>
          <input className="prop-input" value={selectedElements[0].label || ''} onChange={e => updateProp('label', e.target.value)} placeholder="e.g. VDD, VSS, OUT" />
        </div>
      )}

      {selectedElements.length === 1 && selectedElements[0].type === 'label' && (
        <>
          <div className="prop-group">
            <span className="prop-label">Text</span>
            <input className="prop-input" value={selectedElements[0].text || ''} onChange={e => updateProp('text', e.target.value)} placeholder="Label text" />
          </div>
          <div className="prop-group">
            <span className="prop-label">Font Size: {selectedElements[0].fontSize || 12}px</span>
            <input type="range" min="8" max="48" value={selectedElements[0].fontSize || 12} onChange={e => updateProp('fontSize', parseInt(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div className="prop-group">
            <span className="prop-label">Text Color</span>
            {renderInlineColorPicker(selectedElements[0].color || '#FFFFFF', (newColor) => updateProp('color', newColor))}
            {selectedElements[0].color && (
              <button className="prop-btn" onClick={() => updateProp('color', undefined)} style={{ marginTop: '4px', fontSize: '10px' }}>Reset to Default</button>
            )}
          </div>
          <div className="prop-group">
            <span className="prop-label">Alignment</span>
            <div className="prop-btn-row">
              <button className={`prop-btn ${selectedElements[0].align !== 'center' ? 'active' : ''}`} style={{ background: selectedElements[0].align !== 'center' ? 'var(--accent)' : 'var(--surface)', color: selectedElements[0].align !== 'center' ? '#fff' : 'var(--text-primary)' }} onClick={() => updateProp('align', 'left')}>Left</button>
              <button className={`prop-btn ${selectedElements[0].align === 'center' ? 'active' : ''}`} style={{ background: selectedElements[0].align === 'center' ? 'var(--accent)' : 'var(--surface)', color: selectedElements[0].align === 'center' ? '#fff' : 'var(--text-primary)' }} onClick={() => updateProp('align', 'center')}>Center</button>
            </div>
          </div>
          <div className="prop-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <input type="checkbox" id="prop-has-bg" checked={selectedElements[0].hasBg !== false} onChange={e => updateProp('hasBg', e.target.checked)} style={{ cursor: 'pointer', width: '14px', height: '14px' }} />
            <label htmlFor="prop-has-bg" style={{ fontSize: '11px', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>Background Pill</label>
          </div>
        </>
      )}

      {selectedElements.length >= 1 && selectedElements.every(el => el.type === 'contact' || el.type === 'via') && (
        <>
          <div className="prop-group">
            <span className="prop-label">Size</span>
            <div className="prop-btn-row">
              {['small', 'medium', 'big'].map(sz => (
                <button key={sz} className={`prop-btn ${selectedElements.every(el => (el.size || 'small') === sz) ? 'active' : ''}`} style={{ background: selectedElements.every(el => (el.size || 'small') === sz) ? 'var(--accent)' : 'var(--surface)', color: selectedElements.every(el => (el.size || 'small') === sz) ? '#fff' : 'var(--text-primary)' }} onClick={() => updateProp('size', sz)}>{sz.charAt(0).toUpperCase() + sz.slice(1)}</button>
              ))}
            </div>
          </div>
          <div className="prop-group">
            <span className="prop-label">Style</span>
            <div className="prop-btn-row">
              <button className={`prop-btn ${selectedElements.every(el => el.shape === 'x') ? 'active' : ''}`} style={{ background: selectedElements.every(el => el.shape === 'x') ? 'var(--accent)' : 'var(--surface)', color: selectedElements.every(el => el.shape === 'x') ? '#fff' : 'var(--text-primary)' }} onClick={() => updateProp('shape', 'x')}>X</button>
              <button className={`prop-btn ${selectedElements.every(el => (el.shape || 'square') === 'square') ? 'active' : ''}`} style={{ background: selectedElements.every(el => (el.shape || 'square') === 'square') ? 'var(--accent)' : 'var(--surface)', color: selectedElements.every(el => (el.shape || 'square') === 'square') ? '#fff' : 'var(--text-primary)' }} onClick={() => updateProp('shape', 'square')}>Square</button>
            </div>
          </div>
        </>
      )}

      {selectedElements.some(el => el.type === 'line') && (
        <div className="prop-group">
          <span className="prop-label">Layer / Color</span>
          {Object.entries(allLayers).filter(([k]) => !['contact', 'via', 'buriedcontact'].includes(k)).map(([key, { label, hex }]) => (
            <div key={key} className={`color-option ${selectedElements.every(el => el.type !== 'line' || el.layerId === key) ? 'active' : ''}`}
              onClick={() => {
                pushUndoSnapshot();
                const targetCanvasLayerId = `canvas_vlsi_${key}`;
                // Auto-create canvas layer if it doesn't exist
                setElements(prev => {
                  // Wait, to update setCanvasLayers as well, we can pass a function or let App handle it.
                  // But since we can access setElements and we want standard layers mapped,
                  // we can let the parent handle this, or pass setCanvasLayers.
                  // To keep it simple, we can perform it in the state callback or pass setCanvasLayers!
                  // Let's pass a function changeSelectedLineLayer(key, hex) as a prop instead!
                  return prev.map(el => {
                    if (selectedIds.has(el.id) && el.type === 'line') {
                      return { ...el, layerId: key, color: customLayerColors[key] || hex, canvasLayerId: targetCanvasLayerId };
                    }
                    return el;
                  });
                });
                
                // Let's call a callback to ensure canvas layer is auto-created.
                // We'll pass standard canvas layer creation handler:
                if (updateProp) {
                  updateProp('_ensure_vlsi_canvas_layer', key);
                }
              }}>
              <span className="color-dot" style={{ backgroundColor: customLayerColors[key] || hex }} />
              <span style={{ fontSize: 10 }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Poly color toggle (Purple / Red only) */}
      {selectedElements.some(el => el.type === 'line' && el.layerId === 'poly') && (
        <div className="prop-group">
          <span className="prop-label">Poly Color</span>
          <div className="prop-btn-row">
            <button
              className={`prop-btn ${selectedElements.every(el => el.type !== 'line' || el.layerId !== 'poly' || !el.elementColor) ? 'active' : ''}`}
              style={{
                background: selectedElements.every(el => el.type !== 'line' || el.layerId !== 'poly' || !el.elementColor) ? '#9B59B6' : 'var(--surface)',
                color: selectedElements.every(el => el.type !== 'line' || el.layerId !== 'poly' || !el.elementColor) ? '#fff' : 'var(--text-primary)',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
              onClick={() => {
                pushUndoSnapshot();
                setElements(prev => prev.map(el =>
                  selectedIds.has(el.id) && el.type === 'line' && el.layerId === 'poly'
                    ? { ...el, elementColor: undefined }
                    : el
                ));
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#9B59B6', border: '1px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
              Purple
            </button>
            <button
              className={`prop-btn ${selectedElements.every(el => el.type !== 'line' || el.layerId !== 'poly' || el.elementColor === '#E74C3C') ? 'active' : ''}`}
              style={{
                background: selectedElements.some(el => el.type === 'line' && el.layerId === 'poly' && el.elementColor === '#E74C3C') ? '#E74C3C' : 'var(--surface)',
                color: selectedElements.some(el => el.type === 'line' && el.layerId === 'poly' && el.elementColor === '#E74C3C') ? '#fff' : 'var(--text-primary)',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
              onClick={() => {
                pushUndoSnapshot();
                setElements(prev => prev.map(el =>
                  selectedIds.has(el.id) && el.type === 'line' && el.layerId === 'poly'
                    ? { ...el, elementColor: '#E74C3C' }
                    : el
                ));
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#E74C3C', border: '1px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
              Red
            </button>
          </div>
        </div>
      )}

      {selectedElements.some(el => el.type === 'line') && (() => {
        const lineEls = selectedElements.filter(el => el.type === 'line');
        const first = lineEls[0].thickness || 'medium';
        const common = lineEls.every(el => (el.thickness || 'medium') === first) ? first : null;
        return (
          <div className="prop-group">
            <span className="prop-label">Wire Thickness</span>
            {renderThicknessRow(common, (t) => updateProp('thickness', t))}
          </div>
        );
      })()}

      {singleLine && (
        <div className="prop-group">
          <span className="prop-label">Length (grid units)</span>
          <input className="prop-input" type="number" min={1} value={lineLength || 1} onChange={e => { const val = parseInt(e.target.value); if (val > 0) updateLineLength(val); }} />
        </div>
      )}

      {selectedElements.length === 1 && selectedElements[0].type === 'image' && (
        <>
          <div className="prop-group"><span className="prop-label">Width (px)</span><input className="prop-input" type="number" value={selectedElements[0].w || 100} onChange={e => updateProp('w', parseInt(e.target.value) || 100)} /></div>
          <div className="prop-group"><span className="prop-label">Height (px)</span><input className="prop-input" type="number" value={selectedElements[0].h || 100} onChange={e => updateProp('h', parseInt(e.target.value) || 100)} /></div>
        </>
      )}

      {selectedElements.length >= 1 && selectedElements.every(el => el.type === 'rect') && (() => {
        const rectEl = selectedElements[0];
        const isTransparent = !rectEl.fillColor || rectEl.fillColor === 'transparent';
        return (
          <>
            {selectedElements.length === 1 && (
              <div className="prop-group">
                <span className="prop-label">Label</span>
                <input className="prop-input" value={rectEl.label || ''} onChange={e => updateProp('label', e.target.value)} placeholder="e.g. Block, VDD" />
              </div>
            )}
            <div className="prop-group">
              <span className="prop-label">Outline Color</span>
              {renderInlineColorPicker(rectEl.strokeColor || '#4A90E2', (c) => updateProp('strokeColor', c))}
            </div>
            <div className="prop-group">
              <span className="prop-label">Outline Thickness: {rectEl.strokeWidth !== undefined ? rectEl.strokeWidth : 2}px</span>
              <input type="range" min="0" max="12" value={rectEl.strokeWidth !== undefined ? rectEl.strokeWidth : 2} onChange={e => updateProp('strokeWidth', parseInt(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div className="prop-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input type="checkbox" id="rect-sel-transparent" checked={isTransparent} onChange={e => updateProp('fillColor', e.target.checked ? null : '#4A90E2')} style={{ cursor: 'pointer', width: '14px', height: '14px' }} />
              <label htmlFor="rect-sel-transparent" style={{ fontSize: '11px', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>Transparent Fill</label>
            </div>
            {!isTransparent && (
              <div className="prop-group">
                <span className="prop-label">Fill Color</span>
                {renderInlineColorPicker(rectEl.fillColor, (c) => updateProp('fillColor', c))}
              </div>
            )}
          </>
        );
      })()}

      {selectedElements.length === 1 && selectedElements[0].type === 'brush' && (
        <>
          <div className="prop-group">
            <span className="prop-label">Brush Color</span>
            {renderInlineColorPicker(selectedElements[0].color || '#FF453A', (newColor) => updateProp('color', newColor))}
          </div>
        </>
      )}

      {/* Custom Layer Colors if selected elements belong to customizable layers */}
      {selectedCustomizableLayers.length > 0 && (
        <div style={{ borderTop: '1px solid var(--ui-border)', paddingTop: '12px', marginTop: '12px', marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>Custom Layer Colors</div>
          {selectedCustomizableLayers.map(lid => {
            const layerDef = allLayers[lid];
            const currentColor = customLayerColors[lid] || layerDef?.hex || '#FF00FF';
            return (
              <div className="prop-group" key={lid} style={{ marginBottom: '8px' }}>
                <span className="prop-label">{layerDef?.label.split('(')[0] || lid} Color</span>
                {renderInlineColorPicker(currentColor, (newColor) => {
                  pushUndoSnapshot();
                  setCustomLayerColors(prev => ({ ...prev, [lid]: newColor }));
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Z-Order controls */}
      {selectedElements.length > 0 && (
        <div className="prop-group" style={{ marginTop: '8px' }}>
          <span className="prop-label">Z-Order</span>
          <div className="prop-btn-row">
            <button className="prop-btn" onClick={() => { const lid = selectedElements[0].canvasLayerId; if (lid) moveLayerInStack(lid, 'front'); }} title="Bring to Front"><ChevronsUp size={12} /></button>
            <button className="prop-btn" onClick={() => { const lid = selectedElements[0].canvasLayerId; if (lid) moveLayerInStack(lid, 'forward'); }} title="Bring Forward"><ChevronUp size={12} /></button>
            <button className="prop-btn" onClick={() => { const lid = selectedElements[0].canvasLayerId; if (lid) moveLayerInStack(lid, 'backward'); }} title="Send Backward"><ChevronDown size={12} /></button>
            <button className="prop-btn" onClick={() => { const lid = selectedElements[0].canvasLayerId; if (lid) moveLayerInStack(lid, 'back'); }} title="Send to Back"><ChevronsDown size={12} /></button>
          </div>
          
          {/* Hide Layer select dropdown for standard VLSI elements to prevent layer mixing */}
          {!selectedElements.some(el => ['line', 'contact', 'via'].includes(el.type) && el.layerId) && (
            <div className="prop-group" style={{ marginTop: '6px' }}>
              <span className="prop-label">Layer</span>
              <select className="prop-select" value={selectedElements[0].canvasLayerId || ''} onChange={e => { pushUndoSnapshot(); setElements(prev => prev.map(el => selectedIds.has(el.id) ? { ...el, canvasLayerId: e.target.value } : el)); }}>
                {canvasLayers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="prop-btn-row" style={{ marginTop: '12px' }}>
        {selectedElements.some(el => el.type === 'line') && (
          <button className="prop-btn" onClick={rotateSelected}><RotateCw size={12} /> Rotate 90°</button>
        )}
      </div>

      {(selectedElements.length >= 2 || selectedElements.some(el => el.groupId)) && (
        <div className="prop-btn-row" style={{ marginTop: '8px' }}>
          {selectedElements.length >= 2 && (
            <button className="prop-btn" onClick={groupSelected} title="Group (Ctrl+G)"><Group size={12} /> Group</button>
          )}
          {selectedElements.some(el => el.groupId) && (
            <button className="prop-btn" onClick={ungroupSelected} title="Ungroup (Ctrl+Shift+G)"><Ungroup size={12} /> Ungroup</button>
          )}
        </div>
      )}

      <button className="prop-btn danger" onClick={deleteSelected} style={{ marginTop: '8px', width: '100%' }}><Trash2 size={12} /> Delete</button>
    </div>
  );
}
