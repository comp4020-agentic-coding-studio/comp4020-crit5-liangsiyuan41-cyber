// The Make 21 rules engine: structured tokens evaluated strictly left to
// right, like a simple calculator --- no operator precedence, no
// parentheses, no `eval`. Independent of the DOM so it can be unit tested
// and reused by the UI, the level solver and the level-data checker alike.
import { type Rational, add, divide, multiply, subtract } from "./rational.ts";

export type Operator = "+" | "-" | "*" | "/";

// `id` distinguishes tiles that share a face value --- two "4" tiles are
// still two different tiles a player can only use once each.
export interface Tile {
  readonly id: string;
  readonly value: Rational;
}

export type Token =
  | { readonly kind: "tile"; readonly tile: Tile }
  | { readonly kind: "operator"; readonly operator: Operator };

export function tile(t: Tile): Token {
  return { kind: "tile", tile: t };
}

export function op(operator: Operator): Token {
  return { kind: "operator", operator };
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly error?: string;
}

// Every tile handed to a level must appear exactly once, in a strict
// tile/operator/tile/.../tile alternation --- no fewer, no extra, no repeats,
// no tile that isn't part of this level.
export function validateExpression(tiles: readonly Tile[], tokens: readonly Token[]): ValidationResult {
  const expectedLength = tiles.length * 2 - 1;
  if (tokens.length !== expectedLength) {
    return {
      valid: false,
      error: `expected ${tiles.length} tiles and ${tiles.length - 1} operator(s), got ${tokens.length} token(s)`,
    };
  }

  const available = new Set(tiles.map((t) => t.id));
  const used = new Set<string>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const wantsTile = i % 2 === 0;
    if (wantsTile !== (token.kind === "tile")) {
      return { valid: false, error: `expected ${wantsTile ? "a tile" : "an operator"} at position ${i}` };
    }
    if (token.kind === "tile") {
      const id = token.tile.id;
      if (!available.has(id)) return { valid: false, error: `unknown tile "${id}"` };
      if (used.has(id)) return { valid: false, error: `tile "${id}" used more than once` };
      used.add(id);
    }
  }

  return { valid: true };
}

// One completed calculation step: the operator and tile the player picked,
// and the running value after applying them.
export interface Step {
  readonly operator: Operator;
  readonly operand: Rational;
  readonly result: Rational;
}

// The game is integer-only: every tile is a whole number, and +/-/* of whole
// numbers always stay whole, so only a division step can break that --- this
// is where the "whole number" rule actually gets enforced.
export class NonIntegerDivisionError extends Error {
  constructor() {
    super("division must produce a whole number");
  }
}

// Applies each operator to the running value in exactly the order the
// tokens appear --- no precedence, no grouping. `tokens` may end in a tile
// at any point (1, 3, 5, ... tokens), not just a complete expression, so the
// UI can call this after every step to get the history so far.
export function evaluateSteps(tokens: readonly Token[]): Step[] {
  const first = tokens[0];
  if (!first || tokens.length % 2 === 0 || first.kind !== "tile") {
    throw new Error("expression must alternate tile, operator, tile, ...");
  }

  const steps: Step[] = [];
  let value = first.tile.value;

  for (let i = 1; i < tokens.length; i += 2) {
    const opToken = tokens[i];
    const tileToken = tokens[i + 1];
    if (opToken?.kind !== "operator" || tileToken?.kind !== "tile") {
      throw new Error("expression must alternate tile, operator, tile, ...");
    }
    const operand = tileToken.tile.value;
    switch (opToken.operator) {
      case "+":
        value = add(value, operand);
        break;
      case "-":
        value = subtract(value, operand);
        break;
      case "*":
        value = multiply(value, operand);
        break;
      case "/":
        value = divide(value, operand);
        if (value.den !== 1) throw new NonIntegerDivisionError();
        break;
    }
    steps.push({ operator: opToken.operator, operand, result: value });
  }

  return steps;
}

// The final running value once every step has been applied.
export function evaluate(tokens: readonly Token[]): Rational {
  const first = tokens[0];
  if (!first || first.kind !== "tile") {
    throw new Error("expression must alternate tile, operator, tile, ...");
  }
  const steps = evaluateSteps(tokens);
  return steps.length > 0 ? steps[steps.length - 1]!.result : first.tile.value;
}
