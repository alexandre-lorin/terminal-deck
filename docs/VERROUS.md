# Resume conversations and write lock

## Cause identified in Deck launch

Deck adds `-c tui.terminal_title=...` and `-c tui.keymap.composer.queue=[]`.
The CLI excludes implicit connection to the daemon for these configuration options.
It can therefore host an embedded server distinct from the server already owned
of the conversation. A second server cannot take back its active lock.

Primary source examined:
https://github.com/openai/codex/blob/main/codex-rs/tui/src/daemon_startup.rs
(`config_exclusion`, list of options compatible with the implicit daemon).

## Fix

`src/codex-launch.cjs` examines the local connection point of `CODEX_HOME`.
If it is a socket, Deck explicitly launches:

```sh
codex --remote unix:// resume --all -c 'tui.terminal_title=["thread-id","thread-title"]' -c 'tui.keymap.composer.queue=[]'
```

The client thus connects to the existing shared service, despite its local settings
interface. Without an existing socket, it retains the previous standalone launch.
A socket present but a service failing produces a native error: Deck does not
does not force recovery by another server and does not delete the socket.

Official transport documentation:
https://learn.chatgpt.com/docs/app-server
https://learn.chatgpt.com/docs/cli/reference

## Sessions already open

The change applies to the next launched processes. It does not transform a
embedded server already active as a shared server. Rerolling Deck Closes Its Own
terminals as before; you will then have to choose the conversation in the
selector. If another standalone client still owns the chat, they must close it.

No lock files are deleted; no daemon or process outside
Deck is not stopped; no archive or conversation migration is performed.

## Sandbox validation and limit

- Unit test with a real temporary socket: explicit selection of the service,
  preservation of keyboard/title settings and autonomous launch in its absence.
- UI recipe and real CLI without account: selector, input and states preserved.
- `npm run test:codex-shared` prepares a temporary profile, starts its own
  app-server then attempts to attach two PTYs to the same chat, without account or model tour.
- This last recipe could not go all the way in the agent sandbox:
  the reserved directory `/tmp/codex-daemon-1000` is intentionally inaccessible.
  The CLI refuses to prepare for his appointment there. This protection has not been modified.
  Access to the existing user socket is also denied (`EACCES`).
- The effective disappearance of the lock in the normal session therefore remains to be confirmed.

The shared bench uses `ws` from the recipe tooling under
`/tmp/deck-ui-tools`, like Playwright for other recipes; no dependency
is not added to the application for this change.
