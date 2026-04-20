/**
 * Persistence — save and load game progress via localStorage.
 *
 * SRP: this module only knows about serialisation/deserialisation.
 * It does NOT import from main.ts.  Any post-load state mutations that need
 * game-logic helpers (room navigation, checkpoint activation, etc.) are
 * performed through the PersistDeps injection contract, keeping the
 * dependency arrow pointing inward (main → persist, never persist → main).
 */

import { SAVE_KEY } from "../engine/constants";

// ---------------------------------------------------------------------------
// Serialised save format (versioned)
// ---------------------------------------------------------------------------

interface SavePayloadV3 {
  version: 3;
  progression: {
    abilities: { Dash: boolean };
    elements: { FireShift: boolean; IceShift: boolean; WindShift: boolean; ShadowSwap: boolean };
    keyItems: { MoonSeal: boolean };
    worldFlags: { gateOpened: boolean; barrierCleared: boolean; bossAwakened: boolean; bossDefeated: boolean };
    optionalSecrets: { rampartReliquary: boolean };
  };
  upgrades: { weaponStage: number };
  checkpoint: { id: string; roomId: string };
  roomFlags: {
    visitedRooms: Record<string, boolean>;
    pickups: { dashCollected: boolean; weaponCollected: boolean };
  };
}

// ---------------------------------------------------------------------------
// Dependencies injected by main.ts (Dependency Inversion Principle)
// ---------------------------------------------------------------------------

export interface PersistDeps {
  /** Activate a named checkpoint and persist if needed. */
  setSavedCheckpoint(state: any, id: string, shouldSave: boolean): void;
  /** Teleport the player to a checkpoint's spawn position. */
  spawnPlayerAtCheckpoint(state: any, player: any, id: string): void;
  /** Re-derive the procedural layout from current progression flags. */
  regenerateProceduralLayout(state: any): void;
  /** Sync puzzle-driven platforms to their current solved state. */
  syncPuzzlePlatforms(state: any): void;
}

// ---------------------------------------------------------------------------
// Default progress (new game)
// ---------------------------------------------------------------------------

export function getDefaultProgress(): SavePayloadV3 {
  return {
    version: 3,
    progression: {
      abilities: { Dash: false },
      elements: { FireShift: true, IceShift: true, WindShift: true, ShadowSwap: true },
      keyItems: { MoonSeal: false },
      worldFlags: { gateOpened: false, barrierCleared: false, bossAwakened: false, bossDefeated: false },
      optionalSecrets: { rampartReliquary: false }
    },
    upgrades: { weaponStage: 0 },
    checkpoint: { id: "start", roomId: "outer-rampart" },
    roomFlags: {
      visitedRooms: { "outer-rampart": true },
      pickups: { dashCollected: false, weaponCollected: false }
    }
  };
}

// ---------------------------------------------------------------------------
// Load (with version migration)
// ---------------------------------------------------------------------------

export function loadProgress(): SavePayloadV3 {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return getDefaultProgress();

    const parsed = JSON.parse(raw);

    if (parsed.version === 3) {
      return migrateV3(parsed);
    }
    if (parsed.version === 2) {
      return migrateV2(parsed);
    }
    // Legacy v1 (pre-migration) — treat as v2-ish with minimal fields
    return migrateV1(parsed);
  } catch {
    return getDefaultProgress();
  }
}

// ---------------------------------------------------------------------------
// Build the payload to write
// ---------------------------------------------------------------------------

export function getSavePayload(state: any): SavePayloadV3 {
  const checkpoint = state.checkpoints.find((c: any) => c.id === state.savedCheckpointId)
    ?? state.checkpoints[0];

  return {
    version: 3,
    progression: {
      abilities: { Dash: state.abilityUnlocked.Dash },
      elements: {
        FireShift: state.abilityUnlocked.FireShift,
        IceShift: state.abilityUnlocked.IceShift,
        WindShift: state.abilityUnlocked.WindShift,
        ShadowSwap: state.abilityUnlocked.ShadowSwap
      },
      keyItems: { MoonSeal: state.progression.keyItems.MoonSeal },
      worldFlags: {
        gateOpened: state.progression.worldFlags.gateOpened,
        barrierCleared: state.progression.worldFlags.barrierCleared,
        bossAwakened: state.progression.worldFlags.bossAwakened,
        bossDefeated: state.progression.worldFlags.bossDefeated
      },
      optionalSecrets: { rampartReliquary: state.progression.optionalSecrets.rampartReliquary }
    },
    upgrades: { weaponStage: state.player.weaponStage },
    checkpoint: {
      id: state.savedCheckpointId,
      roomId: checkpoint?.roomId ?? state.currentRoomId
    },
    roomFlags: {
      visitedRooms: state.roomState.visitedRooms,
      pickups: {
        dashCollected: !state.pickups.dash.active,
        weaponCollected: !state.pickups.weapon.active
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function saveProgress(state: any): void {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(getSavePayload(state)));
  } catch {
    // Ignore storage failures — prototype must remain playable in restricted contexts.
  }
}

// ---------------------------------------------------------------------------
// Apply persisted data onto live state (requires injected helpers)
// ---------------------------------------------------------------------------

export function applyPersistedProgress(state: any, deps: PersistDeps): void {
  const p = loadProgress();

  state.abilityUnlocked.Dash = p.progression.abilities.Dash;
  state.abilityUnlocked.FireShift = p.progression.elements.FireShift;
  state.abilityUnlocked.IceShift = p.progression.elements.IceShift;
  state.abilityUnlocked.WindShift = p.progression.elements.WindShift;
  state.abilityUnlocked.ShadowSwap = p.progression.elements.ShadowSwap;

  state.progression.keyItems.MoonSeal = p.progression.keyItems.MoonSeal;
  state.progression.worldFlags.gateOpened = p.progression.worldFlags.gateOpened;
  state.progression.worldFlags.barrierCleared = p.progression.worldFlags.barrierCleared;
  state.progression.worldFlags.bossAwakened = p.progression.worldFlags.bossAwakened;
  state.progression.worldFlags.bossDefeated = p.progression.worldFlags.bossDefeated;
  state.progression.optionalSecrets.rampartReliquary = p.progression.optionalSecrets.rampartReliquary;

  state.player.weaponStage = p.upgrades.weaponStage;

  state.pickups.dash.active = !p.roomFlags.pickups.dashCollected;
  state.pickups.weapon.active = !p.roomFlags.pickups.weaponCollected;
  state.barrier.active = !p.progression.worldFlags.barrierCleared;
  state.bossIntroShown = p.progression.worldFlags.bossAwakened;

  if (state.secretCaches?.length) {
    state.secretCaches[0].active = !p.progression.optionalSecrets.rampartReliquary;
  }

  if (p.progression.worldFlags.bossDefeated) {
    for (const enemy of state.enemies) {
      if (enemy.boss) enemy.alive = false;
    }
  }

  state.roomState.visitedRooms = p.roomFlags.visitedRooms ?? { "outer-rampart": true };
  state.routeState.lastAnnouncedRouteId = null;

  deps.setSavedCheckpoint(state, p.checkpoint.id, false);
  deps.spawnPlayerAtCheckpoint(state, state.player, p.checkpoint.id);
  deps.regenerateProceduralLayout(state);
  deps.syncPuzzlePlatforms(state);
}

// ---------------------------------------------------------------------------
// Migration helpers (private)
// ---------------------------------------------------------------------------

function migrateV3(p: any): SavePayloadV3 {
  return {
    version: 3,
    progression: {
      abilities: { Dash: Boolean(p.progression?.abilities?.Dash) },
      elements: {
        FireShift: p.progression?.elements?.FireShift !== false,
        IceShift: p.progression?.elements?.IceShift !== false,
        WindShift: p.progression?.elements?.WindShift !== false,
        ShadowSwap: p.progression?.elements?.ShadowSwap !== false
      },
      keyItems: { MoonSeal: Boolean(p.progression?.keyItems?.MoonSeal) },
      worldFlags: {
        gateOpened: Boolean(p.progression?.worldFlags?.gateOpened),
        barrierCleared: Boolean(p.progression?.worldFlags?.barrierCleared),
        bossAwakened: Boolean(p.progression?.worldFlags?.bossAwakened),
        bossDefeated: Boolean(p.progression?.worldFlags?.bossDefeated)
      },
      optionalSecrets: { rampartReliquary: Boolean(p.progression?.optionalSecrets?.rampartReliquary) }
    },
    upgrades: { weaponStage: p.upgrades?.weaponStage >= 1 ? 1 : 0 },
    checkpoint: {
      id: typeof p.checkpoint?.id === "string" ? p.checkpoint.id : "start",
      roomId: typeof p.checkpoint?.roomId === "string" ? p.checkpoint.roomId : "outer-rampart"
    },
    roomFlags: {
      visitedRooms: (typeof p.roomFlags?.visitedRooms === "object" && p.roomFlags.visitedRooms)
        ? p.roomFlags.visitedRooms
        : { "outer-rampart": true },
      pickups: {
        dashCollected: Boolean(p.roomFlags?.pickups?.dashCollected),
        weaponCollected: Boolean(p.roomFlags?.pickups?.weaponCollected)
      }
    }
  };
}

function migrateV2(p: any): SavePayloadV3 {
  return {
    version: 3,
    progression: {
      abilities: { Dash: Boolean(p.progression?.abilities?.Dash) },
      elements: {
        FireShift: p.progression?.elements?.FireShift !== false,
        IceShift: p.progression?.elements?.IceShift !== false,
        WindShift: p.progression?.elements?.WindShift !== false,
        ShadowSwap: p.progression?.elements?.ShadowSwap !== false
      },
      keyItems: { MoonSeal: false },
      worldFlags: { gateOpened: false, barrierCleared: false, bossAwakened: false, bossDefeated: false },
      optionalSecrets: { rampartReliquary: false }
    },
    upgrades: { weaponStage: p.upgrades?.weaponStage >= 1 ? 1 : 0 },
    checkpoint: {
      id: typeof p.checkpoint?.id === "string" ? p.checkpoint.id : "start",
      roomId: typeof p.checkpoint?.roomId === "string" ? p.checkpoint.roomId : "outer-rampart"
    },
    roomFlags: {
      visitedRooms: (typeof p.roomFlags?.visitedRooms === "object" && p.roomFlags.visitedRooms)
        ? p.roomFlags.visitedRooms
        : { "outer-rampart": true },
      pickups: {
        dashCollected: Boolean(p.roomFlags?.pickups?.dashCollected),
        weaponCollected: Boolean(p.roomFlags?.pickups?.weaponCollected)
      }
    }
  };
}

function migrateV1(p: any): SavePayloadV3 {
  // Very old save format — extract what we can
  return {
    version: 3,
    progression: {
      abilities: { Dash: Boolean(p.dashUnlocked) },
      elements: { FireShift: true, IceShift: true, WindShift: true, ShadowSwap: true },
      keyItems: { MoonSeal: false },
      worldFlags: { gateOpened: false, barrierCleared: false, bossAwakened: false, bossDefeated: false },
      optionalSecrets: { rampartReliquary: false }
    },
    upgrades: { weaponStage: p.weaponStage >= 1 ? 1 : 0 },
    checkpoint: {
      id: typeof p.checkpointId === "string" ? p.checkpointId : "start",
      roomId: "outer-rampart"
    },
    roomFlags: {
      visitedRooms: { "outer-rampart": true },
      pickups: {
        dashCollected: Boolean(p.dashUnlocked),
        weaponCollected: p.weaponStage >= 1
      }
    }
  };
}
