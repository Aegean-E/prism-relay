import { LEVELS } from "../game/levels.js";

const screens = new Map(
  ["title", "chambers", "game"].map((name) => [name, document.getElementById(`screen-${name}`)]),
);
const grid = document.getElementById("chamber-grid");

function showScreen(name) {
  for (const [id, screen] of screens) {
    screen.hidden = id !== name;
  }
  if (name === "chambers") {
    renderChambers();
  }
}

function renderChambers() {
  if (!grid || grid.childElementCount > 0) {
    return;
  }
  for (const level of LEVELS) {
    const card = document.createElement("button");
    card.className = "chamber-card";
    card.dataset.ui = "chamber-card";
    card.dataset.level = level.id;
    card.innerHTML = `<span class="chamber-card__number">${level.chapter}</span><span class="chamber-card__name">${level.name}</span>`;
    card.addEventListener("click", () => showScreen("game"));
    grid.append(card);
  }
}

document.querySelectorAll("[data-ui='start-game']").forEach((button) => {
  button.addEventListener("click", () => showScreen("game"));
});
document.querySelectorAll("[data-ui='open-chambers']").forEach((button) => {
  button.addEventListener("click", () => showScreen("chambers"));
});
document.querySelectorAll("[data-ui='back-to-title'], [data-ui='brand-home']").forEach((button) => {
  button.addEventListener("click", () => showScreen("title"));
});
document.querySelectorAll("[data-ui='game-back']").forEach((button) => {
  button.addEventListener("click", () => showScreen("chambers"));
});

showScreen("title");
