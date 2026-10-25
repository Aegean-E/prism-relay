import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CALLSIGN,
  PROGRESS_KEY,
  PROGRESS_VERSION,
  SIGILS,
  isUnlocked,
  loadProgress,
  normalizeCallsign,
  normalizeProgress,
  rankFor,
  recordResult,
  saveProgress,
  setMusic,
  setSound,
  statsFor,
  totalStars,
  updateProfile,
} from "../src/ui/progress.js";

function fakeStorage(initial = null) {
  let value = initial;
  return {
    getItem(key) {
      return key === PROGRESS_KEY ? value : null;
    },
    setItem(key, next) {
      if (key === PROGRESS_KEY) {
        value = next;
      }
    },
    read() {
      return value;
    },
  };
}

function blankShape() {
  return {
    version: PROGRESS_VERSION,
    sound: true,
    music: true,
    profile: { callsign: DEFAULT_CALLSIGN, sigil: "prism" },
    unlocked: ["first-light"],
    best: {},
  };
}

test("missing progress starts with defaults, music on and the first chamber", () => {
  assert.deepEqual(loadProgress(fakeStorage()), blankShape());
});

test("corrupt progress is recovered without throwing", () => {
  const progress = loadProgress(fakeStorage("{not json"));
  assert.deepEqual(progress, blankShape());
});

test("unknown versions reset instead of migrating silently", () => {
  const raw = { version: 99, best: { "first-light": { moves: 1, stars: 3 } } };
  assert.deepEqual(normalizeProgress(raw), blankShape());
});

test("legacy records without profile or music gain safe defaults", () => {
  const progress = normalizeProgress({
    version: 1,
    sound: false,
    unlocked: ["first-light"],
    best: {},
  });
  assert.equal(progress.sound, false);
  assert.equal(progress.music, true);
  assert.deepEqual(progress.profile, { callsign: DEFAULT_CALLSIGN, sigil: "prism" });
});

test("malformed best, unlocked and profile entries are dropped or normalized", () => {
  const progress = normalizeProgress({
    version: 1,
    sound: true,
    music: false,
    profile: { callsign: "  Nova   Relay  ", sigil: "unknown" },
    unlocked: ["first-light", 7, "split-decision", "ghost-level"],
    best: {
      "first-light": { moves: 2, stars: 3 },
      "split-decision": { moves: 3, stars: 4 },
      broken: { moves: -1, stars: 9 },
      other: null,
    },
  });
  assert.deepEqual(progress.unlocked, ["first-light", "split-decision"]);
  assert.deepEqual(progress.best, { "first-light": { moves: 2, stars: 3 } });
  assert.equal(progress.music, false);
  assert.equal(progress.profile.callsign, "Nova Relay");
  assert.equal(progress.profile.sigil, "prism");
  assert.ok(SIGILS.includes(progress.profile.sigil));
});

test("recordResult keeps the best rating and unlocks the next chamber", () => {
  let progress = loadProgress(fakeStorage());
  progress = recordResult(progress, "first-light", 4, 1, "split-decision");
  progress = recordResult(progress, "first-light", 2, 2, "split-decision");
  progress = recordResult(progress, "first-light", 9, 3, "split-decision");
  assert.deepEqual(progress.best["first-light"], { moves: 9, stars: 3 });
  assert.equal(isUnlocked(progress, "split-decision"), true);
  assert.equal(totalStars(progress), 3);
});

test("recordResult does not replace a better result with a worse one", () => {
  let progress = recordResult(
    loadProgress(fakeStorage()),
    "split-decision",
    3,
    3,
    "mirror-maze",
  );
  progress = recordResult(progress, "split-decision", 8, 1, null);
  assert.deepEqual(progress.best["split-decision"], { moves: 3, stars: 3 });
});

test("a completed first episode unlocks the first chamber of the next episode", () => {
  const best = {};
  for (const id of [
    "first-light",
    "split-decision",
    "mirror-maze",
    "switchback",
    "crossfire",
    "the-vault",
  ]) {
    best[id] = { moves: 1, stars: 3 };
  }
  const progress = normalizeProgress({
    version: 1,
    sound: true,
    music: true,
    unlocked: ["first-light"],
    best,
  });
  assert.equal(isUnlocked(progress, "double-down"), true);
  assert.equal(isUnlocked(progress, "forked-path"), false);
});

test("sound and music preferences round-trip through storage", () => {
  const storage = fakeStorage();
  let progress = loadProgress(storage);
  progress = setSound(progress, false);
  progress = setMusic(progress, false);
  assert.equal(saveProgress(storage, progress), true);
  const loaded = loadProgress(storage);
  assert.equal(loaded.sound, false);
  assert.equal(loaded.music, false);
});

test("profile callsign and sigil update and clamp safely", () => {
  let progress = updateProfile(loadProgress(fakeStorage()), {
    callsign: "  Lumen   Architect Of The Long Way Home  ",
    sigil: "helix",
  });
  assert.equal(progress.profile.callsign.length, 18);
  assert.equal(progress.profile.callsign, "Lumen Architect Of");
  assert.equal(progress.profile.sigil, "helix");
  progress = updateProfile(progress, { callsign: "   " });
  assert.equal(progress.profile.callsign, DEFAULT_CALLSIGN);
  progress = updateProfile(progress, { sigil: "invalid" });
  assert.equal(progress.profile.sigil, "prism");
});

test("normalizeCallsign handles empty and non-string values", () => {
  assert.equal(normalizeCallsign(""), DEFAULT_CALLSIGN);
  assert.equal(normalizeCallsign(null), DEFAULT_CALLSIGN);
  assert.equal(normalizeCallsign("  a  b  "), "a b");
});

test("rank thresholds cover the full star range", () => {
  assert.equal(rankFor(0), "Cadet");
  assert.equal(rankFor(5), "Cadet");
  assert.equal(rankFor(6), "Operator");
  assert.equal(rankFor(14), "Weaver");
  assert.equal(rankFor(23), "Architect");
  assert.equal(rankFor(32), "Lumen");
  assert.equal(rankFor(39), "Relay Master");
  assert.equal(rankFor(100), "Relay Master");
});

test("statsFor derives completion, perfect runs, stars and moves", () => {
  const progress = normalizeProgress({
    version: 1,
    profile: { callsign: "Nova", sigil: "orbit" },
    best: {
      "first-light": { moves: 1, stars: 3 },
      "split-decision": { moves: 4, stars: 2 },
    },
  });
  assert.deepEqual(statsFor(progress), {
    completed: 2,
    perfect: 1,
    stars: 5,
    moves: 5,
    totalLevels: 13,
    totalStars: 39,
  });
});

test("a storage failure is reported and never breaks the game", () => {
  const broken = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      throw new Error("denied");
    },
  };
  assert.equal(loadProgress(broken).version, 1);
  assert.equal(saveProgress(broken, loadProgress(null)), false);
});
