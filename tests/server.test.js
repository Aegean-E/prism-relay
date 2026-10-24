import { test } from "node:test";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { safePath } from "../scripts/serve.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

test("serves the index at the root and resolves nested assets", () => {
  assert.equal(safePath("/"), join(root, "index.html"));
  assert.equal(safePath("/src/ui/app.js"), join(root, "src", "ui", "app.js"));
  assert.equal(safePath("/?screen=chambers"), join(root, "index.html"));
});

test("refuses traversal that leaves the project root", () => {
  assert.equal(safePath("/../secret.txt"), null);
  assert.equal(safePath("/src/../../secret.txt"), null);
  assert.equal(safePath("/%2e%2e/secret.txt"), null);
  assert.equal(safePath("/..%5csecret.txt"), null);
});

test("refuses a sibling directory whose name shares the project prefix", () => {
  const base = resolve("prism-relay-root");
  assert.equal(safePath("/../prism-relay-root-evil/secret.txt", base), null);
  assert.equal(safePath("/asset.txt", base), join(base, "asset.txt"));
});

test("refuses malformed URI escaping instead of crashing", () => {
  assert.equal(safePath("/%E0%A4%A"), null);
});
