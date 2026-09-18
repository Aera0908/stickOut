import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const htmlTitlePlugin = () => ({
  name: 'html-title-plugin',
  transformIndexHtml(html, ctx) {
    const p = (ctx.originalUrl || ctx.path || '/').split('?')[0].replace(/\/+$/, '') || '/';
    let title = 'StickOut — VLSI CAD Suite';
    if (p === '/stick-diagram') title = 'Stick Diagram — StickOut';
    else if (p === '/cmos-diagram' || p === '/cmos') title = 'CMOS Schematic — StickOut';
    else if (p === '/floor-planning' || p === '/floorplan') title = 'Floor Planning — StickOut';

    return html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), htmlTitlePlugin()],
})
