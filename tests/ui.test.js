import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EPISODES, LEVELS, TOTAL_LEVELS, TOTAL_STARS } from "../src/game/levels.js";
import { parseLevel } from "../src/game/engine.js";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const manifest = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));

const requiredControls = [
  "brand-home",
  "open-profile",
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
  "game-mechanic",
  "status-line",
  "profile-back",
  "profile-form",
  "profile-callsign",
  "save-profile",
  "profile-save-status",
  "sigil-picker",
  "sigil-option",
  "profile-stats",
  "profile-episodes",
  "profile-music",
  "profile-sfx",
  "modal",
  "modal-close",
  "modal-title",
  "modal-body",
  "modal-primary",
  "modal-secondary",
  "modal-tertiary",
];

test("the document ships all four screens and a module entry point", () => {
  for (const screen of ["title", "chambers", "game", "profile"]) {
    assert.match(html, new RegExp(`id="screen-${screen}"`));
    assert.match(html, new RegExp(`data-panel="screen-${screen}"`));
  }
  assert.match(html, /<script type="module" src="\.\/src\/ui\/app\.js"><\/script>/);
});

test("every essential control has a stable data-ui handle", () => {
  for (const control of requiredControls) {
    assert.match(html, new RegExp(`data-ui="${control}"`), `${control} is missing`);
  }
  assert.equal((html.match(/data-ui="sigil-option"/g) ?? []).length, 4);
});

test("the sigil picker is a single-tab-stop radio group", () => {
  const picker = html.match(/<div class="sigil-picker"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "";
  const radios = [...picker.matchAll(/<button[^>]*role="radio"[^>]*>/g)].map((match) => match[0]);
  assert.equal(radios.length, 4);
  assert.equal(radios.filter((tag) => /tabindex="0"/.test(tag)).length, 1);
  assert.equal(radios.filter((tag) => /tabindex="-1"/.test(tag)).length, 3);
  const selected = radios.find((tag) => /tabindex="0"/.test(tag));
  assert.match(selected, /aria-checked="true"/);
});

test("panels and cues expose screenshot and accessibility markers", () => {
  assert.match(html, /data-panel="board"/);
  assert.match(html, /data-panel="chamber-grid"/);
  assert.match(html, /data-panel="profile-stats"/);
  assert.match(html, /data-panel="profile-episodes"/);
  assert.match(html, /data-cue="status-line"/);
  assert.match(html, /data-cue="game-chapter"/);
  assert.match(html, /data-cue="profile-rank"/);
  assert.match(html, /aria-live|data-cue/);
});

test("topbar controls keep a 44px touch target on coarse pointers", () => {
  const css = readFileSync(new URL("src/styles.css", root), "utf8");
  const coarse = [...css.matchAll(/@media \(pointer: coarse\) \{([^}]*)\}/g)]
    .map((match) => match[1])
    .join("\n");
  for (const selector of [".topbar .icon-button", ".topbar .ghost-button", ".profile-chip"]) {
    assert.ok(coarse.includes(selector), `${selector} misses the coarse-pointer rule`);
  }
  assert.match(coarse, /min-width:\s*44px/);
  assert.match(coarse, /min-height:\s*44px/);
});

test("the shell has no inline styles or third-party asset dependencies", () => {
  assert.equal(/<style[ >]/i.test(html), false);
  assert.equal(/style="/i.test(html), false);
  assert.equal(/https?:\/\//i.test(html), false);
});

test("the manifest keeps a zero-dependency test and snapshot command", () => {
  assert.equal(manifest.type, "module");
  assert.equal(manifest.scripts.test, "node --test tests");
  assert.equal(manifest.scripts.start, "node scripts/serve.mjs --open");
  assert.equal(manifest.scripts["ui:snapshot"], "node scripts/ui-inventory.mjs");
  assert.equal(manifest.dependencies, undefined);
  assert.equal(manifest.devDependencies, undefined);
});

test("all thirteen chambers parse and use the episode taxonomy", () => {
  assert.equal(LEVELS.length, 13);
  assert.equal(TOTAL_LEVELS, 13);
  assert.equal(TOTAL_STARS, 39);
  assert.equal(EPISODES.length, 3);
  for (const level of LEVELS) {
    const board = parseLevel(level);
    assert.ok(board.width >= 7, `${level.id} has room for the board`);
    assert.ok(board.height >= 7, `${level.id} has room for the board`);
    assert.ok(board.receivers.length >= 1, `${level.id} has a receiver`);
    assert.ok(board.rotatables.length >= 1, `${level.id} has a rotatable piece`);
  }
  assert.equal(EPISODES[0].levels.length, 6);
  assert.equal(EPISODES[1].levels.length, 4);
  assert.equal(EPISODES[2].levels.length, 3);
});

test("the UI inventory scanner recognizes the three marker kinds", () => {
  const source = readFileSync(new URL("scripts/ui-inventory.mjs", root), "utf8");
  assert.match(source, /data-\(ui\|panel\|cue\)/);
  assert.match(source, /ui: "control"/);
  assert.match(source, /panel: "panel"/);
  assert.match(source, /cue: "cue"/);
});
