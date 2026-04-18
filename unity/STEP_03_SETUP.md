# Step 3: Jump, Coyote Time, and Jump Buffer

`PlayerMovement.cs` now includes:

- Jump force
- Coyote time
- Jump buffering

Recommended inspector values:

- Jump Force: `13`
- Coyote Time: `0.12`
- Jump Buffer Time: `0.12`

Quick tests:

1. Press jump while grounded: the player should jump immediately.
2. Walk off an edge and press jump just after leaving: coyote time should still allow the jump.
3. Fall toward the floor and press jump just before landing: buffered jump should trigger on landing.

This step still uses the legacy input axes:

- Move: `Horizontal`
- Jump: `Jump`

Next step:

Step 4 adds dash without mixing it into the jump timing logic.
