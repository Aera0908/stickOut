export const GRID_PITCH = 20;
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.1;
export const LINE_WIDTH = 3;
export const UNDO_LIMIT = 50;
export const AUTOSAVE_KEY = 'stickout-autosave';
export const AUTOSAVE_EXPIRY_DAYS = 30;

export const BASE_LAYERS = {
  poly:          { label: 'Polysilicon (Poly)',      hex: '#9B59B6', dash: null,    customizable: false },
  ndiff:         { label: 'N-Diffusion (N-Active)',  hex: '#27AE60', dash: null,    customizable: false },
  pdiff:         { label: 'P-Diffusion (P-Active)',  hex: '#F1C40F', dash: null,    customizable: false },
  metal1:        { label: 'Metal 1 (M1)',            hex: '#4A90E2', dash: null,    customizable: false },
  metal2:        { label: 'Metal 2 (M2)',            hex: '#C0392B', dash: null,    customizable: false },
  contact:       { label: 'Contact (M→Poly/Diff)',   hex: '#111111', dash: null,    customizable: false },
  via:           { label: 'Via (Metal↔Metal)',        hex: '#FF00FF', dash: null,    customizable: true },
  nwell:         { label: 'N-Well / P-Well',         hex: '#795548', dash: [6,4],   customizable: false },
  demarcation:   { label: 'Demarcation Line',        hex: '#8D6E63', dash: [6,4],   customizable: false },
  nimplant:      { label: 'N+ Implant',              hex: '#43A047', dash: [2,4],   customizable: false },
  pimplant:      { label: 'P+ Implant',              hex: '#F9A825', dash: [2,4],   customizable: false },
  buriedcontact: { label: 'Buried Contact',          hex: '#111111', dash: null,    customizable: false },
  silicideblock: { label: 'Silicide Block',          hex: '#9E9E9E', dash: [2,4],   customizable: false },
  thickoxide:    { label: 'Thick Oxide (High-V)',    hex: '#FF6D00', dash: [10,5],  customizable: false },
};

export const HIGHER_METAL_COLORS = [
  '#00BCD4', '#9C27B0', '#FF9800', '#E91E63', '#009688', '#673AB7',
  '#3F51B5', '#00796B', '#F44336', '#2196F3',
];

export const PALETTE_ORDER_BEFORE_METALS = ['poly', 'ndiff', 'pdiff', 'metal1', 'metal2'];
export const PALETTE_ORDER_AFTER_METALS = [
  'via', 'nwell', 'demarcation', 'nimplant', 'pimplant',
  'buriedcontact', 'silicideblock', 'thickoxide',
];

export const TOOLS = {
  select:   'select',
  line:     'line',
  contact:  'contact',
  rect:     'rect',
  label:    'label',
  brush:    'brush',
  eraser:   'eraser',
  measure:  'measure',
  junction: 'junction',
  device:   'device',
};

// ─── CMOS schematic mode ─────────────────────────────────────────────
// Categorized component library for Mixed-Signal & Analog CMOS diagrams.
export const CMOS_CATEGORIES = [
  { id: 'active',  label: 'Active',  title: 'Active & Switching Devices' },
  { id: 'passive', label: 'Passive', title: 'Passives: Resistors, Capacitors, Inductors' },
  { id: 'protect', label: 'Protect', title: 'Protection & Interface: Diodes, Clamps, SCR, Pads' },
  { id: 'power',   label: 'Power',   title: 'Power Rails, Grounds, Well Taps, I/O Ports' },
  { id: 'gates',   label: 'Gates',   title: 'Static CMOS Logic Gate Presets' },
];

export const CMOS_DEVICES = {
  // Active & Switching
  nmos:      { label: 'NMOS',     title: 'NMOS Transistor (3-term or 4-term with Bulk)', category: 'active', defaultType: 'mosfet', text: 'N' },
  pmos:      { label: 'PMOS',     title: 'PMOS Transistor (3-term or 4-term with Bulk)', category: 'active', defaultType: 'mosfet', text: 'P' },
  tgate:     { label: 'T-Gate',   title: 'Transmission Gate / Pass Gate (PMOS + NMOS)', category: 'active', defaultType: 'tgate',  text: 'TG' },
  bjt:       { label: 'BJT',      title: 'Parasitic / Substrate BJT (NPN / PNP)',        category: 'active', defaultType: 'bjt',    text: 'Q' },
  varactor:  { label: 'Varactor', title: 'MOS / Junction Varactor (Variable Cap)',       category: 'active', defaultType: 'varactor', text: 'Cv' },

  // Passive Components
  resistor:  { label: 'Resistor',  title: 'Resistor (Poly, Diffusion, Thin-Film)',       category: 'passive', defaultType: 'resistor', text: 'R' },
  capacitor: { label: 'Capacitor', title: 'Capacitor (MIM, MOM, MOS-cap)',              category: 'passive', defaultType: 'capacitor', text: 'C' },
  inductor:  { label: 'Inductor',  title: 'Inductor (Planar Spiral, Center-Tapped)',     category: 'passive', defaultType: 'inductor', text: 'L' },

  // Protection & Interface
  diode:     { label: 'PN Diode',  title: 'PN Junction Diode (Clamping, Bandgap)',       category: 'protect', defaultType: 'diode', text: 'D' },
  esd_diode: { label: 'ESD Diode', title: 'Dedicated ESD Clamp Diode',                   category: 'protect', defaultType: 'esd_diode', text: 'ESD' },
  scr:       { label: 'SCR',       title: 'SCR / Thyristor (High-Current ESD Shunt)',    category: 'protect', defaultType: 'scr', text: 'SCR' },
  pad:       { label: 'Bond Pad',  title: 'I/O Bond Pad (Wirebond / Flip-Chip)',         category: 'protect', defaultType: 'pad', text: 'PAD' },

  // Power & References
  vdd:       { label: 'VDD Rail',  title: 'VDD Power Rail (Core, Analog, I/O)',          category: 'power', defaultType: 'supply', kind: 'vdd', text: 'VDD' },
  vss:       { label: 'Ground',    title: 'Ground Node (VSS, AGND, Substrate)',          category: 'power', defaultType: 'supply', kind: 'vss', text: 'VSS' },
  well_tap:  { label: 'Well Tap',  title: 'Bulk / Well Tap (NTAP VDD / PTAP VSS)',       category: 'power', defaultType: 'well_tap', text: 'TAP' },
  port:      { label: 'Port Pin',  title: 'Terminal Pin (Input, Output, InOut, Clock)',  category: 'power', defaultType: 'port', text: 'PIN' },
};

export const RESISTOR_SUBTYPES = {
  poly_unsil: { label: 'Poly (Un-silicided)', code: 'RNPO', title: 'Precision analog un-silicided poly resistor' },
  poly_sil:   { label: 'Poly (Silicided)',   code: 'RPOLY', title: 'Low sheet resistance silicided poly resistor' },
  nwell:      { label: 'N-Well Diff',        code: 'RNWELL', title: 'N-Well bulk diffusion resistor' },
  pwell:      { label: 'P-Well Diff',        code: 'RPWELL', title: 'P-Well diffusion resistor' },
  metal:      { label: 'Metal Thin-Film',    code: 'RMETAL', title: 'Precision thin-film metal resistor' },
};

export const CAPACITOR_SUBTYPES = {
  mim:    { label: 'MIM Cap', title: 'Metal-Insulator-Metal high-linearity precision capacitor' },
  mom:    { label: 'MOM Cap', title: 'Metal-Oxide-Metal interdigitated fringe capacitor' },
  moscap: { label: 'MOS Cap', title: 'MOS gate-oxide capacitor' },
};

export const INDUCTOR_SUBTYPES = {
  spiral:        { label: 'Planar Spiral',      title: 'Planar spiral on-chip inductor' },
  center_tapped: { label: 'Center-Tapped Diff', title: 'Symmetrical differential center-tapped inductor' },
};

export const BJT_SUBTYPES = {
  vpnp: { label: 'Vertical PNP', title: 'CMOS vertical PNP substrate BJT (bandgap voltage ref)' },
  lpnp: { label: 'Lateral PNP',  title: 'Lateral PNP transistor' },
  npn:  { label: 'NPN BJT',      title: 'NPN BJT transistor' },
};

export const VARACTOR_SUBTYPES = {
  mos_varactor:      { label: 'MOS Varactor',      title: 'Accumulation / inversion mode MOS varactor' },
  junction_varactor: { label: 'Junction Varactor', title: 'PN junction diode variable capacitor' },
};

export const DIODE_SUBTYPES = {
  pn:        { label: 'PN Junction',     title: 'Standard PN junction diode' },
  esd_clamp: { label: 'ESD Clamp Diode', title: 'Oversized ESD rail clamp diode' },
  esd_dual:  { label: 'Dual Rail Clamp', title: 'Dual clamp to VDD & VSS with I/O tap' },
};

export const POWER_DOMAINS = [
  { value: 'vdd',   label: 'VDD',   domain: 'Core VDD' },
  { value: 'vdda',  label: 'VDDA',  domain: 'Analog VDD' },
  { value: 'vddio', label: 'VDDIO', domain: 'I/O VDD (3.3V)' },
  { value: 'vref',  label: 'VREF',  domain: 'Voltage Reference' },
];

export const GROUND_TYPES = [
  { value: 'vss',  label: 'VSS',  desc: 'Digital Ground' },
  { value: 'agnd', label: 'AGND', desc: 'Analog Ground' },
  { value: 'sub',  label: 'SUB',  desc: 'Substrate Ground' },
];

export const WELL_TAP_TYPES = [
  { value: 'ntap', label: 'N-Well (VDD)', title: 'N-Well tie-high tap' },
  { value: 'ptap', label: 'P-Sub (VSS)',  title: 'P-Substrate tie-low tap' },
];

export const PORT_TYPES = [
  { value: 'in',    label: 'Input',    title: 'Input signal port' },
  { value: 'out',   label: 'Output',   title: 'Output signal port' },
  { value: 'inout', label: 'Bidirect', title: 'Bidirectional I/O port' },
  { value: 'clk',   label: 'Clock',    title: 'Clock input port' },
];

// Connection-dot radii, in canvas pixels.
export const JUNCTION_SIZES = { small: 3, medium: 4, large: 5.5 };

// Default stroke width for CMOS schematic symbols, in canvas pixels.
export const SYMBOL_STROKE_WIDTH = 2;

// Floor-planning wire (power/ground/custom) presets.
// VCC = supply (red), VSS = ground (dark blue), custom = user-recolorable signal net.
export const FP_WIRE_TYPES = {
  vcc:    { label: 'VCC', color: '#E74C3C' },
  vss:    { label: 'VSS', color: '#2C3E50' },
  custom: { label: 'NET', color: '#16A085' },
};

// Wire (stick) thickness presets, in canvas pixels.
export const WIRE_THICKNESS = { small: 2, medium: 3, large: 6 };

// Rectangle tool defaults.
export const RECT_DEFAULT_STROKE = '#4A90E2';
export const RECT_DEFAULT_STROKE_WIDTH = 2;
