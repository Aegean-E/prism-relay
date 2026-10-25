import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EAST,
  NORTH,
  SOUTH,
  WEST,
  createSession,
  parseLevel,
  refreshSession,
  resetSession,
  rotateSessionCell,
  starsFor,
  traceBeams,
} from "../src/game/engine.js";
import {
  EPISODES,
  LEVELS,
  TOTAL_LEVELS,
  TOTAL_STARS,
  episodeForLevel,
  levelById,
  levelsForEpisode,
  nextLevel,
} from "../src/game/levels.js";
import { applySolution, solveLevel } from "../src/game/solver.js";

function level(rows, par = 0) {
  return {
    id: "test",
    name: "Test",
    rows,
    par,
  };
}

test("a straight beam lights a receiver", () => {
  const board = parseLevel(level([">..T"]));
  const trace = traceBeams(board);
  assert.equal(trace.complete, true);
  assert.equal(trace.litCount, 1);
});

test("a slash mirror reflects east to north", () => {
  const board = parseLevel(level(["..T", ">./"]));
  const trace = traceBeams(board);
  assert.equal(trace.complete, true);
});

test("a backslash mirror reflects east to south", () => {
  const board = parseLevel(level([">.\\", "...", "..T"]));
  const trace = traceBeams(board);
  assert.equal(trace.complete, true);
});

test("rotating flips a mirror between both diagonals", () => {
  const session = createSession(level([">.\\", "...", "..T"]));
  assert.equal(session.board.mirrors[0].orientation, 1);
  assert.equal(rotateSessionCell(session, 2, 0), true);
  assert.equal(session.board.mirrors[0].orientation, 0);
  assert.equal(session.moves, 1);
});

test("cells without a rotatable piece cannot rotate", () => {
  const session = createSession(level([">..T"]));
  assert.equal(rotateSessionCell(session, 0, 0), false);
  assert.equal(rotateSessionCell(session, 3, 0), false);
  assert.equal(session.moves, 0);
});

test("walls stop a beam", () => {
  const board = parseLevel(level([">.#T"]));
  const trace = traceBeams(board);
  assert.equal(trace.complete, false);
});

test("a prism splits a beam into perpendicular branches", () => {
  const board = parseLevel(level([".T.", ">*.", ".T."]));
  const trace = traceBeams(board);
  assert.equal(trace.complete, true);
  assert.ok(trace.paths.length >= 2);
});

test("a splitter passes the beam and forks a copy to the selected side", () => {
  const board = parseLevel(level([">ST", ".T."]));
  assert.equal(board.splitters.length, 1);
  assert.equal(board.rotatables.length, 1);
  const trace = traceBeams(board);
  assert.equal(trace.complete, true);
  assert.equal(trace.litCount, 2);
});

test("flipping a splitter changes which side receives the fork", () => {
  const session = createSession(level([">ZT", ".T."]));
  assert.equal(session.complete, false);
  assert.equal(rotateSessionCell(session, 1, 0), true);
  assert.equal(session.board.splitters[0].orientation, 0);
  assert.equal(session.complete, true);
  assert.equal(session.moves, 1);
});

test("paired portals carry a beam across the grid in the same direction", () => {
  const board = parseLevel(level([">1.1T"]));
  assert.equal(board.portals.length, 2);
  const trace = traceBeams(board);
  assert.equal(trace.complete, true);
  assert.equal(trace.paths.length, 2);
});

test("portal pairs must have exactly two endpoints", () => {
  assert.throws(() => parseLevel(level([">1.T"])), /exactly two portals/);
  assert.throws(() => parseLevel(level([">1.1.1T"])), /exactly two portals/);
});

test("a mirror loop terminates", () => {
  const board = parseLevel(level(["./\\", ">*/", "T.."]));
  const trace = traceBeams(board);
  assert.equal(trace.complete, false);
  assert.ok(trace.paths.length > 0);
});

test("session completion records stars and reset restores the level", () => {
  const source = level(["..T", ">.\\", "..."], 1);
  const session = createSession(source);
  refreshSession(session);
  assert.equal(session.complete, false);
  rotateSessionCell(session, 2, 1);
  assert.equal(session.complete, true);
  assert.equal(session.stars, 3);
  resetSession(session);
  assert.equal(session.moves, 0);
  assert.equal(session.complete, false);
  assert.equal(session.board.mirrors[0].orientation, 1);
  assert.equal(session.paths.length, 1);
});

test("stars award three at par, two within two moves, else one", () => {
  assert.equal(starsFor(3, 3), 3);
  assert.equal(starsFor(4, 3), 2);
  assert.equal(starsFor(5, 3), 2);
  assert.equal(starsFor(6, 3), 1);
});

test("every shipped level is rectangular, unique and solvable at its par", () => {
  assert.equal(LEVELS.length, 13);
  assert.equal(TOTAL_LEVELS, 13);
  assert.equal(TOTAL_STARS, 39);
  assert.equal(EPISODES.length, 3);
  assert.equal(new Set(LEVELS.map((entry) => entry.id)).size, LEVELS.length);
  for (const entry of LEVELS) {
    const board = parseLevel(entry);
    assert.ok(board.rotatables.length > 0, `${entry.id} has a move`);
    const solution = solveLevel(entry);
    assert.ok(solution, `${entry.id} is solvable`);
    assert.equal(solution.moves, entry.par, `${entry.id} par is the shortest solution`);
    const trace = applySolution(entry, solution.orientations);
    assert.equal(trace.complete, true, `${entry.id} solution completes`);
  }
  assert.ok(EPISODES[1].levels.some((entry) => parseLevel(entry).splitters.length > 0));
  assert.ok(EPISODES[2].levels.every((entry) => parseLevel(entry).portals.length >= 2));
  assert.ok(EPISODES[2].levels.at(-1).par > EPISODES[1].levels.at(-1).par);
});

test("episode helpers resolve levels and their order", () => {
  assert.equal(episodeForLevel("double-down").id, "refraction");
  assert.equal(levelsForEpisode("crossing").length, 3);
  assert.equal(levelsForEpisode("missing").length, 0);
  assert.equal(nextLevel("the-vault").id, "double-down");
  assert.equal(nextLevel("long-way-home"), null);
  assert.equal(episodeForLevel("missing"), null);
});

test("levelById finds a level and returns null for unknown ids", () => {
  assert.equal(levelById("first-light").name, "First Light");
  assert.equal(levelById("missing"), null);
});

test("directions are stable for renderer and serializer", () => {
  assert.deepEqual([NORTH, EAST, SOUTH, WEST], [0, 1, 2, 3]);
});
