# Terminal Companions

Codex panels display a stable companion, chosen from their ID.
The Nightlight has the same character and state as the active Codex. If the active panel is a shell, it uses the first Codex of the project. Without Codex, it retains its decorative rotation.

- Without signal: unknown state, slight decorative swing (notably in `/resume`), never a working animation.
- `idle`: light breathing, then sleep after 45 seconds without work.
- `working`: loop of four poses on the keyboard.
- `blocked`: attentive posture; the statement does not necessarily specify a question.
- `done`: small occasional jump, then sleep after 45 seconds; this does not announce that the task is successful.
- `error`: desaturated image and explicit label on hover.
- Exit from the process: return to the unknown state.

Motion reduction system preferences stop animations.
Each Codex panel displays its fixed companion by 96 pixels at the bottom right, offset by 36 pixels from the edge. The reserved side margin is removed: the terminal uses its full width and the companion locally overlays its content. Hovering enlarges the companion to 128 pixels; the click opens the screen saver of the panel with the character centered in large. A second click or Esc returns to the terminal. The button is accessible from the keyboard. On narrow panels, the normal and hover sizes are 72 and 96 pixels; Panels that are too short hide it.

## Signal

The xterm parser only listens to OSC 7501: `state=working:app=codex`, etc.
No reading of transcripts, prompts or conversation bases; no hook
added or modified the account. An older version without this signal retains
only its decorative movement. Terminal text is never interpreted as activity.

Primary source: https://github.com/openai/codex/blob/main/codex-rs/tui/src/terminal_program_status.rs

## Assets

- `assets/mascots/trio.png`: original of Toubi, preserved intact.
- `assets/mascots/working-sheet.png`: transparent sheet created with the integrated imagegen tool.

The generated spreadsheet has a large upper margin: CSS windows
use the actually observed positions, not a regular grid assumption.

Prompt used:

> Use case: identity-preserve. Create a production pixel art animation sprite sheet based exactly on the three supplied violet mascots: slime, bat, robot. Transparent background. Output a square sheet divided into an EXACT invisible 4-column by 3-row equal-cell grid. Row1 only slime, row2 only bat, row3 only robot. Each cell contains the same full character at identical scale and anchored baseline within its row with generous transparent padding. Columns are four sequential frames of a seamless working loop: sitting behind a tiny charcoal computer keyboard, alternating small left and right paw/hand taps; slime uses tiny pseudopod hands, bats its little wing hands, robot its hands. Preserve original identities, face, ears, antennae, violet charcoal ivory colors and pixel art. Small gentle bounce and blink, not exaggerated. Exactly twelve sprites total, no extra rows, no text, labels, grid lines, scenery, shadows or glow beyond original. All sprites isolated from adjacent cells; crisp square pixel blocks; transparent alpha.

## Verification

Unit testing the protocol and rejecting foreign/unknown signals.
Electron/xterm test of transitions with explicit synthetic signals and capture.
True CLI with temporary profile without account: signal `idle` actually received.
A real generation and its approval requests remain to be verified in use:
no model prompt is sent by the test bench.

## Sleep and height — adjustment

The companion moved from 58 to 68 pixels depending on the height of the panel, to stay
Remote quota warnings and seizure. Panels too short
hide it in order to preserve their content.

`assets/mascots/sleeping-sheet.png` is a new transparent board of four
poses per character, created with the integrated imagegen tool. The originals remain
intact. After 45 seconds of a real state `idle` or `done`, it replaces the character
awake. A new working state, wait or error wakes it up immediately.
The unknown state never triggers sleep. The Nightlight follows this same visual state.
Timers are released when companions are deleted.

Electron tests check falling asleep, synchronization and waking up with
a speeding clock; they do not send a prompt to a real account.

Sleep board prompt:

Use case: identity-preserve. Edit the three reference pixel mascots into a sleeping animation sprite sheet. Keep exactly the identities, violet charcoal ivory palette, pixel blocks and recognizable silhouette of the slime, bat, and robot. Fully transparent background, no shadows or scenery. Square sheet, EXACT invisible 4 columns by 3 rows of equally sized cells, each sprite centered at identical scale and baseline. Row1 slime, row2 bat, row3 robot. Four sequential frames per row: curled or settled sleeping, closed eyelids, gentle breathing inhale and exhale. Bat folds its wings and relaxes its huge ears, robot sits eyes closed with antennae relaxed, slime settles into a soft puddle. Small floating pixel Z shapes optional confined within each cell, no other text. No keyboard. All 12 sprites separated by generous transparent margins and inside their own cells, no visible grid. Calm, cute and understated, designed to loop at very slow speed in a dark terminal interface.

## Screen saver per conversation

Hovering or keyboard focus discreetly enlarges the companion. A click opens a screen saver in the relevant panel: black background with 80% opacity, slight blur and centered character, sized according to the available space. The other panels remain usable. Clicking or Esc again closes this screen and returns focus to the terminal. The same sprite continues to receive actual Codex states, without interrupting its process.

## Presence and end of turn

The resume menu maintains a light decorative swing. The native signal `done` triggers a discrete double bounce and two small sparks for 1,8 second, without asserting that the task is successful. Movements and sparks respect the reduction of system animations.

The three additional drawn expressions (curiosity, waiting and awakening) are detailed with the plates and prompts in `docs/EXPRESSIONS-MASCOTTES.md`.

## Breathing after completion and smooth sleep

After the short celebration, the signal `done` maintains decorative breathing in a loop until sleep. The end of the celebration no longer leaves the character frozen. During sleep, the first drawn pose remains stable: continuous breathing for 5,5 seconds and a small floating “z” replace the jerky changes in silhouette. Wake-up and other states remain unchanged.
