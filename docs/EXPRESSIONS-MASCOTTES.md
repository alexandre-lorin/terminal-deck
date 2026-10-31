# Expressions of companions

Created with the built-in **imagegen** tool, from `assets/mascots/trio.png`, kept intact. Each transparent sheet contains three characters and four poses per character.

| Phrase | Board | Trigger |
|---|---|---|
| Curiosity | `assets/mascots/curious-sheet.png` | Unreported state, including selector `/resume`; decoration only |
| Waiting | `assets/mascots/waiting-sheet.png` | Native signal `blocked`: intervention expected |
| Alarm clock | `assets/mascots/waking-sheet.png` | Waking up from sleep, single sequence of 1,2 second |

The character, its actual state, and its pose remain in sync between panel, quotas, and full-panel mode. A new intervention request can immediately interrupt the wake-up sequence. Motion Reduction preferences stop animations; the final awake pose is used while waking up.

The boards of 1448 × 1086 pixels (1449 × 1086 for curiosity) are displayed without modification via CSS windows. The installation margins were inspected; the vertical offsets of the first character compensate for the generated baselines. No source images have been overwritten.

## Prompts used

### curious

Use case: identity-preserve. Production pixel art sprite sheet for a dark terminal companion. Preserve exactly the three reference characters: violet slime, huge-eared bat, small antenna robot; same faces, silhouettes, charcoal violet ivory palette and crisp square pixels. Fully transparent background, no scenery, no grid, no labels, no extra characters. Exactly four columns by three rows of identical cells, twelve sprites total. Slime only row1, bat only row2, robot only row3. Full body centered within each cell, consistent scale and bottom baseline per row, all frames comfortably padded and separated. Four subtle frames of a seamless curious idle loop. Look a little left, head tilted toward viewer, look a little right, blink and return to center. Bat ears gently perk and swivel, slime tilts its oval eyes and soft body, robot tilts head and one antenna. Warm and inquisitive, no keyboard, no question marks or symbols. Tiny pose differences only.

### waiting

Use case: identity-preserve. Production pixel art sprite sheet for a dark terminal companion. Preserve exactly the three reference characters: violet slime, huge-eared bat, small antenna robot; same faces, silhouettes, charcoal violet ivory palette and crisp square pixels. Fully transparent background, no scenery, no grid, no labels, no extra characters. Exactly four columns by three rows of identical cells, twelve sprites total. Slime only row1, bat only row2, robot only row3. Full body centered within each cell, consistent scale and bottom baseline per row, all frames comfortably padded and separated. Four subtle frames of an attentive waiting loop, as if listening for the user's answer. Characters sit upright, soft hopeful open eyes, small paw or wing lifted to ask for attention, gentle blink and small nod. Slime raises one tiny pseudopod, bat raises one little wing hand with alert ears, robot raises one hand. No keyboard, no text or symbols; restrained motion distinct from typing.

### waking up

Use case: identity-preserve. Production pixel art sprite sheet for a dark terminal companion. Preserve exactly the three reference characters: violet slime, huge-eared bat, small antenna robot; same faces, silhouettes, charcoal violet ivory palette and crisp square pixels. Fully transparent background, no scenery, no grid, no labels, no extra characters. Exactly four columns by three rows of identical cells, twelve sprites total. Slime only row1, bat only row2, robot only row3. Full body centered within each cell, consistent scale and bottom baseline per row, all frames comfortably padded and separated. Four successive frames of a one-shot waking-up stretch. First settled with half-closed sleepy eyes, second little yawn with eyes closed, third gentle full-body stretch with ears or antenna raised and arms or wings opening, fourth awake and settled looking forward. Slime squishes then stretches, bat stretches wings and ears, robot stretches arms and antennae. Cute and understated, no keyboard, no text or symbols, retain exact identity.


## Fix overflow

The row of jellies protrudes from its cell in the generated boards. For the bat, the rendering hides the first two pixels of the cell in curiosity and the first three in waking, located before the start of the ears. The positions and silhouettes remain unchanged. The source images are not retouched.

## Fine-tuned animations — 23 October 2026

The original plates remain intact. This improvement concerns movement and transitions in Deck, not new drawings or workshop exports.

- **Blob**: soft strike with light compression, fuller breathing and slow rhythm.
- **Vesper**: small lifting during the strike, light breathing, higher end jump.
- **Byte**: short and regular pulses on the keyboard, minimal breathing, small rebound at the end.
- Curiosity: spaced glances and discreet movement; waiting: small adjustment to seek attention.
- End of turn: anticipation, jump then amortization, followed by existing breathing. This remains a signal of the end, with no guarantee of success.
- Sleep: fixed pose, continuous cycle from 6,2 to 7 seconds depending on the companion and small pause after inspiration. No scrolling of sleeping figures.
- Awakening: brief stretching on the four poses, immediately interruptible by a new native state.
- Change of state/pose: fade of 280 ms from the previous framing; a single temporary layer, removed after transition. The Nightlight also incorporates the visual changes from the source companion.
- Reduction of movements: no sprite animation, no fading, no zoom transition.

Displacements remain less than the base cell pixel during ordinary loops. The background and pose of the sprite are animated separately from the movement of the body. Character changes do not reset activity signals or sleep delays.
