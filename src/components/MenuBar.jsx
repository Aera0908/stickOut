import { Cpu, Bug, Sun, Moon, Heart } from 'lucide-react';

export default function MenuBar({
  openMenu,
  setOpenMenu,
  theme,
  toggleTheme,
  handleNew,
  handleClear,
  handleSaveProject,
  handleLoadProject,
  handleExportPNG,
  triggerImageImport,
  showGrid,
  setShowGrid,
  snapEnabled,
  setSnapEnabled,
  doUndo,
  doRedo,
  deleteSelected,
  setShowFeedbackModal,
  setFeedbackName,
  setFeedbackTitle,
  setFeedbackDesc
}) {
  return (
    <div className="menu-bar">
      <span className="app-title"><Cpu size={14} />StickOut</span>

      <div className="menu-item">
        <button className={openMenu === 'file' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'file' ? null : 'file'); }}>File</button>
        {openMenu === 'file' && (
          <div className="menu-dropdown" onClick={e => e.stopPropagation()}>
            <button onClick={handleNew}><span>New…</span></button>
            <button onClick={handleClear}><span>Clear Canvas</span></button>
            <div className="separator" />
            <button onClick={handleSaveProject}><span>Save Project (.stk)</span><span className="shortcut">Ctrl+S</span></button>
            <button onClick={handleLoadProject}><span>Open Project…</span><span className="shortcut">Ctrl+O</span></button>
            <div className="separator" />
            <button onClick={handleExportPNG}><span>Export PNG…</span></button>
            <div className="separator" />
            <button onClick={triggerImageImport}><span>Import Image…</span></button>
          </div>
        )}
      </div>

      <div className="menu-item">
        <button className={openMenu === 'view' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'view' ? null : 'view'); }}>View</button>
        {openMenu === 'view' && (
          <div className="menu-dropdown" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setShowGrid(g => !g); setOpenMenu(null); }}><span>{showGrid ? '✓' : '  '} Show Grid</span><span className="shortcut">G</span></button>
            <button onClick={() => { setSnapEnabled(s => !s); setOpenMenu(null); }}><span>{snapEnabled ? '✓' : '  '} Snap to Grid</span><span className="shortcut">S</span></button>
          </div>
        )}
      </div>

      <div className="menu-item">
        <button className={openMenu === 'edit' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'edit' ? null : 'edit'); }}>Edit</button>
        {openMenu === 'edit' && (
          <div className="menu-dropdown" onClick={e => e.stopPropagation()}>
            <button onClick={() => { doUndo(); setOpenMenu(null); }}><span>Undo</span><span className="shortcut">Ctrl+Z</span></button>
            <button onClick={() => { doRedo(); setOpenMenu(null); }}><span>Redo</span><span className="shortcut">Ctrl+Y</span></button>
            <div className="separator" />
            <button onClick={() => { deleteSelected(); setOpenMenu(null); }}><span>Delete Selected</span><span className="shortcut">Del</span></button>
          </div>
        )}
      </div>

      <button className="feedback-btn" onClick={() => { setFeedbackName(''); setFeedbackTitle(''); setFeedbackDesc(''); setShowFeedbackModal(true); }} title="Report Bug / Send Feedback"><Bug size={16} /></button>
      <button className="gank-btn" onClick={() => window.open('https://ganknow.com/Aera0908', '_blank', 'noopener,noreferrer')} title="Support Creator on Gank"><Heart size={16} /></button>
      <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
    </div>
  );
}
