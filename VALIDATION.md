# Local validation — 22 October 2026

Environment: Arch Linux / Hyprland, Node.js 26.12, Electron 45, node-pty 1.1.
Graphical recipe and user opening made via XWayland (`--ozone-platform=x11`).
Launching native Wayland from the restricted Codex environment encounters problems
DRM/GPU access errors; it remains to be verified from a normal user session.

- `npm install`: native installation and rebuild successful; npm audit with no vulnerabilities reported.
- `npm run check`: syntax of sources, scripts and tests checked.
- `npm test`: 4 tests passed (panel shafts, closing and balancing,
  validation of descriptors, restoration and file permissions).
- `npm run test:ui`: Successful Electron recipe with temporary profile and HOME.
  Verification of a real PTY and the working folder, keyboard entry, composer,
  divisions and resizing, navigation between projects without stopping shells,
  keyboard-controlled palette, radar, focus and monochrome contrast.
  Codex button tested with a fictitious executable: interactive terminal, input,
  reception of response, end of the process and closing of the panel.
  Canceling shell close, 1 Mio large output, IPC commit,
  save, paused restart and shell restart also checked.
- Local launcher and menu entry installed with `npm run install:local`.

The recipe does not check the connection to a real Codex account, its quotas,
nor the resumption of an old conversation. These functions are not simulated
in the product. The contents of real terminals were not captured.

Flow control limits output awaiting rendering: node-pty is set
pause beyond 128 K unacknowledged characters and resume below 64 K. Capture
recipe is under `artifacts/terminal-deck.png`, excluded from Git.


## Review of October 23 2026

- Compact interface: removal of composer and footer; a single bar
  superior with project, active title and essential orders. Controls
  secondary remain accessible from Ctrl K. Tabs displayed in enlarged view.
- Native OSC title 0/2 displayed in panel, header, tabs and radar.
  Codex launch asks for `tui.terminal_title=["thread-title"]`, without modifying
  global configuration nor read conversation data.
- Ctrl Backspace: deletion of the previous word checked in a real shell.
- Ctrl Shift V: paste verified in the shell and an interactive program; the channel
  clipboard is replaced only in the test instance with dummy text.
- Shift Input: distinct sequence of Input checked through a real PTY in raw mode.
  Ctrl Backspace and Protected Paste are also checked byte by byte.
- Initial titles and renaming tested with a fake Codex, without account or model call.
- `npm run check`, the 4 unit tests and the Electron recipe: passed.
- Reloading the interface then new command in the same PTY: successful,
  without stopping the two open shells.


## Direct closure and reduced panels — 23 October 2026

Immediate closing of the window and panels, without dialogue. Ctrl Q closes
the panel under the mouse and Ctrl T minimizes it without killing the process. The panels
reduced remain restorable by their title; their state is memorized.

Recipe covers different keyboard focus than hover panel, lack of action
off-panel, collapsing all panels, continuing a hidden shell,
restoring the layout, and closing window with an active shell.
A false confirmation dialog causes the test to fail if called.


## Version 0.2 — 23 October 2026

Cause of text pasting: `clipboard.readText()` returns a Promise under Electron
45. The reading now waits for this Promise before limiting the text. Writing
also expects its Promise to pass on actual errors.

The recipe now uses Ozone headless, without DISPLAY or WAYLAND_DISPLAY:
Electron's native clipboard is specific to this process and does not touch the
office. The production IPC channel remains intact. Copy/paste Unicode and text
long (limit of 60 000 characters), then keyboard insertion in shell and raw PTY,
are tested with real APIs. No fake `readText` or replacement IPC channel.

The recipe for the real Codex 0.164.0, with temporary profile and fictitious local supplier,
confirm: `resume --all` on startup; Escape keeps the process and creates the
new cat; `/resume` displays All using the adapter targeting the native filter.
No account is used and no build prompt is sent.

The style uses the principles of Firefox/Perigee, without modifying their files:
deep black, thin lines, left sessions, SVG icons and Perigee variant
optional. Internal IDs of unnamed chats are hidden for the benefit
of the wording Codex.

The application of preferences is tested on a temporary AGENT: previous content
preserved, backup created, second application without duplicates. The global file
real has not been modified by the agent.

0.2 checks: `npm run check`, 7 unit tests, `npm run test:ui` and
`npm run test:codex` successful. Captures on fictitious data: `empty-workspace.png`,
`terminal-deck.png`, `perigee.png` and `native-codex-picker.png` under `artifacts/`.


## Version 0.3 — popup La Veilleuse

- Non-modal and movable popup: Codex quotas, windows, announced deadlines,
  age of the statement, manual and automatic refresh every five minutes.
- Normalization without conversion of absent values ​​to 0; cache, errors,
  time limit and last statement kept covered by the tests.
- Accelerated time test: a new reading at five minutes; no reading
  additional once the popup is closed. The recipe uses a fictional source,
  separated from the already verified real Electron clipboard.
- The real CLI accepts `initialize` then receives `account/rateLimits/read`; with
  a temporary CODEX_HOME without an account, it correctly refuses the statement for
  lack of authentication. No template or thread prompt is created.
- Reading with the real profile: impossible in the agent environment, the CLI
  stopping before responses with read filesystem error
  alone. No real user quota has therefore been validated here.
- Recipe capture: `artifacts/usage-popup.png` (fictitious percentages).

### October 23 adjustments

- Gauges display remaining quota (`100 - usedPercent`), such as `/status`.
- The UI test checks the accessible value and the initial anchor at the bottom right.
- Deck launches Codex with `tui.keymap.composer.queue=[]`, without blocking Tab in lists or shell. The real CLI accepts this setting at launch; sending during an actual build is not tested.
- The global configuration `.codex/config.toml` remains to be modified from the user session: this folder is read-only here.

## Animated Companions

See `docs/MASCOTTES.md`: OSC protocol 7501, synthetic transitions in xterm, real CLI idle signal, and commit limits without actual generation. Motion reduction preferences are checked in Electron.

## Placement, synchronization and direct launch

- Mascot of 96 pixels above Quotas in the sidebar; character and signals synchronized with the Nightlight, including after changing the active Codex.
- Real CLI recipe launched without clicking on the home page: All selector opened automatically, Esc and `/resume` retained. No template prompt.
- Super Shift Enter added to Hyprland; reload without error, active link confirmed with `hyprctl binds`.

- Focus on hover checked with true no-click shell input; the selection also follows keyboard focus. 96 pixels companion is placed in the sidebar and the panels maintain their full height.

## Final choice — fixed variant

- One companion per Codex terminal, anchored at the bottom right; the side margin avoids covering the terminal cells.
- Two verified simultaneous companions, with independent states; The Night Light follows the active panel.
- The old sidebar companion is removed. Both HTML mockups are kept in `docs/demos/`.

## Height, sleep and shared recovery

- Companion reassembled; new transparent sleep board.
- 45 seconds at rest: sleep synchronized with the Night Light; return to work: immediate awakening. Checked in Electron with accelerated clock.
- New test with a real local socket: choice of explicit shared service.
- Recipe from two real clients on a test service: blocked by the intentionally inaccessible appointment directory in the sandbox; no bypass. See `docs/VERROUS.md`.

## Sideband-free interactive companion

- Deletion of 112 pixels reserved on the right: return to the normal margin of 5 pixels.
- Companion of 96 pixels, shifted to the left; click to enlarge to 144 pixels.
- UI test of click, second click, keyboard activation with Enter and reduction with Esc, as well as dimensions and maintenance of native animations.

## Cat screensaver

The Electron recipe checks the magnification on hover, the coverage of the only affected panel, the black opacity of 80%, the click to close, the keyboard activation and Esc. The companion maintains its state and the terminal process continues.

## Selector movement and end reaction

The companion's decorative move is checked in the real Codex selector. The UI tests check the end signal, bounce and sparks separately, with the same sprites and without a template prompt.

## Cartoon expressions

- Loading and dimensions of the three new boards checked in Electron.
- Curiosity in the real native selector, waiting on signal `blocked`, wake-up sequence and return to work verified.
- An intervention during awakening immediately cancels this pose; its timer does not restore an old expression.
- Synchronization with quotas and compliance with the reduction of movements verified with synthetic recipe signals, without model prompt.

## Continuity of movement

Electron tests sample CSS transformations after the celebration ends: breathing does indeed continue. For sleep, they check a transformation change with continuous timing `ease-in-out`, without a change in frame or board position.

## Local companion workshop

- Model: frame limits, masks, JSON reloading and dimensions of all boards checked.
- Server: limited routes, read-only, refusal of arbitrary paths and CSP checked.
- Actual Electron recipe: character selection, frame dragging, keyboard, skin, speed, save and reload, native PNG/JSON download, reimport and narrow screen layout.
- Fingerprints of the six identical source images before and after the recipe. No accounts, no prompts, no actual terminal data used.
- Rendering of source poses is distinct from Deck's decorative transformations; exports are not applied to the application.

## Sessions, attention and history — 23 October 2026

- `npm run check` and `npm test`: validation of metadata, companion limited to three choices, history limited to 80 entries, rewrite without terminal content.
- Isolated Electron/xterm/PTY recipe: search for a session, favorite then filter, Vesper choice, effective save in the temporary profile, synchronization of quotas, restoration on reload.
- OSC test signals injected into the real xterm parser: wait → attention entry → return to panel and acknowledgment; work/wait → end → a history entry. Reloading with old buffer: no new entry or alert.
- The recipe does not contact any Codex accounts. The activity signals in this scenario are explicit fixtures; no actual template jobs are sent.
- System notifications are conditional on Electron `Notification.isSupported()` and window focus. Their display and click under the personal Hyprland desktop are not validated by the headless recipe; navigating the app is.
- In this revision from October 23, Companion and Favorites followed a Deck panel. The October 24 revision below adds an association to the recognized native identity, without indexing all external chats.

## Improved animations — 23 October 2026

- Actual Electron Recipe: All three characters have a distinct punching move; sampling the transformation at two times to verify that it changes.
- Fade: intermediate opacity checked on the browser layer and removed after the end of its animation.
- End of turn: breathing still active after the jump. Sleep: fixed framing and continuous movement, without jump timing function.
- Conservation of existing controls: interruptible wake-up, state and pose synchronized with quotas, enlargement by hover, screen saver by click and return by Esc, reduction of movements.
- The recipe signals are fictitious, injected into the real xterm; no account or prompt template used.

## Delivery of 24 October 2026 — conversation, comfort and poses

- Recipe for the real CLI installed, without account or prompt: `thread-id` + `thread-title` accepted, extraction of the native prefix and the full UUID of the unnamed conversation, identifier hidden in the visible title; initial All selector and `/resume` preserved.
- Electron/xterm recipe: same identity in two panels, sharing a Byte then Vesper choice and the favorite, renaming, another cat with the same name without inheritance of the favorite, return to the first cat, closing then explicit resumption of the favorite by UUID. The identities and outputs of these scenarios are local fixtures.
- Ctrl Page Previous/Next, search field protected from focus on hover, compact menu at 920 × 620 and Esc: checked in Electron. Legacy native paste paths, shell/Codex input, and shortcuts remain included.
- Hi at rest, refusal to greet while working/sleeping, staring, yawning at 43,2 s, sleeping at 45 s, and native interrupt: checked. PNGs are decoded by the browser; preview of the six new representative poses in `artifacts/new-companion-poses.png`.
- Workshop: both plates are included in the list of sources; PNG/JSON exports/imports, framing and source fingerprinting checked by `npm run test:studio`.
- D-Bus reading of the personal notification service: Mako responds to `GetServerInformation`. No testing of viewing or clicking an actual notification is claimed.

## Ctrl + drag panels

- Tree tests: exchange, insertion on four edges, conservation of all identifiers including reduced panels, maintenance of ratios excluding insertion, unchanged trees for invalid targets.
- Real pointer gestures in Electron: swap then back, place above then right, preview, escape, release Ctrl and drop off target. Without Ctrl, no tree change.
- The same shell prints the same PID before and after moves; no process is recreated. The layout actually written in the temporary profile corresponds to the displayed tree. The application reload and restart scenarios remain in the same recipe.
- Useful capture: `artifacts/pane-drag-preview.png`, only synthetic recipe data.

## Autostart all Codexes — 25 October 2026

- `npm run test:startup`: 1, 3 and 16 Codex panels, real Electron and PTY with a fictitious CLI; each panel starts, no visible panel remains on “Launch Codex”. The selected panel, collapses, paused shells, and other projects are retained. A reload does not create an additional panel and reattach processes.
- The first real multi-CLI test on a new CODEX_HOME revealed a race in Codex's native SQLite migrations. Deck now waits for the native screen or activity signal of the first TUI before launching the others (wait capped at 10 s). No bases or locks are modified by Deck.
- Added `Filter: All … Sort:` compact header detection. The transition from Cwd remains conditional on the native selection and focus attributes; no keystrokes are sent to another screen.
- `npm run test:codex` checks three real CLIs without an account, a fictitious local provider and without a template prompt. All arrive on All; Escape → new chat and `/resume` → All are then checked in the first panel.
- Syntax check, 20 unit tests and usual Electron/PTY recipe executed.

## Fox Loaf and Corbac mini — 25 October 2026

- Shared catalog with five entries, indices 0/1/2 preserved, choices 3 and 4 accepted in descriptors and conversation cards. Historical automatic allocations remain at modulo 3.
- Electron/xterm/PTY recipe: five choice cards and five rotating previews without Codex. Fox Loaf and Corbac mini chosen via the interface, synchronized between two panels of the same conversation and the quotas; 3/4 values ​​checked in the profile actually saved via IPC.
- Poses: correct atlas on keyboard and waiting, refusal to greet while waiting, greeting while resting, yawning at 43,2 s, sleeping at 45 s on the last stable pose, waking up then returning to the keyboard. Reducing movement maintains a fixed pose.
- Screen saver for each new animal opened by clicking then closed by Escape. Synthetic captures `artifacts/fox-loaf-screensaver.png`, `artifacts/corbac-mini-screensaver.png`, and `artifacts/five-companion-choices.png`.
- 48 sprite framing inspected as read-only on alpha bands; origins corrected in the metadata without retouching the PNGs. Comparative capture: `artifacts/new-companion-poses.png`.
- Workshop: five characters, quick expression/character change, source resolution, separate settings between keyboard and wait, export Corbac mini PNG/JSON, import of settings to the good state of the same atlas, sleep on a pose, return to a board of the trio. Footprints of the ten springs preserved.
- `npm run check`, 21 unit tests, `npm run test:ui` and `npm run test:studio` executed. No account or prompt template used by recipes; the assets come from the integrated imagegen tool.


## Access to companions — 25 October 2026

- **Companions** side button added to make the choice visible without knowing the ♧ symbol.
- Electron Recipe: collection of five cards visible without Codex, then opening the choice of active Codex using this button. From a selected shell, choices Fox Loaf and Corbac mini applied to the project Codex and saved; other accesses remain available.


## Graphic harmonization — 25 October 2026

- Fox Loaf and Corbac mini redesigned with the integrated imagegen tool from the trio and previous atlases: simplified shapes, sharper eyes and contours, orange/charcoal colors preserved. The old PNGs remain present; active sources use versioned names.
- Framing of six rows checked on the alpha bands without retouching PNG, then presence and poses observed in the real Electron rendering. The fox's left mask is shared with the workbench, exported as JSON and applied to the rendered PNGs.
- Model tests: mask limited to the size of the frame and round trip of the manifest. Workshop recipe: active left mask = transparent band, deactivation = visible pixels, restoration = transparent band. Export Corbac mini PNG/JSON then import to the correct expression from the versioned source.
- 3/4 choices, synchronization between panels/quotas, hi, yawn, fixed sleep, wake up and screen saver remain in the UI recipe. The test counters do not represent a validation of the exact number of colors or a manual pixel grid.
- `npm run check`, 21 unit tests, `npm run test:ui` and `npm run test:studio` executed. The screenshots `five-companion-choices.png` and `new-companion-poses.png` show the current rendering; their older versions are kept with the suffix `-v1`.

## Tauri migration — 26 October 2026

- Rust source in `src-tauri`, shared interface, npm/Cargo build, separate profile and recoverable parallel launcher.
- Git: tests reading a real repository, names with spaces/newlines/renaming, no index created; global instructions saved and idempotent on a temporary AGENT.
- Real but synthetic memory comparison: three shells, Xvfb without GPU, five seconds at rest. Electron 218 Mio PSS application; Tauri release 333,4 Mio. No PSS gains demonstrated; do not confuse cumulative RSS and assignable memory.
- The desktop session and its processes are not visible in the recipe environment; `npm run memory` is provided for this measurement on the host.
- Native Tauri recipe: real WebKitGTK, real PTYs, shell/resize/close, X11 keyboard via xdotool, Xvfb's own clipboard, Codex/fictitious quota protocol, five farts and save, isolated workshop. No real prompt.
- The Tauri bench uses Xvfb and xdotool installed only under `/tmp/deck-native-tools`; variables `DECK_XVFB` and `DECK_XDOTOOL` to provide them otherwise. Comparison Playwright under `/tmp/deck-ui-tools`. No office changes required.
- Office notifications, real Wayland and the resumption of a real account remain to be verified in use. The earlier shared lock recipe remains stuck in the sandbox; no new promises on this subject.

Final migration result: 25 JavaScript tests and 7 Rust tests pass.
JavaScript syntax and Rust format checked. Electron UI recipes, getting started 1/3/16
and workshop pass. Complete Tauri recipe: shortcuts actually sent by
xdotool, isolated native clipboard, PNG export written by Rust and verified signature,
refusal of Deck commands from the workshop, native window closure with code 0.
The normal release binary was also launched separately: absence of commands
native_smoke in binary, WebKitGTK window, Ctrl Shift N and typing in a shell
real checked (`scripts/tauri-production-smoke.cjs`, capture `artifacts/tauri-release.png`).
Parallel installation carried out: launcher `terminal-deck-tauri`, dedicated menu,
Electron profile copied only once with private backup. Main Launcher
Electron kept while waiting for the choice of Toubi, taking into account the memory result.
No commits created and no global AGENTS changed automatically.

## Integrated dictation — 27 October 2026

- New Electron Linux card: F9 / micro, capture with audio level, F9 or Enter to transcribe, editable text, then Send/Enter. Escape cancels. No automatic sending on silence or noise, no interaction with F8 conversation mode.
- PTY targeting by identifier and token, without clipboard or keyboard injection Hyprland. A single IPC carries bracketed-paste text followed by Enter.
- `npm run check` and `npm test`: 30 tests pass. `npm run test:ui`: Complete Electron/PTY existing recipe passed. `node scripts/dictation-smoke.cjs` and `DICTATION_NATIVE=1 npm run test:dictation`: successful dictation course using Electron headless and Wayland.
- The interface recipe explicitly uses a fake CLI, PCM capture and fixture decoder, with real subprocesses, a real Electron and a real PTY. It checks for modified text, absence of sending before validation, single sending, escape during capture/transcription, absence of late result and panel change. No prompt sent to an account.
- Actual PipeWire capture verified separately via new manager: microphone open, audio metering available, shutdown and cleanup successful. French speech recognition by the large-v3-turbo model and the voice of Toubi remain to be tried; do not confuse the fixture decoder with this test.
- Recipe captures: `artifacts/dictation-recording.png` and `artifacts/dictation-review.png`, test data only.
- Old source Hyprland F9 commented with backup `~/.config/hypr/hyprland.conf.before-dictation-card-20261027-183145`; valid configuration, no global F9 bind remaining. Old files preserved.
- The existing personal window was not restarted: closing it stops its PTYs. The card becomes available the next time Terminal Deck Electron is opened. The Tauri engine retains the existing interface without this function.
