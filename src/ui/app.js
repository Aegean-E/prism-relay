import { LEVELS, levelById } from "../game/levels.js";
import {
  createSession,
  resetSession,
  rotateSessionCell,
  starsFor,
  traceBeams,
} from "../game/engine.js";
import { solveLevel } from "../game/solver.js";
import * as audio from "./audio.js";
import {
  isUnlocked,
  loadProgress,
  recordResult,
  saveProgress,
  setSound,
  totalStars,
} from "./progress.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
})();
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const screens = new Map(
  ["title", "chambers", "game"].map((name) => [name, document.getElementById(`screen-${name}`)]),
);

const elements = {
  topbarStatus: document.querySelector('[data-cue="topbar-status"]'),
  soundToggle: document.querySelector('[data-ui="sound-toggle"]'),
  titleStars: document.getElementById("title-stars"),
  titleBest: document.getElementById("title-best"),
  chamberGrid: document.getElementById("chamber-grid"),
  chamberProgressFill: document.getElementById("chamber-progress-fill"),
  chamberProgressTrack: document.getElementById("chamber-progress-track"),
  chamberProgressValue: document.getElementById("chamber-progress-value"),
  gameChapter: document.getElementById("game-chapter"),
  gameTitle: document.getElementById("game-title"),
  gameSubtitle: document.getElementById("game-subtitle"),
  hudMoves: document.getElementById("hud-moves"),
  hudPar: document.getElementById("hud-par"),
  hudRelays: document.getElementById("hud-relays"),
  gameHint: document.getElementById("game-hint"),
  statusLine: document.getElementById("status-line"),
  board: document.getElementById("board"),
  boardFrame: document.getElementById("board-frame"),
  beamLayer: document.getElementById("beam-layer"),
  modal: document.getElementById("modal"),
  modalKicker: document.getElementById("modal-kicker"),
  modalTitle: document.getElementById("modal-title"),
  modalStars: document.getElementById("modal-stars"),
  modalBody: document.getElementById("modal-body"),
  modalPrimary: document.getElementById("modal-primary"),
  modalSecondary: document.getElementById("modal-secondary"),
  modalTertiary: document.getElementById("modal-tertiary"),
  modalClose: document.querySelector('[data-ui="modal-close"]'),
};

const state = {
  progress: loadProgress(storage),
  screen: "title",
  level: null,
  session: null,
  completed: false,
  paused: false,
  preview: false,
  previewMode: null,
  result: null,
  modalOpen: false,
  modalKind: null,
  mirrorCells: [],
  cellElements: new Map(),
};

function showScreen(name) {
  state.screen = name;
  for (const [id, screen] of screens) {
    screen.hidden = id !== name;
  }
  if (name === "title") {
    updateTitleStats();
  }
  if (name === "chambers") {
    renderChambers();
  }
  updateTopbarStatus();
  updateSoundButton();
  if (name !== "game") {
    closeModal();
  }
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

function updateTitleStats() {
  const stars = totalStars(state.progress);
  const moves = Object.values(state.progress.best).reduce((total, result) => total + result.moves, 0);
  elements.titleStars.textContent = String(stars).padStart(2, "0");
  elements.titleBest.textContent = moves > 0 ? `${moves} moves` : "—";
}

function updateTopbarStatus() {
  if (!elements.topbarStatus) {
    return;
  }
  if (state.screen === "game" && state.level) {
    elements.topbarStatus.textContent = `CHAMBER ${state.level.chapter} / ${state.level.name.toUpperCase()}`;
    return;
  }
  if (state.screen === "chambers") {
    const completed = completedCount();
    elements.topbarStatus.textContent = `${String(completed).padStart(2, "0")} / 06 CHAMBERS COMPLETE`;
    return;
  }
  elements.topbarStatus.textContent = "LIGHT ROUTING / 06 CHAMBERS";
}

function updateSoundButton() {
  if (!elements.soundToggle) {
    return;
  }
  const enabled = state.progress.sound;
  elements.soundToggle.classList.toggle("is-muted", !enabled);
  elements.soundToggle.setAttribute("aria-pressed", String(!enabled));
  elements.soundToggle.setAttribute("aria-label", enabled ? "Mute sound" : "Enable sound");
}

function completedCount() {
  return LEVELS.filter((level) => state.progress.best[level.id]).length;
}

function nextPlayableLevel() {
  return (
    LEVELS.find(
      (level) => isUnlocked(state.progress, level.id) && !state.progress.best[level.id],
    ) ?? LEVELS[0]
  );
}

function starsMarkup(count) {
  return [1, 2, 3]
    .map((index) => `<span class="star${index <= count ? " is-earned" : ""}" aria-hidden="true">★</span>`)
    .join("");
}

function starLabel(count) {
  if (count === 0) {
    return "No stars yet";
  }
  return `${count} of 3 stars`;
}

function renderChambers() {
  if (!elements.chamberGrid) {
    return;
  }
  elements.chamberGrid.replaceChildren();
  for (const level of LEVELS) {
    const unlocked = isUnlocked(state.progress, level.id);
    const best = state.progress.best[level.id] ?? null;
    const item = document.createElement("div");
    item.className = "chamber-card-item";
    item.setAttribute("role", "listitem");
    const card = document.createElement("button");
    card.type = "button";
    card.className = "chamber-card";
    card.classList.toggle("is-complete", Boolean(best));
    card.classList.toggle("is-locked", !unlocked);
    card.disabled = !unlocked;
    card.dataset.level = level.id;
    card.setAttribute("data-ui", "chamber-card");
    card.setAttribute(
      "aria-label",
      `${level.chapter}, ${level.name}. ${unlocked ? (best ? `${best.stars} stars, best ${best.moves} moves` : "Open chamber") : "Locked"}`,
    );
    card.innerHTML = `
      <span class="chamber-card__top">
        <span class="chamber-card__number">CHAMBER ${level.chapter}</span>
        <span class="stars" aria-label="${starLabel(best?.stars ?? 0)}">${starsMarkup(best?.stars ?? 0)}</span>
      </span>
      <span class="chamber-card__name">${level.name}</span>
      <span class="chamber-card__subtitle">${level.subtitle}</span>
      <span class="chamber-card__footer">
        <span>PAR ${level.par}</span>
        <span class="chamber-card__action">${unlocked ? (best ? `${best.moves} MOVES` : "ENTER →") : "LOCKED"}</span>
      </span>
    `;
    card.addEventListener("click", () => startLevel(level.id));
    item.append(card);
    elements.chamberGrid.append(item);
  }

  const completed = completedCount();
  elements.chamberProgressTrack?.setAttribute("aria-valuenow", String(completed));
  if (elements.chamberProgressFill) {
    elements.chamberProgressFill.style.width = `${(completed / LEVELS.length) * 100}%`;
  }
  if (elements.chamberProgressValue) {
    elements.chamberProgressValue.textContent = `${completed} / ${LEVELS.length} chambers`;
  }
}

function startLevel(levelId, options = {}) {
  const level = levelById(levelId) ?? LEVELS[0];
  closeModal();
  state.level = level;
  state.session = createSession(level);
  state.completed = false;
  state.paused = false;
  state.result = null;
  state.preview = Boolean(options.preview);
  traceSession();
  showScreen("game");
  renderBoard();
  updateBoard();
  if (!options.silent) {
    audio.playUi();
  }
}

function renderBoard() {
  const board = state.session?.board;
  if (!board || !elements.board) {
    return;
  }
  state.mirrorCells = [];
  state.cellElements.clear();
  elements.board.replaceChildren();
  elements.board.style.setProperty("--cols", board.width);
  elements.board.style.setProperty("--rows", board.height);
  elements.board.style.setProperty("--ratio", `${board.width} / ${board.height}`);
  elements.beamLayer.setAttribute("viewBox", `0 0 ${board.width} ${board.height}`);
  elements.beamLayer.setAttribute("preserveAspectRatio", "none");

  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const cell = board.cells[y][x];
      const node = document.createElement(cell.kind === "mirror" ? "button" : "div");
      node.className = `cell cell--${cell.kind}`;
      node.dataset.x = String(x);
      node.dataset.y = String(y);
      if (cell.kind === "mirror") {
        node.type = "button";
        node.setAttribute("data-ui", "mirror-cell");
        node.setAttribute("aria-label", cellLabel(cell));
        state.mirrorCells.push({ x, y, element: node });
      } else if (cell.kind === "wall" || cell.kind === "floor") {
        node.setAttribute("aria-hidden", "true");
      } else {
        node.setAttribute("role", "img");
        node.setAttribute("aria-label", cellLabel(cell));
      }
      if (cell.kind === "emitter") {
        node.classList.add(`dir-${directionName(cell.direction)}`);
      }
      const piece = buildPiece(cell);
      if (piece) {
        node.append(piece);
      }
      state.cellElements.set(`${x},${y}`, node);
      elements.board.append(node);
    }
  }
}

function buildPiece(cell) {
  if (cell.kind === "wall" || cell.kind === "floor") {
    return null;
  }
  const piece = document.createElement("span");
  piece.className = `piece piece--${cell.kind}`;
  piece.setAttribute("aria-hidden", "true");
  if (cell.kind === "emitter" || cell.kind === "receiver") {
    piece.append(document.createElement("i"));
  }
  return piece;
}

function directionName(direction) {
  return ["north", "east", "south", "west"][direction] ?? "east";
}

function cellLabel(cell) {
  if (cell.kind === "mirror") {
    return `Mirror, ${cell.orientation === 1 ? "backslash" : "slash"} orientation. Rotate mirror.`;
  }
  if (cell.kind === "receiver") {
    return "Receiver, waiting for light.";
  }
  if (cell.kind === "emitter") {
    return `Emitter facing ${directionName(cell.direction)}.`;
  }
  if (cell.kind === "prism") {
    return "Prism, splits light into three directions.";
  }
  if (cell.kind === "wall") {
    return "Wall, blocks light.";
  }
  return "Empty tile.";
}

function traceSession() {
  if (!state.session) {
    return null;
  }
  const trace = traceBeams(state.session.board);
  state.session.paths = trace.paths;
  state.session.litCount = trace.litCount;
  state.session.complete = trace.complete;
  if (trace.complete) {
    state.session.stars = starsFor(state.session.moves, state.level.par);
  }
  return trace;
}

function updateBoard() {
  if (!state.session || !state.level) {
    return;
  }
  const trace = traceSession();
  for (const mirror of state.session.board.mirrors) {
    const node = state.cellElements.get(`${mirror.x},${mirror.y}`);
    if (node) {
      node.classList.toggle("is-backslash", mirror.orientation === 1);
      node.setAttribute("aria-label", cellLabel(mirror));
    }
  }
  for (const receiver of state.session.board.receivers) {
    const node = state.cellElements.get(`${receiver.x},${receiver.y}`);
    const lit = trace.lit.has(`${receiver.x},${receiver.y}`);
    if (node) {
      node.classList.toggle("is-lit", lit);
      node.setAttribute("aria-label", lit ? "Receiver, charged." : "Receiver, waiting for light.");
    }
  }
  renderBeams();
  updateGameView();
  if (trace.complete && !state.completed && !state.preview) {
    finishLevel();
  }
}

function renderBeams() {
  if (!elements.beamLayer || !state.session) {
    return;
  }
  elements.beamLayer.replaceChildren();
  for (const path of state.session.paths) {
    const points = path.points
      .map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
    const color = path.source % 3;
    for (const layer of ["halo", "core"]) {
      const line = document.createElementNS(SVG_NS, "polyline");
      line.setAttribute("points", points);
      line.setAttribute("class", `beam beam--${layer} beam--${color}`);
      elements.beamLayer.append(line);
    }
  }
}

function updateGameView() {
  if (!state.session || !state.level) {
    return;
  }
  const total = state.session.board.receivers.length;
  const lit = state.session.litCount;
  elements.gameChapter.textContent = `Chamber ${state.level.chapter}`;
  elements.gameTitle.textContent = state.level.name;
  elements.gameSubtitle.textContent = state.level.subtitle;
  elements.hudMoves.textContent = String(state.session.moves);
  elements.hudPar.textContent = String(state.level.par);
  elements.hudRelays.textContent = `${lit}/${total}`;
  elements.gameHint.textContent = `Par is ${state.level.par} moves. Every rotation counts.`;
  elements.boardFrame.classList.toggle("is-complete", state.session.complete);
  if (state.session.complete) {
    elements.statusLine.textContent = "Relay closed. Chamber complete.";
  } else if (state.session.moves === 0) {
    elements.statusLine.textContent = "Rotate a mirror to begin.";
  } else if (lit === 0) {
    elements.statusLine.textContent = "No signal yet. Rotate a mirror into the beam.";
  } else if (lit < total) {
    elements.statusLine.textContent = `${lit} of ${total} relays charged.`;
  } else {
    elements.statusLine.textContent = "All relays charged. Hold the circuit.";
  }
}

function finishLevel() {
  if (state.completed || !state.session || !state.level) {
    return;
  }
  state.completed = true;
  const level = state.level;
  const index = LEVELS.findIndex((entry) => entry.id === level.id);
  const next = index >= 0 ? LEVELS[index + 1] ?? null : null;
  const stars = state.session.stars || starsFor(state.session.moves, level.par);
  const previousBest = state.progress.best[level.id] ?? null;
  state.session.stars = stars;
  state.progress = recordResult(
    state.progress,
    level.id,
    state.session.moves,
    stars,
    next?.id ?? null,
  );
  saveProgress(storage, state.progress);
  state.result = {
    stars,
    moves: state.session.moves,
    previousBest: previousBest?.moves ?? null,
    bestMoves: state.progress.best[level.id]?.moves ?? state.session.moves,
    next: next?.id ?? null,
    preview: false,
  };
  updateTitleStats();
  updateTopbarStatus();
  audio.playVictory();
  window.setTimeout(() => {
    if (state.completed && state.screen === "game" && !state.modalOpen) {
      openVictoryModal();
    }
  }, reduceMotion ? 60 : 520);
}

function handleBoardClick(event) {
  const target = event.target instanceof Element ? event.target.closest("button.cell--mirror") : null;
  if (!target || !elements.board.contains(target)) {
    return;
  }
  event.preventDefault();
  rotateMirror(Number(target.dataset.x), Number(target.dataset.y), target);
}

function handleBoardKeydown(event) {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    return;
  }
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !active.classList.contains("cell--mirror")) {
    return;
  }
  event.preventDefault();
  moveMirrorFocus(active, event.key);
}

function moveMirrorFocus(active, key) {
  const x = Number(active.dataset.x);
  const y = Number(active.dataset.y);
  const [dx, dy] = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  }[key];
  const candidates = state.mirrorCells
    .filter((mirror) => mirror.element !== active)
    .filter((mirror) => {
      if (dx !== 0) {
        return mirror.y === y && (mirror.x - x) * dx > 0;
      }
      return mirror.x === x && (mirror.y - y) * dy > 0;
    })
    .sort((a, b) => {
      const aDistance = dx !== 0 ? Math.abs(a.x - x) : Math.abs(a.y - y);
      const bDistance = dx !== 0 ? Math.abs(b.x - x) : Math.abs(b.y - y);
      if (aDistance !== bDistance) {
        return aDistance - bDistance;
      }
      return dx !== 0 ? Math.abs(a.y - y) - Math.abs(b.y - y) : Math.abs(a.x - x) - Math.abs(b.x - x);
    });
  candidates[0]?.element.focus();
}

function rotateMirror(x, y, element) {
  if (
    state.screen !== "game" ||
    state.paused ||
    state.completed ||
    state.modalOpen ||
    !state.session
  ) {
    return;
  }
  const changed = rotateSessionCell(state.session, x, y);
  if (!changed) {
    return;
  }
  audio.playRotate();
  element.classList.remove("is-turning");
  void element.offsetWidth;
  element.classList.add("is-turning");
  updateBoard();
}

function resetCurrentLevel() {
  if (!state.session || !state.level) {
    return;
  }
  closeModal();
  resetSession(state.session);
  state.completed = false;
  state.paused = false;
  state.result = null;
  state.preview = false;
  for (const mirror of state.mirrorCells) {
    mirror.element.classList.remove("is-turning");
  }
  updateBoard();
  audio.playUi();
}

function setAction(button, action) {
  if (!button) {
    return;
  }
  if (!action) {
    button.hidden = true;
    button.onclick = null;
    return;
  }
  button.hidden = false;
  button.textContent = action.label;
  button.onclick = (event) => {
    event.preventDefault();
    closeModal();
    action.run();
  };
}

function openModal({ kind, kicker, title, stars = null, bodyHtml, primary, secondary, tertiary }) {
  state.modalKind = kind;
  state.modalOpen = true;
  elements.modalKicker.textContent = kicker;
  elements.modalTitle.textContent = title;
  elements.modalBody.innerHTML = bodyHtml;
  elements.modalStars.innerHTML = stars === null ? "" : starsMarkup(stars);
  elements.modalStars.hidden = stars === null;
  if (stars !== null) {
    elements.modalStars.setAttribute("aria-label", starLabel(stars));
  }
  setAction(elements.modalPrimary, primary);
  setAction(elements.modalSecondary, secondary);
  setAction(elements.modalTertiary, tertiary);
  if (!elements.modal.open) {
    elements.modal.showModal();
  }
}

function closeModal() {
  if (elements.modal.open) {
    elements.modal.close();
  }
}

function openHowToModal() {
  const fromGame = state.screen === "game" && state.session;
  const startAction = {
    label: fromGame ? "Back to the chamber" : "Enter the relay",
    run: () => {
      if (fromGame) {
        return;
      }
      startLevel(nextPlayableLevel().id);
    },
  };
  openModal({
    kind: "howto",
    kicker: "Field manual",
    title: "Route the light.",
    bodyHtml: `
      <div class="howto-list">
        <div class="howto-item">
          <span class="legend__glyph legend__glyph--mirror" aria-hidden="true"></span>
          <div><strong>Rotate mirrors</strong><p>Click, tap, or press Space on a focused mirror. Slash and backslash faces reflect the beam in different directions.</p></div>
        </div>
        <div class="howto-item">
          <span class="legend__glyph legend__glyph--prism" aria-hidden="true"></span>
          <div><strong>Use the prisms</strong><p>A prism passes the beam through and splits copies to both perpendicular sides. One source can feed three branches.</p></div>
        </div>
        <div class="howto-item">
          <span class="legend__glyph legend__glyph--receiver" aria-hidden="true"></span>
          <div><strong>Charge every receiver</strong><p>The chamber closes only when every receiver is lit. Finish at or under par for three stars.</p></div>
        </div>
      </div>
      <p class="modal__fine">Keyboard: arrows move focus, space rotates, R restarts, M toggles sound, Esc pauses.</p>
    `,
    primary: startAction,
    secondary: { label: "Close", run: () => {} },
  });
}

function openPauseModal() {
  if (state.screen !== "game" || !state.session) {
    return;
  }
  state.paused = true;
  openModal({
    kind: "pause",
    kicker: "Signal paused",
    title: "Take a breath.",
    bodyHtml: `<p>The circuit is holding. Resume when you are ready to rotate another mirror.</p>`,
    primary: { label: "Resume", run: () => {} },
    secondary: { label: "Restart chamber", run: resetCurrentLevel },
    tertiary: { label: "Chamber index", run: () => showScreen("chambers") },
  });
}

function openVictoryModal() {
  if (!state.level || !state.result) {
    return;
  }
  const result = state.result;
  const level = state.level;
  const message =
    result.stars === 3
      ? "Perfect routing. The grid is singing."
      : result.stars === 2
        ? "Relay closed. A cleaner path is still waiting."
        : "Relay closed. There is a sharper route through the light.";
  const nextAction = result.next
    ? {
        label: "Next chamber →",
        run: () => startLevel(result.next),
      }
    : {
        label: "Return to chambers",
        run: () => showScreen("chambers"),
      };
  openModal({
    kind: "victory",
    kicker: "Chamber complete",
    title: level.name,
    stars: result.stars,
    bodyHtml: `
      <p>${message}</p>
      <dl class="result-grid">
        <div><dt>Moves</dt><dd>${result.moves}</dd></div>
        <div><dt>Par</dt><dd>${level.par}</dd></div>
        <div><dt>Best</dt><dd>${result.bestMoves}</dd></div>
      </dl>
    `,
    primary: nextAction,
    secondary: { label: "Replay", run: () => startLevel(level.id) },
    tertiary: { label: "Chamber index", run: () => showScreen("chambers") },
  });
}

function toggleSound() {
  state.progress = setSound(state.progress, !state.progress.sound);
  saveProgress(storage, state.progress);
  audio.setEnabled(state.progress.sound);
  updateSoundButton();
  if (state.progress.sound) {
    audio.playUi();
  }
}

function handleGlobalKeydown(event) {
  if (elements.modal.open) {
    return;
  }
  const key = event.key.toLowerCase();
  if (key === "m") {
    toggleSound();
    return;
  }
  if (state.screen !== "game") {
    return;
  }
  if (key === "r") {
    event.preventDefault();
    resetCurrentLevel();
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    openPauseModal();
  }
}

function previewVictory() {
  if (!state.session) {
    startLevel(LEVELS[0].id, { preview: true, silent: true });
  }
  const solution = solveLevel(state.level);
  if (solution) {
    state.session.board.mirrors.forEach((mirror, index) => {
      mirror.orientation = solution.orientations[index];
    });
    state.session.moves = solution.moves;
    traceSession();
    state.completed = true;
    updateBoard();
  }
  const index = LEVELS.findIndex((entry) => entry.id === state.level.id);
  const next = index >= 0 ? LEVELS[index + 1] ?? null : null;
  state.completed = true;
  state.result = {
    stars: 3,
    moves: state.session.moves,
    previousBest: null,
    bestMoves: state.session.moves,
    next: next?.id ?? null,
    preview: true,
  };
  openVictoryModal();
}

function applyQueryState() {
  const params = new URLSearchParams(window.location.search);
  const requestedLevel = params.get("level");
  const requestedScreen = params.get("screen");
  const preview = params.get("preview");

  if (requestedLevel) {
    startLevel(requestedLevel, { preview: Boolean(preview), silent: true });
  } else if (requestedScreen === "chambers") {
    showScreen("chambers");
  } else if (requestedScreen === "game") {
    startLevel(LEVELS[0].id, { preview: Boolean(preview), silent: true });
  } else {
    showScreen("title");
  }

  if (preview === "howto") {
    openHowToModal();
  } else if (preview === "pause") {
    if (!state.session) {
      startLevel(LEVELS[0].id, { preview: true, silent: true });
    }
    openPauseModal();
  } else if (preview === "victory") {
    previewVictory();
  }
}

function bindEvents() {
  elements.board.addEventListener("click", handleBoardClick);
  elements.board.addEventListener("keydown", handleBoardKeydown);
  document.querySelectorAll('[data-ui="start-game"]').forEach((button) => {
    button.addEventListener("click", () => startLevel(nextPlayableLevel().id));
  });
  document.querySelectorAll('[data-ui="open-chambers"]').forEach((button) => {
    button.addEventListener("click", () => {
      audio.playUi();
      showScreen("chambers");
    });
  });
  document.querySelectorAll('[data-ui="open-howto"]').forEach((button) => {
    button.addEventListener("click", openHowToModal);
  });
  document.querySelectorAll('[data-ui="back-to-title"], [data-ui="brand-home"]').forEach((button) => {
    button.addEventListener("click", () => showScreen("title"));
  });
  document.querySelectorAll('[data-ui="game-back"]').forEach((button) => {
    button.addEventListener("click", () => showScreen("chambers"));
  });
  document.querySelectorAll('[data-ui="reset-level"], [data-ui="restart-level-side"]').forEach((button) => {
    button.addEventListener("click", resetCurrentLevel);
  });
  document.querySelectorAll('[data-ui="pause-game"]').forEach((button) => {
    button.addEventListener("click", openPauseModal);
  });
  elements.soundToggle?.addEventListener("click", toggleSound);
  elements.modalClose?.addEventListener("click", closeModal);
  elements.modal.addEventListener("close", () => {
    state.modalOpen = false;
    state.modalKind = null;
    state.paused = false;
    elements.modalPrimary?.blur();
  });
  window.addEventListener("keydown", handleGlobalKeydown);
}

audio.setEnabled(state.progress.sound);
bindEvents();
updateSoundButton();
updateTitleStats();
applyQueryState();
