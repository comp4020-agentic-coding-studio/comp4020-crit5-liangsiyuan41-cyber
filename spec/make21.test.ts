// Contract tests for Make 21's rules engine (retires with this week's brief,
// per spec/README.md). The engine is DOM-free --- these exercise it directly.
import { describe, expect, it } from "vitest";
import { DivisionByZeroError, divide, equals, fromInt, multiply, rational, subtract } from "../rational.ts";
import {
  NonIntegerDivisionError,
  evaluate,
  evaluateSteps,
  op,
  tile,
  validateExpression,
  type Operator,
  type Tile,
  type Token,
} from "../expression.ts";

function tiles(...values: number[]): Tile[] {
  return values.map((value, i) => ({ id: `t${i}`, value: fromInt(value) }));
}

describe("evaluate: strict left to right, no precedence", () => {
  it("2 + 4 * 5 - 1 = 29, applying each operator to the running value in click order", () => {
    const [a, b, c, d] = tiles(2, 4, 5, 1) as [Tile, Tile, Tile, Tile];
    const tokens: Token[] = [tile(a), op("+"), tile(b), op("*"), tile(c), op("-"), tile(d)];

    expect(validateExpression([a, b, c, d], tokens).valid).toBe(true);
    expect(equals(evaluate(tokens), fromInt(29))).toBe(true);

    // A reader that instead gives * higher precedence --- 2 + (4*5) - 1 ---
    // lands on 21. The two results must disagree, or this test isn't
    // actually pinning down "no precedence".
    expect(precedenceAware([2, 4, 5, 1], ["+", "*", "-"])).toBe(21);
  });

  it("shows the running value after every completed step", () => {
    const [a, b, c, d] = tiles(2, 4, 5, 1) as [Tile, Tile, Tile, Tile];
    const tokens: Token[] = [tile(a), op("+"), tile(b), op("*"), tile(c), op("-"), tile(d)];

    const steps = evaluateSteps(tokens);
    expect(steps.map((step) => step.result)).toEqual([fromInt(6), fromInt(30), fromInt(29)]);

    // The history is available after any prefix, not just the full expression.
    expect(evaluateSteps(tokens.slice(0, 3)).map((step) => step.result)).toEqual([fromInt(6)]);
  });
});

describe("evaluate: the running value carries exact fractions between steps", () => {
  it("30 - 6 / 4 * 6 = 36, dividing the running value 24 (not the tile 6) by 4", () => {
    const [a, b, c, d] = tiles(30, 6, 4, 6) as [Tile, Tile, Tile, Tile];
    const tokens: Token[] = [tile(a), op("-"), tile(b), op("/"), tile(c), op("*"), tile(d)];

    expect(validateExpression([a, b, c, d], tokens).valid).toBe(true);

    // 30 - 6 = 24, and 24 / 4 lands on the exact integer 6 --- it's the
    // running value 24 being divided, not the original 6 tile in isolation.
    expect(divide(fromInt(24), fromInt(4))).toEqual(rational(6, 1));

    expect(equals(evaluate(tokens), fromInt(36))).toBe(true);

    // Dividing before subtracting (the old precedence rule) uses 6 / 4 = 3/2
    // and lands on 21, not 36 --- a different, no-longer-correct answer.
    const precedenceGrouping = subtract(fromInt(30), multiply(divide(fromInt(6), fromInt(4)), fromInt(6)));
    expect(equals(precedenceGrouping, fromInt(21))).toBe(true);
    expect(equals(precedenceGrouping, fromInt(36))).toBe(false);
  });
});

describe("integer-only division", () => {
  it("rejects a division step that would produce a fraction", () => {
    const [a, b] = tiles(5, 2) as [Tile, Tile];
    const tokens: Token[] = [tile(a), op("/"), tile(b)];
    expect(() => evaluate(tokens)).toThrow(NonIntegerDivisionError);
    expect(() => evaluateSteps(tokens)).toThrow(NonIntegerDivisionError);
  });

  it("allows a division step that divides evenly", () => {
    const [a, b] = tiles(6, 2) as [Tile, Tile];
    const tokens: Token[] = [tile(a), op("/"), tile(b)];
    expect(equals(evaluate(tokens), fromInt(3))).toBe(true);
  });

  it("checks the running value, not just the original tiles, for divisibility", () => {
    // 5 - 2 = 3, then 3 / 2 is not a whole number, even though neither
    // original tile alone would be a problem.
    const [a, b, c] = tiles(5, 2, 2) as [Tile, Tile, Tile];
    const tokens: Token[] = [tile(a), op("-"), tile(b), op("/"), tile(c)];
    expect(() => evaluate(tokens)).toThrow(NonIntegerDivisionError);
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

// Deliberately not using the rules engine: this is the wrong evaluator now
// that the game is calculator-style, kept only to prove test 1's
// precedence-aware result is really 21, not 29.
function precedenceAware(values: number[], operators: Operator[]): number {
  const terms: { sign: "+" | "-"; value: number }[] = [];
  let sign: "+" | "-" = "+";
  let value = values[0]!;

  for (let i = 0; i < operators.length; i++) {
    const next = values[i + 1]!;
    switch (operators[i]) {
      case "*":
        value *= next;
        break;
      case "/":
        value /= next;
        break;
      case "+":
      case "-":
        terms.push({ sign, value });
        sign = operators[i] as "+" | "-";
        value = next;
        break;
    }
  }
  terms.push({ sign, value });

  return terms.reduce((result, term) => (term.sign === "+" ? result + term.value : result - term.value), 0);
}
