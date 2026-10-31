# Tauri migration — 26 October 2026

The Tauri version retains the xterm.js frontend and companions. Its Rust engine
use portable-pty; no Electron process or Node backend is needed
to run the binary. Electron remains available for comparison and feedback.
The historic record is not being renamed to preserve local paths.

## Orders

- `npm start`: Tauri development; `npm run start:electron`: old engine.
- `npm run build:tauri`: optimized binary in `src-tauri/target/release/terminal-deck`.
- `npm run install:tauri`: parallel installation `terminal-deck-tauri` and dedicated menu.
- `node scripts/install-tauri.cjs --replace`: explicit replacement of the main launcher.
- `terminal-deck-electron`: Electron motor retained after parallel installation.
- `npm run memory`: PSS/RSS of processes visible from the current session.
- `npm run instructions:git`: apply global Git block, save then atomic replace.

The profile is `~/.config/terminal-deck-tauri/workspace.json`. At the first import,
the installer also keeps a raw copy of the Electron profile in this new
folder, with private permissions. The original profile remains intact. Both
Profiles do not sync after copying. Conversations remain managed
by Codex; only documented dispositions and preferences are imported.
`TERMINAL_DECK_PROFILE` continues to allow an isolated recipe.

## Architecture and limits

- `src-tauri/src/main.rs`: Explicit API, window guard, local windows and closing.
- `terminal.rs`: PTY, UTF-8 between reads, resizing, acknowledgments and back pressure.
- `workspace.rs`: commit and atomic write, same fart indices and profile format.
- `quotas.rs`: app-server initialization/read protocol, five-minute cache, twelve-second delay, last reading kept in case of error.
- `git.rs`: fixed read-only command, bounded output and eight-second delay. The Electron engine offers the same view via `src/git.cjs`.
- `src/tauri-bridge.js`: common frontend contract, listeners installed before boot.
- Workbench is another local WebView. It cannot use `deck`; its only business command is `studio_export`, limited to PNG/JSON validated in Downloads. Exclusive creation so as not to overwrite any files. No possibility to choose an arbitrary path.
- Navigation limited to the intended local pages; new remote windows refused. The capabilities of the main interface do not apply to the workshop.
- Built-in scenarios are only compiled with `native-smoke`. **Never install this test binary**; normal compilation excludes them.

Isolated X11 testing does not prove recipe on actual Hyprland/Wayland desktop,
neither the action of a real notification server, nor the resumption of a Codex account in
during use. No locks are removed and no global Codex servers
is not stopped. The shared server selection follows the existing arguments.

## Memory measured

Synthetic local scenario: three bash shells at rest, window 1520 × 960,
Xvfb without GPU and temporary profiles. Tauri compiled in release. No account or
prompt template. Measurement of descending processes after five seconds of stabilization.

| Engine | PSS app | RSS cumulative application | PSS with shells |
|---|---:|---:|---:|
| Electron | 218 MiB | 626,9 MiB | 221,9 MiB |
| Optimized Tauri | 333,4 MiB | 603,2 MiB | 337 MiB |

**This test does not show a drop in PSS memory.** The added RSS counts
pages shared several times; its slight decline is not enough to declare a gain.
This statement does not measure Toubi's Deck on his desktop, his actual Codex processes,
nor its graphics acceleration. The measurement JSON is in
`artifacts/memory-comparison.json` (local artifact ignored by Git).

The objective of lower consumption remains to be confirmed/optimized on the desktop
real. The parallel installation allows comparison without imposing this assumption.

Technical sources: [Tauri](https://tauri.app/concept/architecture/) architecture,
[Tauri configuration](https://v2.tauri.app/reference/config/),
[laptop-pty](https://docs.rs/portable-pty/latest/portable_pty/).

## Final recipe

25 JavaScript tests and 7 Rust tests pass; Syntax and format checked.
Electron UI/starter/workshop recipes and Tauri GTK recipe pass. The latter
in particular checks the real X11 shortcuts, the native clipboard, PNG export
written by Rust, its header, command separation and native closure
without confirmation. A separate test of the binary release without a valid test feature
window opening, Ctrl Shift N and actual shell input.
Parallel installation carried out, main Electron launcher retained.
