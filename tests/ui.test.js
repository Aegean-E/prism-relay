import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LEVELS } from "../src/game/levels.js";
import { parseLevel } from "../src/game/engine.js";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const manifest = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));

const requiredControls = [
  "brand-home",
  "sound-toggle",
  "open-howto",
  "start-game",
  "open-chambers",
  "back-to-title",
  "chamber-grid",
  "game-back",
  "hud-moves",
  "hud-relays",
  "reset-level",
  "pause-game",
  "board",
  "restart-level-side",
  "game-hint",
  "status-line",
  "modal",
  "modal-close",
  "modal-title",
  "modal-body",
  "modal-primary",
  "modal-secondary",
  "modal-tertiary",
];

test("the document ships the three screens and a module entry point", () => {
  for (const screen of ["title", "chambers", "game"]) {
    assert.match(html, new RegExp(`id="screen-${screen}"`));
    assert.match(html, new RegExp(`data-panel="screen-${screen}"`));
  }
  assert.match(html, /<script type="module" src="\.\/src\/ui\/app\.js"><\/script>/);
});

test("every essential control has a stable data-ui handle", () => {
  for (const control of requiredControls) {
    assert.match(html, new RegExp(`data-ui="${control}"`), `${control} is missing`);
  }
});

test("panels and cues expose screenshot and accessibility markers", () => {
  assert.match(html, /data-panel="board"/);
  assert.match(html, /data-panel="chamber-grid"/);
  assert.match(html, /data-cue="status-line"/);
  assert.match(html, /data-cue="game-chapter"/);
  assert.match(html, /aria-live|data-cue/);
});

test("the shell has no inline styles or third-party asset dependencies", () => {
  assert.equal(/<style[ >]/i.test(html), false);
  assert.equal(/style="/i.test(html), false);
  assert.equal(/https?:\/\//i.test(html), false);
});

test("the manifest keeps a zero-dependency test and snapshot command", () => {
  assert.equal(manifest.type, "module");
  assert.equal(manifest.scripts.test, "node --test tests");
  assert.equal(manifest.scripts["ui:snapshot"], "node scripts/ui-inventory.mjs");
  assert.equal(manifest.dependencies, undefined);
  assert.equal(manifest.devDependencies, undefined);
});

test("all six chambers parse and grow in board size without blank rows", () => {
  assert.equal(LEVELS.length, 6);
  for (const level of LEVELS) {
    const board = parseLevel(level);
    assert.ok(board.width >= 7, `${level.id} has room for the board`);
    assert.ok(board.height >= 7, `${level.id} has room for the board`);
    assert.ok(board.receivers.length >= 1, `${level.id} has a receiver`);
    assert.ok(board.mirrors.length >= 1, `${level.id} has a rotatable mirror`);
  }
});

test("the UI inventory scanner recognizes the three marker kinds", () => {
  const source = readFileSync(new URL("scripts/ui-inventory.mjs", root), "utf8");
  assert.match(source, /data-\(ui\|panel\|cue\)/);
  assert.match(source, /ui: "control"/);
  assert.match(source, /panel: "panel"/);
  assert.match(source, /cue: "cue"/);
});
