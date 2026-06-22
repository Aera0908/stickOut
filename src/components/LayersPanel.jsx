import { Plus, GripVertical, Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

export default function LayersPanel({
  canvasLayers,
  setCanvasLayers,
  activeCanvasLayerId,
  setActiveCanvasLayerId,
  elements,
  pushUndoSnapshot,
  addCustomCanvasLayer,
  deleteCanvasLayer,
  duplicateCanvasLayer,
  mergeDownCanvasLayer,
  customLayerForm,
  setCustomLayerForm,
  layerOptionsOpen,
  setLayerOptionsOpen,
  layerDragState,
  setLayerDragState,
  renamingLayerId,
  setRenamingLayerId,
  renameText,
  setRenameText
}) {
  return (
    <div className="layers-tab-content">
      <div className="layers-tab-header">
        <span>LAYERS</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Generic Add is removed; only Custom is kept */}
          <button className="layer-action-btn" onClick={() => setCustomLayerForm({ name: '', color: '#FF00FF', lineWidth: 3, strokeStyle: 'solid' })} title="Add Custom Layer"><Plus size={12} /> Custom Layer</button>
        </div>
      </div>

      {/* Custom layer creation form */}
      {customLayerForm && (
        <div className="custom-layer-form">
          <div className="clf-field">
            <label>Name:</label>
            <input type="text" value={customLayerForm.name} onChange={e => setCustomLayerForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Annotation, Sketch, Bus…" />
          </div>
          <div className="clf-field">
            <label>Color:</label>
            <input type="color" value={customLayerForm.color} onChange={e => setCustomLayerForm(prev => ({ ...prev, color: e.target.value }))} />
          </div>
          <div className="clf-field">
            <label>Width: {customLayerForm.lineWidth}px</label>
            <input type="range" min="1" max="20" value={customLayerForm.lineWidth} onChange={e => setCustomLayerForm(prev => ({ ...prev, lineWidth: parseInt(e.target.value) }))} />
          </div>
          <div className="clf-field">
            <label>Stroke:</label>
            <div className="clf-stroke-options">
              {['solid', 'dashed', 'dotted'].map(s => (
                <button key={s} className={`clf-stroke-btn ${customLayerForm.strokeStyle === s ? 'active' : ''}`} onClick={() => setCustomLayerForm(prev => ({ ...prev, strokeStyle: s }))}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
          </div>
          <div className="clf-actions">
            <button className="clf-create-btn" onClick={() => { if (!customLayerForm.name.trim()) return; addCustomCanvasLayer(customLayerForm); }} disabled={!customLayerForm.name.trim()}>Create</button>
            <button className="clf-cancel-btn" onClick={() => setCustomLayerForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Layer stack (reversed: top layer shown first) */}
      <div className="layer-stack">
        {layerDragState && layerDragState.hoverVisualIdx === 0 && (
          <div className="layer-drop-indicator" />
        )}
        {[...canvasLayers].reverse().map((layer, revIdx) => {
          const realIdx = canvasLayers.length - 1 - revIdx;
          const isActive = layer.id === activeCanvasLayerId;
          const elCount = elements.filter(el => el.canvasLayerId === layer.id).length;
          const isDragging = layerDragState?.draggingId === layer.id;

          return (
            <div key={layer.id} className="layer-stack-item-container" style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                className={`layer-stack-row ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
                style={isDragging ? {
                  transform: `translateY(${layerDragState.currentY - layerDragState.startY}px)`,
                  zIndex: 10,
                  position: 'relative'
                } : {}}
                onClick={() => setActiveCanvasLayerId(layer.id)}
                onMouseDown={(e) => {
                  if (e.target.closest('.layer-drag-handle')) {
                    e.preventDefault();
                    const startY = e.clientY;
                    const startIdx = realIdx;
                    setLayerDragState({ draggingId: layer.id, startY, currentY: startY, startIndex: startIdx, hoverVisualIdx: revIdx, targetIdx: realIdx });

                    const onMove = (me) => {
                      setLayerDragState(prev => {
                        if (!prev) return null;

                        const container = document.querySelector('.layer-stack');
                        if (!container) return { ...prev, currentY: me.clientY };

                        const rows = Array.from(container.querySelectorAll('.layer-stack-row'));
                        let hoverVisualIdx = 0;
                        let found = false;
                        const clientY = me.clientY;

                        for (let i = 0; i < rows.length; i++) {
                          const row = rows[i];
                          const rect = row.getBoundingClientRect();
                          const mid = rect.top + rect.height / 2;
                          if (clientY < mid) {
                            hoverVisualIdx = i;
                            found = true;
                            break;
                          }
                        }
                        if (!found) {
                          hoverVisualIdx = rows.length;
                        }

                        // Map visual index to original index
                        const targetIdx = canvasLayers.length - hoverVisualIdx;

                        return {
                          ...prev,
                          currentY: me.clientY,
                          hoverVisualIdx,
                          targetIdx
                        };
                      });
                    };

                    const onUp = () => {
                      setLayerDragState(prev => {
                        if (prev && prev.targetIdx !== undefined) {
                          const fromIdx = prev.startIndex;
                          let toIdx = prev.targetIdx;

                          if (fromIdx < toIdx) {
                            toIdx--; // Adjust since splicing out element shifts indices
                          }

                          if (fromIdx !== toIdx) {
                            pushUndoSnapshot();
                            setCanvasLayers(prevL => {
                              const arr = [...prevL];
                              const [item] = arr.splice(fromIdx, 1);
                              arr.splice(toIdx, 0, item);
                              return arr;
                            });
                          }
                        }
                        return null;
                      });
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }
                }}
              >
                <span className="layer-drag-handle" title="Drag to reorder"><GripVertical size={12} /></span>
                <button className={`layer-vis-btn ${!layer.visible ? 'hidden' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setCanvasLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)); }}>
                  {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                {renamingLayerId === layer.id ? (
                  <input className="layer-rename-input" value={renameText} autoFocus
                    onChange={e => setRenameText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        setCanvasLayers(prev => prev.map(l => l.id === layer.id ? { ...l, name: renameText || l.name } : l));
                        setRenamingLayerId(null);
                      }
                      if (e.key === 'Escape') setRenamingLayerId(null);
                    }}
                    onBlur={() => {
                      setCanvasLayers(prev => prev.map(l => l.id === layer.id ? { ...l, name: renameText || l.name } : l));
                      setRenamingLayerId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="layer-stack-name" onDoubleClick={(e) => { e.stopPropagation(); setRenamingLayerId(layer.id); setRenameText(layer.name); }}>
                    {layer.name}
                    {layer.isCustom && <span className="layer-custom-badge">C</span>}
                    <span className="layer-el-count">{elCount}</span>
                  </span>
                )}
                
                {/* Opacity slider control */}
                <div className="layer-opacity-control" onClick={e => e.stopPropagation()} style={{ marginRight: '6px' }}>
                  <input type="range" min="0" max="100"
                    value={Math.round((layer.opacity !== undefined ? layer.opacity : 1.0) * 100)}
                    onChange={e => {
                      const val = parseFloat(e.target.value) / 100;
                      setCanvasLayers(prev => prev.map(l => l.id === layer.id ? { ...l, opacity: val } : l));
                    }}
                    className="layer-opacity-slider"
                    title={`Opacity: ${Math.round((layer.opacity !== undefined ? layer.opacity : 1.0) * 100)}%`}
                  />
                  <span className="layer-opacity-percent">{Math.round((layer.opacity !== undefined ? layer.opacity : 1.0) * 100)}%</span>
                </div>

                <div style={{ position: 'relative' }}>
                  <button className="layer-options-btn" onClick={(e) => { e.stopPropagation(); setLayerOptionsOpen(layerOptionsOpen === layer.id ? null : layer.id); }} title="Options">
                    <MoreHorizontal size={12} />
                  </button>
                  {layerOptionsOpen === layer.id && (
                    <div className="layer-options-dropdown" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setRenamingLayerId(layer.id); setRenameText(layer.name); setLayerOptionsOpen(null); }}>Rename</button>
                      <button onClick={() => { duplicateCanvasLayer(layer.id); setLayerOptionsOpen(null); }}>Duplicate</button>
                      {realIdx > 0 && <button onClick={() => { mergeDownCanvasLayer(layer.id); setLayerOptionsOpen(null); }}>Merge Down</button>}
                      {layer.isCustom && <button onClick={() => { setCustomLayerForm({ name: layer.name, color: layer.color, lineWidth: layer.lineWidth, strokeStyle: layer.strokeStyle, editId: layer.id }); setLayerOptionsOpen(null); }}>Edit Layer</button>}
                    </div>
                  )}
                </div>
                <button className="layer-delete-btn" disabled={canvasLayers.length <= 1}
                  onClick={(e) => { e.stopPropagation(); deleteCanvasLayer(layer.id); }} title="Delete Layer">
                  <Trash2 size={12} />
                </button>
              </div>

              {layerDragState && layerDragState.hoverVisualIdx === revIdx + 1 && (
                <div className="layer-drop-indicator" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
