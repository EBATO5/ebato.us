# STRIKE VECTOR — CHARACTER SPRITE PRODUCTION BRIEF
Status: **reference and technical direction locked; actual painted sprite sheets not yet created.**
Primary reference: approved original "STRIKE VECTOR Arena Design Dossier", specifically its bottom-row FORT VECTOR operatives and SUNSET CIRCUIT player concepts. Do NOT use the present procedural game characters as the design reference.

## 1. Camera and presentation — LOCKED
- Elevated **three-quarter overhead** / oblique top-down, around **60–70° above ground**, adjusted by visual comparison with the reference illustration.
- The top of the head and shoulder guards is visible, but so is some face/front of the body and full leg/foot silhouette. Not pure 90° straight-down, not isometric 45° side-view.
- World camera, aim input and collision continue as they are. We are changing the characters' drawn angle, not changing gameplay into 3D.
- Create **8 directional sprites** for N, NE, E, SE, S, SW, W, NW. Do NOT rotate a single oblique human sprite 360°: it turns feet, helmet geometry and lighting sideways. Weapon/forearm layer may optionally pivot smoothly between directional frames.
- Floor shadow is an independent world-aligned ellipse and must not rotate with the character.
- Preview at gameplay size, not just as full-screen concept art.

## 2. Look and proportions
- Semi-realistic, painterly, confidently athletic adults. No oversized heads, big rounded toy armor, gummy arms, abbreviated legs, or bouncy movement.
- Realistic helmet/head relative to shoulders, wider shoulder/chest silhouette tapering to waist, distinct forearms and believable footwear.
- Better weapon silhouettes: narrow pistol/carbine receiver, rail, real barrel/muzzle, grip and stock where relevant. Gun muzzle graphic must match projectile spawning angle/origin in game.
- Separate cyan/orange identification on upper arms, shoulder lights/stripes, helmet/visor, tactical chest band. The rest stays grounded, not fully bright cyan/orange.
- Distinguish humans, AI players and hostile NPCs even against visually busy arena floors.

## 3. FORT VECTOR — TACTICAL SPORTS COMPETITORS
Reference: original mood board, lower LEFT character lineup.
- A sanctioned high-tech military training-sport participant; protective fitted plate armor, gunmetal/slate underlayer, composite shoulder guards, visor/compact helmet, gloves, pads and tactical athletic boots.
- Professional and disciplined bearing: planted stance, controlled recoil, compact gait, deliberate slides. Human anatomy is the priority.
- Cyan and orange are TEAM accents, not monochrome uniforms.
- Maintain variation seen in reference: mostly helmeted operators, with an occasional ponytail/unhelmeted variation in later skins.
- Hostile training units/drones must have a clearly different visual language.

## 4. SUNSET CIRCUIT — URBAN RECREATIONAL COMPETITORS
Reference: original mood board, lower RIGHT character lineup.
- Street sportswear merged with believable wearable protection: technical hoodies/jackets, fitted shirts, sneakers, kneepads, gloves, visor/cap/headset, hairstyle variety.
- Leaner and looser than Fort Vector, but still adult realistic human proportions. No chibi looks or comic exaggeration.
- Materials should read as faded cotton, nylon/ripstop, composite sports guards and subtle lit equipment. Palette of charcoal, warm grey, dusk violet, amber and controlled neon accent.
- Cyan/orange team coding remains unambiguous at sunset, against neon, and at small game zoom.
- Friendly and opposing AI players follow the venue's attire family.

## 5. INITIAL PILOT — approve before a large sprite sheet
Create TWO high-quality painted source characters at precisely the same oblique view:
1. FORT VECTOR — cyan tactical operative with compact helmet and visible rifle.
2. SUNSET CIRCUIT — orange recreational techwear competitor with visible sport pads and firearm.

For each, show FRONT, BACK, and TWO THREE-QUARTER FACINGS with transparent backgrounds. Put each beside the relevant approved mood-board character crop and an in-game-size preview.

Approval test:
- Looks like the mood board, not the current circles/rounded procedural humanoids.
- Shoulder/helmet/torso/legs/weapon read as believable, at approximately 80 px displayed height.
- Strong character-vs-background separation without thick neon cartoon outlines.
- The elevated oblique viewing angle is consistent across both venues.
Only after approval: remaining facings and animations, other team recolors, NPCs.

## 6. TECHNICAL SPRITE SPECIFICATIONS — preliminary integration targets
- Editable masters: **256×256 RGBA per pose**; export **128×128 transparent RGBA frames** and packed PNG/WebP atlases.
- Common trial anchor at source **(64,72)** of a 128×128 tile, attached to the game's existing physics center; feet/weapon may extend beyond hitbox. Calibrate before production.
- Suggested drawn footprint: approximately **75–90 world px** inclusive of weapon; check at real mobile and desktop zoom.
- Current physical character circle (~18 world-unit radius) **does not change**. Do not use sprite bounding boxes as collision shapes.
- Maintain exactly the same anchor across every frame. Include metadata for state, direction, frame rectangle, duration, pivot and optional muzzle offset.
- Recolor using team accent masks or layered sources rather than manually redrawing every motion frame.
- Smoothing and asset reduction must preserve clear human silhouette at in-game zoom.

## 7. ANIMATION PLAN (full set follows pilot)
Facing directions: eventual target **8**; pilot at **4** to approve camera/proportions first.

| Pose/state | Frames per facing |
|---|---:|
| Idle + aim | 1–2 |
| Walking | 4–6 |
| Sprinting | 6 |
| Crouch | 1–2 |
| Dodge / slide | 3–4 |
| Firing recoil | 2–3 |
| Reload | 4–6 |
| Melee | 3–5 |
| Downed | 2–4 |

Animated motion should be restrained and grounded. Do not shake/scale/bounce entire figures with a sine wave. Use separated legs and small shoulder rotations. Game state to read: aim angle, step timing, slide, crouch, reload and melee.

## 8. ENGINE INTEGRATION
Suggested folders:
- strike-vector/art/characters/fort/
- strike-vector/art/characters/sunset/
- strike-vector/art/characters/shared/
- strike-vector/character-sprites.js (NEW renderer/adaptor)
- strike-vector/arena-art.js (existing fallback)
- strike-vector/stadium-themes.js (existing environment skins)
- strike-vector/art/characters/atlas.json (directions, states, pivots)

- Preload the new atlas. If it fails, retain existing procedural characters so gameplay remains playable.
- Use eight-way direction switching or appropriate directional blending for bodies, while keeping precision mouse aim.
- Draw grounded cast shadow separately from body sprite, not in a rotated texture.
- Fix the weapon muzzle attachment before replacing projectile graphics.
- Preserve all original physics, multiplayer messages, enemy wave timing, shop, sound, goals, 45-second ready-up and mobile controls.
- Compare player, guest, teammate bot and enemy behavior in both venues; test team identification over both stadium floors.
- Profile 60 FPS desktop / 30–60 FPS mobile where practical; avoid allocating new canvases or downloading sprites per frame.

## 9. DELIVERY ORDER
1. Original-art-matched **two-character pilot style sheet** at the approved angle.
2. First transparent 4-direction idle/aim samples, in-game preview, user approval.
3. Full 8-direction alpha atlas + walking/running/slide/crouch/recoil/melee/reload.
4. Fort and Sunset cyan/orange palettes, AI/hostile sets and alternate outfits.
5. Sprite polish, detailed impact/weapon FX and stadium-specific finishing touches.

Acceptance is based on the **original supplied concept art**, not generated substitutions or today's temporary procedural avatars.
