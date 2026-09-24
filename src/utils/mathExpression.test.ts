import { describe, it, expect } from 'vitest';
import { evaluateMathExpression } from './mathExpression';

describe('evaluateMathExpression', () => {
  it('evaluates basic addition and subtraction', () => {
    expect(evaluateMathExpression('450 + 120')).toBe(570);
    expect(evaluateMathExpression('500 - 80')).toBe(420);
    expect(evaluateMathExpression('100 + 50 - 25')).toBe(125);
  });

  it('evaluates multiplication and division', () => {
    expect(evaluateMathExpression('15 * 4')).toBe(60);
    expect(evaluateMathExpression('15 x 4')).toBe(60);
    expect(evaluateMathExpression('100 / 4')).toBe(25);
    expect(evaluateMathExpression('10 / 3')).toBe(3.33);
  });

  it('respects standard operator precedence', () => {
    expect(evaluateMathExpression('10 + 5 * 2')).toBe(20);
    expect(evaluateMathExpression('(10 + 5) * 2')).toBe(30);
    expect(evaluateMathExpression('100 - 20 / 2')).toBe(90);
  });

  it('handles decimal numbers and comma separators', () => {
    expect(evaluateMathExpression('12.50 + 7.25')).toBe(19.75);
    expect(evaluateMathExpression('1,200 + 300')).toBe(1500);
  });

  it('handles unary plus and minus', () => {
    expect(evaluateMathExpression('-50 + 100')).toBe(50);
    expect(evaluateMathExpression('+40 + 60')).toBe(100);
  });

  it('returns plain numbers as-is', () => {
    expect(evaluateMathExpression('250.75')).toBe(250.75);
    expect(evaluateMathExpression('0')).toBe(0);
  });

  it('returns null on invalid or incomplete expressions', () => {
    expect(evaluateMathExpression('')).toBeNull();
    expect(evaluateMathExpression('   ')).toBeNull();
    expect(evaluateMathExpression('abc')).toBeNull();
    expect(evaluateMathExpression('10 +')).toBeNull();
    expect(evaluateMathExpression('10 / 0')).toBeNull();
    expect(evaluateMathExpression('(10 + 5')).toBeNull();
  });
});
