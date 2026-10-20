# SUNSET CIRCUIT — Illustrated orange player sprite pilot

Version 1.9 of STRIKE VECTOR can load this illustrated streetwear character atlas.

### Install the art

1. Download the supplied ZIP (`strike_vector_sunset_sprite_upload.zip`) in ChatGPT and extract it.
2. Open this folder on GitHub.
3. Choose **Add file → Upload files**.
4. Upload **only** `sunset_circuit_orange_pilot.webp` here and commit.
5. Refresh https://ebato.us/strike-vector/ and select **Sunset Circuit**.

**The file must be at**:
`strike-vector/art/characters/sunset/sunset_circuit_orange_pilot.webp`

The game automatically loads it if present, displays an appropriate CHARACTER ART status, and creates a cyan-accent variant while preserving the original orange player. When the file is absent or invalid, the game stays playable with its procedural character art.

### Scope / limitations
- Four original illustrated oblique viewpoints + two approximate pose rows, selected from eight aiming sectors.
- These are **not** eight independently painted complete walk cycles. Dedicated eight-direction animation atlases remain a separate production task.
- No change to hitboxes, physics, cover, scoring, team state, enemy waves or multiplayer messages.
- Source art based on the original approved Sunset Circuit orange player character concept.

Renderer: `strike-vector/character-sprites.js`.
