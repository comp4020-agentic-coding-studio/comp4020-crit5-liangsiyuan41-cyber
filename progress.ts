// In-memory level unlock/completion tracking --- no persistence yet, so this
// resets on every reload. DOM-free so the unlock rule can be tested on its own.
export interface Progress {
  readonly isUnlocked: (id: number) => boolean;
  readonly isCompleted: (id: number) => boolean;
  readonly complete: (id: number) => void;
}

// Only level 1 starts unlocked; completing a level unlocks the next one (if it
// exists) without locking the level just completed, so it stays replayable.
export function createProgress(levelCount: number): Progress {
  const unlocked = new Set<number>([1]);
  const completed = new Set<number>();

  return {
    isUnlocked: (id) => unlocked.has(id),
    isCompleted: (id) => completed.has(id),
    complete(id) {
      completed.add(id);
      if (id + 1 <= levelCount) unlocked.add(id + 1);
    },
  };
}
