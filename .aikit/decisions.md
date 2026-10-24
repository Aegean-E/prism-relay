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
