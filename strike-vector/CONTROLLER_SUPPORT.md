# STRIKE VECTOR — Controller Support (v1.12.1)

**Status:** Implemented on the browser branch through \`controller-support.js\` and the existing \`index.html\`. Standard-layout Xbox, PlayStation DualShock/DualSense, and compatible controllers are supported **when the browser exposes them through the Gamepad API**.

## Quick start

1. Connect a Bluetooth or wired game controller to your device.
2. Open \`https://ebato.us/strike-vector/\` in a modern browser and press a controller button. Some browsers do not expose controllers until a gamepad button is pressed.
3. The bottom-right **controller connected** indicator confirms detection.
4. From the title screen press **Start/Options** to begin solo, or use the D-pad to highlight lobby controls and **A/Cross** to select.
5. The existing keyboard, mouse and touchscreen controls remain available. On supported phones, the on-screen touch overlay hides while the controller is being used.

## Gameplay mapping — standard buttons

| Xbox | PlayStation | Action |
| --- | --- | --- |
| Left stick | Left stick | Walk/strafe, analog speed, diagonal movement |
| Right stick | Right stick | Aim independently of movement; last non-neutral aim direction is retained |
| RT | R2 | Primary fire: tap for semi, tap for a 3-round burst, hold for auto |
| LT + RT | L2 + R2 | Selected precision shot, underbarrel grenade or power shot — hold LT to preview, press RT to fire |
| A | Cross (×) | Slide/dodge, including during firing and reloading |
| B | Circle (○) | One-hit melee strike; still launches the puck and teammates |
| X | Square (□) | Reload |
| Y | Triangle (△) | Switch between knife and primary gun |
| LB or L3 | L1 or L3 | Sprint while held |
| RB | R1 | Cycle installed secondary abilities |
| R3 or D-pad Down | R3 or D-pad Down | Toggle crouch |
| D-pad Up | D-pad Up | Cycle available semi/burst/auto fire modes |
| D-pad Left / Right | D-pad Left / Right | Cycle secondary abilities backward / forward |
| View / Back | Create / Share | Armory/shop toggle |
| Menu / Start | Options | Solo pause; multiplayer player roster/lobby |
| D-pad Up/Down or Left Stick | Same | Navigate visible title, lobby and armory buttons when menu is open |
| A or RT (in menus) | Cross or R2 | Activate focused menu button |
| B (in menus) | Circle | Back/close menu, node popup or resume |

*Controller mode does not modify* damage, projectile count, puck physics, AI, economy, or multiplayer damage authority. The same \`pressPrimaryTrigger\`, \`shoot\`, \`quickMelee\`, \`startSlide\`, \`reload\`, \`switchWeapon\`, \`cycleFireMode\` and \`selectSecondary\` methods drive mouse/touch/keyboard and controller.

## Implementation detail

- Standard Gamepad API (\`navigator.getGamepads()\`) sampled once per animation frame in \`controller-support.js\`.
- Radial analog dead zone: 0.19; right-stick aim activation 0.32; trigger activation 0.43. Values outside the dead zone map to continuous movement, so analog speed works.
- Button edge transitions prevent duplicate semi-auto shots, repeating dodge and accidentally cycling menus many times per frame. Continuous RT drives unlocked automatic fire; LT+RT queues one secondary shot for the existing cadence.
- Right stick sets world-space aiming, including grenade trajectory and narrow precision cone.
- Gamepad pause/armory and menus reuse existing visible DOM controls with focus + click; gamepad need not simulate browser mouse gestures.
- Connection status appears when the browser reports a controller, without requiring a plugin, install or account.
- Disconnection/blur/hidden-tab clears held inputs. Touch overlay cleanup respects pad-held triggers on phones.
- Missing/unsupported Gamepad API is a no-op; all prior input methods continue normally.

## Verification

**Passed (simulated):** JS syntax, Gamepad API normalization, stick dead zone, trigger press/release edges, LT+RT chord, button-to-action wiring, disconnect cleanup, module load order, unchanged melee/precision balance. An integration harness also fired each command through the bridge without actual physical hardware.

**Still needs hands-on browser testing:** Xbox and DualSense wired/Bluetooth on your PC, mobile Safari/Chrome if the OS/browser exposes Gamepad API, menu focus/armory navigation on small screens, guest-host multiplayer and controller+mouse handoff. Browser and OS gamepad mappings can differ; unsupported mapping may need a future custom profile.

## Planned optional enhancements

Per-controller remapping, aim sensitivity/dead zones in settings, rumble feedback on goal/melee, radial selection of secondary weapons, improved armory selection/zoom and configurable aim assist (not enabled by default).
