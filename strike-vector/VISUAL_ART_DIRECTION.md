# STRIKE VECTOR — Stadium Art Production Plan

**Direction:** Near-future combat-sport arenas with believable materials, expressive player silhouettes, and high-contrast cyan/orange team identity.
**Reference:** The approved two-arena mood board: FORT VECTOR / SUNSET CIRCUIT.
**Rule:** Art must never change physics, matchmaking, puck boundaries, cover health/collision, gameplay scale, or reward systems.

## Current implementation (v1.11.0 cinematic combat feedback)
- \`arena-art.js\` supplies a cached stadium-floor painter, destructible cover skin, cached top-down player/bot/enemy sprites, and an energy puck skin.
- \`index.html\` delegates rendering to that module while preserving the original collision, team, AI, sound, game loop, multiplayer, and arena dimensions.
- Both FORT VECTOR and SUNSET CIRCUIT are selectable stadium skins. The online host chooses the stadium in the lobby; that selection is carried in the multiplayer room rules.
- The additional `stadium-themes.js` art module implements Sunset Circuit's cached gold-hour city court, neon goal gantries, edge storefronts, chain-link fences, graffiti, planter dressing, urban cover, and street-techwear characters. All geometry and collision footprints are unchanged.
- **v1.8.0 sprite adapter is committed**: `character-sprites.js` uses an authored four-view/two-pose transparent Fort Vector atlas, selects oblique view sectors without rotating human art 360°, generates orange team trims, and preserves procedural fallbacks. Multiplayer enemy/bot and Sunset Circuit rendering remain untouched.
- **Fort Vector binary installed:** `strike-vector/art/characters/fort/fort_vector_cyan_pilot.webp` was confirmed in the repository after the initial upload.
- **Sunset Circuit pending binary:** the user must upload `sunset_circuit_orange_pilot.webp` (inside the v1.9 Sunset asset ZIP) into `strike-vector/art/characters/sunset/`. The new two-venue sprite loader can then display the illustrated player automatically. Until uploaded, Sunset displays its procedural fallback.
- Player models now use lightweight procedural gait, slide, crouch and reload poses; enemy, AI, and online human movement is animated without modifying the simulation.
- Procedural drawings are a **playable art foundation**, not the final hand-authored concept-art-quality sprite sheets.

- **v1.9.0:** adds a separate Sunset Circuit orange character pilot extracted from the approved concept art and eight discrete aiming sectors for both stadiums. Orange/cyan color variants share art while physics and networking remain unchanged. Directional views still reuse or mirror **four hand-illustrated viewpoints**; the true unique eight-way walk, slide, reload and melee sheet remains unfinished.

- **v1.10.0:** existing transparent player atlases are blended for smoother gait and given stable facing selection, restrained muzzle recoil, reload cues, melee glints, low-profile slide trails, and multiplayer slide/reload/run animation-state synchronization. These are improved two-pose animations, **not** eight independently illustrated direction/frame cycles.
- **v1.10.0 combat:** precision shot is 2.5× damage and projectile velocity, with 2.5× upgraded penetration capacity (rounded up to whole extra penetrations); multiplayer host reconstruction preserves the same modifiers. Landed melee attacks one-hit KO vulnerable opponents, preserve teammate knockback, and launch the puck with 1,320–1,600 initial force depending on the melee upgrade. Spawn protection and host-configured PVP rules still apply.

- **v1.11.0 (implemented):** New `combat-vfx.js` contains bounded, expiring visual-only effects: directional muzzle flashes, ejected casings, melee energy sweeps, slide streaks/dust, and impact sparks. Both lobby-hosted multiplayer and solo paths emit effects using the existing hit/fire messages. Remote slide events are rendered through the established synchronized slide state. No damage, penetration, movement, melee power, puck physics, economy, or networking authority was modified.
- The VFX module supports a `low` quality mode for future device settings and clears itself on game reset. Particle count is hard capped. Syntax and mocked effect lifecycle/rendering tests passed; **live browser/mobile/multiplayer testing remains pending**.
- **Still pending:** truly hand-illustrated eight-direction idle/run/walk/slide/melee/reload sheets. Current illustrated character atlases contain four authored views with two usable poses (eight aim sectors through mirroring), enhanced by blended motion and independent action VFX.

## Arena A: FORT VECTOR / Tactical Arena

| Priority | Asset or system | Requirements |
| --- | --- | --- |
| P0 | Ballistic concrete/steel floor | Panel seams, scuffs, grates, industrial gradients, stable cached surface |
| P0 | Sport-field markings | Center ring, lanes, zone stencils A1/A2/B1/B2, unobstructed puck line of sight |
| P0 | Team goals | Cyan/orange goal gantries; identical hit area and geometry |
| P0 | Destructible obstacles | Crates / reinforced walls; every removed 12px collision cell stays visually transparent |
| P0 | Operative sprites | Cyan/orange armored competitive-team silhouettes, top-down, obvious weapon direction |
| P0 | AI / hostiles | Robot and aggressor profiles, distinct from player teams |
| P0 | Energy puck | Metallic shell, emissive ring and core, readable at movement speed |
| P1 | Directional animations | Walk, sprint, crouch, slide, melee, reload, death |
| P1 | 2D effects | Sparks, casing, smoke, muzzle flare, shockwave, projected floodlight shadows |
| P1 | Arena identity props | Holographic scoreboard, high-tech floodlights, rails, conduit trays |
| P2 | Audio ambiance | Stadium hum, distant PA, short goal stingers, spatial cover damage |
| P2 | Authored artwork | Export actual sprite sheets, albedo/normal/emissive floor/cover atlas with consistent scale |

## Arena B: SUNSET CIRCUIT / Golden Hour Street Court

| Priority | Asset or system | Requirements |
| --- | --- | --- |
| P0 | Painted neighborhood court | Cracked asphalt, center mural, line wear, amber sunlight |
| P0 | Court boundary dressing | Chain-link edges, storefront silhouettes, elevated conduits, goal frames |
| P0 | Cyberpunk recreational players | Sport-techwear, visors, pads and sneakers; preserve team accents |
| P0 | Urban destructible cover | Concrete planters, utility boxes, shipping crates, barriers; reuse exact collision slots |
| P1 | Graffiti/decals | Court mural and local team/sponsor tags; no clutter under projectile trails |
| P1 | Golden-hour lighting | Long baked shadows, warm pools of light, restrained magenta/cyan neon |
| P1 | City-life dressing | Neon shop signs, vents, overhead power lines, benches and puddles at court periphery |
| P2 | Ambient effects | Sparking signs, slow reflection shimmer, crowd texture and signage animations |
| P2 | Venue audio | Distant traffic, audience reactions, atmospheric scene stems |

## Proposed file architecture
\`\`\`text
strike-vector/
  index.html                     # Gameplay, networking, world/collision logic
  arena-art.js                   # Phase 1: base procedural rendering module
  stadium-themes.js              # Phase 2: two themes and character motion sprites
  character-sprites.js           # Illustrated player atlases and blended gait
  combat-vfx.js                  # Transient action VFX, visual only
  art/
    fort-vector/
      environment-atlas.webp
      players-cyan.webp
      players-orange.webp
      effects.webp
    sunset-circuit/
      environment-atlas.webp
      street-players-cyan.webp
      street-players-orange.webp
      effects.webp
    shared/
      puck.webp
      ui-icons.webp
\`\`\`

## Implementation milestones
1. **Fort Vector facelift — implemented (v1.6.0):** cached industrial stadium paint, zone stencils, facility barriers, procedural top-down sprites and mechanical puck.
2. **Sunset Circuit — implemented (v1.7.0 first playable pass):** solo/online stadium selection, warm court, graffiti, edges, neon sports goals, cyberpunk recreational-player outfits, urban cover; game rules and cover footprints unchanged.
3. **Movement animation — implemented (v1.7.0 first playable pass):** procedural steps, run gait, sliding/crouching poses, and local reload detail. Still to do: hand-painted sprite-sheet animation with 8 directions and polished melee/firing frames.
4. **Art replacement — next:** optimized hand-authored texture atlases and sprite sheets with preloading, fallback procedural painter, and controllable effects quality.
5. **Presentation polish — later:** arena-specific UI/scoreboards, improved lighting, impact FX, goal celebrations, ambient animation and audio.

## Technical guardrails / acceptance
- Collision, barrier/chip coordinates and game mechanics remain **exactly** the same between stadiums.
- Single stadium selection comes from the host and is transmitted to guests; guests cannot diverge visually on collision-relevant props.
- Target playable desktop at 60 FPS and capable mobile devices at 30–60 FPS, with cached static layers and a low-effects mode.
- Team cyan/orange, enemy warnings, puck, goal outlines, laser, projectiles and cover edges are distinct under both lighting schemes.
- Art uses preloaded or cached layers, not per-frame new texture canvases; no unrelated network calls.
- Mobile portrait/landscape, zoom, retina scaling, pause and live map must remain functional.
- If external art fails to load, the game still renders playable geometry via fallback painter.
- Before publishing future stages, verify a two-player host/guest match, enemy-wave continuity, shop/ready-up, goal reset and puck collisions.

### v1.11.2 — Sprite pipeline preparation (implemented, no new art yet)
- Prepared optional loader for `strike-vector/art/characters/sunset/sunset_orange_move_pilot.webp` (8 columns × 4 rows, 32 individually drawn poses). Accepted sizes: `1792×1408` or `896×704` WebP; orange Sunset walk/run only. The existing v1.11.1 4×2 Sunset art remains the fallback for missing or invalid assets, and cyan/fort art stays untouched.
- Four frame cycles at approximately 8.1 fps walking and 13.5 fps sprinting, using existing input state/step animation and independent aim directions. No new simulation/network events or combat balance changes.
- **Still not created**: 32 individually illustrated animation frames. Production checklist and indexing contract: [SUNSET_32_FRAME_MOVEMENT_PILOT.md](./SUNSET_32_FRAME_MOVEMENT_PILOT.md).
