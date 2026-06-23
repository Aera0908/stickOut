# StickOut — VLSI Stick Diagram Editor

StickOut is an open-source, professional-grade, interactive, browser-based EDA (Electronic Design Automation) tool designed for drawing and editing VLSI stick diagrams. Featuring a modern dark-mode interface, a highly responsive pannable/zoomable canvas, and comprehensive layer management, it allows hardware engineers, researchers, and students to quickly map out silicon-level layouts, manage connectivity, and export publication-ready high-resolution assets.

![Hero Banner](src/assets/hero.png)

---

## ✨ Features

### 🎨 Premium Dark-Mode User Experience
- Designed with a clean glassmorphism palette, harmonious slate gradients, and sleek transitions.
- Interactive, responsive toolbar buttons, collapsible HUD overlays, and sidebar controls.

### 📐 Canvas Workspace & Grid Control
- **Pannable & Zoomable**: Left-click and drag while holding `Space` (or use middle-mouse button) to pan; mouse wheel to zoom dynamically centered on the cursor.
- **Grid & Snapping**: Optional visual grid pitch (`G` to toggle) with precise grid snapping (`S` to toggle) to keep wiring aligned.
- **Interactive Ghosting**: Dragging selected components displays a semi-transparent "ghost" of their original position to help visualize grid offsets before release.

### 🔌 Intelligent Wire Jumps & Connections
- **Same-Layer Jumps**: When orthogonal lines of the *same layer/color* cross, the horizontal line automatically draws a curved bridge arc ("jump") to indicate they are not electrically connected. PMOS and NMOS wires crossing poly, for example, will cross normally (different layers).
- **Right-Click Connection Overrides**: Right-clicking any active jump point dynamically toggles its electrical state. Overridden crossovers render as solid line intersections (normal crossings), indicating a connection. Right-click again to restore the jump.

### 🌈 Layer Control Sidebar & Reordering
Supports full independent control over all standard VLSI layout layers:
- 🔵 **Metal 1 (M1)**: Blue solid line (`#4A90E2`) for standard metal interconnects.
- 🔴 **Metal 2 (M2)**: Red solid line (`#C0392B`) for secondary orthogonal routing.
- 🟡 **P-Diffusion (P-Active)**: Yellow solid line (`#F1C40F`) representing PMOS source/drain regions.
- 🟢 **N-Diffusion (N-Active)**: Green solid line (`#27AE60`) representing NMOS source/drain regions.
- 🟣 **Polysilicon (Poly)**: Purple (`#9B59B6`) by default, toggleable to Red (`#E74C3C`) in the Properties panel, representing transistor gate layers.
- 🔲 **Contacts**: Black outline (light theme) or White outline (dark theme) for M1 to Silicon/Poly connections.
- 🔲 **Vias**: Magenta solid square (`#FF00FF`) for Metal-to-Metal (M1↔M2) connections.
- 🟫 **N-Well / P-Well**: Brown dashed boundary (`#795548`) for bulk isolation regions.
- 🟫 **Demarcation Line**: Thin brown dashed line (`#8D6E63`) separating NMOS and PMOS regions.
- 🟢 **N+ Implant / P+ Implant**: Dashed green (`#43A047`) and yellow (`#F9A825`) outlines for region doping.
- 🔲 **Buried Contact**: Specialized silicon-to-gate connection layer (`#111111`).
- 🔘 **Silicide Block**: Gray dashed pattern (`#9E9E9E`) for resistor/ESD structures.
- 🟠 **Thick Oxide (High-V)**: Orange dashed outline (`#FF6D00`) for high-voltage transistors.
- 🎨 **Dynamic Higher Metals (M3, M4, etc.)**: Dynamically add higher metal layers with customizable colors.

#### Photoshop-Style Layer Operations
- **Visibility (Eye Icon)**: Toggle layer rendering on/off. Hidden elements are immune to selection, dragging, and are skipped in PNG exports.
- **Locking (Lock Icon)**: Toggle selection lock. Locked elements remain visible but cannot be modified, moved, or deleted.
- **Opacity Slider**: Control drawing opacity (10% to 100%) dynamically reflected on the canvas and in export images.
- **Drag-and-Drop Reordering**: Drag and drop layers to rearrange their rendering stack order (bottom to top).
- **Custom Canvas Layers**: Add, rename, or delete custom drawing layers to group annotation and design elements.

### 💾 Local Auto-Save (localStorage)
- Automatically saves the complete workspace layout, layer properties, and canvas state to browser localStorage on any modification.
- Debounced auto-save triggers silently to prevent performance stutter, and auto-restores state cleanly on app mount with a UI toast notification.

### 🔀 Stacked Via + Contact Connections
- Placing a **Via** directly on top of a **Contact** at the same grid point automatically converts both to standard **Square** shapes and applies a small visual offset (1.5px).
- This creates the industry-standard "stacked squares" visual style used to represent direct Metal 2 to Polysilicon connections.

### 🧪 Custom Color Swatch
- Select the custom color swatch to draw wires in any custom color.
- Houses a native HTML5 color picker to choose any custom color.
- Automatically places custom-colored elements on the **Custom Layer** for easy grouping.

### 📝 Mathematical Text Subscript Rendering
- Text labels automatically parse LaTeX-style math subscript formatting. For example, inputs like `V_{DD}`, `V_DD`, `V_{SS}`, and `V_SS` render as elegant, publication-quality serif italic subscript text.
- Supports left and center alignment toggles, as well as toggling the background pill container off for clean, plain text labeling directly on rails.

### 💾 Content-Aware PNG Export
- Under **File -> Export PNG...**, crops output dimensions exactly to the boundary of the elements drawn (plus padding).
- Adjustable margin size (4 grid units, 3 grid units, or none).
- Background options: **Transparent**, **White**, or **Dark**.
- Customizable label text styles: Dark text, Light text, or Pill background.
- Crisp **2x high-resolution** scaling suitable for reports, papers, and presentations.

### 🖌️ Freehand Paintbrush & Eraser
- Switch to the Paintbrush tool to draw freehand markups and annotations directly onto the canvas.
- Features adjustable brush stroke sizes and opacity percentages.
- Use the Eraser tool to cleanly erase brush stroke segments.

### 📋 Clipboard & Duplication Operations
- Full support for standard clipboard commands: **Copy** (`Ctrl + C`), **Cut** (`Ctrl + X`), and **Paste** (`Ctrl + V`).
- **Duplicate** (`Ctrl + D`) replicates the selected elements with a 1-grid-pitch diagonal offset for modular cell replication.

### 🗂️ Keyboard-Driven Layer Reordering
- Reorder layer rendering stack on the fly using hotkeys.
- Selected elements' canvas layers can be sent upward (`Ctrl + ]`), downward (`Ctrl + [`), all the way to the top (`Ctrl + Shift + ]`), or all the way to the bottom (`Ctrl + Shift + [`).

### 📐 Proportional Group Scaling
- Dragging the endpoint of a selected wire when multiple wires are selected scales all selected wires proportionally.
- Constrain modifications to clean integer grid multiples by holding the `Shift` key while scaling.

---

## 🛠️ Technology Stack
- **Framework**: [React](https://react.dev/) + [Vite](https://vite.dev/) (HMR enabled)
- **Canvas API**: HTML5 Canvas for high-performance interactive rendering.
- **Styling**: Pure CSS3 with custom variables for full theme flexibility.
- **Icons**: [Lucide React](https://lucide.dev/) for crisp, scalable vector graphics.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js (version 16 or higher) and npm installed.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Aera0908/stick-diagram.git
   cd stick-diagram
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the local development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173/`.

### Building for Production
To build the application for deployment:
```bash
npm run build
```
The compiled static assets will be located in the `dist/` directory.

---

## ⌨️ Keyboard Shortcuts

The floating Shortcuts HUD in the bottom-left corner of the canvas displays the active hotkeys:

| Key | Action |
|---|---|
| <kbd>V</kbd> | Activate Select / Pointer Tool |
| <kbd>W</kbd> | Activate Wire / Line Tool |
| <kbd>P</kbd> | Activate Via / Contact Tool |
| <kbd>L</kbd> or <kbd>T</kbd> | Activate Label / Text Tool |
| <kbd>B</kbd> | Activate Freehand Paintbrush Tool |
| <kbd>E</kbd> | Activate Eraser Tool |
| <kbd>G</kbd> | Toggle Canvas Grid Visibility |
| <kbd>S</kbd> | Toggle Grid Snapping |
| <kbd>Space</kbd> + Drag | Pan Canvas (or drag with middle-mouse wheel click) |
| <kbd>Del</kbd> / <kbd>Backspace</kbd> | Delete Selected Element(s) |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> | Redo |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save Project (`.stk` file) |
| <kbd>Ctrl</kbd> + <kbd>O</kbd> | Open Project (`.stk` file) |
| <kbd>Ctrl</kbd> + <kbd>A</kbd> | Select All Unlocked Elements |
| <kbd>Ctrl</kbd> + <kbd>C</kbd> | Copy selected elements |
| <kbd>Ctrl</kbd> + <kbd>X</kbd> | Cut selected elements |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Paste clipboard contents |
| <kbd>Ctrl</kbd> + <kbd>D</kbd> | Duplicate selection (offset by 1 grid pitch) |
| <kbd>Ctrl</kbd> + <kbd>[</kbd> | Move selected element's layer down one step |
| <kbd>Ctrl</kbd> + <kbd>]</kbd> | Move selected element's layer up one step |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>[</kbd> | Move layer to bottom of rendering stack |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>]</kbd> | Move layer to top of rendering stack |
| <kbd>Esc</kbd> | Cancel current wire draw or clear selections |

---

## 🗃️ Project Structure

```
stick-diagram/
├── public/                 # Static assets (Favicons, SVG graphics)
├── src/
│   ├── assets/             # Images, logos, and verification media
│   ├── App.css             # Modular layout and styling definitions
│   ├── App.jsx             # React logic, Canvas rendering, and event handlers
│   ├── index.css           # Global resets and CSS variables (UI themes)
│   └── main.jsx            # React root application entrypoint
├── index.html              # HTML5 template wrapper
├── package.json            # Scripts and dependencies
└── vite.config.js          # Vite configurations
```

---

## 👤 Author & Credits

Developed with ❤️ by **Aira Josh Ynte**:
- 🌐 **LinkedIn**: [aira-josh-ynte](https://www.linkedin.com/in/aira-josh-ynte/)
- 📄 **Web Resume**: [aera0908.github.io](https://aera0908.github.io)
- 💻 **GitHub**: [@Aera0908](https://github.com/Aera0908)
- 🐦 **X (Twitter)**: [@aera0908](https://x.com/aera0908)
- 💬 **Discord**: [aeradynamics](https://discord.com/users/aeradynamics)

---

## 📜 License
This project is open-source and licensed under the MIT License.
