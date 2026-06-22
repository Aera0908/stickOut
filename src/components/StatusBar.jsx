export default function StatusBar({
  activeTool,
  toolNames,
  cursorGrid,
  zoom,
  snapEnabled,
  showGrid,
  groupScaleState
}) {
  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-item">{toolNames[activeTool] || 'Select'}</span>
        <span className="status-separator" />
        <span className="status-item">X: {cursorGrid.x} &nbsp; Y: {cursorGrid.y}</span>
        <span className="status-separator" />
        <span className="status-item">Zoom: {Math.round(zoom * 100)}%</span>
        <span className="status-separator" />
        <span className="status-item"><span className={`dot ${snapEnabled ? 'on' : 'off'}`} />Snap {snapEnabled ? 'ON' : 'OFF'}</span>
        <span className="status-separator" />
        <span className="status-item"><span className={`dot ${showGrid ? 'on' : 'off'}`} />Grid {showGrid ? 'ON' : 'OFF'}</span>
        {groupScaleState && groupScaleState.ratio != null && (
          <>
            <span className="status-separator" />
            <span className="status-item" style={{ color: 'var(--accent)' }}>
              Group Scale: {groupScaleState.integerMode ? `${Math.round(groupScaleState.ratio)}×` : `${Math.round(groupScaleState.ratio * 100)}%`}
              &nbsp;|&nbsp; Lines: {Object.keys(groupScaleState.originalElements || {}).length} selected
            </span>
          </>
        )}
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
  );
}
