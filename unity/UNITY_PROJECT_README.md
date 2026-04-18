# Unity Project Shell

This folder now includes the minimum Unity project structure so Unity Hub and the Unity Editor can recognize it as a project:

- `Assets/`
- `Packages/manifest.json`
- `Packages/packages-lock.json`
- `ProjectSettings/ProjectVersion.txt`

Recommended editor version:

- `Unity 2022.3.62f1`

If Unity Hub still does not show it automatically:

1. Open Unity Hub
2. Click `Open`
3. Select `C:\development\Project Shadow Shift`
4. If prompted, use `Unity 2022.3.62f1` or the closest installed `2022.3 LTS`
5. If Hub still refuses, open Unity Editor first and use `Open` on the same folder

After the first open, Unity should generate:

- `Library/`
- `Logs/`
- `Temp/`
- remaining `ProjectSettings/*.asset` files

Important:

- The gameplay scripts are already under `Assets/_Project`
- Scenes, tags, layers, and ScriptableObject assets still need to be created in the editor
