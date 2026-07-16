import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Landing from './components/Landing.jsx'
import { usePathname } from './router.jsx'

function Root() {
  const path = usePathname();
  if (path === '/stick-diagram') return <App mode="stick" />;
  if (path === '/floor-planning') return <App mode="floorplan" />;
  return <Landing />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
