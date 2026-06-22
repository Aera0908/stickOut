export const GRID_PITCH = 20;
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.1;
export const LINE_WIDTH = 3;
export const UNDO_LIMIT = 50;
export const AUTOSAVE_KEY = 'stickdiagram-autosave';
export const AUTOSAVE_EXPIRY_DAYS = 30;

export const BASE_LAYERS = {
  poly:          { label: 'Polysilicon (Poly)',      hex: '#E74C3C', dash: null,    customizable: false },
  ndiff:         { label: 'N-Diffusion (N-Active)',  hex: '#27AE60', dash: null,    customizable: false },
  pdiff:         { label: 'P-Diffusion (P-Active)',  hex: '#F1C40F', dash: null,    customizable: false },
  metal1:        { label: 'Metal 1 (M1)',            hex: '#4A90E2', dash: null,    customizable: false },
  metal2:        { label: 'Metal 2 (M2)',            hex: '#C0392B', dash: null,    customizable: false },
  contact:       { label: 'Contact (M→Poly/Diff)',   hex: '#111111', dash: null,    customizable: false },
  via:           { label: 'Via (Metal↔Metal)',        hex: '#9C27B0', dash: null,    customizable: true },
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
  'contact', 'via', 'nwell', 'demarcation', 'nimplant', 'pimplant',
  'buriedcontact', 'silicideblock', 'thickoxide',
];

export const TOOLS = {
  select:  'select',
  line:    'line',
  contact: 'contact',
  label:   'label',
  brush:   'brush',
};
