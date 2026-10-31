# Terminal Deck 0.4

Local cockpit for Codex and your shells. HTML/CSS/JavaScript and xterm.js interface,
**Tauri 2 / Rust / portable-pty** engine available in parallel with the Electron engine.
The Tauri engine does not launch Node or Electron; hosted CLIs keep their own runtime.

## Usage

```sh
npm install
npm start              # développement Tauri
npm run build:tauri     # binaire optimisé
npm run install:tauri   # lanceur terminal-deck-tauri, profil séparé
npm run start:electron  # version Electron conservée
```

The Tauri build asks for Rust, GTK 3 and WebKitGTK 4.1 on Linux. The project
remains in its historical record to preserve existing paths.
`postinstall` is further preparing Electron/node-pty for the benchmark build.
The installed Tauri binary does not depend on their execution.

The main launcher is not replaced by the parallel installation. For the
explicitly replace: `node scripts/install-tauri.cjs --replace`. The profile
Electron is copied only once to `~/.config/terminal-deck-tauri`, without modifying
the source. The two profiles then evolve separately.

[Migration, checks and memory](../docs/MIGRATION-TAURI.md).
**Git** button at the top: modified branch and files, read-only.
`npm run memory` measures Deck processes visible from your session.

- Projects accessible in the sidebar; `~/01 - Dev` file catalog
  and `00 - Projets à tester`, or choosing another folder.
- Codex or shell in each panel; horizontal/vertical divisions,
  movable dividers, balanced grid and enlarged panel with tabs.
- Terminals remain active when changing projects or collapsing a panel.
  The titles of the collapsed panels allow them to be restored. Radar of all sessions.
- Rename a terminal by clicking on its name. Search in its output.
- Compact top bar: project and title of the active terminal. No composer
  nor status banner at the bottom; secondary actions are in Ctrl K.
- The native title of the terminal is included in the panels, tabs and radar.
  For Codex, Deck requests `thread-id` and `thread-title`; only the readable name is displayed. Technical identity is used for conversation preferences.
  Manual renaming of a panel remains available by clicking on its title.
- Neutral black by default; graphite and ash contrasts, and **Perigee** atmosphere
  with discreet purple accent, available in Ctrl K. Active project sessions
  are accessible directly in the sidebar.

## Shortcuts

| Action | Shortcut |
|---|---|
| Command palette and navigation | CtrlK |
| New Codex | Ctrl N |
| New shell | Ctrl Shift N |
| Terminal on the right | Ctrl Shift D |
| Focus | Ctrl Shift F |
| Session radar | Ctrl Shift O |
| Expand/Restore Panel | Ctrl Shift Enter |
| Select a panel | Alt 1…9 |
| Search in terminal | Ctrl F |
| Copy/paste into terminal | Ctrl Shift C / V |
| Close the panel under the mouse, directly | CtrlQ |
| Collapse panel under mouse | Ctrl T |
| Close active panel, directly | Ctrl Shift W |
| Clear previous word | Ctrl Backspace |
| Line break in Codex, without sending | Shift Enter |
| Dictate a message (Electron Linux engine) | F9 or microphone button |

Dictation opens a card in the targeted Codex. Speak, then F9, Enter or
**Finish** starts transcription. The text remains editable; **Send** or
Enter sends it to the terminal. Escape cancels. No noise triggers sending or
codex interruption. The card does not respond out loud.

The microphone goes through PipeWire and the transcription goes through local Whisper, with the
existing Falcon multilingual model (`large-v3-turbo`, otherwise `base`). No account,
network or clipboard is not used by this function. Audio and transcription
are temporary, cleaned after validation, cancellation or normal closure.
A sudden system shutdown may leave files as `/tmp`.
The Tauri engine retains its functionality and does not yet offer this card.
Recipe: `npm run test:dictation` (real Electron/PTY, audio and fixture decoder
explicit); `DICTATION_NATIVE=1 npm run test:dictation` uses Wayland.

## Persistence and limits of this first version

`~/.config/terminal-deck/workspace.json` keeps records, names, arrangements,
collapsed states, latest titles, favorites, chosen companions, viewing dates, text sizes and contrast. No terminal or prompt content is
recorded by Deck. The history and conversations that the programs launched
record themselves remain managed by these programs.

Closing the application, especially with Super Q under Hyprland, stops its terminals
without asking for confirmation. Closing a panel stops its terminal directly. Upon reopening,
All Codex panels in the active project start in the Conversation Switcher, including minimized panels. Shells and other projects remain paused. **Launch** opens a new process; he doesn't take back
not automatically an old Codex conversation. The previous output remains
viewable as long as the application is open, with a limited history in memory.
The reattach cache is limited to 512 K characters per terminal.

The Codex button launches `codex resume --all` in the project folder with
`-c 'tui.terminal_title=["thread-id","thread-title"]'`. All active conversations are
proposed. **Escape** in this selector starts a new chat. During a `/resume`
Later, Deck also selects the **All** filter in the native interface. The option `tui.terminal_title` only concerns the title
from the window; CLI permissions and authentication remain unchanged.
The global Codex configuration is not modified. The last title issued by the terminal is kept in the panel descriptor; Deck does not read the conversation bases to find him.
Conversation locks already used by another client remain managed
by Codex: Deck does not remove any locks or force restarts.
Accounts are not isolated by panel. The “in progress” status indicates that the
process works; it does not claim to measure the agent's activity or quota.
The shell inherits your environment and loads its connection configuration.

## Validation

```sh
npm run check
npm test
# Outils de recette hors dépendances de l'application :
npm install --prefix /tmp/deck-ui-tools --no-package-lock playwright
npm run test:ui
# Vérifier le vrai sélecteur Codex installé, sans compte :
npm run test:codex
```

The Electron recipe uses a temporary HOME and profile, real shells and
a fictional Codex executable. The headless display has an isolated clipboard:
the test calls Electron's true asynchronous read/write APIs without
access the desktop clipboard. It does not read connections and send
no prompt to an account. Recipe `test:codex` uses the real CLI, a profile
temporary and a fictitious local supplier, without recourse to a model. It checks PTY, keyboard shortcuts, native titles, panels,
resizing, themes, navigation, closing and restoring.
The capture `artifacts/terminal-deck.png` represents this fictitious data exclusively.

Functional inspirations: [Claude Deck](../../electron--claude-deck/README.md) and
[Code mode of BridgeMind](https://docs.bridgemind.ai/docs/code-mode).

Codex title options are documented in [official commands](https://learn.chatgpt.com/docs/developer-commands#configure-terminal-title-items-with-title).


## Interface Preferences and Codex Instructions

The preferences expressed by Toubi are grouped into
[docs/PREFERENCES-TOUBI.md](../docs/PREFERENCES-TOUBI.md) and already integrated into the project AGENTS.
To add them to global instructions without overwriting existing content:

```sh
node scripts/apply-preferences.cjs
```

The script targets `~/.codex/AGENTS.md`, saves its previous version and replaces
only its own delimited block. A second execution does not create a duplicate.
It must be executed by Toubi in its terminal if the `.codex` folder is in
read-only for the agent. For another AGENT: `--target /chemin/AGENTS.md`.


## The Nightlight — Codex quota popup

Click on **◴ Quotas** at the bottom of the sidebar, or search for **Codex Quotas** in Ctrl K.
The popup does not block terminals and can be moved by its header.
It opens next to the button, at the bottom and displays the remaining percentages, the windows provided by Codex, their dates
announced reset and the age of the reading. The mascot is decorative,
not an indicator of agent activity.

An update takes place upon opening (five-minute cache), then every
five minutes while the popup remains open. The ↻ button forces a reading.
Closing the popup stops its periodic refresh. Codex sessions open
in Deck are also accessible from this panel.

The statement uses `codex app-server --listen stdio://`, then only
`initialize`, `initialized` and `account/rateLimits/read`. No conversation is
open, no prompt is sent, no connection is triggered by Deck.
The CLI uses its existing connection; playback is not available with all
authentication methods. Errors are presented without raw diagnostics.

Quota data remains in memory. An error keeps the last reading
with an expired state; a missing window remains unknown, never at 0% by default.
The current popup is specific to Terminal Deck and Codex; this is not a widget
autonomous office nor a Claude meter. Actual quotas must be verified
from a normal user session: the restricted environment of the agent
blocks CLI startup with read-only user profile.

Quota API: [official documentation](https://learn.chatgpt.com/docs/app-server#6-rate-limits-chatgpt).

Launching Codex in Deck disables `tui.keymap.composer.queue`: Tab no longer queues the draft for sending. Other native uses of Tab remain available.

The Nightlight displays the same character and state as the active Codex. Without Codex in the project, the five companions alternate with each opening: Blob, Vesper, Byte, Fox Loaf and Corbac mini. The source image is kept intact in `assets/mascots/trio.png` and displayed by CSS windows, without activity animation.

Codex panels now have a little companion: he types on the keyboard
on the native work signal, breathes at rest and reacts at the end of a round.
Without a state communicated by Codex, it remains immobile. See `docs/MASCOTTES.md`.

Super + Shift + Enter opens Terminal Deck or brings it to the front. On launch, each restored Codex panel in the active project opens its selector to all conversations; Escape allows a new chat. Shells and other projects remain paused. Each Codex panel keeps its companion fixed at the bottom right. Focus follows the mouse between terminals, without clicking.

The companion has risen above the warnings and falls asleep after 45 seconds of rest. He wakes up as soon as Codex resumes.

The recovery explicitly uses the shared service when its socket exists, to avoid local TUI settings causing a separate server. See `docs/VERROUS.md` for limits and remaining validation on your session.

The companion is now 96 pixels and is shifted slightly to the left. Click on it to enlarge it to 144 pixels; re-click or press Esc to collapse. The reserved strip on the side is removed: the terminal uses its entire width.

Hover over the companion to enlarge it. Click to open the chat screen saver: companion in the center in large, conversation darkened to 80%. Re-click or press Esc to return to the terminal.

Companions also have drawn poses of curiosity in the selector, waiting during an intervention and waking up after sleep. Each expression retains the same character in the terminal and Nightlight.

## Companions workshop

**Ctrl K → Companion Workshop** opens the local tool in the browser: animated preview, advance pose by pose, zoom, peel, framing by dragging, mask of stray pixels and PNG/JSON exports. The settings remain local; the original images are never overwritten.

Independent launch: `npm run studio -- --open`. Instructions for use in `docs/ATELIER-COMPAGNONS.md`.


## Sessions, attention and companions

- **Sessions** or **Ctrl Shift O**: search by title/project in known Deck panels, favorite filters, recent and interventions. The Codex button opens the native switcher for other conversations; no Codex private index is read.
- The **♧** button on a Codex panel chooses Blob, Vesper or Byte. When the native identity is recognized, the choice and favorites follow the conversation between panels and after renaming. Without a usable identity, the setting remains attached to the panel. The Nightlight keeps the same companion.
- **Attention** appears on native signals `blocked` / `error`, or on a terminal ringtone. Clicking on an entry finds the project and restores its collapsed panel. A selection acknowledges the alert; it does not respond to Codex. The signals remain generic: Deck does not claim to distinguish a question from an authorization.
- If Deck is in the background and the desktop allows it, a generic silent notification takes you back to the correct session. No conversation titles are displayed on the desktop. System notification remains dependent on the local notification service.
- **Tours Completed** keeps as much 80 metadata (title, time, panel) as possible, on a native work/wait → end transition. The end of a round does not guarantee success. History can be cleared independently of conversations; an entry whose panel is closed remains viewable but does not launch anything.
- Reattaching an old output does not replay alerts or history entries. No exchange content is saved by these functions.


## Finishes of 24 October 2026

- **Ctrl + drag** from the content or title of a panel: center to swap, edges to place left/right/above/below. Preview during gesture; Escape, release Ctrl before mouse or drop off target to cancel. The processes remain active and the layout is saved. In enlarged view, return to the mosaic to move the panels.
- **Ctrl Previous page / Next page**: browse the visible panels. In Sessions: arrows, Enter and **Ctrl D** for the highlighted favorite. Escape returns focus to the terminal. A search field being edited maintains focus despite hovering over another panel.
- The small panels group their secondary actions under **···**, without hiding the functions. No native Codex composer shortcuts are changed.
- New greeting on click, discreet glance on hover and yawn before sleep. Decorative reactions are limited to resting states and respect the reduction of movements. [Plants and prompts](../docs/NOUVELLES-POSES.md).
- Recognized conversations remain in Sessions after closing their panel. If the full UUID is known, a click explicitly requests native recovery; otherwise Deck opens the picker, without guessing the ID or sending any text. Normal launch always opens the All switcher. [Identity and boundaries](../docs/CONVERSATIONS.md).


## Starting all Codexes — 25 October 2026

All Codex panels already present in the active project start automatically, without a “Launch Codex” button to click. The mosaic, selected panel and reductions are preserved. If no Codex is present, Deck opens one. Terminals that are already active are not restarted when the interface is reloaded. A launch failure does not prevent other panels from starting.

Each new process presents the native selector `resume --all`: choose the conversation to resume, or Escape for a new chat. No conversations or prompts are sent automatically.

Dedicated recipe: `npm run test:startup`.


## Fox Loaf and Corbac mini — 25 October 2026

The **Companions** button at the bottom of the sidebar opens the choice of five characters; the small **♧** button of each Codex also remains available. **Fox Loaf** pats with its little paws then falls asleep in its tail; **Corbac mini** taps the keyboard, tilts his head and sleeps in a ball of feathers. They also have wait, greet, yawn and wake poses, with the same native and shortcut signals as the trio.

The chosen character follows the recognized conversation and remains identical in quotas. The old indices and automatic attributions of the trio are preserved; both new ones are available to choose from. In the workshop, selecting Fox Loaf or Corbac mini gives access to the states of their individual atlas and PNG/JSON exports.

[Harmonized plates and prompts](../docs/FOX-CORBAC-HARMONISES.md). The first versions remain kept in the project.


The Companions menu remains accessible without a Codex panel: it shows the collection and suggests opening one. If a shell is selected, the side button targets the first Codex in the project rather than remaining ineffective.
