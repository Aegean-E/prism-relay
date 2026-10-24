# prism-relay

[![Built with AIKit](https://img.shields.io/badge/built%20with-AIKit-6f42c1)](https://github.com/Aegean-E/AIKit)

A neon laser-mirror puzzle game: rotate prisms, split beams, and recharge the grid across handcrafted levels.

## ⚡ 30-Second Cold-Start Quick Reference

- **Runtime Prerequisites**: <FILL: each runtime this project needs and its minimum version>
- **Canonical Regression Shield Gate**:
  ```bash
  node --test tests
  ```

### 🛠️ AIKit Commands (run from the AIKit folder)
| Role | Command |
|---|---|
| Status, task and gates | `python aikit.py status prism-relay` |
| Phase 4: every gate | `python aikit.py check prism-relay` |
| Repair memory and map, then check | `python aikit.py fix prism-relay` |
| Resume an interrupted task | `python aikit.py resume prism-relay` |

## 📦 What's Inside

```text
prism-relay/
├── .gitignore                <- transient AIKit state excluded
├── LICENSE                   <- GNU AGPL-3.0
├── README.md
└── .aikit/                   <- this project's memory: record, ledger, decisions
```

## 📜 License

GNU Affero General Public License v3.0; see [LICENSE](LICENSE).
