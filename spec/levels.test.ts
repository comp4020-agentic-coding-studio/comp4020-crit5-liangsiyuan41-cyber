// Contract tests for the fixed Make 21 level bank (retires with this week's
// brief, per spec/README.md).
import { describe, expect, it } from "vitest";
import { equals, fromInt } from "../rational.ts";
import { evaluate, validateExpression } from "../expression.ts";
import { LEVELS } from "../levels.ts";
import { isSolvable } from "../solver.ts";

describe("the level bank", () => {
  it("has exactly 21 levels, sequentially numbered from 1", () => {
    expect(LEVELS).toHaveLength(21);
    expect(LEVELS.map((level) => level.id)).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
  });

  it("gives every level exactly four uniquely identified tiles", () => {
    for (const level of LEVELS) {
      expect(level.tiles).toHaveLength(4);
      expect(new Set(level.tiles.map((t) => t.id)).size).toBe(4);
    }
  });

  it("stores an answer that uses every tile exactly once and reaches exactly 21", () => {
    for (const level of LEVELS) {
      const validity = validateExpression(level.tiles, level.answer);
      expect(validity.valid, `level ${level.id}: ${validity.error ?? "invalid"}`).toBe(true);
      expect(equals(evaluate(level.answer), fromInt(21)), `level ${level.id}`).toBe(true);
    }
  });

  it("is solvable by the shared brute-force solver", () => {
    for (const level of LEVELS) {
      expect(isSolvable(level.tiles), `level ${level.id} has no solution`).toBe(true);
    }
  });
});
