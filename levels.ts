// The fixed Make 21 level bank. Each level's answer is stored as structured
// tokens built from that level's own tiles --- never as a JS expression run
// through eval --- so it evaluates through the same rules engine as any
// player-built expression.
import { fromInt } from "./rational.ts";
import { op, tile, type Operator, type Tile, type Token } from "./expression.ts";

export interface Level {
  readonly id: number;
  readonly tiles: readonly Tile[];
  readonly answer: readonly Token[];
}

interface LevelSpec {
  readonly id: number;
  readonly numbers: readonly number[];
  // The given answer, already split into its number/operator sequence ---
  // e.g. "2 + 4 * 5 - 1" becomes values [2,4,5,1] and operators [+,*,-].
  readonly answerValues: readonly number[];
  readonly answerOperators: readonly Operator[];
}

function buildLevel(spec: LevelSpec): Level {
  const tiles: Tile[] = spec.numbers.map((value, index) => ({
    id: `level-${spec.id}-tile-${index}`,
    value: fromInt(value),
  }));

  // Match each answer value to one of this level's own (still-unused) tiles,
  // so the answer references the exact same tile identities as `tiles` ---
  // required for duplicate-valued tiles (e.g. two "9"s) to each be used once.
  const remaining = tiles.slice();
  const answerTiles: Tile[] = spec.answerValues.map((value) => {
    const index = remaining.findIndex((t) => t.value.num === value);
    if (index === -1) {
      throw new Error(`level ${spec.id}: answer uses ${value}, which isn't one of this level's tiles`);
    }
    return remaining.splice(index, 1)[0]!;
  });

  const answer: Token[] = [tile(answerTiles[0]!)];
  for (let i = 0; i < spec.answerOperators.length; i++) {
    answer.push(op(spec.answerOperators[i]!), tile(answerTiles[i + 1]!));
  }

  return { id: spec.id, tiles, answer };
}

const LEVEL_SPECS: readonly LevelSpec[] = [
  { id: 1, numbers: [1, 4, 7, 9], answerValues: [1, 4, 7, 9], answerOperators: ["+", "+", "+"] },
  { id: 2, numbers: [2, 3, 7, 9], answerValues: [2, 3, 7, 9], answerOperators: ["+", "+", "+"] },
  { id: 3, numbers: [2, 4, 6, 9], answerValues: [2, 4, 6, 9], answerOperators: ["+", "+", "+"] },
  { id: 4, numbers: [1, 4, 9, 9], answerValues: [9, 9, 4, 1], answerOperators: ["+", "+", "-"] },
  { id: 5, numbers: [3, 7, 8, 9], answerValues: [8, 9, 7, 3], answerOperators: ["+", "+", "-"] },
  { id: 6, numbers: [1, 2, 4, 5], answerValues: [2, 4, 5, 1], answerOperators: ["+", "*", "-"] },
  { id: 7, numbers: [1, 2, 4, 9], answerValues: [2, 9, 4, 1], answerOperators: ["*", "+", "-"] },
  { id: 8, numbers: [1, 2, 3, 8], answerValues: [3, 8, 1, 2], answerOperators: ["*", "-", "-"] },
  { id: 9, numbers: [1, 2, 4, 6], answerValues: [4, 6, 1, 2], answerOperators: ["*", "-", "-"] },
  { id: 10, numbers: [2, 3, 3, 6], answerValues: [3, 3, 2, 6], answerOperators: ["*", "+", "*"] },
  { id: 11, numbers: [2, 3, 3, 9], answerValues: [9, 3, 2, 3], answerOperators: ["*", "-", "*"] },
  { id: 12, numbers: [2, 3, 4, 9], answerValues: [9, 3, 4, 2], answerOperators: ["*", "-", "-"] },
  { id: 13, numbers: [2, 4, 4, 7], answerValues: [7, 2, 4, 4], answerOperators: ["-", "+", "*"] },
  { id: 14, numbers: [3, 4, 4, 8], answerValues: [8, 3, 4, 4], answerOperators: ["-", "+", "*"] },
  { id: 15, numbers: [3, 5, 8, 9], answerValues: [5, 9, 3, 8], answerOperators: ["*", "-", "*"] },
  { id: 16, numbers: [3, 6, 7, 7], answerValues: [7, 6, 3, 7], answerOperators: ["*", "-", "*"] },
  { id: 17, numbers: [4, 5, 6, 9], answerValues: [5, 9, 6, 4], answerOperators: ["*", "-", "*"] },
  { id: 18, numbers: [5, 7, 7, 8], answerValues: [8, 7, 7, 5], answerOperators: ["*", "-", "*"] },
  { id: 19, numbers: [6, 7, 7, 9], answerValues: [7, 9, 7, 6], answerOperators: ["*", "-", "*"] },
  { id: 20, numbers: [2, 5, 5, 8], answerValues: [5, 5, 8, 2], answerOperators: ["*", "-", "/"] },
  { id: 21, numbers: [3, 4, 6, 9], answerValues: [4, 6, 9, 3], answerOperators: ["*", "-", "/"] },
  { id: 22, numbers: [3, 5, 5, 12], answerValues: [5, 5, 12, 3], answerOperators: ["*", "-", "/"] },
  { id: 23, numbers: [3, 4, 4, 15], answerValues: [15, 3, 4, 4], answerOperators: ["/", "+", "*"] },
  { id: 24, numbers: [4, 4, 4, 20], answerValues: [4, 4, 20, 4], answerOperators: ["*", "+", "/"] },
  { id: 25, numbers: [5, 5, 6, 24], answerValues: [5, 5, 24, 6], answerOperators: ["*", "-", "/"] },
  { id: 26, numbers: [6, 6, 9, 25], answerValues: [25, 6, 6, 9], answerOperators: ["-", "*", "/"] },
  { id: 27, numbers: [4, 6, 8, 29], answerValues: [29, 8, 4, 6], answerOperators: ["-", "/", "-"] },
  { id: 28, numbers: [2, 4, 9, 30], answerValues: [9, 4, 30, 2], answerOperators: ["*", "-", "/"] },
  { id: 29, numbers: [3, 3, 9, 22], answerValues: [22, 9, 3, 3], answerOperators: ["-", "/", "/"] },
  { id: 30, numbers: [4, 6, 6, 30], answerValues: [30, 6, 4, 6], answerOperators: ["-", "/", "*"] },
];

export const LEVELS: readonly Level[] = LEVEL_SPECS.map(buildLevel);
