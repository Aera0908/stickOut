import { useState, useEffect } from 'react';

// ─── Minimal client-side router (no external dependency) ──────────────
// Clean URLs via the History API. Works with the Vercel SPA rewrite so
// refresh / deep-links resolve to index.html.

export function navigate(to) {
  if (window.location.pathname === to) return;
  window.history.pushState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function usePathname() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return path;
}

export function Link({ to, children, onClick, ...rest }) {
  const handleClick = (e) => {
    if (e.defaultPrevented) return;
    // Let the browser handle modifier / non-left clicks (open in new tab, etc.)
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (onClick) onClick(e);
    navigate(to);
  };
  return <a href={to} onClick={handleClick} {...rest}>{children}</a>;
}
