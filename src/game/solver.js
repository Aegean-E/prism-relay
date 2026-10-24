import { parseLevel, traceBeams } from "./engine.js";

function popcount(value) {
  let count = 0;
  let bits = value;
  while (bits > 0) {
    count += bits & 1;
    bits >>>= 1;
  }
  return count;
}

export function solveLevel(level) {
  const board = parseLevel(level);
  const mirrorCount = board.mirrors.length;
  if (mirrorCount > 20) {
    throw new Error("Levels with more than 20 mirrors need a different solver.");
  }
  const initialMask = board.mirrors.reduce(
    (mask, mirror, index) => mask | (mirror.orientation << index),
    0,
  );
  const total = 1 << mirrorCount;
  let best = null;
  let examined = 0;

  for (let mask = 0; mask < total; mask += 1) {
    for (let index = 0; index < mirrorCount; index += 1) {
      board.mirrors[index].orientation = (mask >> index) & 1;
    }
    examined += 1;
    const trace = traceBeams(board);
    if (!trace.complete) {
      continue;
    }
    const moves = popcount(mask ^ initialMask);
    if (best === null || moves < best.moves) {
      best = {
        moves,
        orientations: board.mirrors.map((mirror) => mirror.orientation),
        sameAsInitial: moves === 0,
      };
    }
  }

  for (let index = 0; index < mirrorCount; index += 1) {
    board.mirrors[index].orientation = (initialMask >> index) & 1;
  }

  return best === null ? null : { ...best, examined };
}

export function applySolution(level, orientations) {
  const board = parseLevel(level);
  if (orientations.length !== board.mirrors.length) {
    throw new Error("The solution does not cover every mirror.");
  }
  board.mirrors.forEach((mirror, index) => {
    mirror.orientation = orientations[index];
  });
  return traceBeams(board);
}
