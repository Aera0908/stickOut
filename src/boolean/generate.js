// Boolean expression -> CMOS complex-gate stick diagram.
//
// The gate implements Y = f directly: the NMOS pull-down network (PDN) is
// built from the minimized, factored form of f' (so Y = !(PDN) = f), and the
// PMOS pull-up network (PUN) is its series/parallel dual. Inputs that appear
// complemented (e.g. A') assume the inverted signal is available externally.
//
// Layout style matches the app's built-in template: horizontal VDD/VSS metal1
// rails, horizontal pdiff/ndiff strips, one vertical poly column per
// transistor pair, metal1 routing with contacts at diffusion.

import { GRID_PITCH, BASE_LAYERS } from '../constants.js';
import { uid } from '../helpers.js';
import { parseInput } from './parser.js';
import { getVars, mintermsOf, qmMinimize, factorCubes, astToString, literalCount } from './minimize.js';

const MAX_VARS = 6;

// ─── Series/parallel network construction ────────────────────────────

// Factored AST (NOT only on leaves) -> SP tree.
function toSpTree(ast) {
  switch (ast.type) {
    case 'var': return { kind: 'leaf', name: ast.name, neg: false };
    case 'not': return { kind: 'leaf', name: ast.child.name, neg: true };
    case 'and': return { kind: 'series', children: ast.children.map(toSpTree) };
    case 'or': return { kind: 'parallel', children: ast.children.map(toSpTree) };
    default: throw new Error('Constant expression cannot be synthesized');
  }
}

// Dual network: swap series <-> parallel, keep leaf order.
function dualSpTree(sp) {
  if (sp.kind === 'leaf') return { ...sp };
  return {
    kind: sp.kind === 'series' ? 'parallel' : 'series',
    children: sp.children.map(dualSpTree),
  };
}

// Walk the SP tree between nets top..bottom, assigning terminal nets to each
// transistor. Leaves are emitted in-order, so the PDN and its dual PUN yield
// transistors in the same column order.
function assignNets(sp, top, bottom, makeNet, out) {
  if (sp.kind === 'leaf') {
    out.push({ name: sp.name, neg: sp.neg, a: top, b: bottom });
    return;
  }
  if (sp.kind === 'series') {
    let prev = top;
    sp.children.forEach((child, i) => {
      const next = i === sp.children.length - 1 ? bottom : makeNet();
      assignNets(child, prev, next, makeNet, out);
      prev = next;
    });
    return;
  }
  sp.children.forEach(child => assignNets(child, top, bottom, makeNet, out));
}

// ─── Row placement: orientation + diffusion sharing ──────────────────

// Greedy Euler-style walk: orient each transistor (which net faces left/right)
// so adjacent transistors share a diffusion node whenever their nets allow it.
function placeRow(transistors) {
  const orient = [];
  const shared = [];
  for (let i = 0; i < transistors.length; i++) {
    const t = transistors[i];
    if (i > 0) {
      const prevRight = orient[i - 1].right;
      if (t.a === prevRight || t.b === prevRight) {
        shared[i] = true;
        orient[i] = { left: prevRight, right: t.a === prevRight ? t.b : t.a };
        continue;
      }
      shared[i] = false;
    }
    const next = transistors[i + 1];
    const touchesNext = (net) => next && (net === next.a || net === next.b);
    if (touchesNext(t.b) && !touchesNext(t.a)) orient[i] = { left: t.a, right: t.b };
    else if (touchesNext(t.a)) orient[i] = { left: t.b, right: t.a };
    else orient[i] = { left: t.a, right: t.b };
  }
  return { orient, shared };
}

// Diffusion node positions and strip segments for one row.
function buildRowNodes(orient, shared, colX, g) {
  const nodes = [];
  const segments = [];
  let runStartX = colX[0] - g;
  nodes.push({ net: orient[0].left, x: colX[0] - g });
  for (let i = 1; i < orient.length; i++) {
    if (shared[i]) {
      nodes.push({ net: orient[i].left, x: (colX[i - 1] + colX[i]) / 2 });
    } else {
      nodes.push({ net: orient[i - 1].right, x: colX[i - 1] + g });
      segments.push({ x1: runStartX, x2: colX[i - 1] + g });
      runStartX = colX[i] - g;
      nodes.push({ net: orient[i].left, x: colX[i] - g });
    }
  }
  const last = orient.length - 1;
  nodes.push({ net: orient[last].right, x: colX[last] + g });
  segments.push({ x1: runStartX, x2: colX[last] + g });
  return { nodes, segments };
}

function netPositions(nodes) {
  const map = new Map();
  nodes.forEach(({ net, x }) => {
    if (!map.has(net)) map.set(net, new Set());
    map.get(net).add(x);
  });
  const result = new Map();
  map.forEach((xs, net) => result.set(net, [...xs].sort((a, b) => a - b)));
  return result;
}

// ─── Analysis ────────────────────────────────────────────────────────

// Parse + minimize. Returns { ok, error } or the full analysis including
// generated elements (positioned near the origin; caller translates them).
export function analyzeExpression(text) {
  let outputName, ast;
  try {
    ({ outputName, ast } = parseInput(text));
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const vars = getVars(ast);
  if (vars.length === 0) return { ok: false, error: 'Expression has no variables — nothing to synthesize.' };
  if (vars.length > MAX_VARS) return { ok: false, error: `Too many variables (${vars.length}); maximum is ${MAX_VARS}.` };

  const n = vars.length;
  const mintermsF = mintermsOf(ast, vars);
  if (mintermsF.length === 0) return { ok: false, error: `Expression is always 0 — tie ${outputName} to VSS instead.` };
  if (mintermsF.length === (1 << n)) return { ok: false, error: `Expression is always 1 — tie ${outputName} to VDD instead.` };

  const all = new Set(mintermsF);
  const mintermsFc = [];
  for (let m = 0; m < (1 << n); m++) if (!all.has(m)) mintermsFc.push(m);

  const factoredF = factorCubes(qmMinimize(mintermsF, n), vars);
  const pdnAst = factorCubes(qmMinimize(mintermsFc, n), vars); // PDN implements f'

  const transistorsPerNetwork = literalCount(pdnAst);
  const negatedInputs = new Set();
  (function findNeg(node) {
    if (node.type === 'not' && node.child.type === 'var') negatedInputs.add(node.child.name);
    else if (node.type === 'and' || node.type === 'or') node.children.forEach(findNeg);
  })(pdnAst);

  let elements;
  try {
    elements = generateGateElements(pdnAst, outputName);
  } catch (e) {
    return { ok: false, error: e.message };
  }

  return {
    ok: true,
    outputName,
    minimizedString: `${outputName} = ${astToString(factoredF)}`,
    pdnString: astToString(pdnAst),
    transistorCount: transistorsPerNetwork * 2,
    negatedInputs: [...negatedInputs].sort(),
    elements,
  };
}

// ─── Element emission ────────────────────────────────────────────────

function line(x1, y1, x2, y2, layerId) {
  return {
    id: uid(), type: 'line', x1, y1, x2, y2,
    layerId, color: BASE_LAYERS[layerId].hex, label: '',
    canvasLayerId: `canvas_vlsi_${layerId}`,
  };
}

function contact(x, y) {
  return {
    id: uid(), type: 'contact', x, y, size: 'small', shape: 'square',
    layerId: 'contact', color: '#111111', canvasLayerId: 'canvas_vlsi_contact',
  };
}

function label(x, y, text, canvasLayerId = 'canvas_vlsi_metal1') {
  return { id: uid(), type: 'label', x, y, text, align: 'center', hasBg: false, canvasLayerId };
}

function generateGateElements(pdnAst, outputName) {
  const g = GRID_PITCH;
  const spPdn = toSpTree(pdnAst);
  const spPun = dualSpTree(spPdn);

  let nCounter = 0, pCounter = 0;
  const pdnT = [];
  const punT = [];
  assignNets(spPdn, 'OUT', 'VSS', () => `n${++nCounter}`, pdnT);
  assignNets(spPun, 'VDD', 'OUT', () => `p${++pCounter}`, punT);
  const count = pdnT.length;

  const pdnPlace = placeRow(pdnT);
  const punPlace = placeRow(punT);

  // Global column x positions, aligned across both rows. A diffusion break in
  // either row widens the gap so both broken node stubs stay on-grid.
  const colX = [0];
  for (let i = 1; i < count; i++) {
    const bothShared = pdnPlace.shared[i] && punPlace.shared[i];
    colX[i] = colX[i - 1] + (bothShared ? 2 : 4) * g;
  }

  const pRow = buildRowNodes(punPlace.orient, punPlace.shared, colX, g);
  const nRow = buildRowNodes(pdnPlace.orient, pdnPlace.shared, colX, g);
  const pNets = netPositions(pRow.nodes);
  const nNets = netPositions(nRow.nodes);

  // Internal nets that surface at more than one diffusion position need a
  // horizontal metal1 routing track; single-position internal nets are just
  // a shared diffusion node.
  const pTrackNets = [...pNets.keys()].filter(net => /^p\d+$/.test(net) && pNets.get(net).length > 1);
  const nTrackNets = [...nNets.keys()].filter(net => /^n\d+$/.test(net) && nNets.get(net).length > 1);

  // Vertical geometry.
  const vddY = 0;
  const pdiffY = vddY + (pTrackNets.length + 2) * g;
  const midY = pdiffY + 2 * g;
  const ndiffY = midY + 2 * g;
  const vssY = ndiffY + (nTrackNets.length + 2) * g;

  const railX1 = colX[0] - 2 * g;
  const railX2 = colX[count - 1] + 3 * g;

  const els = [];

  // Rails + labels.
  els.push(line(railX1, vddY, railX2, vddY, 'metal1'));
  els.push(line(railX1, vssY, railX2, vssY, 'metal1'));
  els.push(label(railX1 - 1.5 * g, vddY, 'V_{DD}'));
  els.push(label(railX1 - 1.5 * g, vssY, 'V_{SS}'));

  // Diffusion strips.
  pRow.segments.forEach(s => els.push(line(s.x1, pdiffY, s.x2, pdiffY, 'pdiff')));
  nRow.segments.forEach(s => els.push(line(s.x1, ndiffY, s.x2, ndiffY, 'ndiff')));

  // Poly columns + input labels (poly crossing metal rails is a non-connection).
  for (let i = 0; i < count; i++) {
    els.push(line(colX[i], pdiffY - g, colX[i], vssY + g, 'poly'));
    const name = pdnT[i].name + (pdnT[i].neg ? "'" : '');
    els.push(label(colX[i], vssY + g + 12, name, 'canvas_vlsi_poly'));
  }

  // Rail connections: PMOS sources to VDD, NMOS sources to VSS.
  (pNets.get('VDD') || []).forEach(x => {
    els.push(line(x, vddY, x, pdiffY, 'metal1'));
    els.push(contact(x, pdiffY));
  });
  (nNets.get('VSS') || []).forEach(x => {
    els.push(line(x, ndiffY, x, vssY, 'metal1'));
    els.push(contact(x, ndiffY));
  });

  // Output net: drops from both rows onto a middle metal1 track.
  const outXs = [];
  (pNets.get('OUT') || []).forEach(x => {
    els.push(line(x, pdiffY, x, midY, 'metal1'));
    els.push(contact(x, pdiffY));
    outXs.push(x);
  });
  (nNets.get('OUT') || []).forEach(x => {
    els.push(line(x, ndiffY, x, midY, 'metal1'));
    els.push(contact(x, ndiffY));
    outXs.push(x);
  });
  const outMinX = Math.min(...outXs);
  els.push(line(outMinX, midY, railX2, midY, 'metal1'));
  els.push(label(railX2 + g, midY, outputName));

  // Internal-net routing tracks (metal1 jumpers over the diffusion rows).
  pTrackNets.forEach((net, k) => {
    const trackY = vddY + (k + 1) * g;
    const xs = pNets.get(net);
    els.push(line(xs[0], trackY, xs[xs.length - 1], trackY, 'metal1'));
    xs.forEach(x => {
      els.push(line(x, trackY, x, pdiffY, 'metal1'));
      els.push(contact(x, pdiffY));
    });
  });
  nTrackNets.forEach((net, k) => {
    const trackY = ndiffY + (k + 1) * g;
    const xs = nNets.get(net);
    els.push(line(xs[0], trackY, xs[xs.length - 1], trackY, 'metal1'));
    xs.forEach(x => {
      els.push(line(x, ndiffY, x, trackY, 'metal1'));
      els.push(contact(x, ndiffY));
    });
  });

  return els;
}
