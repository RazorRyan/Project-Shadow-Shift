/**
 * Checkpoint system.
 * Checkpoints are zones defined per room. Activation requires player overlap + E.
 * Tracks visited rooms.
 */
export function createCheckpointSystem() {
  const visitedRooms = new Set();
  let activeCheckpoint = null;

  return {
    markRoomVisited(roomId) {
      visitedRooms.add(roomId);
    },

    getVisitedRooms() {
      return [...visitedRooms];
    },

    loadVisited(roomIds = []) {
      roomIds.forEach(id => visitedRooms.add(id));
    },

    getActive() {
      return activeCheckpoint;
    },

    restoreActive(checkpointId, checkpoints = []) {
      activeCheckpoint = checkpoints.find(cp => cp.id === checkpointId) ?? null;
      return activeCheckpoint;
    },

    /**
     * Check whether the player is in a checkpoint zone.
     * @param {object} player — has sprite.body
     * @param {Array}  checkpoints — [{id, x, y, w, h, spawnId}]
     * @param {boolean} activatePressed — true when E was pressed this frame
     * @returns {object|null} activated checkpoint or null
     */
    check(player, checkpoints = [], activatePressed = false) {
      if (!checkpoints.length || !activatePressed) return null;
      const body = player.sprite.body;
      for (const cp of checkpoints) {
        if (
          body.x < cp.x + cp.w &&
          body.x + body.width > cp.x &&
          body.y < cp.y + cp.h &&
          body.y + body.height > cp.y
        ) {
          activeCheckpoint = cp;
          return cp;
        }
      }
      return null;
    },
  };
}
