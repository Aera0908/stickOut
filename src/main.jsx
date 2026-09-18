import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Landing from './components/Landing.jsx'
import { usePathname, getTitleForPath } from './router.jsx'

function Root() {
  const rawPath = usePathname();
  const path = (rawPath || '/').replace(/\/+$/, '') || '/';

  useEffect(() => {
    document.title = getTitleForPath(path);

    if (path === '/landing.html' || path === '/landing') {
      window.history.replaceState({}, '', '/');
    }
  }, [path]);

  if (path === '/stick-diagram') return <App mode="stick" />;
  if (path === '/floor-planning' || path === '/floorplan') return <App mode="floorplan" />;
  if (path === '/cmos-diagram' || path === '/cmos') return <App mode="cmos" />;
  return <Landing />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
