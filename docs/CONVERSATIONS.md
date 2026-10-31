# Preferences by conversation

The official OpenAI](https://learn.chatgpt.com/docs/developer-commands) documentation describes the composition of the terminal title. The local recipe of the installed CLI checks the configuration `tui.terminal_title=["thread-id","thread-title"]`, in a temporary HOME, without an account and without a template prompt.

## Identity observed

For example, the CLI issues a title composed of an abbreviated UUID prefix, followed by ` | ` then the name. For an unnamed conversation, the second part can be the full UUID. The adapter keeps the name visible and separates the technical metadata; it does not read transcripts, private databases, or connection identifiers.

The preferences use the 29 characters from the UUID prefix actually issued by this CLI. This prefix is ​​not a full UUID: direct recovery requires a validated full UUID, known through the same channel. A shorter or unexpected format produces no association. If two known fully qualified UUIDs share this prefix, the entry is marked ambiguous and synchronization is disabled for that entry. The uniqueness of an abbreviated prefix does not constitute a mathematical guarantee for complete UUIDs never communicated.

## Data and behavior

`workspace.json` keeps as many 500 records as possible: abbreviated native key, full UUID when known, last name, favorite Deck, chosen companion, last consultation and original project. No exchanges are kept. The previous preferences of a panel are taken over when it is first identified; Moving on to another conversation does not inherit the choices from the previous chat.

- Same conversation in multiple panels: shared companion and favorites.
- Renaming: the key remains the same; the name is never used to identify a cat.
- Closing a panel: the form remains viewable in Sessions.
- Reopening by an explicit click: access to the existing active panel, otherwise launch of recovery by full UUID. If only the prefix is ​​known, opening of the native selector with an explanatory message, without automatic entry in the terminal.
- Without recognized identity: panel preferences only. No matching by name, folder or content.
- Favorites are specific to Deck; they do not modify the pins of the official Codex client.

Ordinary launch remains `resume --all`; connections and locks continue to be managed by Codex.
