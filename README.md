# Terminal Deck

A local workspace for Codex and shell sessions, built with HTML/CSS/JavaScript and xterm.js. A Tauri 2/Rust/portable-pty backend is available alongside the retained Electron/node-pty implementation.

## Features

- Project navigation, split terminals, resizing and panel rearrangement.
- Persistent workspace layouts and minimized panels that keep their terminals alive.
- Command palette, terminal search and native terminal titles.
- Conversation-related preferences and read-only Git information.
- Optional companions, sprite preview tools and local dictation on supported backends.

Features and platform support vary between backends. The [detailed reference](docs/README-REFERENCE.md) records shortcuts, scope and limitations.

## Development

```sh
git clone https://github.com/alexandre-lorin/terminal-deck.git
cd terminal-deck
npm install
npm start
```

`npm start` uses Tauri. Linux builds require Rust, GTK 3 and WebKitGTK 4.1. The npm postinstall step also prepares Electron and rebuilds node-pty for the comparison backend.

```sh
npm run build:tauri
npm run start:electron
```

## Local installation

```sh
npm run install:tauri
```

The Tauri installer uses a separate launcher and profile. It does not replace the main launcher by default. An explicit `node scripts/install-tauri.cjs --replace` changes that behavior; review the [migration guide](docs/MIGRATION-TAURI.md) first. The initial profile import is a copy, not ongoing synchronization.

## Checks

```sh
npm run check
npm test
npm run test:rust
```

Native recipes include `npm run test:ui`, `npm run test:dictation` and `npm run test:tauri`; read their environment requirements before running them. Synthetic recipes do not validate your real microphone, account quotas or Wayland desktop behavior.

## Documentation

- [Backend migration and measurements](docs/MIGRATION-TAURI.md)
- [Conversation preferences](docs/CONVERSATIONS.md)
- [Write locks and resume behavior](docs/VERROUS.md)
- [Companion studio](docs/ATELIER-COMPAGNONS.md)
- [Historical validation](VALIDATION.md)

This publication does not establish a memory advantage for Tauri: the recorded comparison did not show a lower PSS. Application labels, command output and some source comments may remain in French.
