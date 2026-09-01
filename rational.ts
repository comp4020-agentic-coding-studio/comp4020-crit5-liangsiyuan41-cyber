// Exact rational arithmetic so "reaches exactly 21" never depends on
// floating-point rounding. Every Rational in play is produced by
// `rational()`, which keeps num/den normalized (reduced, den > 0) --- the
// other functions here rely on that invariant instead of re-normalizing.
export interface Rational {
  readonly num: number;
  readonly den: number;
}

export class DivisionByZeroError extends Error {
  constructor() {
    super("division by zero");
  }
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function rational(num: number, den: number): Rational {
  if (den === 0) throw new DivisionByZeroError();
  if (den < 0) {
    num = -num;
    den = -den;
  }
  if (num === 0) return { num: 0, den: 1 };
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

export function fromInt(value: number): Rational {
  return { num: value, den: 1 };
}

export function add(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den + b.num * a.den, a.den * b.den);
}

export function subtract(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den - b.num * a.den, a.den * b.den);
}

export function multiply(a: Rational, b: Rational): Rational {
  return rational(a.num * b.num, a.den * b.den);
}

export function divide(a: Rational, b: Rational): Rational {
  if (b.num === 0) throw new DivisionByZeroError();
  return rational(a.num * b.den, a.den * b.num);
}

export function equals(a: Rational, b: Rational): boolean {
  return a.num === b.num && a.den === b.den;
}
