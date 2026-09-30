import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Landing from './components/Landing.jsx'
import NotFoundPage from './components/NotFoundPage.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { usePathname, getTitleForPath } from './router.jsx'

function TestErrorThrower() {
  throw new Error('Simulated CAD Kernel Crash: Voltage regulator fault detected on VDD_SENSE pin.');
}

function Root() {
  const rawPath = usePathname();
  const path = (rawPath || '/').replace(/\/+$/, '') || '/';

  useEffect(() => {
    document.title = getTitleForPath(path);

    if (path === '/landing.html' || path === '/landing') {
      window.history.replaceState({}, '', '/');
    }
  }, [path]);

  // Route: Test Error Boundary
  if (path === '/test-error' || path === '/__test_error__') {
    return <TestErrorThrower />;
  }

  // Known CAD Application Routes
  if (path === '/stick-diagram') return <App mode="stick" />;
  if (path === '/floor-planning' || path === '/floorplan') return <App mode="floorplan" />;
  if (path === '/cmos-diagram' || path === '/cmos') return <App mode="cmos" />;
  if (path === '/' || path === '/landing.html' || path === '/landing') return <Landing />;

  // 404 Route for any unmatched paths
  return <NotFoundPage currentPath={rawPath} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)
