import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { browserCommand, launchBrowser, looksLikePrismRelay, safePath } from "../scripts/serve.mjs";

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

test("opens the game with the platform browser command", () => {
  const url = "http://127.0.0.1:4173/";
  assert.deepEqual(browserCommand("win32", url), {
    command: "cmd",
    args: ["/c", "start", "", url],
  });
  assert.deepEqual(browserCommand("darwin", url), { command: "open", args: [url] });
  assert.deepEqual(browserCommand("linux", url), { command: "xdg-open", args: [url] });
});

test("launches the browser detached and survives a missing launcher", () => {
  const calls = [];
  let errorHandled = false;
  let unrefCalled = false;
  const child = launchBrowser("http://127.0.0.1:4173/", "linux", (command, args, options) => {
    calls.push({ command, args, options });
    return {
      on(event) {
        if (event === "error") errorHandled = true;
      },
      unref() {
        unrefCalled = true;
      },
    };
  });
  assert.deepEqual(calls, [
    {
      command: "xdg-open",
      args: ["http://127.0.0.1:4173/"],
      options: { detached: true, stdio: "ignore", windowsHide: true },
    },
  ]);
  assert.ok(child);
  assert.equal(errorHandled, true);
  assert.equal(unrefCalled, true);
  assert.equal(
    launchBrowser("http://127.0.0.1:4173/", "linux", () => {
      throw new Error("launcher missing");
    }),
    null,
  );
});

test("recognizes an already running Prism Relay before reusing port 4173", () => {
  assert.equal(looksLikePrismRelay("<title>Prism Relay — a light-routing puzzle</title>"), true);
  assert.equal(looksLikePrismRelay("<title>Some other app</title>"), false);
  assert.equal(looksLikePrismRelay(null), false);
});

test("ships one-click launchers that serve and open the game", () => {
  const cmd = readFileSync(join(root, "play.cmd"), "utf8");
  const sh = readFileSync(join(root, "play.sh"), "utf8");
  assert.match(cmd, /scripts\\serve\.mjs --open/);
  assert.match(sh, /scripts\/serve\.mjs --open/);
  assert.equal(
    (cmd.match(/\r\n/g) ?? []).length,
    (cmd.match(/\n/g) ?? []).length,
    "play.cmd must use CRLF line endings",
  );
  assert.ok(!sh.includes("\r"), "play.sh must use LF line endings");
});
