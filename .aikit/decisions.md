# Decisions

Why this project is built the way it is, oldest first. One entry per decision that changes a
contract, a dependency, a data format or the architecture; IDs are consecutive and never reused.

<!-- Entry format:
### ADR-NNN: <decision in one line>
- **Date**: YYYY-MM-DD
- **Status**: Accepted
- **Context**: <what forced the decision>
- **Decision**: <what was decided>
- **Consequences**: <what follows, including what it costs>
-->

### ADR-001: Static zero-dependency ESM game with a pure beam engine and solver-backed pars
- **Date**: 2026-10-24
- **Status**: Accepted
- **Context**: The game must run instantly in a browser, be testable without a bundler, and support screenshot-based UI review by several independent model providers.
- **Decision**: Ship plain HTML, CSS and ES modules served by a Node standard-library server. Keep beam physics, level parsing and scoring in pure modules; render the board with DOM cells and an SVG beam overlay; store progress in a versioned localStorage envelope. Prove every shipped chamber with a brute-force solver test whose minimum move count equals the advertised par.
- **Consequences**: No install or network is needed to play. The board is fully keyboard-accessible. Levels are capped at 20 mirrors so the solver stays instant. Visual polish lives in CSS tokens, which the AIKit UI guard can enforce.

### ADR-002: Episodes introduce rotatable splitters and paired portals; profile and music stay local
- **Date**: 2026-10-24
- **Status**: Accepted
- **Context**: The original six chambers form a complete arc but leave no long-term progression. The user asked for a profile, more episodes that get harder, mechanics that appear later, and music.
- **Decision**: Group chambers into three ordered episodes: Ignition (mirrors and fixed prisms), Refraction (rotatable splitters), Crossing (paired teleport portals). Generalize the solver to enumerate every two-state rotatable, so splitters are covered by the same par proof as mirrors. Keep the progress envelope version at 1 and add optional `music` and `profile` fields with normalized defaults, plus sequential-unlock repair so saves made before the new episodes still open the first new chamber. Profile callsign, sigil, rank and audio settings live in localStorage; background music is synthesized with WebAudio after a user gesture, with no audio assets.
- **Consequences**: Old saves are preserved without a destructive migration. Episode content adds 7 chambers and 2 mechanics; the final chamber carries 13 rotatables, so the solver still runs in milliseconds. Portal paths are emitted as separate segments to avoid drawing a false line across the grid. Music is intentionally simple and stops when the tab is hidden.
