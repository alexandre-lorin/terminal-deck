# The companions’ workshop

Terminal Deck local sprite preview and framing tool. It does not send any images to an external service and does not replace any application files.

## Open

From Deck: **Ctrl K → Companion Workshop**. The default browser opens.

Or, from the project folder:

```sh
npm run studio -- --open
```

The server only listens on `127.0.0.1`, on port 47831 when available. If this port is busy, a free port is chosen and the link is displayed. Ctrl C closes the server launched from the terminal. The one launched by Deck is closed with Deck.

## Use

1. Choose Blob, Vesper or Byte, then an expression.
2. Play the animation, slow it down, pause and choose a pose in the lower band.
3. Move the frame into the board on the right; drag its lower right corner to resize it. Fields allow precise values. “Hide on top” removes stray pixels without moving the silhouette.
4. Use the checkerboard for transparency, the skin to compare with the previous pose, and the grid for the preview pixels.
5. Export a PNG board and its JSON settings. The PNG contains only the sprites, without the guides or skin.

The controls report pixels that touch the edges: this is a visual aid, not automatic proof that the entire drawing is correct.

Shortcuts: **Space** to play or pause; **← / →** to change pose; **Alt + arrows** to move the frame one source pixel, with **Shift** for ten pixels. Entering a field pauses playback.

## Backup and imports

Settings are kept in the browser's local storage, per board and per character. They remain linked to the browser and the local address. JSON allows them to be stored elsewhere or reloaded.

A personal PNG sheet can be imported, then its columns and rows adjusted. It remains in the browser's memory; after reloading, you must re-import this PNG to find the associated settings. Maximum size: 24 MB and 8192 × 8192 pixels.

The JSON preserves the framing in the source, the durations and the coordinates of the frames of the exported sheet. The exports are square, from 32 to 128 pixels depending on the choice, with proportions preserved and aligned at the bottom.

## Perimeter

The workshop regularizes the frames and allows them to be inspected. It does not automatically transform a generated illustration into a regular grid pixel art drawing. It does not draw new pixels or apply exports to Deck without a separate edit.

The preview shows the source poses. The decorative transformations added by Deck—breathing, sparkles, screen saver—are not included in the PNG. Deck's sleep maintains a stable pose; the workshop allows you to inspect the four poses present in the board.

## Verification

```sh
npm run check
npm test
npm run test:studio
npm run test:ui
```

The workshop recipe uses a real isolated Electron browser: frame movement, keyboard, local save, PNG and JSON export via native download, reimport, narrow view and fingerprint control of the original images. She does not initiate any Codex tricks or use any accounts.

The server is read-only and only serves an explicit list of workshop files and its six known boards. Arbitrary paths and write requests are denied. The page does not have any access to Deck's IPC bridge.
