# STRIKE VECTOR v1.12 — Sunset Orange 32-Frame Movement Pilot

**Status (2026-10-20):** Sprite-loader support is implemented and committed. **The actual 32 individually illustrated movement frames are not yet produced or uploaded.** Until the new asset exists and validates, the approved v1.11.1 Sunset animation remains in service. Existing Fort Vector art and combat physics are unchanged.

## Production deliverable

- **File to upload:** `strike-vector/art/characters/sunset/sunset_orange_move_pilot.webp`
- **Master art:** transparent RGBA, **1792 × 1408 px**, with 8 equal columns × 4 equal rows; each frame exactly **224 × 352 px**.
- **Optional downscaled export:** transparent RGBA WebP **896 × 704 px** (8 × 4 frames of **112 × 176 px**).
- **32 different painted poses**: 4 facing directions × 4 walking frames + 4 facing directions × 4 running frames. Don't re-use or multiply one standing frame and label it animated.
- **Idle / crouch / slide / firing / melee / reload:** continue using the existing `sunset_circuit_orange_pilot.webp` and action VFX for this first movement pilot.
- **For now, orange team only.** Cyan Sunset retains the older recolored pilot until its own original blue illustration is available.

## Atlas indexing (zero-based)

| Row | Facing shown | Columns 0, 1, 2, 3 | Columns 4, 5, 6, 7 |
| --- | --- | --- | --- |
| 0 | North / back | Walk A, pass A, Walk B, pass B | Run A, flight A, Run B, recover |
| 1 | Northeast / back three-quarter | Walk A, pass A, Walk B, pass B | Run A, flight A, Run B, recover |
| 2 | Southeast / front three-quarter | Walk A, pass A, Walk B, pass B | Run A, flight A, Run B, recover |
| 3 | South / front | Walk A, pass A, Walk B, pass B | Run A, flight A, Run B, recover |

At source width `W` and height `H`:
- `cellWidth = W / 8`; `cellHeight = H / 4`
- `sourceX = (walkOrRunOffset + frameIndex) * cellWidth`
- `sourceY = facingRow * cellHeight`
- `walkOrRunOffset = 0` for walking and `4` for sprinting.

## Directions / mirror policy

Existing input convention: world x grows East, world y grows South. The aim angle controls illustration facing; WASD controls translation. Preserve independent aiming.

| Eight aim sectors | Authored movement row | Horizontal flip |
| --- | --- | --- |
| N | 0 | no |
| NE | 1 | no |
| E | 2 (SE approximation) | no |
| SE | 2 | no |
| S | 3 | no |
| SW | 2 | yes |
| W | 2 (SE approximation) | yes |
| NW | 1 | yes |

**Limitation:** E/W reuse a three-quarter direction as a temporary compromise. We are not yet claiming eight original illustrated directions.

## Runtime playback rules (implemented)

- Active locomotion: `info.move > 0.16`; no active slide/crouch/death.
- Walk when `0.16 < info.move <= 0.88`; run when `info.move > 0.88`.
- The current game's `step` moves about 9 units/s walking and 15 units/s running.
- `frameIndex = floor(max(0, step) * 0.9) % 4`. This yields approximately **8.1 walking frames/s** and **13.5 running frames/s**, respectively, with 4 frames per full cycle.
- Use **one solid movement frame per render**, not a transparent duplicate over an idle pose.
- Return immediately to the **existing idle frame** when stationary, crouched, sliding, or defeated.
- The movement atlas draws into the **same world-aligned sprite rectangle and pivot** as the current `112 × 176` convention: center anchor `(56,92)`, render scale `0.48`. In double-resolution master coordinates, equivalent pivot is `(112,184)`.
- The current `stableFacing` hysteresis is retained, avoiding flicker near aim-sector boundaries.
- Gameplay collision circles, player velocities, score/puck, weapon settings, PvP damage, and network authority are unchanged. Guests and bots already supply aim/step/movement metadata through the renderer.

## Art and QA acceptance

- Every frame has fully transparent pixels outside the illustrated silhouette; no white/black solid backgrounds or cut-off feet, hair, weapons.
- Every sprite fits **inside its own cell**. Zero overlap from adjacent frames (the older concept sheet needed an overflow trim; this replacement must not).
- Keep consistent world-space hip/torso center and shoe level; no body teleport between frames.
- Preserve the approved Sunset orange + charcoal tactical streetwear, hairstyle, equipment, and overhead three-quarter camera.
- Walk leg silhouettes should visibly alternate sides; run frames should show stronger extension and momentum, not just a sped-up walking pose.
- Check all four rows for 4 distinct walk and 4 distinct run poses, good alpha, consistent scale/pivots.
- Check E/W approximation and mirrored NW/SW poses, including weapon and jacket asymmetry.
- Check game-scale previews (rendered figure ~54×84 pixels). Preserve readability over microdetails.
- Check walking/sprinting in solo and live two-player lobby, both teams, plus AI teammates; check slide/reload/melee fallback; check Fort Vector remains unchanged.
- Confirm real artwork file exists on GitHub and inspect rendering before announcing v1.12 complete.

## Implementation in repository

`strike-vector/character-sprites.js` already attempts to load the optional path above. It accepts only WebP decodes reporting `1792 × 1408` or `896 × 704`. If the file is absent, fails decode, or has other dimensions, the old approved 4×2 pilot remains displayed. The exposed `window.StrikeVectorSprites.motionStatus` reads `pending`, `missing`, `invalid`, or `ready` for basic diagnostics.

**After upload:** Test in browser, keep orange movement on the new sheet and cyan on the old sheet, and only then update the game title to v1.12. No new game mechanics are required for this phase.

**Next:** Real cyan Sunset art sheet (not recolored orange), optional dedicated slide/melee/reload poses, then Fort Vector multi-frame walk/run.
