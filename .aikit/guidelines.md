# Project Guidelines

Rules for this project only, written by people or AI agents. They add to AIKit's principles and
rank below them: a guideline never overrides a principle (PRINCIPLE-000 R6, PRINCIPLE-001 R4).
Add one with `python aikit.py guideline <name> "<rule>" --source <user|ADR-NNN|person>`, or by
hand as one line below in the form `- **G-NNN** (source): rule`; IDs are never reused.

Persisted state carries a format version. A loader refuses a version it does not support,
without modifying or quarantining that file; older versions migrate when a migration exists.

## Rules
- **G-001** (user): The website copies only index.html and src/** into a commit-named directory; keep every runtime file there, use relative URLs, and update the AegeanWorks sync allowlist when the layout changes.
- **G-002** (user): The website build must run as a static HTTP page from a subpath: no backend, API, fetch/XHR/WebSocket, service worker, CDN, remote font or image, root-absolute path, or top-window navigation.
- **G-003** (user): Serve the game from a nested path after runtime changes and run python tools/sync_playable_games.py --check-source in AegeanWorks before merging; a failure blocks the website sync.
- **G-004** (user): Keep package.json version in semver and LICENSE as AGL-1.1; the website displays the version and commit and namespaces its own storage, so prefix game localStorage keys with prism-relay.
