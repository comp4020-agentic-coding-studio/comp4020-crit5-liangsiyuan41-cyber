// DOM-free brute-force solvability check: try every ordering of a level's
// tiles and every combination of operators between them, through the same
// exact rules engine the game uses. Small enough to search exhaustively ---
// 4! orderings * 4^3 operator combinations = 1,536 candidates for four tiles.
import { DivisionByZeroError, equals, fromInt, type Rational } from "./rational.ts";
import { NonIntegerDivisionError, evaluate, op, tile, type Operator, type Tile, type Token } from "./expression.ts";

const OPERATORS: readonly Operator[] = ["+", "-", "*", "/"];

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  return items.flatMap((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    return permutations(rest).map((perm) => [item, ...perm]);
  });
}

function operatorCombinations(count: number): Operator[][] {
  if (count === 0) return [[]];
  const rest = operatorCombinations(count - 1);
  return OPERATORS.flatMap((operator) => rest.map((combo) => [operator, ...combo]));
}

export function solve(tiles: readonly Tile[], target: Rational = fromInt(21)): Token[] | null {
  for (const order of permutations(tiles)) {
    for (const operators of operatorCombinations(order.length - 1)) {
      const tokens: Token[] = [tile(order[0]!)];
      for (let i = 0; i < operators.length; i++) {
        tokens.push(op(operators[i]!), tile(order[i + 1]!));
      }
      try {
        if (equals(evaluate(tokens), target)) return tokens;
      } catch (err) {
        if (!(err instanceof DivisionByZeroError) && !(err instanceof NonIntegerDivisionError)) throw err;
      }
    }
  }
  return null;
}

export function isSolvable(tiles: readonly Tile[], target: Rational = fromInt(21)): boolean {
  return solve(tiles, target) !== null;
}
