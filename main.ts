// The Make 21 app entry, loaded as a module by index.html. Renders the level
// select and game screens and wires up clicks; all the actual rules (what's a
// legal expression, whether it's exactly 21, which levels unlock) live in
// levels.ts/expression.ts/rational.ts/progress.ts and are reused as-is.
import { createProgress } from "./progress.ts";
import {
  NonIntegerDivisionError,
  evaluate,
  evaluateSteps,
  op,
  tile,
  validateExpression,
  type Operator,
  type Token,
} from "./expression.ts";
import { LEVELS, type Level } from "./levels.ts";
import { equals, fromInt, type Rational } from "./rational.ts";

const progress = createProgress(LEVELS.length);

const levelSelect = document.querySelector<HTMLElement>("#level-select")!;
const game = document.querySelector<HTMLElement>("#game")!;
const levelGrid = document.querySelector<HTMLElement>("#level-grid")!;
const backToLevels = document.querySelector<HTMLButtonElement>("#back-to-levels")!;
const gameTitle = document.querySelector<HTMLElement>("#game-title")!;
const tilesEl = document.querySelector<HTMLElement>("#tiles")!;
const operatorsEl = document.querySelector<HTMLElement>("#operators")!;
const currentValueEl = document.querySelector<HTMLElement>("#current-value")!;
const historyEl = document.querySelector<HTMLElement>("#history")!;
const moveErrorEl = document.querySelector<HTMLElement>("#move-error")!;
const undoButton = document.querySelector<HTMLButtonElement>("#undo")!;
const resetButton = document.querySelector<HTMLButtonElement>("#reset")!;
const viewAnswerButton = document.querySelector<HTMLButtonElement>("#view-answer")!;
const submitButton = document.querySelector<HTMLButtonElement>("#submit")!;
const feedbackEl = document.querySelector<HTMLElement>("#feedback")!;
const congrats = document.querySelector<HTMLElement>("#congrats")!;
const congratsBack = document.querySelector<HTMLButtonElement>("#congrats-back")!;
const congratsPlayAgain = document.querySelector<HTMLButtonElement>("#congrats-play-again")!;

const OPERATORS: readonly Operator[] = ["+", "-", "*", "/"];
const OPERATOR_SYMBOLS: Record<Operator, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

let currentLevel: Level | null = null;
let tokens: Token[] = [];
let ended = false;
// Set only by View Answer, to show the stored answer's steps instead of the
// player's own (possibly empty) attempt.
let showingAnswer = false;

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
  showingAnswer = false;
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

// Replaces the normal "solved!" feedback when the just-solved level is the
// last one --- a dedicated screen instead of an offer to go to a non-existent
// next level.
function showCongratulations(): void {
  game.hidden = true;
  congrats.hidden = false;
}

function formatRational(value: Rational): string {
  return value.den === 1 ? String(value.num) : `${value.num}/${value.den}`;
}

function tileValueAt(tokens: readonly Token[], index: number): Rational {
  const token = tokens[index];
  if (token?.kind !== "tile") throw new Error("expected a tile");
  return token.tile.value;
}

// Renders the running value and the history of completed steps for
// `source` (either the player's own tokens, or a stored answer). `source`
// may end mid-step (an operator with no tile chosen yet) --- that trailing
// operator is dropped before evaluating, and shown separately as a prompt.
function renderCalculation(source: readonly Token[]): void {
  if (source.length === 0) {
    currentValueEl.textContent = "Tap a tile to begin.";
    historyEl.replaceChildren();
    return;
  }

  const last = source[source.length - 1];
  const pending = source.length % 2 === 0 && last?.kind === "operator" ? last : null;
  const settled = pending ? source.slice(0, -1) : source;
  const steps = evaluateSteps(settled);
  const current = evaluate(settled);

  currentValueEl.textContent = pending
    ? `Current value: ${formatRational(current)} — choose a tile for ${OPERATOR_SYMBOLS[pending.operator]}`
    : `Current value: ${formatRational(current)}`;

  historyEl.replaceChildren(
    ...steps.map((step, i) => {
      const previous = i === 0 ? tileValueAt(settled, 0) : steps[i - 1]!.result;
      const item = document.createElement("li");
      item.textContent = `${formatRational(previous)} ${OPERATOR_SYMBOLS[step.operator]} ${formatRational(step.operand)} = ${formatRational(step.result)}`;
      return item;
    }),
  );
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
  moveErrorEl.textContent = "";
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
        const candidate = [...tokens, tile(t)];
        // A tile completes a division step --- try it against the real rules
        // engine and reject the move (leaving `tokens` untouched) if that
        // step's result isn't a whole number, rather than duplicating the
        // divisibility check here.
        try {
          evaluateSteps(candidate);
        } catch (err) {
          if (err instanceof NonIntegerDivisionError) {
            moveErrorEl.textContent = "Division must give a whole number.";
            return;
          }
          throw err;
        }
        feedbackEl.textContent = "";
        tokens = candidate;
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

  renderCalculation(showingAnswer ? level.answer : tokens);

  undoButton.disabled = ended || tokens.length === 0;
  resetButton.disabled = ended || tokens.length === 0;
  viewAnswerButton.disabled = ended;
  submitButton.disabled = ended || !validateExpression(level.tiles, tokens).valid;
}

function showEndedFeedback(message: string, options: { offerNext: boolean }): void {
  const level = currentLevel!;
  feedbackEl.replaceChildren();

  const text = document.createElement("p");
  text.className = `feedback-message${options.offerNext ? " success" : ""}`;
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

// A wrong submit ends the attempt (like a solved level or View Answer) so
// the failure state is deliberate and clearly named, rather than silently
// clearing the board --- the player only starts over by clicking Try Again.
function showFailureFeedback(): void {
  feedbackEl.replaceChildren();

  const text = document.createElement("p");
  text.className = "feedback-message failure";
  text.textContent = "Not 21 — try again.";
  feedbackEl.append(text);

  const tryAgain = document.createElement("button");
  tryAgain.type = "button";
  tryAgain.textContent = "Try Again";
  tryAgain.addEventListener("click", () => {
    tokens = [];
    ended = false;
    feedbackEl.replaceChildren();
    renderGame();
  });
  feedbackEl.append(tryAgain);

  const back = document.createElement("button");
  back.type = "button";
  back.textContent = "Back to levels";
  back.addEventListener("click", closeLevel);
  feedbackEl.append(back);
}

undoButton.addEventListener("click", () => {
  // A lone first tile just goes away; mid-step (a pending operator with no
  // tile chosen yet) drops just that operator; otherwise a whole completed
  // step (operator + tile) is undone at once, restoring the previous
  // running value and freeing the tile it used.
  const newLength = tokens.length === 1 ? 0 : tokens.length % 2 === 0 ? tokens.length - 1 : tokens.length - 2;
  tokens = tokens.slice(0, newLength);
  renderGame();
});

resetButton.addEventListener("click", () => {
  tokens = [];
  renderGame();
});

viewAnswerButton.addEventListener("click", () => {
  if (!currentLevel) return;
  ended = true;
  showingAnswer = true;
  showEndedFeedback("Here's one solution. This attempt doesn't count as solved.", { offerNext: false });
  renderGame();
});

submitButton.addEventListener("click", () => {
  if (!currentLevel) return;
  const level = currentLevel;

  if (equals(evaluate(tokens), fromInt(21))) {
    ended = true;
    progress.complete(level.id);
    renderGame();
    if (level.id === LEVELS.length) {
      showCongratulations();
    } else {
      showEndedFeedback(`Level ${level.id} solved!`, { offerNext: true });
    }
  } else {
    ended = true;
    showFailureFeedback();
    renderGame();
  }
});

backToLevels.addEventListener("click", closeLevel);

congratsBack.addEventListener("click", () => {
  congrats.hidden = true;
  closeLevel();
});

congratsPlayAgain.addEventListener("click", () => {
  progress.reset();
  congrats.hidden = true;
  openLevel(1);
});

renderLevelSelect();
