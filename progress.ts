// In-memory level unlock/completion tracking --- no persistence yet, so this
// resets on every reload. DOM-free so the unlock rule can be tested on its own.
export interface Progress {
  readonly isUnlocked: (id: number) => boolean;
  readonly isCompleted: (id: number) => boolean;
  readonly complete: (id: number) => void;
  readonly reset: () => void;
}

// Only level 1 starts unlocked; completing a level unlocks the next one (if it
// exists) without locking the level just completed, so it stays replayable.
export function createProgress(levelCount: number): Progress {
  let unlocked = new Set<number>([1]);
  let completed = new Set<number>();

  return {
    isUnlocked: (id) => unlocked.has(id),
    isCompleted: (id) => completed.has(id),
    complete(id) {
      completed.add(id);
      if (id + 1 <= levelCount) unlocked.add(id + 1);
    },
    // Back to the start-of-game state, for "Play Again" after finishing every level.
    reset() {
      unlocked = new Set<number>([1]);
      completed = new Set<number>();
    },
  };
}
