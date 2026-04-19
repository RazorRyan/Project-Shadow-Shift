# Web Game Prompt Queue

This folder is a lightweight task queue for the browser version of `Shadow Shift`.

Workflow:

1. Each task is a markdown prompt file.
2. Every file starts with a status line:
   - `Status: TODO`
   - `Status: DONE`
3. Work should always pick the first meaningful `TODO` item from this folder.
4. After finishing a task, update that file to `Status: DONE`.
5. Add brief completion notes under `Completion Notes`.

Execution order:

1. `01_combat_feel.md`
2. `02_enemy_behaviors.md`
3. `03_level_art_pass.md`
4. `04_ui_and_menus.md`
5. `05_progression_and_persistence.md`
6. `06_mobile_friendly_controls.md`
7. `07_level_01_forgotten_gate.md`
8. `08_level_02_ashen_crossing.md`
9. `09_level_03_sunken_sanctum.md`
10. `10_level_04_shiver_hollows.md`
11. `11_level_05_eclipse_keep.md`
12. `12_web_standards_and_android_portability.md`

Target project:

- `C:\development\Project Shadow Shift\Web`

Primary game files:

- `index.html`
- `styles.css`
- `game.js`
