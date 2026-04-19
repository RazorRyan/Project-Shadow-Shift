/**
 * Room transition system.
 * Checks whether the player has entered an exit zone each frame.
 * Entity-agnostic — works with any player that has sprite.body.
 */
export function createRoomTransitionSystem() {
  let gatedUntil = 0;

  return {
    arm(delayMs = 0, now = 0) {
      gatedUntil = now + Math.max(0, delayMs);
    },

    /**
     * @param {object} player  - has sprite.body (Phaser ArcadeBody)
     * @param {Array}  exits   - array of { x, y, w, h, targetRoom, spawnId }
     * @returns matched exit object or null
     */
    check(player, exits = [], now = 0) {
      if (!exits.length) return null;
      if (now < gatedUntil) return null;
      const body = player.sprite.body;
      for (const exit of exits) {
        if (
          body.x            < exit.x + exit.w &&
          body.x + body.width > exit.x &&
          body.y            < exit.y + exit.h &&
          body.y + body.height > exit.y
        ) {
          return exit;
        }
      }
      return null;
    },
  };
}
