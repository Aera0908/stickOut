import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Landing from './components/Landing.jsx'
import { usePathname } from './router.jsx'

function Root() {
  const path = usePathname();

  useEffect(() => {
    if (path === '/stick-diagram') {
      document.title = 'Stick Diagram — StickOut';
    } else if (path === '/floor-planning' || path === '/floorplan') {
      document.title = 'Floor Planning — StickOut';
    } else if (path === '/cmos-diagram' || path === '/cmos') {
      document.title = 'CMOS Diagram — StickOut';
    } else {
      document.title = 'StickOut — Free Online VLSI Stick Diagram Maker & Editor';
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
