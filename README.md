# StickOut

Browser-based Electronic Design Automation (EDA) suite for drawing, synthesizing, and editing VLSI stick diagrams and CMOS layout topologies.

Live Application: [stickout.vercel.app](https://stickout.vercel.app) | Repository: [github.com/Aera0908/stickOut](https://github.com/Aera0908/stickOut) | License: MIT

---

## Overview

StickOut is a specialized CAD environment tailored for VLSI designers, researchers, and computer engineering students. It translates schematic logic and transistor placement into structured silicon stick diagrams, modeling physical mask layers, diffusion intersections, jumper bridge arcs, and stacked interconnect vias directly in the browser.

---

## Core Capabilities

### 1. Canvas Engine & Drafting Modes

- **Infinite Workspace**: Smooth pan and zoom centered on cursor coordinates via middle-mouse drag or `Space` + left-click.
- **Snapping & Alignment**: Configurable grid pitch with strict coordinate snapping (`S`) and visual grid toggle (`G`).
- **Interactive Ghosting**: Real-time semi-transparent position preview while transforming or dragging elements.
- **Three Dedicated Modes**:
  - **Stick Diagram Mode**: Orthogonal routing, standard VLSI layer conventions, and jumper crossovers.
  - **CMOS Gate Mode**: Automated pull-up (PMOS) and pull-down (NMOS) network layout with Euler path diffusion sharing.
  - **Floorplan & Annotation Mode**: Substrate wells, guard rings, demarcation boundaries, and freehand markup.

### 2. Intelligent Interconnect Routing

- **Automatic Wire Jumpers**: When orthogonal wires of the *same layer* cross, the horizontal segment renders a bridge arc indicating no electrical connection. Dissimilar layers (e.g., Poly over Diffusion) intersect flatly as active FET junctions.
- **Crossover State Override**: Right-clicking any active jump point toggles electrical connection on or off, switching dynamically between a bridge arc and a solid electrical junction.
- **Stacked Via & Contact Merging**: Aligning a Via directly over a Contact automatically configures stacked square geometries with sub-pixel offsets, reflecting M2-to-Silicon interconnect standards.

### 3. Layer Management & Photoshop-Style Controls

- **Visibility & Locking**: Per-layer eye and lock toggles to hide layers or protect elements from accidental selection.
- **Variable Opacity**: Real-time layer opacity sliders (10% to 100%) applied across both canvas rendering and exported media.
- **Stack Reordering**: Drag-and-drop layer reordering in the sidebar, with keyboard shortcuts to elevate or demote z-indices.
- **Custom Layers & Palettes**: Create, rename, and color-code user-defined layout layers with integrated HTML5 color selection.

### 4. Boolean Synthesis & Optimization

- **Expression Parser**: Accepts arbitrary Boolean logic equations using standard operators (`AND`, `OR`, `NOT`, `XOR`, `NAND`, `NOR`, `XNOR`).
- **Logic Minimization**: Integrated logic reducer producing simplified sum-of-products representations.
- **Euler Path Routing**: Automatically determines optimal transistor ordering to maximize unbroken diffusion strips.

### 5. Export & Project Serialization

- **Content-Aware PNG Export**: Dynamically calculates the bounding box of drawn components with selectable margin padding (0, 3, or 4 grid units).
- **High-Resolution Output**: 2x pixel density export optimized for IEEE publications, laboratory reports, and presentation slides.
- **Background Control**: Choose between Transparent, Pure White, or Dark Theme canvas backgrounds.
- **LaTeX Math Subscript Rendering**: Text labels format expressions such as `V_{DD}`, `V_DD`, `V_{SS}`, and `V_IN` into serif italic typography.
- **JSON Project Storage (`.stk`)**: Save and load complete project states, including custom layers, undo histories, and viewport configurations.
- **Local Persistence**: Debounced `localStorage` auto-saves the active design session across browser refreshes.

---

## Silicon Layer Specification

The editor conforms to standard VLSI color-coding and design rule conventions:

| Layer Name | Layer Key | Silicon Mask / Function | Standard Color | Rendering Behavior |
|---|---|---|---|---|
| Polysilicon | `poly` | Transistor Gate Electrode | Purple (`#9B59B6`) / Red (`#E74C3C`) | Intersects diffusion to form active channel |
| N-Diffusion | `ndiff` | NMOS Active Region (Source/Drain) | Green (`#27AE60`) | Conductive channel when gate is high |
| P-Diffusion | `pdiff` | PMOS Active Region (Source/Drain) | Yellow (`#F1C40F`) | Conductive channel when gate is low |
| Metal 1 | `metal1` | Primary Intra-Cell Routing Rail | Blue (`#4A90E2`) | Standard interconnect rail |
| Metal 2 | `metal2` | Secondary Interconnect Layer | Red (`#C0392B`) | Orthogonal cross-cell routing |
| Contact | `contact` | Metal 1 to Silicon/Poly Contact | Monochrome square | Joins M1 to active or polysilicon |
| Via | `via` | Metal 1 to Metal 2 Interconnect | Magenta square (`#FF00FF`) | Stacks with Contact for direct M2 connection |
| N-Well | `nwell` | PMOS Bulk Substrate Region | Brown dashed boundary (`#795548`) | Substrate tub demarcation |
| Demarcation | `demarcation` | N-Well / P-Well Split Line | Brown dashed line (`#8D6E63`) | Physical layout separation boundary |
| N+ / P+ Implant | `nimplant` / `pimplant` | Source/Drain Doping Profile | Dashed Green / Yellow outline | Mask region for ion implantation |
| Buried Contact | `buriedcontact` | Direct Gate-to-Diffusion Joint | Dark Charcoal (`#111111`) | Direct poly-diffusion junction |
| Silicide Block | `silicideblock` | Salicide Prevention for Resistors | Gray dashed boundary (`#9E9E9E`) | Prevents low-resistance silicide formation |
| Thick Oxide | `thickoxide` | High-Voltage Dielectric Mask | Orange dashed boundary (`#FF6D00`) | Identifies thick oxide I/O devices |
| Dynamic Metals | `metal3`, `metal4`+ | Multi-Level Metal Interconnects | User-configurable | Additional metallization layers |

---

## Keyboard Shortcuts

| Shortcut | Scope | Action |
|---|---|---|
| `V` | Tool | Select / Transform pointer |
| `W` | Tool | Wire / Interconnect line tool |
| `P` | Tool | Contact / Via placement tool |
| `L` or `T` | Tool | Text label with math subscript support |
| `B` | Tool | Freehand markup paintbrush |
| `E` | Tool | Brush eraser |
| `G` | Canvas | Toggle grid visibility |
| `S` | Canvas | Toggle grid snapping |
| `Space` + Drag | Canvas | Pan viewport (or Middle-Mouse Drag) |
| `Del` / `Backspace` | Edit | Delete selected element(s) |
| `Ctrl` + `Z` | History | Undo previous action |
| `Ctrl` + `Y` | History | Redo action |
| `Ctrl` + `C` | Clipboard | Copy selected elements |
| `Ctrl` + `X` | Clipboard | Cut selected elements |
| `Ctrl` + `V` | Clipboard | Paste clipboard contents |
| `Ctrl` + `D` | Clipboard | Duplicate selection with 1-pitch offset |
| `Ctrl` + `A` | Selection | Select all unlocked elements |
| `Ctrl` + `[` | Layers | Send selected layer down one step |
| `Ctrl` + `]` | Layers | Bring selected layer up one step |
| `Ctrl` + `Shift` + `[` | Layers | Send layer to bottom of stack |
| `Ctrl` + `Shift` + `]` | Layers | Bring layer to top of stack |
| `Ctrl` + `S` | File | Export project to `.stk` JSON file |
| `Ctrl` + `O` | File | Open existing `.stk` project file |
| `Esc` | General | Cancel active drawing or deselect all |

---

## Project Structure

```
stick-diagram/
├── public/                 # Static web assets, manifest, and icons
│   ├── 404.html            # Standalone SPA 404 fallback
│   ├── favicon.svg         # Application icon
│   ├── llm.txt / llms.txt  # LLM system context files
│   ├── manifest.json       # Progressive Web App manifest
│   ├── robots.txt          # Search engine crawlers policy
│   └── sitemap.xml         # XML sitemap
├── src/
│   ├── boolean/            # Boolean synthesis engine
│   │   ├── generate.js     # Dual-rail transistor network synthesis
│   │   ├── minimize.js     # Logic reduction and simplification
│   │   └── parser.js       # Equation tokenization and AST generation
│   ├── cmos/               # Standard CMOS logic cells
│   │   └── gates.js        # Gate topology definitions and Euler algorithms
│   ├── components/         # Modular React UI components
│   │   ├── BooleanModal.jsx      # Equation synthesis dialog
│   │   ├── CanvasArea.jsx        # HTML5 canvas rendering engine & event handling
│   │   ├── ErrorBoundary.jsx     # Global error catching with diagnostic reporting
│   │   ├── ErrorPages.css        # Styling for error and status views
│   │   ├── Landing.jsx           # Documentation and feature showcase page
│   │   ├── LayersPanel.jsx       # Photoshop-style layer stack and reordering
│   │   ├── MenuBar.jsx           # Top application command bar
│   │   ├── Modals.jsx            # Export, settings, help, and feedback dialogs
│   │   ├── NotFoundPage.jsx      # In-app 404 fallback page
│   │   ├── PropertiesPanel.jsx   # Inspector for active selections and coordinates
│   │   ├── StatusBar.jsx         # Bottom status, grid metrics, and diagnostics
│   │   └── Toolbar.jsx           # Expandable left tool and layer palette
│   ├── constants.js        # Default layer configurations and tool enumerations
│   ├── helpers.js          # Geometric calculations, jumper math, and snapping logic
│   ├── router.jsx          # Client-side hash routing handler
│   ├── App.css             # Main workspace styling
│   ├── App.jsx             # Core state coordinator and history management
│   ├── index.css           # Design tokens, variables, and typography
│   └── main.jsx            # React root application bootstrap
├── index.html              # HTML entrypoint and SEO metadata
├── package.json            # Package dependencies and npm scripts
├── vercel.json             # Vercel deployment and routing rules
└── vite.config.js          # Vite build configuration
```

---

## Technology Stack

- **Framework**: React 19 + Vite 8
- **Graphics Pipeline**: HTML5 Canvas 2D Context API with sub-pixel rendering
- **Styling**: Pure CSS3 with custom variables and glassmorphism design tokens
- **Vector Icons**: Lucide React
- **Logic Processing**: Native JavaScript Boolean minimization and graph traversal

---

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (version 18 or higher) and npm installed.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Aera0908/stickOut.git
   cd stickOut
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch development server:
   ```bash
   npm run dev
   ```
   The local application will be available at `http://localhost:5173/`.

### Production Build

Compile optimized static assets:
```bash
npm run build
```

Preview production build locally:
```bash
npm run preview
```

---

## Author

Developed by **Aira Josh Ynte**:
- Web Resume: [aera0908.github.io](https://aera0908.github.io)
- GitHub: [@Aera0908](https://github.com/Aera0908)
- X (Twitter): [@aera0908](https://x.com/aera0908)
- Discord: `aeradynamics`

---

## License

This project is licensed under the [MIT License](LICENSE).
