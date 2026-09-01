// Contract tests for Make 21's rules engine (retires with this week's brief,
// per spec/README.md). The engine is DOM-free --- these exercise it directly.
import { describe, expect, it } from "vitest";
import { DivisionByZeroError, divide, equals, fromInt, multiply, rational } from "../rational.ts";
import { evaluate, op, tile, validateExpression, type Operator, type Tile, type Token } from "../expression.ts";

function tiles(...values: number[]): Tile[] {
  return values.map((value, i) => ({ id: `t${i}`, value: fromInt(value) }));
}

describe("evaluate: standard precedence, no parentheses", () => {
  it("2 + 4 * 5 - 1 = 21, using every tile exactly once", () => {
    const [a, b, c, d] = tiles(2, 4, 5, 1) as [Tile, Tile, Tile, Tile];
    const tokens: Token[] = [tile(a), op("+"), tile(b), op("*"), tile(c), op("-"), tile(d)];

    expect(validateExpression([a, b, c, d], tokens).valid).toBe(true);
    expect(equals(evaluate(tokens), fromInt(21))).toBe(true);

    // Multiplication binds tighter than the surrounding +/-: 2 + (4*5) - 1 = 21.
    // A reader that instead folds strictly left to right --- ((2 + 4) * 5) - 1
    // --- lands on 29. The two results must disagree, or this test isn't
    // actually pinning down precedence.
    expect(naiveLeftToRight([2, 4, 5, 1], ["+", "*", "-"])).toBe(29);
  });
});

describe("evaluate: equal precedence, left to right, exact fractions", () => {
  it("30 - 6 / 4 * 6 = 21, dividing before multiplying because it comes first", () => {
    const [a, b, c, d] = tiles(30, 6, 4, 6) as [Tile, Tile, Tile, Tile];
    const tokens: Token[] = [tile(a), op("-"), tile(b), op("/"), tile(c), op("*"), tile(d)];

    expect(validateExpression([a, b, c, d], tokens).valid).toBe(true);

    // 6 / 4 lands on the exact fraction 3/2, not a rounded decimal --- and
    // only that fraction, carried forward exactly, reaches 21 downstream.
    expect(divide(fromInt(6), fromInt(4))).toEqual(rational(3, 2));

    expect(equals(evaluate(tokens), fromInt(21))).toBe(true);

    // If * and / didn't share precedence evaluated left to right, the other
    // grouping --- 6 / (4 * 6) --- would apply instead: 1/4, not 3/2, and
    // the whole expression would land on 29.75, not 21.
    const rightToLeftGrouping = divide(fromInt(6), multiply(fromInt(4), fromInt(6)));
    expect(rightToLeftGrouping).toEqual(rational(1, 4));
    expect(equals(rightToLeftGrouping, rational(3, 2))).toBe(false);
  });
});

describe("validateExpression", () => {
  const [a, b, c, d] = tiles(2, 4, 5, 1) as [Tile, Tile, Tile, Tile];

  it("accepts a complete expression using every tile once", () => {
    const tokens: Token[] = [tile(a), op("+"), tile(b), op("*"), tile(c), op("-"), tile(d)];
    expect(validateExpression([a, b, c, d], tokens).valid).toBe(true);
  });

  it("rejects an expression that omits a tile", () => {
    const tokens: Token[] = [tile(a), op("+"), tile(b), op("*"), tile(c)];
    expect(validateExpression([a, b, c, d], tokens).valid).toBe(false);
  });

  it("rejects an expression that reuses a tile", () => {
    const tokens: Token[] = [tile(a), op("+"), tile(b), op("*"), tile(b), op("-"), tile(d)];
    expect(validateExpression([a, b, c, d], tokens).valid).toBe(false);
  });

  it("rejects an expression using a tile that isn't part of this level", () => {
    const intruder: Tile = { id: "intruder", value: fromInt(9) };
    const tokens: Token[] = [tile(a), op("+"), tile(b), op("*"), tile(c), op("-"), tile(intruder)];
    expect(validateExpression([a, b, c, d], tokens).valid).toBe(false);
  });

  it("rejects the wrong number of operators", () => {
    const tokens: Token[] = [tile(a), op("+"), tile(b), tile(c), op("-"), tile(d)];
    expect(validateExpression([a, b, c, d], tokens).valid).toBe(false);
  });
});

describe("division by zero", () => {
  it("is rejected cleanly by the rational core", () => {
    expect(() => divide(fromInt(5), fromInt(0))).toThrow(DivisionByZeroError);
  });

  it("propagates cleanly out of evaluate()", () => {
    const [a, b] = tiles(5, 0) as [Tile, Tile];
    const tokens: Token[] = [tile(a), op("/"), tile(b)];
    expect(() => evaluate(tokens)).toThrow(DivisionByZeroError);
  });
});

// Deliberately not using the rules engine: this is the wrong evaluator, kept
// here only to prove test 1's naive-left-to-right result is really 29.
function naiveLeftToRight(values: number[], operators: Operator[]): number {
  let result = values[0]!;
  for (let i = 0; i < operators.length; i++) {
    const b = values[i + 1]!;
    switch (operators[i]) {
      case "+":
        result += b;
        break;
      case "-":
        result -= b;
        break;
      case "*":
        result *= b;
        break;
      case "/":
        result /= b;
        break;
    }
  }
  return result;
}
