import { Globe } from 'lucide-react';

export default function StatusBar({
  activeTool,
  toolNames,
  cursorGrid,
  zoom,
  snapEnabled,
  showGrid,
  groupScaleState,
  statusMessage
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
        {statusMessage && (
          <>
            <span className="status-separator" />
            <span className="status-item" style={{ color: '#F1C40F' }}>{statusMessage}</span>
          </>
        )}
      </div>
      <div className="status-right">
        <span className="credit-author">Created by <a href="https://www.linkedin.com/in/aira-josh-ynte/" target="_blank" rel="noopener noreferrer" className="credit-link">Aira Josh Ynte</a></span>
        <span className="status-separator credit-author-sep" />
        
        <a href="https://aera0908.github.io" target="_blank" rel="noopener noreferrer" className="credit-icon" title="Web Resume">
          <Globe size={13} />
          <span className="credit-text">Portfolio</span>
        </a>
        <span className="status-separator" />
        <a href="https://github.com/Aera0908/stickOut" target="_blank" rel="noopener noreferrer" className="credit-icon" title="GitHub">
          <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
          <span className="credit-text">GitHub</span>
        </a>
        <span className="status-separator" />
        <a href="https://x.com/aera0908" target="_blank" rel="noopener noreferrer" className="credit-icon" title="X (Twitter)">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style={{ verticalAlign: 'middle' }}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          <span className="credit-text">X</span>
        </a>
        <span className="status-separator" />
        <a href="https://discord.com/users/aeradynamics" target="_blank" rel="noopener noreferrer" className="credit-icon" title="Discord: aeradynamics">
          <svg viewBox="0 0 127.14 96.36" width="13" height="13" fill="currentColor" style={{ verticalAlign: 'middle' }}><path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.88,6.83,77.19,77.19,0,0,0,49.58,0,105.15,105.15,0,0,0,19.14,8.07C2.81,32.22-1.71,55.77.47,78.89A105.65,105.65,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.9-.65,1.76-1.34,2.58-2.07a75.48,75.48,0,0,0,72.63,0c.83.73,1.68,1.42,2.58,2.07a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.65,105.65,0,0,0,31.57-17.47C129.22,50.78,124.28,27.48,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/></svg>
          <span className="credit-text">Discord</span>
        </a>
      </div>
    </div>
  );
}
