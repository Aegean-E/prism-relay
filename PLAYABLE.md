# Website playable contract

Prism Relay is served inside the AegeanWorks website from a commit-named copy of
`index.html` and `src/**`. The AegeanWorks workflow refreshes that copy daily
with `tools/sync_playable_games.py` and shows this repository's `package.json`
version, commit and a SHA-256 digest on the Play page.

Keep these rules when changing the game. A change that breaks one of them makes
the website sync fail instead of publishing a broken build.

## Required layout and paths

- Keep `index.html` at the repository root.
- Keep all runtime JavaScript, CSS and other loaded files under `src/`.
- Use only relative URLs such as `./src/...`; never root-absolute paths like
  `/src/...`.
- Do not reference a machine path, `file://`, or anything outside this
  repository.
- If a runtime file must move outside `index.html` or `src/`, update the copy
  allowlist in AegeanWorks `tools/sync_playable_games.py` in the same change.

## Required runtime

- The game must run from a plain static HTTP server at a nested path, for
  example `http://127.0.0.1:8000/prism-relay/`, with no rewrite or proxy.
- Do not add a backend, API route, `fetch`, `XMLHttpRequest`, `WebSocket`,
  server-side rendering or any other network call.
- Do not register a service worker; the website owns the service worker and
  cache.
- Do not load a CDN, remote font, remote image or analytics script. Keep every
  runtime asset in the repository. The SVG XML namespace
  `http://www.w3.org/2000/svg` is the only allowed absolute URL.
- Do not navigate the top window or assume the game owns the browser tab; it
  runs inside a same-origin iframe. `window.top` and `window.parent`
  navigation are not allowed.

## Required metadata and storage

- Keep `package.json` `version` in semver; the website displays it.
- Keep `LICENSE` as the Aegean Game License 1.1 (AGL-1.1) text.
- Prefix game progress keys with `prism-relay` so they cannot collide with the
  host site's storage.

## Verification before merging

```bash
npm test
```

From the AegeanWorks project:

```bash
python tools/sync_playable_games.py --check-source
```

Also serve the parent directory and open the game through a nested URL, not
`file://` and not the repository root:

```bash
python -m http.server 8000 --directory ..
# open http://127.0.0.1:8000/prism-relay/
```

A successful source check, a passing test suite and a nested-path load are the
three proofs the website sync expects.
