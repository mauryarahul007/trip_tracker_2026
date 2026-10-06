class _MathParser {
  final String clean;
  int pos = 0;

  _MathParser(this.clean);

  String peek() {
    while (pos < clean.length && clean[pos] == ' ') {
      pos++;
    }
    return pos < clean.length ? clean[pos] : '';
  }

  String get() {
    while (pos < clean.length && clean[pos] == ' ') {
      pos++;
    }
    return pos < clean.length ? clean[pos++] : '';
  }

  double? parsePrimary() {
    final ch = peek();
    if (ch == '(') {
      get(); // consume '('
      final val = parseExpr();
      if (val == null || peek() != ')') return null;
      get(); // consume ')'
      return val;
    }

    final numStart = pos;
    while (pos < clean.length && RegExp(r'[\d.]').hasMatch(clean[pos])) {
      pos++;
    }
    final numStr = clean.substring(numStart, pos);
    if (numStr.isEmpty || numStr == '.') return null;
    return double.tryParse(numStr);
  }

  double? parseFactor() {
    int sign = 1;
    while (peek() == '+' || peek() == '-') {
      if (get() == '-') sign = -sign;
    }
    final val = parsePrimary();
    return val == null ? null : sign * val;
  }

  double? parseTerm() {
    var left = parseFactor();
    if (left == null) return null;

    while (peek() == '*' || peek() == '/') {
      final op = get();
      final right = parseFactor();
      if (right == null) return null;
      if (op == '*') {
        left = left! * right;
      } else {
        if (right == 0) return null; // Avoid division by zero
        left = left! / right;
      }
    }
    return left;
  }

  double? parseExpr() {
    var left = parseTerm();
    if (left == null) return null;

    while (peek() == '+' || peek() == '-') {
      final op = get();
      final right = parseTerm();
      if (right == null) return null;
      if (op == '+') {
        left = left! + right;
      } else {
        left = left! - right;
      }
    }
    return left;
  }

  double? parse() {
    try {
      final result = parseExpr();
      if (result == null) return null;
      while (pos < clean.length && clean[pos] == ' ') {
        pos++;
      }
      if (pos < clean.length) return null;

      if (result.isFinite) {
        return ((result + 1e-7) * 100).round() / 100.0;
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}

double? evaluateMathExpression(String expr) {
  if (expr.trim().isEmpty) return null;
  final clean = expr.replaceAll(',', '').replaceAll(RegExp(r'x', caseSensitive: false), '*').trim();
  if (!RegExp(r'^[\d\s+\-*/.()]+$').hasMatch(clean)) return null;

  final parser = _MathParser(clean);
  return parser.parse();
}
