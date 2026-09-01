// The Make 21 app entry, loaded as a module by index.html. Renders the level
// select and game screens and wires up clicks; all the actual rules (what's a
// legal expression, whether it's exactly 21, which levels unlock) live in
// levels.ts/expression.ts/rational.ts/progress.ts and are reused as-is.
import { createProgress } from "./progress.ts";
import { evaluate, op, tile, validateExpression, type Operator, type Token } from "./expression.ts";
import { LEVELS, type Level } from "./levels.ts";
import { equals, fromInt } from "./rational.ts";

const progress = createProgress(LEVELS.length);

const levelSelect = document.querySelector<HTMLElement>("#level-select")!;
const game = document.querySelector<HTMLElement>("#game")!;
const levelGrid = document.querySelector<HTMLElement>("#level-grid")!;
const backToLevels = document.querySelector<HTMLButtonElement>("#back-to-levels")!;
const gameTitle = document.querySelector<HTMLElement>("#game-title")!;
const tilesEl = document.querySelector<HTMLElement>("#tiles")!;
const operatorsEl = document.querySelector<HTMLElement>("#operators")!;
const expressionEl = document.querySelector<HTMLElement>("#expression")!;
const undoButton = document.querySelector<HTMLButtonElement>("#undo")!;
const resetButton = document.querySelector<HTMLButtonElement>("#reset")!;
const viewAnswerButton = document.querySelector<HTMLButtonElement>("#view-answer")!;
const submitButton = document.querySelector<HTMLButtonElement>("#submit")!;
const feedbackEl = document.querySelector<HTMLElement>("#feedback")!;

const OPERATORS: readonly Operator[] = ["+", "-", "*", "/"];
const OPERATOR_SYMBOLS: Record<Operator, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

let currentLevel: Level | null = null;
let tokens: Token[] = [];
let ended = false;

function renderLevelSelect(): void {
  levelGrid.replaceChildren(
    ...LEVELS.map((level) => {
      const unlocked = progress.isUnlocked(level.id);
      const completed = progress.isCompleted(level.id);

      const button = document.createElement("button");
      button.type = "button";
      button.className = `level ${completed ? "completed" : unlocked ? "unlocked" : "locked"}`;
      button.textContent = completed ? `${level.id} ✓` : String(level.id);
      button.disabled = !unlocked;
      button.setAttribute("aria-label", `Level ${level.id}${completed ? ", completed" : unlocked ? "" : ", locked"}`);
      button.addEventListener("click", () => openLevel(level.id));
      return button;
    }),
  );
}

function openLevel(id: number): void {
  const level = LEVELS.find((l) => l.id === id);
  if (!level || !progress.isUnlocked(id)) return;

  currentLevel = level;
  tokens = [];
  ended = false;
  gameTitle.textContent = `Level ${level.id}`;
  feedbackEl.replaceChildren();
  levelSelect.hidden = true;
  game.hidden = false;
  renderGame();
}

function closeLevel(): void {
  currentLevel = null;
  game.hidden = true;
  levelSelect.hidden = false;
  renderLevelSelect();
}

function formatTokens(tokens: readonly Token[]): string {
  return tokens.map((token) => (token.kind === "tile" ? String(token.tile.value.num) : OPERATOR_SYMBOLS[token.operator])).join(" ");
}

function usedTileIds(): Set<string> {
  const ids = new Set<string>();
  for (const token of tokens) {
    if (token.kind === "tile") ids.add(token.tile.id);
  }
  return ids;
}

function renderGame(): void {
  if (!currentLevel) return;
  const level = currentLevel;
  const used = usedTileIds();
  const expectingTile = tokens.length % 2 === 0;

  tilesEl.replaceChildren(
    ...level.tiles.map((t) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = used.has(t.id) ? "tile used" : "tile";
      button.textContent = String(t.value.num);
      button.disabled = ended || used.has(t.id) || !expectingTile;
      button.addEventListener("click", () => {
        feedbackEl.textContent = "";
        tokens.push(tile(t));
        renderGame();
      });
      return button;
    }),
  );

  operatorsEl.replaceChildren(
    ...OPERATORS.map((operator) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "operator";
      button.textContent = OPERATOR_SYMBOLS[operator];
      button.disabled = ended || expectingTile;
      button.addEventListener("click", () => {
        feedbackEl.textContent = "";
        tokens.push(op(operator));
        renderGame();
      });
      return button;
    }),
  );

  expressionEl.textContent = tokens.length > 0 ? formatTokens(tokens) : "Tap a tile to begin.";

  undoButton.disabled = ended || tokens.length === 0;
  resetButton.disabled = ended || tokens.length === 0;
  viewAnswerButton.disabled = ended;
  submitButton.disabled = ended || !validateExpression(level.tiles, tokens).valid;
}

function showEndedFeedback(message: string, options: { offerNext: boolean }): void {
  const level = currentLevel!;
  feedbackEl.replaceChildren();

  const text = document.createElement("p");
  text.textContent = message;
  feedbackEl.append(text);

  const back = document.createElement("button");
  back.type = "button";
  back.textContent = "Back to levels";
  back.addEventListener("click", closeLevel);
  feedbackEl.append(back);

  if (options.offerNext && level.id < LEVELS.length) {
    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "Next level →";
    next.addEventListener("click", () => openLevel(level.id + 1));
    feedbackEl.append(next);
  }
}

undoButton.addEventListener("click", () => {
  tokens.pop();
  renderGame();
});

resetButton.addEventListener("click", () => {
  tokens = [];
  renderGame();
});

viewAnswerButton.addEventListener("click", () => {
  if (!currentLevel) return;
  ended = true;
  expressionEl.textContent = `${formatTokens(currentLevel.answer)} = 21`;
  showEndedFeedback("Here's one solution. This attempt doesn't count as solved.", { offerNext: false });
  renderGame();
});

submitButton.addEventListener("click", () => {
  if (!currentLevel) return;
  const level = currentLevel;

  if (equals(evaluate(tokens), fromInt(21))) {
    ended = true;
    progress.complete(level.id);
    showEndedFeedback(`Level ${level.id} solved!`, { offerNext: true });
  } else {
    tokens = [];
    feedbackEl.replaceChildren();
    feedbackEl.textContent = "Not 21 — try again.";
  }
  renderGame();
});

backToLevels.addEventListener("click", closeLevel);

renderLevelSelect();
