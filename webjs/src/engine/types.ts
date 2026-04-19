// ─── Primitive unions ────────────────────────────────────────────────────────

export type World         = "Light" | "Shadow";
export type WorldMode     = "Light" | "Shadow" | "Both";
export type Element       = "None" | "Fire" | "Ice" | "Wind";
export type EnemyType     = "goblin" | "watcher" | "demon" | "bulwark" | "hound" | "shadowWalker" | "oracle" | "revenant" | "boss";
export type HitTag        = "light" | "heavy" | "pogo" | "finisher";
export type Team          = "player" | "enemy";
export type WorldAffinity = "Light" | "Shadow" | "Both";
export type WorldPhase    = "neutral" | "empowered" | "exposed";
export type ReactionType  = "light" | "heavy" | "elemental" | "pogo" | "finisher";
export type StatusEffectType        = "none" | "scorch" | "chill" | "gust";
export type ReactiveTriggerType     = "swap" | "rest" | "attack" | "approach";
export type ElementalInteractionOutcome = "none" | "clear" | "fail" | "temper" | "gust";

// ─── World / shadow ───────────────────────────────────────────────────────────

export interface WorldModifier {
  affinity: WorldAffinity;
  phase: WorldPhase;
  damageTakenMultiplier: number;
  speedMultiplier: number;
  contactDamageBonus: number;
}

// ─── Impact / combat ─────────────────────────────────────────────────────────

export interface ImpactTuning {
  weight: number;
  knockbackScale: number;
  staggerScale: number;
  staggerThreshold: number;
  hitstopBonus: number;
}

export interface Hitbox {
  ownerType: string;
  ownerId: string;
  team: Team;
  x: number;
  y: number;
  w: number;
  h: number;
  lifetime: number;
  damage: number;
  knockbackX: number;
  knockbackTime: number;
  staggerTime: number;
  impactPower: number;
  hitTag: HitTag;
  element: Element;
  profileId: string | null;
}

/** Minimal required fields when constructing a hitbox. */
export interface HitboxInit {
  ownerType: string;
  ownerId: string;
  team: Team;
  x: number;
  y: number;
  w: number;
  h: number;
  lifetime?: number;
  damage?: number;
  knockbackX?: number;
  knockbackTime?: number;
  staggerTime?: number;
  impactPower?: number;
  hitTag?: HitTag;
  element?: Element;
  profileId?: string | null;
}

export interface Hurtbox {
  targetType: string;
  targetId: string;
  team: Team;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── Elemental ───────────────────────────────────────────────────────────────

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;
  tickInterval?: number;
  tickDamage?: number;
  slowMultiplier?: number;
}

export interface ElementalCombatProfile {
  damageMultiplier: number;
  impactBonus: number;
  knockbackMultiplier: number;
  hitstopBonus: number;
  statusEffect: StatusEffect | null;
}

export interface EnemyElementProfile {
  vulnerabilities: Element[];
  resistances: Element[];
}

export interface ElementalState {
  type: StatusEffectType;
  timer: number;
  tickTimer: number;
  sourceElement: Element;
  slowMultiplier: number;
  tickDamage: number;
}

export interface ElementalHitResult {
  element: Element;
  damage: number;
  impactBonus: number;
  knockbackMultiplier: number;
  hitstopBonus: number;
  reactionText: string | null;
  statusEffect: StatusEffect | null;
}

export interface HazardContactProfile {
  active: boolean;
  damage: number;
  knockbackMultiplier: number;
  message: string;
}

export interface ElementalInteractionResult {
  outcome: ElementalInteractionOutcome;
  changed: boolean;
  message: string | null;
  color: string | null;
}

// ─── Enemy ───────────────────────────────────────────────────────────────────

export interface Enemy {
  type: EnemyType;
  hp: number;
  maxHp: number;
  x?: number;
  y?: number;
  worldAffinity?: WorldAffinity;
  worldPhase?: WorldModifier;
  elementalState?: ElementalState;
}

// ─── Hazard ──────────────────────────────────────────────────────────────────

export interface Hazard {
  x: number;
  y: number;
  w: number;
  h: number;
  element?: Element;
  kind?: string;
  damage?: number;
  message?: string;
  dampenedTimer?: number;
  world?: WorldMode;
}

// ─── World-swap state ─────────────────────────────────────────────────────────

export interface WorldSwapState {
  world: World;
  enemies?: Enemy[];
  hazards?: Hazard[];
}

export interface WorldSwapSummary {
  exposedEnemies: number;
  empoweredEnemies: number;
  activeHazards: number;
}

// ─── Reactivity ──────────────────────────────────────────────────────────────

export interface ReactiveState {
  pulses: Record<string, number>;
  flags: Record<string, boolean>;
}

export interface ReactiveResponse {
  setFlag?: string;
  message?: string | null;
}

export interface ReactiveConfig {
  triggers: ReactiveTriggerType[];
  responses?: Partial<Record<ReactiveTriggerType, ReactiveResponse>>;
}

export interface ReactiveObject {
  reactiveState?: ReactiveState;
  reactivity?: ReactiveConfig;
}

export interface ReactiveTrigger {
  type: ReactiveTriggerType;
}

export interface ReactiveResult {
  accepted: boolean;
  message?: string | null;
}

// ─── Puzzles ─────────────────────────────────────────────────────────────────

export interface PuzzleNodeDef {
  id: string;
  triggerType: string;
  duration?: number;
  requiredWorld?: World;
  requiredElement?: Element;
}

export interface PuzzleNodeRuntime {
  active: boolean;
  timer: number;
}

export interface PuzzleRuntime {
  solved: boolean;
  activeWindowTimer: number;
  nodes: Record<string, PuzzleNodeRuntime>;
}

export interface Puzzle {
  nodes: PuzzleNodeDef[];
  nodeDuration?: number;
  windowDuration?: number;
  persistent?: boolean;
  runtime?: PuzzleRuntime;
}

export interface PuzzleTriggerOptions {
  world?: World;
  element?: Element;
}

export interface PuzzleTriggerResult {
  accepted: boolean;
  solved?: boolean;
}

// ─── Progression / world requirements ────────────────────────────────────────

export interface Requirements {
  abilities?: string[];
  element?: Element;
  world?: World;
  minWeaponStage?: number;
  keyItems?: string[];
  worldFlags?: string[];
  secrets?: string[];
  visitedRooms?: string[];
}

export interface ProgressionState {
  abilities: Record<string, boolean> | undefined;
  elements: Record<string, boolean>;
  keyItems: Record<string, boolean>;
  worldFlags: Record<string, boolean>;
  optionalSecrets: Record<string, boolean>;
  visitedRooms: Record<string, boolean>;
  element: Element;
  world: World;
  weaponStage: number;
}

// ─── Boss ────────────────────────────────────────────────────────────────────

export interface BossContext {
  enemy?: { hp: number; maxHp: number; x?: number; y?: number; [key: string]: unknown };
  player?: { x?: number; y?: number; [key: string]: unknown };
  [key: string]: unknown;
}

export interface BossAttack {
  id: string;
  phase?: string;
  weight?: number;
  score?: (context: BossContext) => number;
  canUse?: (context: BossContext) => boolean;
}

export interface BossPhaseThreshold {
  id: string;
  hpRatio: number;
}

export interface BossConfig {
  initialPhase?: string;
  attackCatalog?: BossAttack[];
  phaseThresholds?: BossPhaseThreshold[];
  introWakeX?: number;
}

export interface BossController {
  phase: string;
  lastAttackId: string | null;
  attackCatalog: BossAttack[];
  phaseThresholds: BossPhaseThreshold[];
  introWakeX: number;
}

// ─── Timing / runtime ────────────────────────────────────────────────────────

export interface TimingOptions {
  fixedStepSeconds?: number;
  maxFrameDeltaSeconds?: number;
  maxFixedSteps?: number;
}

export interface FrameFlags {
  paused?: boolean;
  freezeSimulation?: boolean;
  timeScale?: number;
}

export interface TimingSnapshot {
  frameIndex: number;
  now: number;
  rawDeltaSeconds: number;
  clampedDeltaSeconds: number;
  fixedStepSeconds: number;
  fixedSteps: number;
  alpha: number;
  paused: boolean;
  freezeSimulation: boolean;
  timeScale: number;
}

export interface RuntimeConfig {
  timing?: TimingOptions;
  getFrameFlags?: () => FrameFlags;
  onFrame: (snapshot: TimingSnapshot) => void;
}

// ─── Movement ────────────────────────────────────────────────────────────────

export interface PlayerTuningOverrides {
  moveSpeed?: number;
  jumpForce?: number;
  dashSpeed?: number;
  dashDuration?: number;
  dashCooldownDuration?: number;
  wallSlideSpeed?: number;
  jumpCutMultiplier?: number;
}

export interface PlayerVelocityState {
  vx: number;
  facing: number;
  onGround: boolean;
  wallJumpLock: number;
  attackRecover: number;
}
