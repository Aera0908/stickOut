// Boolean expression parser for the stick diagram generator.
//
// Accepted syntax (classroom conventions):
//   Variables:  single letters, optionally followed by digits (A, B, S0, S1).
//               Adjacent letters imply AND: "AB" means A·B.
//   AND:        . * & ·          (or implicit adjacency)
//   OR:         + |
//   NOT:        postfix ' (A'), or prefix ! ~ (!A, ~(A+B))
//   Constants:  0, 1
//   Output:     optional "Y = ..." prefix names the output net.

export class ParseError extends Error {
  constructor(message, pos) {
    super(message);
    this.pos = pos;
  }
}

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (/[A-Za-z]/.test(c)) {
      let name = c;
      let j = i + 1;
      while (j < src.length && /[0-9]/.test(src[j])) { name += src[j]; j++; }
      tokens.push({ t: 'var', name: name.toUpperCase(), pos: i });
      i = j;
      continue;
    }
    if (c === '0' || c === '1') { tokens.push({ t: 'const', v: c === '1' ? 1 : 0, pos: i }); i++; continue; }
    if (c === '+' || c === '|' || c === '∨') { tokens.push({ t: 'or', pos: i }); i++; continue; }
    if (c === '.' || c === '*' || c === '&' || c === '·' || c === '∧') { tokens.push({ t: 'and', pos: i }); i++; continue; }
    if (c === '!' || c === '~' || c === '¬') { tokens.push({ t: 'not', pos: i }); i++; continue; }
    if (c === "'" || c === '’' || c === '`') { tokens.push({ t: 'post', pos: i }); i++; continue; }
    if (c === '(') { tokens.push({ t: 'lp', pos: i }); i++; continue; }
    if (c === ')') { tokens.push({ t: 'rp', pos: i }); i++; continue; }
    throw new ParseError(`Unexpected character "${c}"`, i);
  }
  return tokens;
}

// Grammar (OR lowest precedence, then AND, then NOT):
//   expr    := andExpr (OR andExpr)*
//   andExpr := notExpr ((AND)? notExpr)*      -- implicit AND by adjacency
//   notExpr := NOT notExpr | postfix
//   postfix := atom (POST)*
//   atom    := VAR | CONST | '(' expr ')'
function parseTokens(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  const startsFactor = (tok) => tok && (tok.t === 'var' || tok.t === 'const' || tok.t === 'lp' || tok.t === 'not');

  function parseExpr() {
    const children = [parseAnd()];
    while (peek() && peek().t === 'or') { next(); children.push(parseAnd()); }
    return children.length === 1 ? children[0] : { type: 'or', children };
  }

  function parseAnd() {
    const children = [parseNot()];
    for (;;) {
      if (peek() && peek().t === 'and') { next(); children.push(parseNot()); }
      else if (startsFactor(peek())) { children.push(parseNot()); }
      else break;
    }
    return children.length === 1 ? children[0] : { type: 'and', children };
  }

  function parseNot() {
    if (peek() && peek().t === 'not') { next(); return { type: 'not', child: parseNot() }; }
    return parsePostfix();
  }

  function parsePostfix() {
    let node = parseAtom();
    while (peek() && peek().t === 'post') { next(); node = { type: 'not', child: node }; }
    return node;
  }

  function parseAtom() {
    const tok = peek();
    if (!tok) throw new ParseError('Unexpected end of expression', -1);
    if (tok.t === 'var') { next(); return { type: 'var', name: tok.name }; }
    if (tok.t === 'const') { next(); return { type: 'const', value: tok.v }; }
    if (tok.t === 'lp') {
      next();
      const node = parseExpr();
      if (!peek() || peek().t !== 'rp') throw new ParseError('Missing closing parenthesis', tok.pos);
      next();
      return node;
    }
    throw new ParseError('Expected a variable, constant, or "("', tok.pos);
  }

  const ast = parseExpr();
  if (pos < tokens.length) throw new ParseError('Unexpected trailing input', tokens[pos].pos);
  return ast;
}

// Parses full input, optionally with an "OUT = expr" prefix.
// Returns { outputName, ast }.
export function parseInput(text) {
  let outputName = 'Y';
  let exprText = text;
  const eq = text.indexOf('=');
  if (eq >= 0) {
    const lhs = text.slice(0, eq).trim();
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(lhs)) throw new ParseError('Output name before "=" must be a simple identifier', 0);
    outputName = lhs.toUpperCase();
    exprText = text.slice(eq + 1);
  }
  if (!exprText.trim()) throw new ParseError('Empty expression', 0);
  const tokens = tokenize(exprText);
  if (tokens.length === 0) throw new ParseError('Empty expression', 0);
  return { outputName, ast: parseTokens(tokens) };
}
