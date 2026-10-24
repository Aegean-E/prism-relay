import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROGRESS_KEY,
  PROGRESS_VERSION,
  isUnlocked,
  loadProgress,
  normalizeProgress,
  recordResult,
  saveProgress,
  setSound,
  totalStars,
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

test("missing progress starts with the first chamber and sound on", () => {
  const progress = loadProgress(fakeStorage());
  assert.equal(progress.version, PROGRESS_VERSION);
  assert.equal(progress.sound, true);
  assert.deepEqual(progress.unlocked, ["first-light"]);
  assert.deepEqual(progress.best, {});
});

test("corrupt progress is recovered without throwing", () => {
  const progress = loadProgress(fakeStorage("{not json"));
  assert.deepEqual(progress.unlocked, ["first-light"]);
  assert.equal(totalStars(progress), 0);
});

test("unknown versions reset instead of migrating silently", () => {
  const raw = { version: 99, best: { "first-light": { moves: 1, stars: 3 } } };
  assert.deepEqual(normalizeProgress(raw), {
    version: PROGRESS_VERSION,
    sound: true,
    unlocked: ["first-light"],
    best: {},
  });
});

test("malformed best entries are dropped", () => {
  const progress = normalizeProgress({
    version: 1,
    unlocked: ["first-light", 7, "split-decision"],
    best: {
      "first-light": { moves: 2, stars: 3 },
      broken: { moves: -1, stars: 9 },
      other: null,
    },
  });
  assert.deepEqual(progress.unlocked, ["first-light", "split-decision"]);
  assert.deepEqual(progress.best, { "first-light": { moves: 2, stars: 3 } });
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

test("sound preference round-trips through storage", () => {
  const storage = fakeStorage();
  const muted = setSound(loadProgress(storage), false);
  assert.equal(muted.sound, false);
  assert.equal(saveProgress(storage, muted), true);
  assert.equal(loadProgress(storage).sound, false);
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
