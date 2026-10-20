# STRIKE VECTOR v1.11.1 — Sunset Circuit Movement Readability Fix
**Status:** Implemented in \`strike-vector/character-sprites.js\` and released as game title v1.11.1. The same existing Sunset WebP is used; users don't need to reupload the art.

## Diagnosis (confirmed by original uploaded atlas + current renderer)
- The **1415 × 1112 RGBA WebP** has four authored directions in the top row (idle) and four distinct leg/stride poses in the bottom row.
- The v1.11 renderer **always painted row 0 (idle)** at full opacity, then drew row 1 (stride) with an alpha peaking around the movement strength (~0.72 for walking). Result: ghosted movement mixed with a strongly visible idle silhouette.
- Some top-row shoe pixels had **spilled into the top 32 pixels** of the bottom cells. This produced stray floating fragments when the movement row appeared.
- This is a **renderer readability problem plus small atlas layout overflow**, not a need to regenerate the entire visual design.

## Implemented v1.11.1 behavior (exact values)
- \`moving > 0.16\`: counts as active locomotion if not sliding, crouching, or defeated.
- Gait phase \`((step / Math.PI) % 1 + 1) % 1\`; phase advances from the game's existing step input. No new physics, input controls, network events, or movement speed.
- **Walking (\`move <= 0.88\`):** display fully opaque movement frame whenever gait phase is **below 0.68** (68% of each step); idle frame otherwise.
- **Running (\`move > 0.88\`):** display fully opaque movement frame whenever gait phase is **below 0.74** (74% of each step); idle frame otherwise.
- **Standing (\`move <= 0.16\`), crouching, sliding, dead:** show the top-row pose; existing crouch/slide transformations and combat effects remain.
- Sunset displays **one solid frame at a time**, avoiding translucent double bodies. Fort Vector retains the existing blended animation unchanged.
- When drawing Sunset's high-resolution movement row, **skip the first 32 pixels of each 556-pixel-high source cell** and place the remaining pixels at the same source-relative destination coordinates. This removes leaked shoe fragments **without changing world position or sprite pivot**.
- No edits to the source WebP, goals, collisions, puck physics, melee strength, precision multipliers, damage logic, shop, bots, or team network state.

## Verify in the game
1. Hard refresh \`https://ebato.us/strike-vector/\` after the deployed page title shows **v1.11.1**.
2. Select Sunset Circuit; stand still. Idle pose should remain steady.
3. Walk left/right/up/down while aiming separately. The illustrated legs should alternate clearly, not look like faint ghosts. Check all four authored views plus their mirrored sectors.
4. Sprint; the movement frame should appear more often.
5. Crouch and slide; existing action states must not be overridden by walk animation.
6. Host a multiplayer lobby and repeat with a guest and AI teammate (direction updates must still come from the host/guest state).
7. Switch to Fort Vector; confirm its original gait remains unchanged.
8. Look for detached shoe pixels over the character's head while running; none should show.

## Limitations / subsequent art production
This is a deliberately targeted **two-pose visibility fix**, **not** a true 8-way frame-by-frame animation. The *next real art milestone* is an authored 8-direction set (per stadium/team) with at least 4–6 unique walking frames, 6 running frames, 3–4 slides, and 3–5 melee frames, all with stable pivots. The orange and cyan Sunset players should eventually use **separately illustrated artwork** rather than recoloring orange gear to cyan.

The user's original approved concept art remains the visual authority.