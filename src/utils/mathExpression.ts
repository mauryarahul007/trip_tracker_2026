/**
 * Evaluates basic arithmetic expressions safely without `eval` or `Function`.
 * Supports +, -, *, /, x, decimals, and parentheses with proper operator precedence.
 * Returns null if the expression is invalid, incomplete, or results in NaN/Infinity.
 */
export function evaluateMathExpression(expr: string): number | null {
  if (!expr || !expr.trim()) return null;
  const clean = expr.replace(/,/g, '').replace(/x/gi, '*').trim();
  // Ensure only allowed characters: digits, decimal point, operators, parentheses, spaces
  if (!/^[\d\s+\-*/.()]+$/.test(clean)) return null;

  let pos = 0;

  function peek(): string {
    while (pos < clean.length && clean[pos] === ' ') pos++;
    return pos < clean.length ? clean[pos] : '';
  }

  function get(): string {
    while (pos < clean.length && clean[pos] === ' ') pos++;
    return pos < clean.length ? clean[pos++] : '';
  }

  function parseExpr(): number | null {
    let left = parseTerm();
    if (left === null) return null;

    while (peek() === '+' || peek() === '-') {
      const op = get();
      const right = parseTerm();
      if (right === null) return null;
      if (op === '+') {
        left += right;
      } else {
        left -= right;
      }
    }
    return left;
  }

  function parseTerm(): number | null {
    let left = parseFactor();
    if (left === null) return null;

    while (peek() === '*' || peek() === '/') {
      const op = get();
      const right = parseFactor();
      if (right === null) return null;
      if (op === '*') {
        left *= right;
      } else {
        if (right === 0) return null; // Avoid division by zero
        left /= right;
      }
    }
    return left;
  }

  function parseFactor(): number | null {
    let sign = 1;
    while (peek() === '+' || peek() === '-') {
      if (get() === '-') sign = -sign;
    }
    const val = parsePrimary();
    return val === null ? null : sign * val;
  }

  function parsePrimary(): number | null {
    const ch = peek();
    if (ch === '(') {
      get(); // consume '('
      const val = parseExpr();
      if (val === null || peek() !== ')') return null;
      get(); // consume ')'
      return val;
    }
    // Number
    let numStr = '';
    while (pos < clean.length && /[\d.]/.test(clean[pos])) {
      numStr += clean[pos++];
    }
    if (!numStr || numStr === '.') return null;
    const n = parseFloat(numStr);
    return isNaN(n) ? null : n;
  }

  try {
    const result = parseExpr();
    if (result === null) return null;
    // Check for trailing non-whitespace characters
    while (pos < clean.length && clean[pos] === ' ') pos++;
    if (pos < clean.length) return null;

    if (isFinite(result)) {
      return Math.round(result * 100) / 100;
    }
    return null;
  } catch {
    return null;
  }
}
