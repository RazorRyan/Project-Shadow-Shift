# Step 1: Project Scaffold and Starter Architecture

This workspace now contains the starter `Assets/_Project` folder structure and the first runtime scripts.

Files created:

- `Assets/_Project/Core/Runtime/AbilityType.cs`
- `Assets/_Project/Core/Runtime/GameContext.cs`
- `Assets/_Project/Core/Data/GameStateDefinition.cs`
- `Assets/_Project/ShadowSwap/WorldType.cs`
- `Assets/_Project/Elements/ElementType.cs`

Folders created:

- `Assets/_Project/Core/Runtime`
- `Assets/_Project/Core/Data`
- `Assets/_Project/Player`
- `Assets/_Project/Combat`
- `Assets/_Project/Enemies`
- `Assets/_Project/World`
- `Assets/_Project/ShadowSwap`
- `Assets/_Project/Elements`
- `Assets/_Project/Weapons`
- `Assets/_Project/UI`
- `Assets/_Project/Systems`
- `Assets/_Project/Scenes`
- `Assets/_Project/Prefabs`
- `Assets/_Project/Art`
- `Assets/_Project/Materials`
- `Assets/_Project/Animations`
- `Assets/_Project/Audio`

Unity editor steps still required:

1. Open this folder as a Unity 2D project.
2. Let Unity import and compile the scripts.
3. Create `DefaultGameState`:
   - Right click `Assets/_Project/Core/Data`
   - `Create > Shadow Shift > Game State Definition`
4. Create scene `Assets/_Project/Scenes/Bootstrap.unity`
5. Add GameObject `GameContext` to the scene and attach `GameContext.cs`
6. Assign `DefaultGameState` to the `Initial State` field
7. Create tags:
   - `Player`
   - `Enemy`
   - `Hazard`
   - `Interactable`
8. Create layers:
   - `Player`
   - `Ground`
   - `Enemy`
   - `Hazard`
   - `LightWorld`
   - `ShadowWorld`
   - `Interactable`
9. Create sorting layers:
   - `Background`
   - `World`
   - `Actors`
   - `FX`
   - `UI`

Suggested temporary scene layout:

- `Main Camera` at `(0, 0, -10)`
- Empty `GameContext` object with `GameContext` component
- Empty `LevelRoot`
- Simple `Ground` object with `BoxCollider2D`

Next recommended step:

Step 2: create the player object, Rigidbody2D setup, ground check, and basic horizontal movement.
