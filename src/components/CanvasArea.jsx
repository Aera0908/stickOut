import { Layers, HelpCircle, ZoomIn, ZoomOut } from 'lucide-react';

export default function CanvasArea({
  canvasRef,
  containerRef,
  canvasClass,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleDoubleClick,
  sidebarOpen,
  setSidebarOpen,
  lineStart,
  setLineStart,
  setLinePreview,
  labelInput,
  setLabelInput,
  labelInputRef,
  confirmLabel,
  labelReadyRef,
  showShortcutsHUD,
  setShowShortcutsHUD,
  zoom,
  zoomInStep,
  zoomOutStep,
  zoomReset,
  mode
}) {
  return (
    <div className={canvasClass} ref={containerRef}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={e => e.preventDefault()}
      />

      <button className="mobile-sidebar-toggle-btn" onClick={(e) => { e.stopPropagation(); setSidebarOpen(prev => !prev); }} title="Toggle Sidebar"><Layers size={18} /></button>

      {/* Zoom / magnifier controls (works without a scroll wheel) */}
      <div className="zoom-controls" onMouseDown={e => e.stopPropagation()}>
        <button className="zoom-btn" onClick={(e) => { e.stopPropagation(); zoomInStep && zoomInStep(); }} title="Zoom In ( + )"><ZoomIn size={16} /></button>
        <button className="zoom-btn zoom-level" onClick={(e) => { e.stopPropagation(); zoomReset && zoomReset(); }} title="Reset Zoom ( 0 )">{Math.round((zoom || 1) * 100)}%</button>
        <button className="zoom-btn" onClick={(e) => { e.stopPropagation(); zoomOutStep && zoomOutStep(); }} title="Zoom Out ( - )"><ZoomOut size={16} /></button>
      </div>

      {lineStart && (
        <button className="canvas-floating-btn" onClick={(e) => { e.stopPropagation(); setLineStart(null); setLinePreview(null); }} title="Finish Wire Drawing (Esc)">Done / Finish Wire</button>
      )}

      {labelInput && (
        <input
          ref={labelInputRef}
          className="inline-label-input"
          style={{
            left: labelInput.screenX,
            top: labelInput.screenY - 10,
            fontSize: `${Math.round((labelInput.fontSize || 12) * (zoom || 1))}px`,
            color: labelInput.color || 'var(--text-primary)'
          }}
          value={labelInput.text}
          onChange={e => setLabelInput(prev => ({ ...prev, text: e.target.value }))}
          onKeyDown={e => {
            if (e.key === 'Enter') confirmLabel(labelInput.text);
            if (e.key === 'Escape') setLabelInput(null);
          }}
          onBlur={() => {
            if (labelReadyRef.current) confirmLabel(labelInput.text);
          }}
          placeholder="Label…"
        />
      )}

      {/* Keyboard Shortcuts HUD */}
      <div className={`shortcuts-hud ${showShortcutsHUD ? 'expanded' : 'collapsed'}`}>
        <button className="hud-toggle-btn" onClick={() => setShowShortcutsHUD(prev => !prev)} title={showShortcutsHUD ? "Hide Shortcuts" : "Show Keyboard Shortcuts"}>
          <HelpCircle size={14} />
          {!showShortcutsHUD && <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Shortcuts</span>}
        </button>
        {showShortcutsHUD && (
          <div className="hud-content">
            <div className="hud-header">Keyboard Shortcuts</div>
            <div className="hud-grid">
              <div className="hud-row"><kbd>V</kbd> <span>Select Tool</span></div>
              <div className="hud-row"><kbd>W</kbd> <span>{mode === 'floorplan' ? 'Wire (VCC/VSS)' : 'Wire Tool'}</span></div>
              {mode !== 'floorplan' && <div className="hud-row"><kbd>P</kbd> <span>Contact Tool</span></div>}
              <div className="hud-row"><kbd>R</kbd> <span>{mode === 'floorplan' ? 'Block / Pin' : 'Rectangle Tool'}</span></div>
              <div className="hud-row"><kbd>L</kbd> / <kbd>T</kbd> <span>Label Tool</span></div>
              {mode === 'floorplan'
                ? <div className="hud-row"><kbd>M</kbd> <span>Measure Tool</span></div>
                : <div className="hud-row"><kbd>B</kbd> <span>Brush Tool</span></div>}
              <div className="hud-row"><kbd>+</kbd> / <kbd>-</kbd> <span>Zoom In / Out</span></div>
              <div className="hud-row"><kbd>0</kbd> <span>Reset Zoom</span></div>
              <div className="hud-row"><kbd>G</kbd> <span>Toggle Grid</span></div>
              <div className="hud-row"><kbd>S</kbd> <span>Toggle Snap</span></div>
              <div className="hud-row"><kbd>Space</kbd> + Drag <span>Pan Canvas</span></div>
              <div className="hud-row"><kbd>Del</kbd> / <kbd>Backspace</kbd> <span>Delete</span></div>
              <div className="hud-row"><kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Y</kbd> <span>Undo / Redo</span></div>
              <div className="hud-row"><kbd>Ctrl</kbd> + <kbd>G</kbd> <span>Group / Ungroup</span></div>
              <div className="hud-row"><kbd>Ctrl</kbd> + <kbd>]</kbd> / <kbd>[</kbd> <span>Layer Forward/Back</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
