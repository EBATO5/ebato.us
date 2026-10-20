# STRIKE VECTOR — Stadium Art Production Plan

**Direction:** Near-future combat-sport arenas with believable materials, expressive player silhouettes, and high-contrast cyan/orange team identity.
**Reference:** The approved two-arena mood board: FORT VECTOR / SUNSET CIRCUIT.
**Rule:** Art must never change physics, matchmaking, puck boundaries, cover health/collision, gameplay scale, or reward systems.

## Current implementation (v1.6.0)
- \`arena-art.js\` supplies a cached stadium-floor painter, destructible cover skin, cached top-down player/bot/enemy sprites, and an energy puck skin.
- \`index.html\` delegates rendering to that module while preserving the original collision, team, AI, sound, game loop, multiplayer, and arena dimensions.
- FORT VECTOR is the default visual stadium in this first pass.
- Procedural drawings are a **playable art foundation**, not the final hand-authored concept-art-quality sprite sheets.

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
  arena-art.js                   # Phase 1: procedural rendering module
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
1. **Fort Vector facelift — implemented:** cached industrial stadium paint, zone stencils, facility barriers, basic top-down sprites, bright mechanical puck. Verify desktop and mobile.
2. **Character animation:** move from temporary cached procedural character silhouettes to frame-based 8-direction sprite sequences, including movement states.
3. **Sunset Circuit:** introduce stadium selector in match host and solo setup; network stadium ID at match start; use the same fixed collider/goal layout and physics.
4. **Art replacement:** use optimized hand-authored texture atlases and sprite sheets with preloading, fallback procedural painter, and controllable effects quality.
5. **Presentation polish:** arena-appropriate branding, HUD iconography, celebrations, impact FX, goal lighting, ambient animations and music cues.

## Technical guardrails / acceptance
- Collision, barrier/chip coordinates and game mechanics remain **exactly** the same between stadiums.
- Single stadium selection comes from the host and is transmitted to guests; guests cannot diverge visually on collision-relevant props.
- Target playable desktop at 60 FPS and capable mobile devices at 30–60 FPS, with cached static layers and a low-effects mode.
- Team cyan/orange, enemy warnings, puck, goal outlines, laser, projectiles and cover edges are distinct under both lighting schemes.
- Art uses preloaded or cached layers, not per-frame new texture canvases; no unrelated network calls.
- Mobile portrait/landscape, zoom, retina scaling, pause and live map must remain functional.
- If external art fails to load, the game still renders playable geometry via fallback painter.
- Before publishing future stages, verify a two-player host/guest match, enemy-wave continuity, shop/ready-up, goal reset and puck collisions.
