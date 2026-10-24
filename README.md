# Prism Relay

[![Built with AIKit](https://img.shields.io/badge/built%20with-AIKit-6f42c1)](https://github.com/Aegean-E/AIKit)

A neon light-routing puzzle game: rotate mirrors, split beams through prisms, and charge every receiver across six handcrafted chambers.

## 30-Second Cold-Start Quick Reference

- **Runtime Prerequisites**: Node.js 20+ (tested on Node 26) and a modern browser (Chromium, Firefox or Safari). No npm install and no network access are required.
- **Play locally**:
  ```bash
  npm start
  ```
  Then open `http://127.0.0.1:4173/`.
- **Canonical Regression Shield Gate**:
  ```bash
  npm test
  ```
- **UI inventory proof**:
  ```bash
  npm run ui:snapshot
  ```

### Controls

| Input | Action |
|---|---|
| Click / tap a mirror | Rotate it 90 degrees |
| Arrow keys | Move focus between rotatable pieces |
| Space / Enter | Rotate the focused mirror |
| R | Restart the chamber |
| Esc | Pause |
| M | Toggle sound |

## What Is Prism Relay

Each chamber is a grid of emitters, mirrors, prisms and receivers. An emitter fires a continuous beam. A mirror reflects the beam to an adjacent cell; a prism passes the beam through and splits copies to both perpendicular sides. A receiver absorbs the beam and charges. Charge every receiver to close the relay.

Moves are counted per mirror rotation. Each chamber advertises a par, the shortest possible solution. Finish at or under par for three stars, within two extra moves for two, and otherwise one. The best rating and move count for every chamber are saved locally.

### Chambers

| Chapter | Name | Idea |
|---|---|---|
| 01 | First Light | One mirror, one clean reflection |
| 02 | Split Decision | A prism feeds two receivers |
| 03 | Mirror Maze | Three independent branches |
| 04 | Switchback | A walled service corridor |
| 05 | Crossfire | Two emitters, six receivers |
| 06 | The Vault | Four prisms and a six-move finale |

Progress is stored in `localStorage` under `prism-relay.progress.v1`. A missing or corrupt record resets safely without interrupting play.

## What's Inside

```text
prism-relay/
├── .aikit/                    <- project memory: record, ledger, decisions, UI contract
├── .gitignore                <- transient state and caches excluded
├── LICENSE                   <- GNU AGPL-3.0
├── README.md                 <- this living quick reference
├── index.html                 <- semantic shell and all UI surfaces
├── package.json               <- zero dependencies, test and snapshot commands
├── scripts/
│   ├── serve.mjs              <- Node standard-library static server
│   └── ui-inventory.mjs       <- stable data-ui / data-panel / data-cue inventory
├── src/
│   ├── game/
│   │   ├── engine.js          <- pure parser, beam tracer, session and scoring
│   │   ├── levels.js          <- six frozen ASCII chambers and pars
│   │   └── solver.js          <- exhaustive minimum-move solver
│   ├── ui/
│   │   ├── app.js             <- screens, board renderer, input, modal flow
│   │   ├── audio.js           <- generated WebAudio cues, no asset files
│   │   └── progress.js        <- versioned localStorage envelope
│   ├── styles.css             <- component styling using theme tokens
│   └── theme.css              <- the only file with raw color and font values
└── tests/
    ├── engine.test.js         <- physics, cycles, session, solver-backed pars
    ├── progress.test.js       <- corrupt state, best result, unlock, sound
    └── ui.test.js             <- screen, control and manifest contract
```

### Design Decisions

- **Pure engine first.** `engine.js` knows nothing about the DOM. `traceBeams` returns immutable paths and lit-receiver keys, so tests and the SVG renderer share one source of truth.
- **Solver-backed par.** Every level is checked at test time by enumerating mirror orientations. The advertised par must equal the true minimum move count.
- **Token-only styling.** Raw colors and font values live in `src/theme.css`; every other line uses CSS custom properties.
- **Accessible by construction.** The board is a grid of real buttons with labels, keyboard focus, `aria-pressed` mirror state, a live status line and a native `<dialog>`.
- **No external assets.** Light beams are SVG paths, pieces are CSS shapes, and sounds are synthesized with WebAudio.

## AIKit Workflow

Run these from the AIKit checkout:

| Role | Command |
|---|---|
| Project status, task and gates | `python aikit.py status prism-relay` |
| Open a bounded UI task | `python aikit.py ui begin prism-relay --surface app` |
| Verify scope, fast proof, inventory and style drift | `python aikit.py ui verify prism-relay` |
| Close the UI task after review | `python aikit.py ui finish prism-relay --reviewed --reviewer <name>` |
| Phase 4: every gate | `python aikit.py check prism-relay` |

The committed UI contract `.aikit/ui.json` bounds the surface to `index.html` and `src/**`, runs `npm test` as the fast proof, and compares `npm run ui:snapshot` against the baseline. Tests, tooling, project memory and README are protected paths.

### Screenshot QA

The app accepts development-only query parameters so every state can be captured without a test driver:

| URL | State |
|---|---|
| `/?screen=title` | Title |
| `/?screen=chambers` | Chamber index |
| `/?level=mirror-maze` | Gameplay |
| `/?level=mirror-maze&preview=howto` | How-to dialog |
| `/?level=mirror-maze&preview=pause` | Pause dialog |
| `/?level=mirror-maze&preview=victory` | Three-star victory dialog |

Screenshots are reviewed by six independent providers through subagents before the final UI commit.

## License

GNU Affero General Public License v3.0; see [LICENSE](LICENSE).
