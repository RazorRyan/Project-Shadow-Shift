/**
 * combatResolver.js
 * Entity-agnostic combat hit resolution utilities.
 * Targets must implement:
 *   getHurtbox() -> { x, y, w, h }
 *   canBeHit()   -> boolean
 */

/**
 * Returns true if two AABB boxes overlap.
 * @param {{ x: number, y: number, w: number, h: number }} a
 * @param {{ x: number, y: number, w: number, h: number }} b
 */
export function boxesOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/**
 * Build a standardized hit event from an attack profile.
 * @param {object} profile  - attack profile (from playerAttackProfiles)
 * @param {number} facing   - attacker facing direction (+1 / -1)
 * @param {number} damage   - resolved damage value
 * @returns {{ damage, hitTag, knockbackX, finisher }}
 */
export function buildHitEvent(profile, facing, damage) {
  return {
    damage,
    hitTag: profile.hitTag ?? "light",
    knockbackX: facing * (profile.type === "downslash" ? 140 : profile.knockback),
    finisher: Boolean(profile.finisher)
  };
}

/**
 * Resolve which targets are hit by an attack box.
 * Calls canBeHit() on each target — does NOT apply damage.
 * @param {{ x, y, w, h }} attackBox
 * @param {Array}          targets   - array of entities implementing canBeHit() + getHurtbox()
 * @returns {Array} subset of targets whose hurtboxes overlap attackBox
 */
export function resolveAttack(attackBox, targets) {
  return targets.filter(t => t.canBeHit() && boxesOverlap(attackBox, t.getHurtbox()));
}

/**
 * Resolve and apply an attack across a target set using shared combat plumbing.
 * The caller supplies target id rules and hit construction so entity-specific
 * damage calculation can stay outside the scene without forcing inheritance.
 *
 * @param {{
 *   attackBox: { x:number, y:number, w:number, h:number },
 *   targets: Array,
 *   hasHitTarget: (targetId:string) => boolean,
 *   registerHitTarget: (targetId:string) => void,
 *   getTargetId: (target:any) => string,
 *   createHit: (target:any) => any,
 *   applyHit?: (target:any, hit:any) => any
 * }} options
 * @returns {Array<{ target:any, targetId:string, hit:any, result:any }>}
 */
export function resolveAppliedAttack({
  attackBox,
  targets,
  hasHitTarget,
  registerHitTarget,
  getTargetId,
  createHit,
  applyHit = (target, hit) => target.applyHit(hit)
}) {
  const resolvedTargets = resolveAttack(
    attackBox,
    targets.filter((target) => !hasHitTarget(getTargetId(target)))
  );

  return resolvedTargets.map((target) => {
    const targetId = getTargetId(target);
    registerHitTarget(targetId);
    const hit = createHit(target);
    const result = applyHit(target, hit);
    return { target, targetId, hit, result };
  });
}
