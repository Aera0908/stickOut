// Transistor-level CMOS schematics for the standard logic gates.
//
// Every gate is static CMOS: a PMOS pull-up network (PUN) from VDD to the
// output node, and its series/parallel dual as an NMOS pull-down network (PDN)
// from the output node to VSS. AND / OR / BUF are the inverting gate followed
// by an inverter stage.
//
// Layouts are authored by hand rather than auto-routed, so each one stays
// readable: transistor columns are aligned, gate nets run on dedicated vertical
// buses on the left, and wires that must cross an unrelated net simply cross —
// the canvas draws a hop there, and a connection dot is placed only where nets
// genuinely join.
//
// Coordinates are laid out around the origin; the caller translates the whole
// block to wherever it should land.

import { GRID_PITCH } from '../constants.js';
import { uid, groupUid } from '../helpers.js';

// Terminal offsets baked into the MOSFET symbol (see helpers.js):
//   gate = (x - 2G, y) — or (x + 2G, y) when mirrored
//   top  = (x, y - 2G)   bottom = (x, y + 2G)
// Stacking two transistors 4G apart therefore connects them in series with no
// wire between them.
const G = GRID_PITCH;

function gateBuilder(canvasLayerId) {
  const els = [];
  const groupId = groupUid();
  const push = (el) => { els.push({ ...el, canvasLayerId, groupId }); return el; };

  return {
    els,
    wire: (x1, y1, x2, y2) => push({ id: uid(), type: 'line', x1, y1, x2, y2, schematic: true, thickness: 'medium', label: '' }),
    pmos: (x, y, label, mirror = false) => push({ id: uid(), type: 'mosfet', device: 'pmos', x, y, rotation: 0, mirror, label, wl: '' }),
    nmos: (x, y, label, mirror = false) => push({ id: uid(), type: 'mosfet', device: 'nmos', x, y, rotation: 0, mirror, label, wl: '' }),
    vdd: (x, y) => push({ id: uid(), type: 'supply', kind: 'vdd', x, y, rotation: 0, label: 'VDD' }),
    vss: (x, y) => push({ id: uid(), type: 'supply', kind: 'vss', x, y, rotation: 0, label: 'VSS' }),
    dot: (x, y) => push({ id: uid(), type: 'junction', x, y, size: 'medium' }),
    text: (x, y, text) => push({ id: uid(), type: 'label', x, y, text, align: 'center', hasBg: false }),
  };
}

// ─── Shared sub-blocks ───────────────────────────────────────────────

// One inverter column centred on (x, y): VDD on top, PMOS over NMOS, VSS below.
// The output node is exactly (x, y).
function inverterColumn(b, x, y, pLabel, nLabel) {
  b.vdd(x, y - 9 * G);
  b.wire(x, y - 9 * G, x, y - 7 * G);
  b.pmos(x, y - 5 * G, pLabel);
  b.wire(x, y - 3 * G, x, y + 3 * G);
  b.nmos(x, y + 5 * G, nLabel);
  b.wire(x, y + 7 * G, x, y + 9 * G);
  b.vss(x, y + 9 * G);
  return {
    pGate: { x: x - 2 * G, y: y - 5 * G },
    nGate: { x: x - 2 * G, y: y + 5 * G },
    out: { x, y },
  };
}

// Vertical bus at busX tying an inverter column's two gates together.
function inverterInputBus(b, col, busX) {
  b.wire(busX, col.pGate.y, col.pGate.x, col.pGate.y);
  b.wire(busX, col.pGate.y, busX, col.nGate.y);
  b.wire(busX, col.nGate.y, col.nGate.x, col.nGate.y);
}

// ─── Single-stage gates ──────────────────────────────────────────────

function buildNot(b) {
  const col = inverterColumn(b, 0, 0, 'MP1', 'MN1');
  inverterInputBus(b, col, -100);
  b.dot(-100, 0);
  b.wire(-100, 0, -160, 0);
  b.text(-180, 0, 'A');
  b.dot(0, 0);
  b.wire(0, 0, 80, 0);
  b.text(100, 0, 'Y');
}

function buildBuf(b) {
  const s1 = inverterColumn(b, 0, 0, 'MP1', 'MN1');
  inverterInputBus(b, s1, -100);
  b.dot(-100, 0);
  b.wire(-100, 0, -160, 0);
  b.text(-180, 0, 'A');

  const s2 = inverterColumn(b, 200, 0, 'MP2', 'MN2');
  inverterInputBus(b, s2, 120);

  // Stage 1 output drives stage 2's gate bus.
  b.dot(0, 0);
  b.wire(0, 0, 120, 0);
  b.dot(120, 0);

  b.dot(200, 0);
  b.wire(200, 0, 280, 0);
  b.text(300, 0, 'Y');
}

// NAND core: PMOS pair in parallel across the top, NMOS pair in series below.
// The output node sits on the spine at (0, -160).
function buildNandCore(b) {
  b.vdd(0, -300);
  b.wire(0, -300, 0, -260);
  b.dot(0, -260);
  b.wire(-80, -260, 80, -260);          // PUN source rail
  b.pmos(-80, -220, 'MP1');
  b.pmos(80, -220, 'MP2', true);
  b.wire(-80, -180, 80, -180);          // PUN drain rail
  b.dot(0, -180);
  b.wire(0, -180, 0, -140);             // spine down to the PDN
  b.nmos(0, -100, 'MN1');
  b.nmos(0, -20, 'MN2');                // stacked in series with MN1
  b.wire(0, 20, 0, 60);
  b.vss(0, 60);

  // Input A — both gates sit on the left, so a single bus reaches them.
  b.wire(-200, -220, -200, -100);
  b.wire(-200, -220, -120, -220);
  b.wire(-200, -100, -40, -100);
  b.dot(-200, -160);
  b.wire(-200, -160, -280, -160);
  b.text(-300, -160, 'A');

  // Input B — MP2's gate faces right, so B runs over the top of the gate.
  // Where it crosses A's wires the canvas draws a hop: no connection.
  b.wire(-160, -380, -160, -20);
  b.wire(-160, -380, 160, -380);
  b.wire(160, -380, 160, -220);
  b.wire(160, -220, 120, -220);
  b.wire(-160, -20, -40, -20);
  b.dot(-160, -60);
  b.wire(-160, -60, -280, -60);
  b.text(-300, -60, 'B');

  return { out: { x: 0, y: -160 } };
}

// NOR core: PMOS pair in series down the spine, NMOS pair in parallel below.
// The output node sits on the spine at (0, -80).
function buildNorCore(b) {
  b.vdd(0, -300);
  b.wire(0, -300, 0, -260);
  b.pmos(0, -220, 'MP1');
  b.pmos(0, -140, 'MP2');               // stacked in series with MP1
  b.wire(0, -100, 0, -60);
  b.dot(0, -60);
  b.wire(-80, -60, 80, -60);            // PDN drain rail
  b.nmos(-80, -20, 'MN1');
  b.nmos(80, -20, 'MN2', true);
  b.wire(-80, 20, 80, 20);              // PDN source rail
  b.dot(0, 20);
  b.wire(0, 20, 0, 60);
  b.vss(0, 60);

  // Input A — PMOS gate on the spine, NMOS gate on the left column.
  b.wire(-200, -220, -200, -20);
  b.wire(-200, -220, -40, -220);
  b.wire(-200, -20, -120, -20);
  b.dot(-200, -180);
  b.wire(-200, -180, -300, -180);
  b.text(-320, -180, 'A');

  // Input B — MN2's gate faces right, so B runs under the gate to reach it.
  b.wire(-160, -140, -160, 140);
  b.wire(-160, -140, -40, -140);
  b.wire(-160, 140, 160, 140);
  b.wire(160, 140, 160, -20);
  b.wire(160, -20, 120, -20);
  b.dot(-160, 60);
  b.wire(-160, 60, -300, 60);
  b.text(-320, 60, 'B');

  return { out: { x: 0, y: -80 } };
}

// Output tap for a bare inverting core (NAND / NOR).
function appendOutputTap(b, core) {
  b.dot(core.out.x, core.out.y);
  b.wire(core.out.x, core.out.y, 180, core.out.y);
  b.text(200, core.out.y, 'Y');
}

// Inverting core + output inverter, i.e. NAND→AND and NOR→OR.
function appendOutputInverter(b, core, pLabel, nLabel) {
  const y = core.out.y;
  const col = inverterColumn(b, 340, y, pLabel, nLabel);
  inverterInputBus(b, col, 260);

  b.dot(core.out.x, y);
  b.wire(core.out.x, y, 260, y);
  b.dot(260, y);

  b.dot(340, y);
  b.wire(340, y, 420, y);
  b.text(440, y, 'Y');
}

// ─── XOR / XNOR ──────────────────────────────────────────────────────

// Both are the same 8-transistor complex gate; only the four input net names
// differ. The PUN is two parallel pairs in series, the PDN two series branches
// in parallel. Complemented inputs (A', B') are taken as available externally —
// the same convention the boolean-expression generator uses.
function buildXorCore(b, nets) {
  const [n1, n2, n3, n4] = nets;

  b.vdd(0, -500);
  b.wire(0, -500, 0, -460);
  b.dot(0, -460);
  b.wire(-80, -460, 80, -460);          // VDD rail
  b.pmos(-80, -420, 'MP1');
  b.pmos(80, -420, 'MP2', true);
  b.wire(-80, -380, 80, -380);          // PUN internal rail
  b.pmos(-80, -340, 'MP3');
  b.pmos(80, -340, 'MP4', true);
  b.wire(-80, -300, 80, -300);          // PUN output rail
  b.dot(0, -300);
  b.wire(0, -300, 0, -260);
  b.dot(0, -260);
  b.wire(-80, -260, 80, -260);          // PDN drain rail
  b.nmos(-80, -220, 'MN1');
  b.nmos(-80, -140, 'MN2');             // series with MN1
  b.nmos(80, -220, 'MN3', true);
  b.nmos(80, -140, 'MN4', true);        // series with MN3
  b.wire(-80, -100, 80, -100);          // PDN source rail
  b.dot(0, -100);
  b.wire(0, -100, 0, -60);
  b.vss(0, -60);

  b.dot(0, -280);
  b.wire(0, -280, 240, -280);
  b.text(260, -280, 'Y');

  // net1 — MP1 and MN1, both on the left column.
  b.wire(-180, -420, -180, -220);
  b.wire(-180, -420, -120, -420);
  b.wire(-180, -220, -120, -220);
  b.dot(-180, -320);
  b.wire(-180, -320, -360, -320);
  b.text(-380, -320, n1);

  // net2 — MN2 on the left, MP2 on the right: routed over the top.
  b.wire(-220, -560, -220, -140);
  b.wire(-220, -140, -120, -140);
  b.wire(-220, -560, 280, -560);
  b.wire(280, -560, 280, -420);
  b.wire(280, -420, 120, -420);
  b.dot(-220, -480);
  b.wire(-220, -480, -360, -480);
  b.text(-380, -480, n2);

  // net3 — MP3 on the left, MN3 on the right: routed under the bottom.
  b.wire(-260, -340, -260, 60);
  b.wire(-260, -340, -120, -340);
  b.wire(-260, 60, 320, 60);
  b.wire(320, 60, 320, -220);
  b.wire(320, -220, 120, -220);
  b.dot(-260, -20);
  b.wire(-260, -20, -360, -20);
  b.text(-380, -20, n3);

  // net4 — MP4 and MN4, both on the right column; fed around the bottom.
  b.wire(160, -340, 160, -140);
  b.wire(160, -340, 120, -340);
  b.wire(160, -140, 120, -140);
  b.wire(-300, -60, -300, 100);
  b.wire(-300, -60, -360, -60);
  b.wire(-300, 100, 360, 100);
  b.wire(360, 100, 360, -240);
  b.wire(360, -240, 160, -240);
  b.dot(160, -240);
  b.text(-380, -60, n4);
}

// ─── Presets ─────────────────────────────────────────────────────────

// Order matters: this drives the toolbar palette.
export const GATE_PRESETS = [
  { id: 'not',  label: 'NOT',  title: 'NOT / Inverter — 2 transistors',        transistors: 2 },
  { id: 'buf',  label: 'BUF',  title: 'BUF / Buffer — 4 transistors',          transistors: 4 },
  { id: 'nand', label: 'NAND', title: 'NAND2 — 4 transistors',                 transistors: 4 },
  { id: 'nor',  label: 'NOR',  title: 'NOR2 — 4 transistors',                  transistors: 4 },
  { id: 'and',  label: 'AND',  title: 'AND2 — NAND2 + inverter, 6 transistors', transistors: 6 },
  { id: 'or',   label: 'OR',   title: 'OR2 — NOR2 + inverter, 6 transistors',  transistors: 6 },
  { id: 'xor',  label: 'XOR',  title: "XOR2 — 8 transistors (needs A', B')",   transistors: 8 },
  { id: 'xnor', label: 'XNOR', title: "XNOR2 — 8 transistors (needs A', B')",  transistors: 8 },
];

// Gates whose complemented inputs are assumed to be supplied externally.
export const GATES_NEEDING_COMPLEMENTS = ['xor', 'xnor'];

export function createGateElements(id, canvasLayerId = 'layer_1') {
  const b = gateBuilder(canvasLayerId);
  switch (id) {
    case 'not':  buildNot(b); break;
    case 'buf':  buildBuf(b); break;
    case 'nand': appendOutputTap(b, buildNandCore(b)); break;
    case 'nor':  appendOutputTap(b, buildNorCore(b)); break;
    case 'and':  appendOutputInverter(b, buildNandCore(b), 'MP3', 'MN3'); break;
    case 'or':   appendOutputInverter(b, buildNorCore(b), 'MP3', 'MN3'); break;
    case 'xor':  buildXorCore(b, ['A', 'B', "A'", "B'"]); break;
    case 'xnor': buildXorCore(b, ['A', "B'", "A'", 'B']); break;
    default: return [];
  }
  return b.els;
}
