export const PROGRESS_KEY = "prism-relay.progress.v1";
export const PROGRESS_VERSION = 1;

function blankProgress() {
  return {
    version: PROGRESS_VERSION,
    sound: true,
    unlocked: ["first-light"],
    best: {},
  };
}

export function normalizeProgress(raw) {
  if (!raw || typeof raw !== "object" || raw.version !== PROGRESS_VERSION) {
    return blankProgress();
  }
  const best = {};
  if (raw.best && typeof raw.best === "object") {
    for (const [levelId, result] of Object.entries(raw.best)) {
      if (
        typeof levelId === "string" &&
        result &&
        Number.isInteger(result.moves) &&
        result.moves >= 0 &&
        Number.isInteger(result.stars) &&
        result.stars >= 1 &&
        result.stars <= 3
      ) {
        best[levelId] = { moves: result.moves, stars: result.stars };
      }
    }
  }
  const unlocked = Array.isArray(raw.unlocked)
    ? raw.unlocked.filter((id) => typeof id === "string")
    : [];
  if (!unlocked.includes("first-light")) {
    unlocked.unshift("first-light");
  }
  return {
    version: PROGRESS_VERSION,
    sound: raw.sound !== false,
    unlocked: [...new Set(unlocked)],
    best,
  };
}

export function loadProgress(storage) {
  if (!storage) {
    return blankProgress();
  }
  try {
    const text = storage.getItem(PROGRESS_KEY);
    if (!text) {
      return blankProgress();
    }
    return normalizeProgress(JSON.parse(text));
  } catch {
    return blankProgress();
  }
}

export function saveProgress(storage, progress) {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(normalizeProgress(progress)));
    return true;
  } catch {
    return false;
  }
}

function betterResult(previous, moves, stars) {
  if (!previous) {
    return true;
  }
  if (stars !== previous.stars) {
    return stars > previous.stars;
  }
  return moves < previous.moves;
}

export function recordResult(progress, levelId, moves, stars, nextLevelId = null) {
  const next = normalizeProgress(progress);
  if (betterResult(next.best[levelId], moves, stars)) {
    next.best[levelId] = { moves, stars };
  }
  if (nextLevelId && !next.unlocked.includes(nextLevelId)) {
    next.unlocked.push(nextLevelId);
  }
  return next;
}

export function setSound(progress, enabled) {
  const next = normalizeProgress(progress);
  next.sound = Boolean(enabled);
  return next;
}

export function totalStars(progress) {
  return Object.values(normalizeProgress(progress).best).reduce(
    (total, result) => total + result.stars,
    0,
  );
}

export function isUnlocked(progress, levelId) {
  return normalizeProgress(progress).unlocked.includes(levelId);
}
