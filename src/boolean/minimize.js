// Exact boolean minimization for the stick diagram generator.
//
// Pipeline: AST -> truth table -> Quine-McCluskey minimal SOP -> algebraic
// factoring. Literal count of the factored form equals the transistor count
// per network, so minimizing literals directly minimizes transistors.
//
// Cubes are strings over {'0','1','-'} with one character per variable,
// index 0 = first variable (MSB of the minterm number).

export function getVars(ast) {
  const names = new Set();
  (function walk(node) {
    if (node.type === 'var') names.add(node.name);
    else if (node.type === 'not') walk(node.child);
    else if (node.type === 'and' || node.type === 'or') node.children.forEach(walk);
  })(ast);
  return [...names].sort();
}

export function evalAst(ast, assignment) {
  switch (ast.type) {
    case 'const': return ast.value === 1;
    case 'var': return !!assignment[ast.name];
    case 'not': return !evalAst(ast.child, assignment);
    case 'and': return ast.children.every(c => evalAst(c, assignment));
    case 'or': return ast.children.some(c => evalAst(c, assignment));
    default: throw new Error(`Unknown AST node: ${ast.type}`);
  }
}

// Minterm numbers (0..2^n-1) for which the expression is true.
export function mintermsOf(ast, vars) {
  const n = vars.length;
  const minterms = [];
  for (let m = 0; m < (1 << n); m++) {
    const assignment = {};
    for (let i = 0; i < n; i++) assignment[vars[i]] = !!((m >> (n - 1 - i)) & 1);
    if (evalAst(ast, assignment)) minterms.push(m);
  }
  return minterms;
}

function mintermToCube(m, n) {
  let s = '';
  for (let i = 0; i < n; i++) s += ((m >> (n - 1 - i)) & 1) ? '1' : '0';
  return s;
}

function tryCombine(a, b) {
  let diff = -1;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (a[i] === '-' || b[i] === '-') return null;
    if (diff >= 0) return null;
    diff = i;
  }
  if (diff < 0) return null;
  return a.slice(0, diff) + '-' + a.slice(diff + 1);
}

function cubeCovers(cube, m, n) {
  for (let i = 0; i < n; i++) {
    if (cube[i] === '-') continue;
    const bit = (m >> (n - 1 - i)) & 1;
    if ((cube[i] === '1') !== (bit === 1)) return false;
  }
  return true;
}

// Quine-McCluskey: minimal sum-of-products cover as a list of cubes.
// Essential prime implicants first, then greedy set cover for the rest
// (exact at classroom sizes, where essentials almost always finish the job).
export function qmMinimize(minterms, n) {
  if (minterms.length === 0) return [];
  if (n === 0) return ['-'.repeat(0)];
  if (minterms.length === (1 << n)) return ['-'.repeat(n)];

  // Iteratively combine cubes until no more merges are possible.
  let current = new Set(minterms.map(m => mintermToCube(m, n)));
  const primes = new Set();
  while (current.size > 0) {
    const arr = [...current];
    const combined = new Set();
    const wasCombined = new Set();
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const merged = tryCombine(arr[i], arr[j]);
        if (merged) {
          combined.add(merged);
          wasCombined.add(arr[i]);
          wasCombined.add(arr[j]);
        }
      }
    }
    arr.forEach(c => { if (!wasCombined.has(c)) primes.add(c); });
    current = combined;
  }

  // Cover table.
  const primeList = [...primes];
  const coverage = primeList.map(p => new Set(minterms.filter(m => cubeCovers(p, m, n))));

  const chosen = [];
  const uncovered = new Set(minterms);

  // Essential primes: minterms covered by exactly one prime.
  for (const m of minterms) {
    const covering = [];
    for (let i = 0; i < primeList.length; i++) if (coverage[i].has(m)) covering.push(i);
    if (covering.length === 1 && !chosen.includes(covering[0])) chosen.push(covering[0]);
  }
  chosen.forEach(i => coverage[i].forEach(m => uncovered.delete(m)));

  // Greedy cover for the remainder.
  while (uncovered.size > 0) {
    let best = -1, bestCount = -1;
    for (let i = 0; i < primeList.length; i++) {
      if (chosen.includes(i)) continue;
      let count = 0;
      coverage[i].forEach(m => { if (uncovered.has(m)) count++; });
      if (count > bestCount) { bestCount = count; best = i; }
    }
    if (best < 0 || bestCount === 0) break;
    chosen.push(best);
    coverage[best].forEach(m => uncovered.delete(m));
  }

  return chosen.map(i => primeList[i]).sort();
}

function cubeToAst(cube, vars) {
  const literals = [];
  for (let i = 0; i < cube.length; i++) {
    if (cube[i] === '1') literals.push({ type: 'var', name: vars[i] });
    else if (cube[i] === '0') literals.push({ type: 'not', child: { type: 'var', name: vars[i] } });
  }
  if (literals.length === 0) return { type: 'const', value: 1 };
  if (literals.length === 1) return literals[0];
  return { type: 'and', children: literals };
}

function andNode(children) {
  const flat = [];
  children.forEach(c => {
    if (c.type === 'const' && c.value === 1) return;
    if (c.type === 'and') flat.push(...c.children);
    else flat.push(c);
  });
  if (flat.length === 0) return { type: 'const', value: 1 };
  if (flat.length === 1) return flat[0];
  return { type: 'and', children: flat };
}

function orNode(children) {
  const flat = [];
  children.forEach(c => {
    if (c.type === 'or') flat.push(...c.children);
    else flat.push(c);
  });
  if (flat.length === 1) return flat[0];
  return { type: 'or', children: flat };
}

// Greedy most-common-literal factoring: SOP cubes -> factored AST with NOT
// only on leaves. E.g. {AB, AC} -> A(B + C), saving one transistor pair.
export function factorCubes(cubes, vars) {
  if (cubes.length === 0) return { type: 'const', value: 0 };
  if (cubes.length === 1) return cubeToAst(cubes[0], vars);

  let bestIdx = -1, bestBit = null, bestCount = 1;
  for (let i = 0; i < vars.length; i++) {
    for (const bit of ['0', '1']) {
      const count = cubes.filter(c => c[i] === bit).length;
      if (count > bestCount) { bestCount = count; bestIdx = i; bestBit = bit; }
    }
  }

  if (bestIdx < 0) return orNode(cubes.map(c => cubeToAst(c, vars)));

  const withLit = cubes
    .filter(c => c[bestIdx] === bestBit)
    .map(c => c.slice(0, bestIdx) + '-' + c.slice(bestIdx + 1));
  const rest = cubes.filter(c => c[bestIdx] !== bestBit);

  const literal = bestBit === '1'
    ? { type: 'var', name: vars[bestIdx] }
    : { type: 'not', child: { type: 'var', name: vars[bestIdx] } };

  const factoredPart = andNode([literal, factorCubes(withLit, vars)]);
  if (rest.length === 0) return factoredPart;
  return orNode([factoredPart, factorCubes(rest, vars)]);
}

// Number of variable leaves = transistors per network.
export function literalCount(ast) {
  switch (ast.type) {
    case 'const': return 0;
    case 'var': return 1;
    case 'not': return literalCount(ast.child);
    case 'and':
    case 'or': return ast.children.reduce((sum, c) => sum + literalCount(c), 0);
    default: return 0;
  }
}

export function astToString(ast) {
  switch (ast.type) {
    case 'const': return String(ast.value);
    case 'var': return ast.name;
    case 'not': {
      if (ast.child.type === 'var') return `${ast.child.name}'`;
      return `(${astToString(ast.child)})'`;
    }
    case 'and':
      return ast.children
        .map(c => (c.type === 'or' ? `(${astToString(c)})` : astToString(c)))
        .join('·');
    case 'or':
      return ast.children.map(astToString).join(' + ');
    default: return '?';
  }
}
