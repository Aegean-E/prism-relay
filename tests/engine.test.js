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
import { LEVELS, levelById } from "../src/game/levels.js";
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

test("non-mirror cells cannot rotate", () => {
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
  assert.equal(LEVELS.length, 6);
  assert.equal(new Set(LEVELS.map((entry) => entry.id)).size, LEVELS.length);
  for (const entry of LEVELS) {
    const board = parseLevel(entry);
    assert.ok(board.mirrors.length > 0, `${entry.id} has a move`);
    const solution = solveLevel(entry);
    assert.ok(solution, `${entry.id} is solvable`);
    assert.equal(solution.moves, entry.par, `${entry.id} par is the shortest solution`);
    const trace = applySolution(entry, solution.orientations);
    assert.equal(trace.complete, true, `${entry.id} solution completes`);
  }
});

test("levelById finds a level and returns null for unknown ids", () => {
  assert.equal(levelById("first-light").name, "First Light");
  assert.equal(levelById("missing"), null);
});

test("directions are stable for renderer and serializer", () => {
  assert.deepEqual([NORTH, EAST, SOUTH, WEST], [0, 1, 2, 3]);
});
