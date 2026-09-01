// Contract tests for the level-unlock rule (retires with this week's brief,
// per spec/README.md).
import { describe, expect, it } from "vitest";
import { createProgress } from "../progress.ts";

describe("createProgress", () => {
  it("starts with only level 1 unlocked", () => {
    const progress = createProgress(21);
    expect(progress.isUnlocked(1)).toBe(true);
    for (let id = 2; id <= 21; id++) expect(progress.isUnlocked(id)).toBe(false);
  });

  it("starts with no levels completed", () => {
    const progress = createProgress(21);
    for (let id = 1; id <= 21; id++) expect(progress.isCompleted(id)).toBe(false);
  });

  it("unlocks the next level on completion, without locking the one just completed", () => {
    const progress = createProgress(21);
    progress.complete(1);
    expect(progress.isCompleted(1)).toBe(true);
    expect(progress.isUnlocked(1)).toBe(true);
    expect(progress.isUnlocked(2)).toBe(true);
    expect(progress.isUnlocked(3)).toBe(false);
  });

  it("keeps a completed level unlocked and completed, so it stays replayable", () => {
    const progress = createProgress(21);
    progress.complete(1);
    progress.complete(1);
    expect(progress.isCompleted(1)).toBe(true);
    expect(progress.isUnlocked(1)).toBe(true);
  });

  it("does not unlock a level past the last one", () => {
    const progress = createProgress(21);
    progress.complete(21);
    expect(progress.isCompleted(21)).toBe(true);
    expect(progress.isUnlocked(22)).toBe(false);
  });

  it("reset re-locks everything but level 1 and clears completion, for Play Again", () => {
    const progress = createProgress(21);
    progress.complete(1);
    progress.complete(2);
    progress.reset();

    expect(progress.isUnlocked(1)).toBe(true);
    expect(progress.isUnlocked(2)).toBe(false);
    expect(progress.isCompleted(1)).toBe(false);
    expect(progress.isCompleted(2)).toBe(false);
  });
});
