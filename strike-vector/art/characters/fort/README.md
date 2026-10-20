# Fort Vector illustrated character pilot

The game renderer loads `fort_vector_cyan_pilot.webp` from this folder.
The source asset pack supplied in this project contains the original transparent
atlas (448×352) and its accompanying `atlas.json`.

**Asset status:** The adapter is committed. The binary WEBP still needs to be
added to this GitHub folder for the live website to show it.

## Installation
1. Open this folder in GitHub, choose **Add file → Upload files**.
2. Upload the file named `fort_vector_cyan_pilot.webp` from the supplied pack.
3. Commit to the site's default branch and refresh `/strike-vector/`.

The game can still play with the existing procedural characters until the sprite
loads successfully. The pilot has four authored viewing angles with idle and
stride variations, not eight unique animation directions. The renderer mirrors
left/right sectors and never rotates the oblique artwork in a full circle.

The adapter is `strike-vector/character-sprites.js` and does not modify game
physics, networking, health, hitboxes, goal rules, or team logic.
