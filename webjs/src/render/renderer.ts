import { clamp, hexToRgba, multiplyHex } from '../engine/utils';
import { COLORS } from '../engine/constants';
import { isWorldEntityActive } from '../engine/shadow';
import { getReactivePulse, getReactiveFlag } from '../engine/reactivity';
import { isPuzzleActive, getPuzzleNodeState } from '../engine/puzzles';
import { getSavePayload } from '../save/persist';
import { getProgressionState } from '../engine/world';
import { getEnemyState } from '../game/enemy-ai';

// ─── deps injected from main.ts ─────────────────────────────────────────────

export interface RendererDeps {
  /** Returns the active attack profile for the player. */
  getAttackProfileById: (player: any, profileId: string) => any;
  /** Returns the current normalized attack box (pre-flip). */
  getCurrentAttackBox: (player: any, profile: any) => any;
  /** Builds a world-space hitbox from player + profile + box. */
  createPlayerAttackHitbox: (player: any, profile: any, box: any) => { x: number; y: number; w: number; h: number };
  /** Returns the hurtbox rect for an enemy. */
  getEnemyHurtbox: (enemy: any) => { x: number; y: number; w: number; h: number };

  // Room / progression queries — only used by debug overlays
  getCurrentRoom: (state: any) => any;
  getRoomEntities: (state: any, roomId: string) => any;
  getCurrentProgressionRoute: (state: any) => any | null;
  getAvailableOptionalRoutes: (state: any) => any[];
}

// ─── public interface ───────────────────────────────────────────────────────

export interface Renderer {
  draw(state: any): void;
}

// ─── factory ────────────────────────────────────────────────────────────────

export function createRenderer(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  deps: RendererDeps
): Renderer {

  // Per-frame state reference — set once at the start of draw(), never stored
  // between frames. All private functions read from this.
  let _state: any;

  // ─── top-level draw ─────────────────────────────────────────────────────

  function draw(state: any): void {
    _state = state;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    ctx.save();
    const shakeX = _state.combat.screenShake > 0
      ? (Math.random() * 2 - 1) * _state.combat.screenShakeStrength : 0;
    const shakeY = _state.combat.screenShake > 0
      ? (Math.random() * 2 - 1) * _state.combat.screenShakeStrength * 0.45 : 0;
    ctx.translate(-_state.camera.x + shakeX, shakeY);
    drawRoomMarkers();
    drawFarStructures();
    drawPlatforms();
    drawPuzzlePlatforms();
    drawRoomDecor();
    drawCheckpoints();
    drawShadowPlatforms();
    drawBarrier();
    drawGate();
    drawHazards();
    drawPickups();
    drawSecretCaches();
    drawSlashEffects();
    drawEnemies();
    drawExit();
    drawPlayer();
    drawParticles();
    drawForegroundFrames();
    if (_state.debug.showCombatBoxes) drawCombatDebugBoxes();
    if (_state.debug.showRequirements) drawRequirementDebugOverlay();
    if (_state.debug.showSaveState) drawSaveDebugOverlay();
    if (_state.debug.showProceduralLayout) drawProceduralLayoutOverlay();
    if (_state.puzzleState.debugVisible) drawPuzzleOverlay();
    ctx.restore();
    drawDebugStateOverlay();
  }

  // ─── debug overlays ─────────────────────────────────────────────────────

  function drawCombatDebugBoxes(): void {
    ctx.save();
    const player = _state.player;
    ctx.strokeStyle = "rgba(92, 228, 255, 0.95)";
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.w, player.h);

    if (player.attackTimer > 0) {
      const profile = deps.getAttackProfileById(player, player.attackProfileId);
      const hitbox = deps.createPlayerAttackHitbox(player, profile, deps.getCurrentAttackBox(player, profile));
      ctx.strokeStyle = "rgba(255, 225, 125, 0.95)";
      ctx.strokeRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
    }

    ctx.strokeStyle = "rgba(255, 120, 165, 0.92)";
    for (const enemy of _state.enemies) {
      if (!enemy.alive) continue;
      const hurtbox = deps.getEnemyHurtbox(enemy);
      ctx.strokeRect(hurtbox.x, hurtbox.y, hurtbox.w, hurtbox.h);
    }
    ctx.restore();
  }

  function drawRequirementDebugOverlay(): void {
    const labels: { x: number; y: number; text: string }[] = [];
    const currentRoom = deps.getCurrentRoom(_state);
    const roomEntities = deps.getRoomEntities(_state, currentRoom.id);
    const activeRoute = deps.getCurrentProgressionRoute(_state);
    const optionalRoute = deps.getAvailableOptionalRoutes(_state)[0] ?? null;

    labels.push({
      x: _state.camera.x + 18,
      y: 20,
      text: `Room: ${currentRoom.label} | pickups ${roomEntities.pickups.length} | checkpoints ${roomEntities.checkpoints.length} | secrets ${roomEntities.secrets.length}`
    });

    if (activeRoute) {
      labels.push({ x: _state.camera.x + 18, y: 42, text: `Main route: ${activeRoute.objective}` });
    }
    if (optionalRoute) {
      labels.push({ x: _state.camera.x + 18, y: 64, text: `Optional: ${optionalRoute.objective}` });
    }
    if (_state.gate.active) {
      labels.push({ x: _state.gate.x, y: _state.gate.y - 14, text: `Gate: ${formatRequirements(_state.gate.requirements)}` });
    }
    if (_state.barrier.active) {
      labels.push({ x: _state.barrier.x - 10, y: _state.barrier.y - 14, text: `Barrier: ${formatRequirements(_state.barrier.requirements)}` });
    }
    for (const cache of _state.secretCaches ?? []) {
      if (!cache.active) continue;
      labels.push({ x: cache.x - 12, y: cache.y - 14, text: `${cache.label}: ${formatRequirements(cache.requirements)}` });
    }

    for (const label of labels) {
      ctx.save();
      ctx.fillStyle = "rgba(10, 14, 24, 0.82)";
      ctx.fillRect(label.x, label.y, Math.max(150, label.text.length * 7.2), 18);
      ctx.fillStyle = "#f4ebc9";
      ctx.font = "12px monospace";
      ctx.fillText(label.text, label.x + 6, label.y + 12);
      ctx.restore();
    }
  }

  function formatRequirements(requirements: any): string {
    if (!requirements) return "none";
    const parts: string[] = [];
    if (requirements.abilities?.length) parts.push(requirements.abilities.join(" + "));
    if (requirements.element) parts.push(requirements.element);
    if (requirements.world) parts.push(requirements.world);
    if (requirements.minWeaponStage != null) parts.push(`Weapon ${requirements.minWeaponStage}+`);
    if (requirements.keyItems?.length) parts.push(requirements.keyItems.join(" + "));
    if (requirements.worldFlags?.length) parts.push(requirements.worldFlags.join(" + "));
    if (requirements.secrets?.length) parts.push(requirements.secrets.join(" + "));
    if (requirements.visitedRooms?.length) parts.push(`Visited ${requirements.visitedRooms.join("/")}`);
    if (requirements.anyOf?.length) parts.push(requirements.anyOf.map(formatRequirements).join(" or "));
    return parts.join(" | ") || "custom";
  }

  function drawSaveDebugOverlay(): void {
    const payload = getSavePayload(_state);
    const progression = getProgressionState(_state);
    const lines = [
      `Save v${payload.version}`,
      `Checkpoint: ${payload.checkpoint.id} (${payload.checkpoint.roomId})`,
      `Dash: ${payload.progression.abilities.Dash ? "yes" : "no"}`,
      `Weapon: ${payload.upgrades.weaponStage}`,
      `Moon Seal: ${progression.keyItems.MoonSeal ? "owned" : "missing"}`,
      `Barrier: ${progression.worldFlags.barrierCleared ? "cleared" : "sealed"}`,
      `Dash pickup: ${payload.roomFlags.pickups.dashCollected ? "taken" : "up"}`,
      `Weapon pickup: ${payload.roomFlags.pickups.weaponCollected ? "taken" : "up"}`,
      `Reliquary: ${progression.optionalSecrets.rampartReliquary ? "opened" : "hidden"}`
    ];
    ctx.save();
    ctx.fillStyle = "rgba(10, 14, 24, 0.84)";
    ctx.fillRect(22, 112, 272, 18 + lines.length * 18);
    ctx.fillStyle = "#dfe7ff";
    ctx.font = "12px monospace";
    lines.forEach((line, index) => { ctx.fillText(line, 32, 130 + index * 18); });
    ctx.restore();
  }

  function drawProceduralLayoutOverlay(): void {
    const generated = _state.proceduralLayout;
    const lines: string[] = [
      `Challenge route seed: ${generated.seed}`,
      `Valid: ${generated.validation.valid ? "yes" : "no"}`
    ];
    generated.route.forEach((entry: any, index: number) => {
      lines.push(`${index + 1}. ${entry.label} [${entry.role}]`);
    });
    if (generated.validation.errors.length) {
      lines.push(`Issue: ${generated.validation.errors[0]}`);
    } else {
      lines.push("Press L again to reroll this route.");
    }
    const width = 340;
    const lineHeight = 18;
    const x = _state.camera.x + canvas.width - width - 22;
    const y = 22;
    ctx.save();
    ctx.fillStyle = "rgba(9, 13, 22, 0.86)";
    ctx.fillRect(x, y, width, 18 + lines.length * lineHeight);
    ctx.fillStyle = "#d7e5ff";
    ctx.font = "12px monospace";
    lines.forEach((line, index) => {
      ctx.fillStyle = index < 2 ? "#f2ebd0" : "#d7e5ff";
      ctx.fillText(line, x + 10, y + 18 + index * lineHeight);
    });
    ctx.restore();
  }

  function drawPuzzleOverlay(): void {
    const lines: string[] = [];
    for (const puzzle of _state.puzzles ?? []) {
      lines.push(`${puzzle.label}: ${isPuzzleActive(puzzle) ? "active" : "idle"} ${puzzle.runtime?.activeWindowTimer ? `(${puzzle.runtime.activeWindowTimer.toFixed(1)}s)` : ""}`.trim());
      for (const node of puzzle.nodes ?? []) {
        const nodeState = getPuzzleNodeState(puzzle, node.id);
        lines.push(`- ${node.label}: ${nodeState.active ? nodeState.timer.toFixed(1) : "off"}`);
      }
    }
    for (const puzzle of _state.puzzles ?? []) {
      for (const node of puzzle.nodes ?? []) {
        const nodeState = getPuzzleNodeState(puzzle, node.id);
        ctx.save();
        ctx.strokeStyle = nodeState.active ? "#fff0b8" : "rgba(191, 206, 255, 0.45)";
        ctx.lineWidth = nodeState.active ? 3 : 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(10, 14, 24, 0.84)";
        ctx.fillRect(node.x - 40, node.y - node.radius - 18, 92, 16);
        ctx.fillStyle = "#f4ebc9";
        ctx.font = "11px monospace";
        ctx.fillText(node.label, node.x - 34, node.y - node.radius - 6);
        ctx.restore();
      }
    }
    ctx.save();
    ctx.fillStyle = "rgba(10, 14, 24, 0.84)";
    ctx.fillRect(22, 286, 280, 18 + lines.length * 18);
    ctx.fillStyle = "#dfe7ff";
    ctx.font = "12px monospace";
    lines.forEach((line, index) => { ctx.fillText(line, 32, 304 + index * 18); });
    ctx.restore();
  }

  function drawDebugStateOverlay(): void {
    if (!_state.debug.showStateLabels) return;
    const debugLines: string[] = [
      `Player: ${_state.player.actionState} (${_state.player.actionStateTimer.toFixed(2)}s)`
    ];
    for (const enemy of _state.enemies) {
      if (!enemy.alive) continue;
      const elementState = enemy.elementalState?.type && enemy.elementalState.type !== "none"
        ? ` | ${enemy.elementalState.type} ${Math.max(0, enemy.elementalState.timer).toFixed(1)}s` : "";
      const worldPhase = enemy.worldPhase?.phase && enemy.worldPhase.phase !== "neutral"
        ? ` | ${enemy.worldPhase.phase}` : "";
      debugLines.push(`${enemy.name}: ${getEnemyState(enemy)} (${Math.max(0, enemy.stateTimer).toFixed(2)}s)${worldPhase}${elementState}`);
    }
    ctx.save();
    ctx.fillStyle = "rgba(8, 10, 18, 0.76)";
    ctx.fillRect(18, 18, 320, 24 + debugLines.length * 18);
    ctx.font = "13px monospace";
    ctx.textBaseline = "top";
    debugLines.forEach((line, index) => {
      ctx.fillStyle = index === 0 ? "#f0ebd4" : "#bcd1ff";
      ctx.fillText(line, 28, 28 + index * 18);
    });
    ctx.restore();
  }

  // ─── background ─────────────────────────────────────────────────────────

  function drawBackground(): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (_state.world === "Light") {
      gradient.addColorStop(0, "#6a5a88");
      gradient.addColorStop(0.32, "#1a223d");
      gradient.addColorStop(1, "#02040a");
    } else {
      gradient.addColorStop(0, "#2f376d");
      gradient.addColorStop(0.32, "#0b1025");
      gradient.addColorStop(1, "#020208");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawMoonAndMist();
    drawParallaxRuins();
    drawUpperCanopy();
    drawForegroundFog();
  }

  function drawMoonAndMist(): void {
    ctx.save();
    const moonX = 1010 - _state.camera.x * 0.08;
    const moonY = 118;
    ctx.fillStyle = _state.world === "Light" ? "rgba(235, 205, 152, 0.8)" : "rgba(160, 150, 255, 0.54)";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = _state.world === "Light" ? "rgba(8, 9, 16, 0.98)" : "rgba(4, 5, 12, 0.96)";
    ctx.beginPath();
    ctx.arc(moonX + 22, moonY - 6, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = _state.world === "Light" ? "rgba(239, 209, 160, 0.18)" : "rgba(166, 160, 255, 0.16)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 74, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const y = 360 + i * 38;
      const x = ((i * 190) - _state.camera.x * (0.11 + i * 0.015)) % (canvas.width + 260) - 120;
      ctx.fillStyle = _state.world === "Light" ? "rgba(214, 222, 255, 0.035)" : "rgba(148, 158, 255, 0.045)";
      ctx.beginPath();
      ctx.ellipse(x, y, 240, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawParallaxRuins(): void {
    const layers = [
      { speed: 0.1, color: "rgba(8, 10, 16, 0.34)", height: 0.58 },
      { speed: 0.18, color: "rgba(10, 13, 21, 0.48)", height: 0.67 },
      { speed: 0.28, color: "rgba(14, 17, 28, 0.72)", height: 0.76 }
    ];
    for (const layer of layers) {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      for (let i = 0; i <= 9; i++) {
        const x = i * 170 - (_state.camera.x * layer.speed % 170);
        const top = canvas.height * layer.height - (i % 3) * 40;
        ctx.lineTo(x, top + 60);
        ctx.lineTo(x + 45, top - 46);
        ctx.lineTo(x + 92, top + 70);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawUpperCanopy(): void {
    ctx.save();
    const color = _state.world === "Light" ? "rgba(32, 37, 49, 0.18)" : "rgba(21, 19, 38, 0.24)";
    ctx.fillStyle = color;
    for (let i = 0; i < 8; i++) {
      const x = ((i * 170) - _state.camera.x * 0.33) % (canvas.width + 220) - 80;
      ctx.beginPath();
      ctx.moveTo(x, -20);
      ctx.quadraticCurveTo(x + 40, 46 + (i % 3) * 10, x + 16, 120);
      ctx.quadraticCurveTo(x + 86, 70, x + 104, -20);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawForegroundFog(): void {
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const x = ((i * 220) - _state.camera.x * 0.45) % (canvas.width + 300) - 120;
      const y = 602 + (i % 2) * 20;
      ctx.fillStyle = "rgba(241, 244, 255, 0.028)";
      ctx.beginPath();
      ctx.ellipse(x, y, 220, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ─── room label markers ─────────────────────────────────────────────────

  function drawRoomMarkers(): void {
    const labels = [
      { x: 120, title: "Eclipse Keep", subtitle: "Outer rampart" },
      { x: 860, title: "Ash Gate", subtitle: "Break the sealed approach" },
      { x: 1960, title: "Umbral Galleries", subtitle: "Layered climb through the keep" },
      { x: 3460, title: "Eclipse Throne", subtitle: "Final ascent into darkness" }
    ];
    ctx.font = "700 22px Segoe UI";
    ctx.textAlign = "left";
    for (const label of labels) {
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.fillText(label.title, label.x, 70);
      ctx.fillStyle = "rgba(180,195,228,0.8)";
      ctx.font = "500 14px Segoe UI";
      ctx.fillText(label.subtitle, label.x, 92);
      ctx.font = "700 22px Segoe UI";
    }
  }

  // ─── platforms & walls ──────────────────────────────────────────────────

  function drawPlatforms(): void {
    for (const platform of _state.platforms) drawStonePlatform(platform);
    for (const wall of _state.walls) drawWallPillar(wall);
  }

  function drawPuzzlePlatforms(): void {
    for (const platform of _state.puzzlePlatforms ?? []) {
      const skin = getRoomVisualTheme(platform.x + platform.w * 0.5);
      drawSpectralPlatform(platform, skin, platform.active && isWorldEntityActive(platform, _state.world));
    }
  }

  function drawShadowPlatforms(): void {
    for (const platform of _state.shadowPlatforms) {
      const skin = getRoomVisualTheme(platform.x + platform.w * 0.5);
      drawSpectralPlatform(platform, skin, isWorldEntityActive(platform, _state.world));
    }
  }

  function drawHazards(): void {
    for (const hazard of _state.hazards ?? []) {
      if (hazard.kind !== "spikes") continue;
      drawHazardBed(hazard);
    }
  }

  function drawStonePlatform(platform: any): void {
    const x = platform.x;
    const y = platform.y;
    const w = platform.w;
    const h = platform.h;
    const theme = getRoomVisualTheme(x + w * 0.5);
    const topDepth = Math.min(16, h);
    ctx.save();
    const faceGradient = ctx.createLinearGradient(x, y, x, y + h);
    faceGradient.addColorStop(0, theme.face);
    faceGradient.addColorStop(1, theme.depth);
    ctx.fillStyle = faceGradient;
    drawIrregularPlatformShape(x, y, w, h, platform.type === "ground" ? 7 : 5, platform.type === "ground" ? 6 : 4);
    ctx.fill();
    ctx.fillStyle = theme.top;
    drawIrregularPlatformTop(x, y, w, topDepth, platform.type === "ground" ? 7 : 5);
    ctx.fill();
    ctx.fillStyle = hexToRgba(theme.depth, 0.36);
    drawUndersideShadow(x, y, w, h);
    ctx.fill();
    drawPlatformTrim(x, y, w, topDepth, theme);
    drawPlatformCracks(x, y, w, h, theme);
    drawPlatformHangers(x, y, w, h, theme);
    ctx.restore();
  }

  function drawWallPillar(wall: any): void {
    const theme = getRoomVisualTheme(wall.x + wall.w * 0.5);
    const capitalHeight = Math.min(20, wall.h * 0.12);
    ctx.save();
    const bodyGradient = ctx.createLinearGradient(wall.x, wall.y, wall.x + wall.w, wall.y + wall.h);
    bodyGradient.addColorStop(0, theme.face);
    bodyGradient.addColorStop(1, theme.depth);
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = theme.top;
    ctx.fillRect(wall.x - 2, wall.y, wall.w + 4, capitalHeight);
    ctx.fillStyle = hexToRgba(theme.trim, 0.16);
    ctx.fillRect(wall.x + 4, wall.y + capitalHeight + 6, 4, wall.h - capitalHeight - 18);
    ctx.fillRect(wall.x + wall.w - 8, wall.y + capitalHeight + 12, 3, wall.h - capitalHeight - 24);
    drawWallSeams(wall, theme, capitalHeight);
    ctx.restore();
  }

  function drawSpectralPlatform(platform: any, skin: any, active: boolean): void {
    const x = platform.x;
    const y = platform.y;
    const w = platform.w;
    const h = platform.h;
    ctx.save();
    const glow = ctx.createLinearGradient(x, y, x, y + h + 8);
    glow.addColorStop(0, active ? "#a8b5ff" : hexToRgba("#8a96d9", 0.32));
    glow.addColorStop(1, active ? "#4f5ab5" : hexToRgba("#4f5ab5", 0.1));
    ctx.fillStyle = glow;
    drawIrregularPlatformShape(x, y, w, h, 4, 5);
    ctx.fill();
    ctx.globalAlpha = active ? 0.7 : 0.28;
    ctx.strokeStyle = hexToRgba(skin.trim, 0.44);
    ctx.lineWidth = 2;
    drawIrregularPlatformShape(x + 2, y + 1, w - 4, Math.max(6, h - 2), 3, 4);
    ctx.stroke();
    ctx.fillStyle = hexToRgba("#dfe7ff", active ? 0.22 : 0.1);
    for (let i = 0; i < w; i += 22) {
      ctx.beginPath();
      ctx.arc(x + 8 + i, y + 4 + (i % 3), 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHazardBed(hazard: any): void {
    const theme = getRoomVisualTheme(hazard.x + hazard.w * 0.5);
    const count = Math.max(2, Math.floor(hazard.w / 12));
    const dampened = (hazard.dampenedTimer ?? 0) > 0;
    const activeInWorld = isWorldEntityActive(hazard, _state.world);
    ctx.save();
    ctx.globalAlpha = activeInWorld ? 1 : 0.22;
    ctx.fillStyle = hexToRgba(theme.depth, 0.92);
    ctx.fillRect(hazard.x - 4, hazard.y + hazard.h - 4, hazard.w + 8, 8);
    for (let i = 0; i < count; i++) {
      const px = hazard.x + i * (hazard.w / count);
      const spikeWidth = hazard.w / count;
      ctx.fillStyle = dampened
        ? (_state.world === "Light" ? "rgba(255, 220, 178, 0.8)" : "rgba(255, 191, 144, 0.72)")
        : (_state.world === "Light" ? "rgba(224, 242, 255, 0.9)" : "rgba(161, 180, 255, 0.82)");
      ctx.beginPath();
      ctx.moveTo(px, hazard.y + hazard.h);
      ctx.lineTo(px + spikeWidth * 0.18, hazard.y + hazard.h * 0.68);
      ctx.lineTo(px + spikeWidth * 0.5, hazard.y);
      ctx.lineTo(px + spikeWidth * 0.82, hazard.y + hazard.h * 0.68);
      ctx.lineTo(px + spikeWidth, hazard.y + hazard.h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(35, 52, 69, 0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (dampened) {
      ctx.fillStyle = "rgba(255, 205, 148, 0.2)";
      ctx.fillRect(hazard.x - 2, hazard.y - 8, hazard.w + 4, 8);
    }
    ctx.restore();
  }

  // Platform shape helpers — pure path builders (no ctx.fill/stroke)

  function drawIrregularPlatformShape(x: number, y: number, w: number, h: number, notchDepth: number, wobble: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y + notchDepth);
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const px = x + w * t;
      const py = y + ((i % 2 === 0 ? 1 : -1) * wobble + notchDepth);
      ctx.lineTo(px, py);
    }
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  }

  function drawIrregularPlatformTop(x: number, y: number, w: number, h: number, wobble: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.8);
    for (let i = 0; i <= 7; i++) {
      const t = i / 7;
      const px = x + w * t;
      const py = y + (i % 2 === 0 ? 2 : wobble);
      ctx.lineTo(px, py);
    }
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  }

  function drawUndersideShadow(x: number, y: number, w: number, h: number): void {
    ctx.beginPath();
    ctx.moveTo(x + 4, y + h * 0.62);
    ctx.lineTo(x + w - 6, y + h * 0.56);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  }

  function drawPlatformTrim(x: number, y: number, w: number, topDepth: number, theme: any): void {
    ctx.fillStyle = hexToRgba(theme.trim, 0.22);
    for (let i = 0; i < w; i += 28) {
      ctx.fillRect(x + i + 4, y + 3 + (i % 3), 14, Math.max(2, topDepth - 10));
    }
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + topDepth - 1);
    ctx.lineTo(x + w - 4, y + topDepth - 1);
    ctx.stroke();
  }

  function drawPlatformCracks(x: number, y: number, w: number, h: number, theme: any): void {
    ctx.strokeStyle = hexToRgba(theme.depth, 0.42);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < w; i += 46) {
      const px = x + 12 + i;
      ctx.beginPath();
      ctx.moveTo(px, y + 7);
      ctx.lineTo(px + 4, y + 18);
      ctx.lineTo(px - 2, y + 24);
      ctx.lineTo(px + 5, y + Math.min(h - 8, 34));
      ctx.stroke();
    }
  }

  function drawPlatformHangers(x: number, y: number, w: number, h: number, theme: any): void {
    ctx.strokeStyle = hexToRgba(theme.growth, 0.9);
    ctx.lineWidth = 2;
    const maxHangers = Math.min(4, Math.floor(w / 64));
    for (let i = 0; i < maxHangers; i++) {
      const px = x + 18 + i * (w / Math.max(1, maxHangers));
      const length = Math.min(26, h * 0.35) + (i % 2) * 10;
      ctx.beginPath();
      ctx.moveTo(px, y + h - 2);
      ctx.quadraticCurveTo(px - 6 + i * 2, y + h + length * 0.35, px + 2, y + h + length);
      ctx.stroke();
    }
  }

  function drawWallSeams(wall: any, theme: any, capitalHeight: number): void {
    ctx.strokeStyle = hexToRgba(theme.trim, 0.18);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wall.x + 4, wall.y + capitalHeight + 10);
    ctx.lineTo(wall.x + wall.w - 5, wall.y + capitalHeight + 6);
    ctx.moveTo(wall.x + 5, wall.y + wall.h * 0.48);
    ctx.lineTo(wall.x + wall.w - 6, wall.y + wall.h * 0.46);
    ctx.stroke();
  }

  // ─── room visual theme ──────────────────────────────────────────────────

  function getRoomVisualTheme(x: number): any {
    if (x < 960) return {
      id: "outerRampart", top: "#7a7f8a", face: "#4e5561", depth: "#272c33",
      trim: "#9da5b1", accent: "rgba(206, 214, 228, 0.18)", growth: "rgba(173, 188, 142, 0.18)"
    };
    if (x < 1900) return {
      id: "ashGate", top: "#8c786a", face: "#5b473f", depth: "#2b2220",
      trim: "#b79d86", accent: "rgba(255, 206, 160, 0.14)", growth: "rgba(172, 101, 72, 0.16)"
    };
    if (x < 3300) return {
      id: "umbralGalleries", top: "#707493", face: "#42465e", depth: "#1e2233",
      trim: "#98a0d4", accent: "rgba(188, 197, 255, 0.16)", growth: "rgba(94, 106, 162, 0.18)"
    };
    return {
      id: "eclipseThrone", top: "#8e829d", face: "#4b4458", depth: "#1c1924",
      trim: "#d2c1dc", accent: "rgba(236, 221, 255, 0.14)", growth: "rgba(161, 145, 184, 0.16)"
    };
  }

  // ─── barrier & gate ─────────────────────────────────────────────────────

  function drawBarrier(): void {
    if (!_state.barrier.active) return;
    const x = _state.barrier.x;
    const y = _state.barrier.y;
    const w = _state.barrier.w;
    const h = _state.barrier.h;
    const heat = _state.element === "Fire";
    const swapPulse = getReactivePulse(_state.barrier, "swap");
    const attackPulse = getReactivePulse(_state.barrier, "attack");
    const base = heat ? COLORS.burnableHot : COLORS.burnable;

    ctx.save();
    const glow = ctx.createRadialGradient(x + w * 0.5, y + h * 0.35, 6, x + w * 0.5, y + h * 0.45, 54);
    glow.addColorStop(0, hexToRgba(heat ? "#ffb47d" : swapPulse > 0 ? "#b0bcff" : "#8c5a3b", heat ? 0.32 : swapPulse > 0 ? 0.26 : 0.18));
    glow.addColorStop(1, hexToRgba(heat ? "#ff9a63" : "#5f3722", 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x - 28, y - 18, w + 56, h + 42);

    ctx.fillStyle = "rgba(17, 10, 9, 0.92)";
    ctx.beginPath();
    ctx.moveTo(x + 3, y + h);
    ctx.lineTo(x + 8, y + 22);
    ctx.lineTo(x + 16, y + 3);
    ctx.lineTo(x + 23, y + 18);
    ctx.lineTo(x + 31, y + 2);
    ctx.lineTo(x + w - 4, y + h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + h);
    ctx.lineTo(x + 10, y + 26);
    ctx.lineTo(x + 17, y + 9);
    ctx.lineTo(x + 23, y + 20);
    ctx.lineTo(x + 30, y + 6);
    ctx.lineTo(x + w - 8, y + h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = attackPulse > 0 ? "rgba(255, 240, 210, 0.92)" : "rgba(34, 14, 8, 0.82)";
    ctx.lineWidth = attackPulse > 0 ? 2.8 : 2;
    ctx.stroke();

    ctx.strokeStyle = hexToRgba(heat ? "#ffd3a4" : "#d4976c", 0.34);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const px = x + 10 + i * 9;
      ctx.beginPath();
      ctx.moveTo(px, y + 16 + i * 3);
      ctx.lineTo(px + 3, y + h - 16 - i * 5);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const emberX = x + 8 + i * 7;
      const emberY = y + 14 + (i % 2) * 8;
      ctx.fillStyle = hexToRgba(heat ? "#ffd38f" : "#9f6844", heat ? 0.85 : 0.35);
      ctx.beginPath();
      ctx.arc(emberX, emberY, 1.8 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGate(): void {
    drawDiegeticGate(_state.gate, _state.gate.active);
  }

  function drawDiegeticGate(gate: any, active: boolean): void {
    const theme = getRoomVisualTheme(gate.x + gate.w * 0.5);
    const x = gate.x;
    const y = gate.y;
    const w = gate.w;
    const h = gate.h;
    const approachPulse = getReactivePulse(gate, "approach");
    const swapPulse = getReactivePulse(gate, "swap");
    const attackPulse = getReactivePulse(gate, "attack");

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(x - 18, y - 18, w + 36, h + 24);
    ctx.fillStyle = theme.depth;
    ctx.fillRect(x - 10, y - 10, w + 20, h + 12);

    const frameGradient = ctx.createLinearGradient(x, y, x + w, y + h);
    frameGradient.addColorStop(0, active ? (swapPulse > 0 ? "#9aa9f7" : COLORS.gate) : hexToRgba(COLORS.gateOpen, 0.4));
    frameGradient.addColorStop(1, active ? (approachPulse > 0 ? "#d9c28e" : theme.face) : hexToRgba(COLORS.gateOpen, 0.18));
    ctx.fillStyle = frameGradient;
    roundRectPath(x, y, w, h, 8);
    ctx.fill();

    if (active) {
      ctx.fillStyle = hexToRgba(theme.trim, 0.15);
      ctx.fillRect(x + 5, y + 10, w - 10, h - 20);
      ctx.strokeStyle = attackPulse > 0 ? "rgba(255, 244, 214, 0.82)" : "rgba(235, 222, 184, 0.22)";
      ctx.lineWidth = attackPulse > 0 ? 2.8 : 2;
      ctx.strokeRect(x + 4, y + 6, w - 8, h - 12);
      ctx.fillStyle = COLORS.pickupDash;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, y + 12);
      ctx.lineTo(x + w * 0.75, y + 30);
      ctx.lineTo(x + w * 0.52, y + 30);
      ctx.lineTo(x + w * 0.62, y + 52);
      ctx.strokeStyle = hexToRgba("#fff8dc", 0.66);
      ctx.lineWidth = 2.4;
      ctx.stroke();
    } else {
      ctx.strokeStyle = COLORS.gateOpen;
      ctx.lineWidth = 3;
      roundRectPath(x, y, w, h, 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ─── pickups, secrets, checkpoints ─────────────────────────────────────

  function drawPickups(): void {
    if (_state.pickups.dash.active) drawPickupRelic(_state.pickups.dash, "dash");
    if (_state.pickups.weapon.active) drawPickupRelic(_state.pickups.weapon, "weapon");
  }

  function drawSecretCaches(): void {
    for (const cache of _state.secretCaches ?? []) {
      if (!cache.active) continue;
      drawPickupRelic(cache, "secret");
    }
  }

  function drawCheckpoints(): void {
    for (const checkpoint of _state.checkpoints) {
      drawCheckpointShrine(
        checkpoint,
        checkpoint.id === _state.savedCheckpointId,
        checkpoint.id === _state.nearbyCheckpointId
      );
    }
  }

  function drawPickupRelic(pickup: any, kind: string): void {
    const centerX = pickup.x + pickup.w * 0.5;
    const centerY = pickup.y + pickup.h * 0.5 + Math.sin(performance.now() * 0.004 + pickup.x * 0.03) * 3;
    const color = kind === "dash" ? COLORS.pickupDash : kind === "secret" ? "#f6efbe" : COLORS.pickupWeapon;
    const halo = ctx.createRadialGradient(centerX, centerY, 3, centerX, centerY, 36);
    halo.addColorStop(0, hexToRgba(color, kind === "secret" ? (pickup.revealAlpha ?? 0.42) : 0.42));
    halo.addColorStop(1, hexToRgba(color, 0));

    ctx.save();
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(22, 24, 34, 0.82)";
    ctx.lineWidth = 2;

    if (kind === "dash") {
      ctx.fillStyle = hexToRgba(color, 0.95);
      ctx.beginPath();
      ctx.moveTo(centerX - 10, centerY - 8);
      ctx.lineTo(centerX + 1, centerY - 11);
      ctx.lineTo(centerX - 1, centerY - 1);
      ctx.lineTo(centerX + 8, centerY - 1);
      ctx.lineTo(centerX - 4, centerY + 12);
      ctx.lineTo(centerX - 2, centerY + 3);
      ctx.lineTo(centerX - 11, centerY + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (kind === "weapon") {
      ctx.fillStyle = hexToRgba(color, 0.95);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 14);
      ctx.lineTo(centerX + 10, centerY - 2);
      ctx.lineTo(centerX, centerY + 16);
      ctx.lineTo(centerX - 10, centerY - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f4fbff";
      ctx.fillRect(centerX - 1.5, centerY - 18, 3, 34);
    } else {
      ctx.fillStyle = hexToRgba(color, 0.95);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 14);
      ctx.lineTo(centerX + 12, centerY - 2);
      ctx.lineTo(centerX, centerY + 14);
      ctx.lineTo(centerX - 12, centerY - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#fff8dc";
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 10);
      ctx.lineTo(centerX, centerY + 10);
      ctx.moveTo(centerX - 10, centerY);
      ctx.lineTo(centerX + 10, centerY);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCheckpointShrine(checkpoint: any, active: boolean, nearby: boolean): void {
    const swapPulse = getReactivePulse(checkpoint, "swap");
    const restPulse = getReactivePulse(checkpoint, "rest");
    const shadowBlessing = getReactiveFlag(checkpoint, "shadowBlessing");
    const glowColor = active
      ? (_state.world === "Light" ? "#f3dca3" : "#9ca8ff")
      : nearby ? "#e9d6aa" : "#c6d0e4";

    ctx.save();
    const glow = ctx.createRadialGradient(checkpoint.x + 14, checkpoint.y + 18, 2, checkpoint.x + 14, checkpoint.y + 18, active ? 46 : nearby ? 38 : 28);
    glow.addColorStop(0, active ? hexToRgba(glowColor, 0.35) : nearby ? "rgba(255,232,190,0.18)" : "rgba(220,230,255,0.1)");
    glow.addColorStop(1, hexToRgba(glowColor, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(checkpoint.x + 14, checkpoint.y + 18, active ? 46 : nearby ? 38 : 28, 0, Math.PI * 2);
    ctx.fill();

    if (swapPulse > 0 || restPulse > 0 || shadowBlessing) {
      ctx.fillStyle = shadowBlessing
        ? "rgba(146, 166, 255, 0.22)"
        : swapPulse > 0 ? "rgba(168, 188, 255, 0.18)" : "rgba(255, 232, 190, 0.18)";
      ctx.beginPath();
      ctx.arc(checkpoint.x + 14, checkpoint.y + 18, 52, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(18, 20, 30, 0.82)";
    ctx.beginPath();
    ctx.moveTo(checkpoint.x - 6, checkpoint.y + checkpoint.h);
    ctx.lineTo(checkpoint.x + 2, checkpoint.y + 14);
    ctx.lineTo(checkpoint.x + 14, checkpoint.y - 6);
    ctx.lineTo(checkpoint.x + 26, checkpoint.y + 14);
    ctx.lineTo(checkpoint.x + 34, checkpoint.y + checkpoint.h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = shadowBlessing ? "#b8c7ff" : active ? glowColor : nearby ? "#e9d6aa" : "rgba(180, 190, 215, 0.5)";
    ctx.lineWidth = shadowBlessing ? 3.2 : active ? 3 : nearby ? 2.5 : 2;
    ctx.beginPath();
    ctx.moveTo(checkpoint.x + 14, checkpoint.y - 4);
    ctx.lineTo(checkpoint.x + 14, checkpoint.y + checkpoint.h - 8);
    ctx.stroke();

    ctx.fillStyle = active ? glowColor : nearby ? "#f1dfb8" : "rgba(165, 176, 204, 0.54)";
    ctx.beginPath();
    ctx.moveTo(checkpoint.x + 14, checkpoint.y - 2);
    ctx.lineTo(checkpoint.x + 26, checkpoint.y + 12);
    ctx.lineTo(checkpoint.x + 14, checkpoint.y + 22);
    ctx.lineTo(checkpoint.x + 2, checkpoint.y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ─── enemies ────────────────────────────────────────────────────────────

  function drawEnemies(): void {
    for (const enemy of _state.enemies) {
      if (!enemy.alive) continue;
      const enemyState = getEnemyState(enemy);
      const hurtStrength = clamp(enemy.hurtTimer / 0.22, 0, 1);
      const reactionStrength = clamp(enemy.reactionTimer / 0.24, 0, 1);
      const baseColor = enemy.invuln > 0 || hurtStrength > 0.2 ? COLORS.enemyHit : getEnemyColor(enemy.type);
      const facing = enemy.vx >= 0 ? 1 : -1;
      const anticipationStrength = enemyState === "windup"
        ? 1 - clamp(enemy.stateTimer / getEnemyStateDurationGuess(enemy), 0, 1) : 0;
      const actionStrength = enemyState === "burst" ? 1
        : enemyState === "recover" || enemyState === "stagger"
          ? clamp(enemy.stateTimer / 0.24, 0, 1) : 0;

      const renderEnemy = {
        ...enemy,
        x: enemy.x + Math.sin(performance.now() * 0.09 + enemy.x * 0.08) * hurtStrength * 3.5
          - facing * anticipationStrength * getEnemyAnticipationLean(enemy),
        y: enemy.y - hurtStrength * 2
          + anticipationStrength * getEnemyAnticipationLift(enemy)
          + getEnemyReactionOffset(enemy, reactionStrength),
        telegraphAlpha: anticipationStrength,
        actionAlpha: actionStrength,
        reactionAlpha: reactionStrength,
        worldPhaseAlpha: enemy.worldPhase?.phase === "empowered" ? 0.26
          : enemy.worldPhase?.phase === "exposed" ? 0.3 : 0,
        renderState: enemyState
      };

      if (hurtStrength > 0) {
        ctx.save();
        ctx.globalAlpha = hurtStrength * 0.35;
        ctx.fillStyle = "#fff3d6";
        ctx.beginPath();
        ctx.ellipse(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, enemy.w * 0.65, enemy.h * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      if (enemy.type === "shadowWalker") {
        const fade = enemyState === "windup" ? 0.48
          : 0.72 + Math.sin(performance.now() * 0.01 + enemy.x * 0.02) * 0.12;
        ctx.globalAlpha = clamp(fade, 0.35, 0.9);
      } else if (enemy.type === "watcher") {
        ctx.globalAlpha = 0.88;
        ctx.strokeStyle = "rgba(167, 231, 255, 0.18)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, enemy.w * 0.72, enemy.h * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawEnemyTelegraph(renderEnemy);
      drawEnemySilhouette(renderEnemy, baseColor, facing);
      ctx.restore();

      const barWidth = enemy.boss ? 96 : 36;
      const barHeight = enemy.boss ? 6 : 4;
      const barX = enemy.x + enemy.w / 2 - barWidth / 2;
      const barY = enemy.boss ? enemy.y - 22 : enemy.y - 14;
      drawHealthBar(barX, barY, barWidth, barHeight, enemy.hp, enemy.displayHp, getMaxEnemyHp(enemy));
      if (enemy.boss) {
        ctx.save();
        ctx.fillStyle = "rgba(255, 241, 220, 0.9)";
        ctx.font = "600 13px Segoe UI";
        ctx.textAlign = "center";
        ctx.fillText(enemy.name, enemy.x + enemy.w / 2, enemy.y - 30);
        ctx.restore();
      }
    }
  }

  function getEnemyStateDurationGuess(enemy: any): number {
    switch (enemy.type) {
      case "demon": return 0.42;
      case "bulwark": return 0.32;
      case "hound": return 0.14;
      case "shadowWalker": return 0.28;
      case "watcher": return 0.22;
      case "oracle": return 0.28;
      case "revenant": return 0.24;
      default: return 0.16;
    }
  }

  function getEnemyAnticipationLean(enemy: any): number {
    switch (enemy.type) {
      case "demon": return 10;
      case "bulwark": return 12;
      case "hound": return 7;
      case "shadowWalker": return 8;
      case "oracle": case "revenant": return 7;
      case "watcher": return 5;
      default: return 6;
    }
  }

  function getEnemyAnticipationLift(enemy: any): number {
    return (enemy.type === "watcher" || enemy.type === "oracle") ? -2 : 0;
  }

  function getEnemyReactionOffset(enemy: any, strength: number): number {
    if (enemy.reactionType === "pogo") return 4 - strength * 10;
    if (enemy.reactionType === "finisher") return -strength * 8;
    if (enemy.reactionType === "heavy" || enemy.reactionType === "elemental") {
      return -strength * (enemy.staggeredByLastHit ? 6 : 4);
    }
    return -strength * 3;
  }

  function drawEnemyTelegraph(enemy: any): void {
    if (enemy.worldPhaseAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = enemy.worldPhaseAlpha;
      ctx.strokeStyle = enemy.worldPhase?.phase === "empowered"
        ? (enemy.worldPhase.affinity === "Shadow" ? "rgba(155, 168, 255, 0.92)" : "rgba(252, 239, 190, 0.9)")
        : "rgba(255, 231, 193, 0.92)";
      ctx.lineWidth = enemy.boss ? 4 : 3;
      ctx.beginPath();
      ctx.ellipse(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.48, enemy.w * 0.86, enemy.h * 0.8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (enemy.elementalState?.type && enemy.elementalState.type !== "none") {
      ctx.save();
      ctx.globalAlpha = 0.2 + Math.sin(performance.now() * 0.01 + enemy.x * 0.02) * 0.06;
      ctx.fillStyle = enemy.elementalState.type === "scorch" ? "rgba(255, 165, 112, 0.85)"
        : enemy.elementalState.type === "chill" ? "rgba(187, 235, 255, 0.82)"
        : "rgba(214, 255, 239, 0.78)";
      ctx.beginPath();
      ctx.ellipse(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.48, enemy.w * 0.82, enemy.h * 0.76, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (enemy.telegraphAlpha > 0) {
      const pulse = 0.35 + Math.sin(performance.now() * 0.02 + enemy.x * 0.02) * 0.18;
      const telegraphColor = getEnemyTelegraphColor(enemy.type);
      ctx.save();
      ctx.globalAlpha = clamp(enemy.telegraphAlpha * 0.65 + pulse, 0.15, 0.78);
      ctx.strokeStyle = telegraphColor;
      ctx.lineWidth = enemy.boss ? 4 : 3;
      ctx.beginPath();
      ctx.ellipse(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.48, enemy.w * 0.72, enemy.h * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (enemy.renderState === "burst") {
      const streakColor = getEnemyTelegraphColor(enemy.type);
      ctx.save();
      ctx.globalAlpha = 0.22 + enemy.actionAlpha * 0.2;
      ctx.strokeStyle = streakColor;
      ctx.lineWidth = enemy.boss ? 5 : 3;
      ctx.beginPath();
      ctx.moveTo(enemy.x + enemy.w * 0.2, enemy.y + enemy.h * 0.5);
      ctx.lineTo(enemy.x + enemy.w * 0.8, enemy.y + enemy.h * 0.5);
      ctx.stroke();
      ctx.restore();
    }

    if (enemy.reactionAlpha > 0 && enemy.reactionType !== "none") {
      ctx.save();
      ctx.globalAlpha = Math.min(0.34, enemy.reactionAlpha * 0.4);
      ctx.fillStyle = enemy.reactionType === "pogo" ? "rgba(228, 246, 255, 0.9)"
        : enemy.reactionType === "finisher" ? "rgba(255, 223, 185, 0.88)"
        : enemy.reactionType === "heavy" ? "rgba(255, 232, 198, 0.84)"
        : enemy.reactionType === "elemental" ? "rgba(192, 235, 255, 0.82)"
        : "rgba(255, 244, 228, 0.76)";
      ctx.beginPath();
      ctx.ellipse(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.48, enemy.w * 0.78, enemy.h * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function getEnemyTelegraphColor(type: string): string {
    switch (type) {
      case "goblin": return "rgba(255, 238, 170, 0.92)";
      case "hound": return "rgba(255, 180, 145, 0.94)";
      case "shadowWalker": return "rgba(174, 174, 255, 0.95)";
      case "demon": return "rgba(255, 144, 116, 0.94)";
      case "bulwark": return "rgba(246, 230, 181, 0.95)";
      case "watcher": return "rgba(176, 238, 255, 0.96)";
      case "oracle": return "rgba(204, 230, 255, 0.96)";
      case "revenant": return "rgba(223, 241, 255, 0.96)";
      default: return "rgba(255,255,255,0.9)";
    }
  }

  function getEnemyColor(type: string): string {
    if (type === "goblin") return COLORS.goblin;
    if (type === "hound") return COLORS.hound;
    if (type === "shadowWalker") return COLORS.shadowWalker;
    if (type === "watcher") return COLORS.watcher;
    if (type === "oracle") return "#bca6ff";
    if (type === "revenant") return "#d5ecff";
    if (type === "bulwark") return COLORS.bulwark;
    return COLORS.demon;
  }

  function getMaxEnemyHp(enemy: any): number {
    if (enemy.maxHp) return enemy.maxHp;
    if (enemy.type === "goblin") return 2;
    if (enemy.type === "shadowWalker") return 3;
    if (enemy.type === "watcher") return enemy.name === "Sanctum Watcher" ? 3 : 2;
    if (enemy.type === "oracle") return 16;
    if (enemy.type === "revenant") return 14;
    return 4;
  }

  function drawEnemySilhouette(enemy: any, baseColor: string, facing: number): void {
    if (enemy.type === "goblin") { drawGoblin(enemy, baseColor, facing); return; }
    if (enemy.type === "hound") { drawHound(enemy, baseColor, facing); return; }
    if (enemy.type === "shadowWalker") { drawShadowWalker(enemy, baseColor, facing); return; }
    if (enemy.type === "watcher") { drawWatcher(enemy, baseColor, facing); return; }
    if (enemy.type === "oracle") { drawOracle(enemy, baseColor, facing); return; }
    if (enemy.type === "revenant") { drawRevenant(enemy, baseColor, facing); return; }
    drawDemon(enemy, baseColor, facing);
  }

  function drawHound(enemy: any, color: string, facing: number): void {
    const x = enemy.x;
    const y = enemy.y;
    const lunge = enemy.renderState === "burst" ? 6 : enemy.telegraphAlpha * 4;
    drawOvalShadow(x + 20, y + enemy.h + 4, 20, 6, "rgba(0,0,0,0.2)");
    ctx.save();
    ctx.translate(x + enemy.w / 2, y);
    ctx.scale(facing, 1);
    ctx.translate(-(x + enemy.w / 2), -y);
    ctx.translate(lunge, 0);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 26);
    ctx.lineTo(x + 14, y + 12);
    ctx.lineTo(x + 28, y + 10);
    ctx.lineTo(x + 38, y + 18);
    ctx.lineTo(x + 34, y + 30);
    ctx.lineTo(x + 18, y + 34);
    ctx.lineTo(x + 8, y + 32);
    ctx.closePath();
    ctx.fill();
    strokeBlobOutline(() => {
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 26);
      ctx.lineTo(x + 14, y + 12);
      ctx.lineTo(x + 28, y + 10);
      ctx.lineTo(x + 38, y + 18);
      ctx.lineTo(x + 34, y + 30);
      ctx.lineTo(x + 18, y + 34);
      ctx.lineTo(x + 8, y + 32);
      ctx.closePath();
    });
    ctx.fillStyle = "#ffe4d8";
    ctx.fillRect(x + 24, y + 15, 3, 2);
    ctx.fillRect(x + 30, y + 15, 3, 2);
    ctx.fillStyle = "#1a1110";
    ctx.fillRect(x + 8, y + 31, 5, 12);
    ctx.fillRect(x + 17, y + 32, 5, 11);
    ctx.fillRect(x + 27, y + 31, 5, 12);
    ctx.strokeStyle = "rgba(255, 196, 176, 0.4)";
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 24);
    ctx.quadraticCurveTo(x - 6, y + 14, x + 2, y + 10);
    ctx.stroke();
    ctx.restore();
  }

  function drawGoblin(enemy: any, color: string, facing: number): void {
    const x = enemy.x;
    const y = enemy.y;
    const crouch = enemy.telegraphAlpha * 5 - enemy.actionAlpha * 2;
    drawOvalShadow(x + 20, y + enemy.h + 3, 22, 7, "rgba(0,0,0,0.22)");
    ctx.save();
    ctx.translate(x + enemy.w / 2, y + crouch);
    ctx.scale(facing, 1);
    ctx.translate(-(x + enemy.w / 2), -(y + crouch));
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + 8, y + 16, 26, 28, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 21, y + 12, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 10);
    ctx.lineTo(x + 0, y + 0);
    ctx.lineTo(x + 14, y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 32, y + 10);
    ctx.lineTo(x + 42, y + 0);
    ctx.lineTo(x + 28, y + 6);
    ctx.closePath();
    ctx.fill();
    strokeBlobOutline(() => {
      ctx.beginPath();
      ctx.arc(x + 21, y + 12, 12, 0, Math.PI * 2);
    });
    ctx.fillStyle = "#121417";
    ctx.fillRect(x + 14, y + 46, 5, 16);
    ctx.fillRect(x + 24, y + 46, 5, 16);
    ctx.fillRect(x + 34, y + 22, 8, 5);
    ctx.fillStyle = "#fff4b8";
    ctx.fillRect(x + 17, y + 11, 3, 2);
    ctx.fillRect(x + 24, y + 11, 3, 2);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 20);
    ctx.lineTo(x + 2, y + 30);
    ctx.stroke();
    ctx.restore();
  }

  function drawShadowWalker(enemy: any, color: string, facing: number): void {
    const x = enemy.x;
    const y = enemy.y;
    const phaseLift = enemy.renderState === "burst" ? -8 : enemy.telegraphAlpha * 3;
    drawOvalShadow(x + 22, y + enemy.h + 3, 24, 7, "rgba(0,0,0,0.22)");
    ctx.save();
    ctx.translate(x + enemy.w / 2, y + phaseLift);
    ctx.scale(facing, 1);
    ctx.translate(-(x + enemy.w / 2), -(y + phaseLift));
    ctx.fillStyle = "rgba(14,16,28,0.85)";
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 10);
    ctx.lineTo(x + 3, y + 48);
    ctx.lineTo(x + 10, y + 58);
    ctx.lineTo(x + 35, y + 58);
    ctx.lineTo(x + 43, y + 48);
    ctx.lineTo(x + 34, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 23, y + 15, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 16, y + 25, 14, 24);
    strokeBlobOutline(() => {
      ctx.beginPath();
      ctx.arc(x + 23, y + 15, 11, 0, Math.PI * 2);
    });
    ctx.fillStyle = "#dbe0ff";
    ctx.fillRect(x + 17, y + 13, 4, 2);
    ctx.fillRect(x + 24, y + 13, 4, 2);
    ctx.strokeStyle = "rgba(141,149,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 46);
    ctx.lineTo(x + 39, y + 52);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 28);
    ctx.quadraticCurveTo(x - 4, y + 36, x + 8, y + 54);
    ctx.stroke();
    ctx.restore();
  }

  function drawDemon(enemy: any, color: string, facing: number): void {
    const x = enemy.x;
    const y = enemy.y;
    const lean = enemy.telegraphAlpha * 10 + enemy.actionAlpha * 4;
    drawOvalShadow(x + 24, y + enemy.h + 3, 26, 8, "rgba(0,0,0,0.24)");
    ctx.save();
    ctx.translate(x + enemy.w / 2, y);
    ctx.scale(facing, 1);
    ctx.translate(-(x + enemy.w / 2), -y);
    ctx.translate(lean * 0.18, 0);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + 8, y + 18, 32, 30, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 24, y + 13, 13, 0, Math.PI * 2);
    ctx.fill();
    strokeBlobOutline(() => {
      ctx.beginPath();
      ctx.arc(x + 24, y + 13, 13, 0, Math.PI * 2);
    });
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 5);
    ctx.lineTo(x + 10, y - 6);
    ctx.lineTo(x + 19, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 33, y + 5);
    ctx.lineTo(x + 37, y - 6);
    ctx.lineTo(x + 28, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1a0f11";
    ctx.fillRect(x + 14, y + 48, 6, 16);
    ctx.fillRect(x + 28, y + 48, 6, 16);
    ctx.fillStyle = "#ffe0cf";
    ctx.fillRect(x + 18, y + 11, 3, 2);
    ctx.fillRect(x + 27, y + 11, 3, 2);
    ctx.fillStyle = "#ffd479";
    ctx.fillRect(x + 40, y + 26, 10, 5);
    ctx.strokeStyle = "rgba(255,132,104,0.32)";
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 24);
    ctx.quadraticCurveTo(x - 8, y + 32, x + 8, y + 54);
    ctx.stroke();
    ctx.restore();
  }

  function drawOracle(enemy: any, color: string, facing: number): void {
    const x = enemy.x;
    const y = enemy.y;
    const bob = Math.sin(performance.now() * 0.0035 + x * 0.01) * 7;
    const auraPulse = enemy.telegraphAlpha > 0 ? 0.2 + enemy.telegraphAlpha * 0.35 : 0;
    drawOvalShadow(x + enemy.w * 0.5, y + enemy.h + 8, 32, 9, "rgba(0,0,0,0.18)");
    ctx.save();
    ctx.translate(x + enemy.w / 2, y + bob);
    ctx.scale(facing, 1);
    ctx.translate(-(x + enemy.w / 2), -(y + bob));

    ctx.fillStyle = "rgba(13, 19, 36, 0.94)";
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 18);
    ctx.lineTo(x + 8, y + 74);
    ctx.lineTo(x + 22, y + 96);
    ctx.lineTo(x + 62, y + 96);
    ctx.lineTo(x + 76, y + 74);
    ctx.lineTo(x + 66, y + 18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 42, y + 24, 18, 0, Math.PI * 2);
    ctx.fill();
    if (auraPulse > 0) {
      ctx.save();
      ctx.globalAlpha = auraPulse;
      ctx.strokeStyle = "rgba(200, 228, 255, 0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + 42, y + 24, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = "#eefcff";
    ctx.beginPath();
    ctx.ellipse(x + 42, y + 24, 9, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0d1320";
    ctx.beginPath();
    ctx.arc(x + 42, y + 24, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(167, 220, 255, 0.42)";
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 5; i++) {
      const px = x + 16 + i * 12;
      ctx.beginPath();
      ctx.moveTo(px, y + 54);
      ctx.quadraticCurveTo(px - 5, y + 78, px + (i % 2 === 0 ? -2 : 3), y + 98);
      ctx.stroke();
    }
    strokeBlobOutline(() => {
      ctx.beginPath();
      ctx.arc(x + 42, y + 24, 18, 0, Math.PI * 2);
    });
    ctx.restore();
  }

  function drawRevenant(enemy: any, color: string, facing: number): void {
    const x = enemy.x;
    const y = enemy.y;
    const readiness = enemy.telegraphAlpha * 0.16;
    drawOvalShadow(x + enemy.w * 0.5, y + enemy.h + 5, 36, 10, "rgba(0,0,0,0.26)");
    ctx.save();
    ctx.translate(x + enemy.w / 2, y);
    ctx.scale(facing, 1);
    ctx.translate(-(x + enemy.w / 2), -y);
    ctx.scale(1 + readiness, 1 - readiness * 0.6);

    ctx.fillStyle = "rgba(20, 28, 44, 0.94)";
    ctx.beginPath();
    ctx.roundRect(x + 16, y + 24, 38, 46, 12);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + 18, y + 18, 34, 38, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 35, y + 18, 15, 0, Math.PI * 2);
    ctx.fill();
    strokeBlobOutline(() => {
      ctx.beginPath();
      ctx.roundRect(x + 18, y + 18, 34, 38, 10);
    });
    ctx.fillStyle = "#11161d";
    ctx.fillRect(x + 24, y + 64, 8, 24);
    ctx.fillRect(x + 40, y + 64, 8, 24);
    ctx.fillRect(x + 6, y + 30, 16, 8);
    ctx.fillStyle = "#eff7ff";
    ctx.fillRect(x + 29, y + 15, 4, 3);
    ctx.fillRect(x + 37, y + 15, 4, 3);
    ctx.fillStyle = "#bfdfff";
    ctx.fillRect(x + 50, y + 30, 18, 8);
    ctx.fillRect(x + 62, y + 12, 6, 40);
    ctx.strokeStyle = "rgba(186, 223, 255, 0.34)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 35, y + 38, 30, -0.5, 1.2);
    ctx.stroke();
    ctx.fillStyle = "rgba(188, 223, 255, 0.24)";
    ctx.beginPath();
    ctx.ellipse(x + 35, y + 80, 26, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWatcher(enemy: any, color: string, facing: number): void {
    const x = enemy.x;
    const y = enemy.y;
    const bob = Math.sin(performance.now() * 0.004 + x * 0.01) * 6;
    const eyeGlow = enemy.telegraphAlpha * 0.6 + (enemy.renderState === "burst" ? 0.32 : 0);
    drawOvalShadow(x + 20, y + enemy.h + 8, 18, 6, "rgba(0,0,0,0.16)");
    ctx.save();
    ctx.translate(x + enemy.w / 2, y + bob);
    ctx.scale(facing, 1);
    ctx.translate(-(x + enemy.w / 2), -(y + bob));
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 20, y + 18, 14, 0, Math.PI * 2);
    ctx.fill();
    strokeBlobOutline(() => {
      ctx.beginPath();
      ctx.arc(x + 20, y + 18, 14, 0, Math.PI * 2);
    });
    ctx.fillStyle = "#effcff";
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 18, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (eyeGlow > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(eyeGlow, 0, 0.85);
      ctx.fillStyle = "#d7f7ff";
      ctx.beginPath();
      ctx.arc(x + 20, y + 18, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#11161f";
    ctx.beginPath();
    ctx.arc(x + 20, y + 18, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const px = x + 8 + i * 8;
      ctx.beginPath();
      ctx.moveTo(px, y + 30);
      ctx.quadraticCurveTo(px - 4, y + 42, px + (i % 2 === 0 ? -2 : 2), y + 48);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ─── exit shrine ─────────────────────────────────────────────────────────

  function drawExit(): void {
    drawExitShrine();
  }

  function drawExitShrine(): void {
    const x = _state.exitZone.x;
    const y = _state.exitZone.y;
    const w = _state.exitZone.w;
    const h = _state.exitZone.h;
    const glowColor = _state.world === "Light" ? "#d8f0db" : "#8ea1ff";

    ctx.save();
    const glow = ctx.createRadialGradient(x + w * 0.5, y + h * 0.4, 10, x + w * 0.5, y + h * 0.4, 110);
    glow.addColorStop(0, hexToRgba(glowColor, _state.gameWon ? 0.34 : 0.2));
    glow.addColorStop(1, hexToRgba(glowColor, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x - 70, y - 90, w + 140, h + 170);

    drawArchway(x - 24, y - 56, w + 48, h + 92, "rgba(18, 22, 36, 0.88)");
    ctx.fillStyle = "rgba(10, 13, 20, 0.88)";
    ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
    ctx.strokeStyle = _state.gameWon ? "#ffffff" : "#9ff7d8";
    ctx.lineWidth = 4;
    roundRectPath(x, y, w, h, 12);
    ctx.stroke();

    ctx.strokeStyle = "rgba(230, 236, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y - 40);
    ctx.lineTo(x + w * 0.5, y + h + 22);
    ctx.moveTo(x - 16, y + h * 0.5);
    ctx.lineTo(x + w + 16, y + h * 0.5);
    ctx.stroke();

    ctx.fillStyle = hexToRgba(glowColor, 0.3);
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + h * 0.5, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ─── far structures & room decor ────────────────────────────────────────

  function drawFarStructures(): void {
    const structures = [
      { x: 90, y: 150, w: 140, h: 260, top: "spire" },
      { x: 780, y: 170, w: 130, h: 220, top: "chain" },
      { x: 1700, y: 110, w: 180, h: 300, top: "fortress" },
      { x: 2560, y: 130, w: 200, h: 290, top: "fortress" },
      { x: 3400, y: 100, w: 220, h: 320, top: "throne" }
    ];
    for (const structure of structures) {
      const color = _state.world === "Light" ? "rgba(18, 22, 36, 0.32)" : "rgba(12, 14, 28, 0.4)";
      ctx.fillStyle = color;
      ctx.fillRect(structure.x, structure.y, structure.w, structure.h);
      ctx.fillStyle = _state.world === "Light" ? "rgba(182, 216, 255, 0.08)" : "rgba(144, 164, 255, 0.11)";
      ctx.fillRect(structure.x + 10, structure.y + 10, 10, structure.h - 20);
      ctx.fillRect(structure.x + structure.w - 20, structure.y + 10, 10, structure.h - 20);
      if (structure.top === "chain") {
        drawHangingChain(structure.x + structure.w * 0.5, structure.y - 70, 96, "rgba(160, 168, 195, 0.18)");
      } else if (structure.top === "spire") {
        ctx.beginPath();
        ctx.moveTo(structure.x + structure.w * 0.5, structure.y - 56);
        ctx.lineTo(structure.x + 16, structure.y + 6);
        ctx.lineTo(structure.x + structure.w - 16, structure.y + 6);
        ctx.closePath();
        ctx.fill();
      } else if (structure.top === "fortress") {
        ctx.fillRect(structure.x + 24, structure.y - 42, structure.w - 48, 46);
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(structure.x + 20 + i * (structure.w / 3), structure.y - 16, 16, 18);
        }
      } else if (structure.top === "throne") {
        ctx.beginPath();
        ctx.moveTo(structure.x + 24, structure.y + 22);
        ctx.lineTo(structure.x + structure.w * 0.5, structure.y - 44);
        ctx.lineTo(structure.x + structure.w - 24, structure.y + 22);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(structure.x + structure.w * 0.5 - 18, structure.y - 76, 36, 42);
      }
    }
  }

  function drawRoomDecor(): void {
    drawRoomAStartShrine();
    drawRoomBDashGateSet();
    drawRoomCEnemyHall();
    drawRoomDExitSanctum();
    drawBossShrineArena();
    drawEclipseBraziers();
    drawChainCurtains();
  }

  function drawRoomAStartShrine(): void {
    drawRootCluster(110, 615, 90, _state.world === "Light" ? "rgba(126, 108, 166, 0.24)" : "rgba(88, 92, 162, 0.24)");
    drawLantern(310, 482, "#f0d6a1", 0.16);
    ctx.fillStyle = "rgba(24, 24, 40, 0.62)";
    ctx.beginPath();
    ctx.moveTo(74, 620);
    ctx.lineTo(98, 520);
    ctx.lineTo(142, 520);
    ctx.lineTo(170, 620);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(230, 238, 255, 0.08)";
    ctx.fillRect(108, 542, 24, 34);
  }

  function drawRoomBDashGateSet(): void {
    drawArchway(820, 470, 190, 160, "rgba(56, 44, 64, 0.64)");
    drawHangingChain(924, 304, 170, "rgba(215, 196, 157, 0.18)");
    drawLantern(924, 454, "#efcf9c", 0.16);
  }

  function drawRoomCEnemyHall(): void {
    for (const x of [1500, 1820, 2140, 2460, 2780]) {
      drawBrokenColumn(x, 446, 30, 174);
    }
    drawRootCluster(2140, 620, 320, _state.world === "Light" ? "rgba(132, 112, 164, 0.2)" : "rgba(86, 94, 166, 0.22)");
  }

  function drawRoomDExitSanctum(): void {
    drawArchway(2480, 364, 340, 256, "rgba(40, 34, 60, 0.8)");
    drawLantern(2520, 348, "#efcf9c", 0.15);
    drawLantern(2760, 348, "#efcf9c", 0.15);
    drawRootCluster(2640, 620, 240, _state.world === "Light" ? "rgba(136, 114, 166, 0.22)" : "rgba(86, 96, 170, 0.22)");
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(2880, 408, 136, 8);
  }

  function drawBossShrineArena(): void {
    drawArchway(3440, 320, 440, 300, "rgba(28, 28, 52, 0.88)");
    drawBrokenColumn(3480, 392, 36, 228);
    drawBrokenColumn(3770, 386, 36, 234);
    drawLantern(3570, 350, "#f0d6a1", 0.14);
    drawLantern(3720, 350, "#f0d6a1", 0.14);
    ctx.save();
    ctx.strokeStyle = _state.world === "Light" ? "rgba(242, 212, 157, 0.24)" : "rgba(166, 160, 255, 0.26)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(3640, 604, 132, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(3640, 604, 62, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawEclipseBraziers(): void {
    for (const brazier of [
      { x: 680, y: 586 }, { x: 1320, y: 586 }, { x: 2360, y: 586 }, { x: 3560, y: 586 }
    ]) {
      ctx.fillStyle = "rgba(28, 28, 42, 0.92)";
      ctx.fillRect(brazier.x, brazier.y, 18, 28);
      ctx.fillStyle = "#f0c885";
      ctx.beginPath();
      ctx.moveTo(brazier.x + 9, brazier.y - 18);
      ctx.quadraticCurveTo(brazier.x - 2, brazier.y - 4, brazier.x + 5, brazier.y + 4);
      ctx.quadraticCurveTo(brazier.x + 11, brazier.y - 8, brazier.x + 9, brazier.y - 18);
      ctx.fill();
    }
  }

  function drawChainCurtains(): void {
    for (const cluster of [
      { x: 560, y: 60, w: 120 }, { x: 1600, y: 40, w: 160 },
      { x: 2600, y: 50, w: 180 }, { x: 3520, y: 40, w: 160 }
    ]) {
      for (let i = 0; i < 6; i++) {
        const px = cluster.x + i * (cluster.w / 6);
        const len = 40 + (i % 3) * 18;
        drawHangingChain(px + 8, cluster.y, len, _state.world === "Light" ? "rgba(215, 199, 168, 0.16)" : "rgba(128, 132, 214, 0.18)");
      }
    }
  }

  // ─── decorative primitives ───────────────────────────────────────────────

  function drawArchway(x: number, y: number, w: number, h: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(x, y + 34, w, h - 34);
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + 34, w * 0.5, Math.PI, 0);
    ctx.lineTo(x + w, y + 34);
    ctx.lineTo(x, y + 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = _state.world === "Light" ? "rgba(12, 15, 24, 0.72)" : "rgba(8, 9, 18, 0.82)";
    ctx.fillRect(x + 34, y + 56, w - 68, h - 56);
  }

  function drawBrokenColumn(x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = "rgba(34, 38, 48, 0.46)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(97, 108, 124, 0.18)";
    ctx.fillRect(x + 5, y + 10, 5, h - 18);
    ctx.fillRect(x + w - 10, y + 10, 5, h - 18);
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 18);
    ctx.lineTo(x + w * 0.5, y - 12);
    ctx.lineTo(x + w + 6, y + 16);
    ctx.closePath();
    ctx.fill();
  }

  function drawRootCluster(x: number, y: number, width: number, color: string): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const startX = x + i * (width / 5);
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.quadraticCurveTo(startX - 10 + i * 2, y - 28 - (i % 2) * 10, startX + 10 - i * 2, y - 54 - i * 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHangingChain(x: number, y: number, length: number, color: string): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < length; i += 12) {
      ctx.beginPath();
      ctx.ellipse(x + (i % 24 === 0 ? -2 : 2), y + i, 4, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLantern(x: number, y: number, color: string, glowAlpha: number): void {
    ctx.save();
    ctx.strokeStyle = "rgba(188, 194, 214, 0.26)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 48);
    ctx.lineTo(x, y - 10);
    ctx.stroke();
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 42);
    glow.addColorStop(0, hexToRgba(color, glowAlpha * 2.5));
    glow.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - 8, y - 10, 16, 20, 4);
    ctx.fill();
    ctx.restore();
  }

  // ─── player ──────────────────────────────────────────────────────────────

  function drawPlayer(): void {
    const player = _state.player;
    const tint = getPlayerTint();
    const hurtStrength = clamp(player.hurtFlash / 0.28, 0, 1);
    const attackLunge = player.attackRecover > 0 ? player.facing * 5 * (player.attackRecover / 0.1) : 0;
    const movementPolish = getPlayerRenderPolish(player);
    const renderPlayer = {
      ...player,
      x: player.x + attackLunge + Math.sin(performance.now() * 0.12) * hurtStrength * 2 + movementPolish.offsetX,
      y: player.y + movementPolish.offsetY,
      renderScaleX: movementPolish.scaleX,
      renderScaleY: movementPolish.scaleY,
      capeLag: movementPolish.capeLag,
      dashSmear: movementPolish.dashSmear
    };
    drawShadowWarrior(renderPlayer, player.invuln > 0 || hurtStrength > 0.2 ? "#ffffff" : tint);
    drawHealthBar(player.x - 3, player.y - 14, player.w + 6, 5, player.hp, player.displayHp, player.maxHp);
    if (player.attackTimer > 0) drawAttackArc(player);
  }

  function getPlayerTint(): string {
    const worldTint = _state.world === "Light" ? COLORS.light : COLORS.shadow;
    const elementTint = { None: COLORS.none, Fire: COLORS.fire, Ice: COLORS.ice, Wind: COLORS.wind }[_state.element as string] ?? COLORS.none;
    return multiplyHex(worldTint, elementTint);
  }

  function getPlayerRenderPolish(player: any): any {
    const verticalSpeed = player.vy ?? 0;
    const groundedSquash = player.onGround ? clamp(Math.abs(player.vx) / 360, 0, 1) * 0.04 : 0;
    const landingSquash = player.onGround && verticalSpeed > -20 && verticalSpeed < 60 ? 0.06 : 0;
    const jumpStretch = !player.onGround && verticalSpeed < -110 ? clamp(Math.abs(verticalSpeed) / 920, 0, 0.14) : 0;
    const fallSquash = !player.onGround && verticalSpeed > 220 ? clamp(verticalSpeed / 1000, 0, 0.1) : 0;
    const dashSmear = player.dashTimer > 0 ? clamp(player.dashTimer / player.dashDuration, 0, 1) : 0;
    const attackFollowThrough = player.attackRecover > 0 ? clamp(player.attackRecover / 0.1, 0, 1) : 0;
    const scaleX = 1 + groundedSquash + landingSquash + fallSquash + dashSmear * 0.16 - jumpStretch * 0.1;
    const scaleY = 1 - groundedSquash - landingSquash - fallSquash + jumpStretch * 0.16;
    return {
      scaleX, scaleY,
      offsetX: dashSmear * player.facing * 7 + attackFollowThrough * player.facing * 4,
      offsetY: jumpStretch * -8 + landingSquash * 4,
      capeLag: clamp(player.vx / 28, -12, 12) + dashSmear * player.facing * 8,
      dashSmear
    };
  }

  function drawAttackArc(player: any): void {
    const profile = deps.getAttackProfileById(player, player.attackProfileId);
    const attackX = player.x + profile.offsetX;
    const progress = 1 - clamp(player.attackTimer / 0.1, 0, 1);
    const arcColor = profile.slashColor;

    ctx.save();
    ctx.strokeStyle = arcColor;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.22;
    ctx.strokeRect(attackX, player.y + profile.offsetY, profile.width, profile.height);

    ctx.globalAlpha = 0.9 - progress * 0.35;
    ctx.lineCap = "round";
    ctx.beginPath();
    const originX = player.x + player.w * 0.5;
    const originY = player.y + 28;
    if (profile.type === "downslash") {
      ctx.moveTo(originX - 4, player.y + player.h * 0.48);
      ctx.quadraticCurveTo(originX - 16, player.y + player.h + 10, originX - 4, player.y + player.h + 38);
      ctx.moveTo(originX + 4, player.y + player.h * 0.48);
      ctx.quadraticCurveTo(originX + 16, player.y + player.h + 10, originX + 4, player.y + player.h + 38);
    } else if (player.facing > 0) {
      ctx.arc(originX + 14, originY, 34 + profile.width * 0.18, -0.95 + progress * 0.3, 0.72 + progress * 0.2);
    } else {
      ctx.arc(originX - 14, originY, 34 + profile.width * 0.18, Math.PI - 0.72 - progress * 0.2, Math.PI + 0.95 - progress * 0.3, true);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawShadowWarrior(player: any, tint: string): void {
    const x = player.x;
    const y = player.y;
    const w = player.w;
    const h = player.h;
    const facing = player.facing;
    const renderScaleX = player.renderScaleX ?? 1;
    const renderScaleY = player.renderScaleY ?? 1;
    const capeLag = player.capeLag ?? 0;
    const dashSmear = player.dashSmear ?? 0;

    ctx.save();
    ctx.translate(x + w / 2, y);
    ctx.scale(facing, 1);
    ctx.translate(0, h * 0.5);
    ctx.scale(renderScaleX, renderScaleY);
    ctx.translate(-(x + w / 2), -(y + h * 0.5));

    drawOvalShadow(x + 19, y + h + 4, 26, 8, "rgba(0,0,0,0.24)");

    if (dashSmear > 0.05) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.32, dashSmear * 0.35);
      const smear = ctx.createLinearGradient(x - 18, y + 28, x + 34, y + 40);
      smear.addColorStop(0, "rgba(255,255,255,0)");
      smear.addColorStop(0.45, hexToRgba(tint.startsWith("rgb") ? "#dfe7ff" : tint, 0.28));
      smear.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = smear;
      ctx.beginPath();
      ctx.moveTo(x - 18, y + 38);
      ctx.quadraticCurveTo(x + 8, y + 16, x + 38, y + 32);
      ctx.quadraticCurveTo(x + 16, y + 54, x - 8, y + 56);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 4);
    ctx.quadraticCurveTo(x + 34, y - 10, x + 37, y - 28);
    ctx.quadraticCurveTo(x + 46, y - 6, x + 34, y + 10);
    ctx.quadraticCurveTo(x + 53, y - 6, x + 58, y - 20);
    ctx.quadraticCurveTo(x + 56, y + 4, x + 40, y + 18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = COLORS.cape;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 18);
    ctx.lineTo(x + 1 - capeLag * 0.45, y + 50);
    ctx.lineTo(x + 8 - capeLag * 0.2, y + h);
    ctx.lineTo(x + 21, y + 54);
    ctx.lineTo(x + 34 + capeLag * 0.12, y + h - Math.abs(capeLag) * 0.15);
    ctx.lineTo(x + 39 + capeLag * 0.22, y + 45);
    ctx.lineTo(x + 26, y + 18);
    ctx.closePath();
    ctx.fill();
    strokeBlobOutline(() => {
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 18);
      ctx.lineTo(x + 1 - capeLag * 0.45, y + 50);
      ctx.lineTo(x + 8 - capeLag * 0.2, y + h);
      ctx.lineTo(x + 21, y + 54);
      ctx.lineTo(x + 34 + capeLag * 0.12, y + h - Math.abs(capeLag) * 0.15);
      ctx.lineTo(x + 39 + capeLag * 0.22, y + 45);
      ctx.lineTo(x + 26, y + 18);
      ctx.closePath();
    });

    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 16, 22, 28, 8);
    ctx.fill();
    strokeBlobOutline(() => {
      ctx.beginPath();
      ctx.roundRect(x + 10, y + 16, 22, 28, 8);
    });

    ctx.fillStyle = "#0d0e16";
    ctx.beginPath();
    ctx.arc(x + 21, y + 13, 11, 0, Math.PI * 2);
    ctx.fill();
    strokeBlobOutline(() => {
      ctx.beginPath();
      ctx.arc(x + 21, y + 13, 11, 0, Math.PI * 2);
    });

    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 18);
    ctx.lineTo(x + 21, y + 3);
    ctx.lineTo(x + 32, y + 18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f8fbff";
    ctx.beginPath();
    ctx.ellipse(x + 18, y + 13, 4.8, 6.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 24.5, y + 13, 4.1, 6, 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.steel;
    ctx.fillRect(x + 30, y + 26, 14, 4);
    ctx.fillRect(x + 28, y + 44, 5, 18);
    ctx.fillRect(x + 15, y + 44, 5, 18);
    ctx.fillRect(x + 9, y + 25, 5, 18);
    ctx.fillRect(x + 28, y + 25, 5, 18);

    if (_state.element !== "None") {
      ctx.strokeStyle = tint;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 21, y + 28, 20, -0.7, 1.3);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 30);
    ctx.quadraticCurveTo(x + 0, y + 36, x - 6, y + 48);
    ctx.moveTo(x + 32, y + 30);
    ctx.quadraticCurveTo(x + 44, y + 36, x + 50, y + 46);
    ctx.stroke();
    ctx.restore();
  }

  // ─── slash effects & particles ───────────────────────────────────────────

  function drawSlashEffects(): void {
    for (const effect of _state.slashEffects) {
      const alpha = clamp(effect.life / effect.maxLife, 0, 1);
      const width = effect.width * (1.05 - alpha * 0.12);
      const height = effect.height * (0.82 + alpha * 0.2);
      ctx.save();
      ctx.translate(effect.x, effect.y);
      if (effect.type !== "downslash") ctx.scale(effect.facing, 1);
      ctx.globalAlpha = alpha * 0.55;
      const gradient = effect.type === "downslash"
        ? ctx.createLinearGradient(0, -height * 0.65, 0, height * 0.9)
        : ctx.createLinearGradient(0, -height * 0.4, width * 0.85, height * 0.2);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(0.45, effect.color);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 8 * alpha;
      ctx.lineCap = "round";
      ctx.beginPath();
      if (effect.type === "downslash") {
        ctx.moveTo(0, -height * 0.42);
        ctx.quadraticCurveTo(-width * 0.22, height * 0.02, 0, height * 0.8);
        ctx.moveTo(0, -height * 0.42);
        ctx.quadraticCurveTo(width * 0.22, height * 0.02, 0, height * 0.8);
      } else {
        ctx.moveTo(-8, -height * 0.35);
        ctx.quadraticCurveTo(width * 0.38, -height * 0.65, width * 0.92, height * 0.16);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticles(): void {
    for (const particle of _state.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ─── foreground frames ───────────────────────────────────────────────────

  function drawForegroundFrames(): void {
    ctx.save();
    ctx.globalAlpha = 0.22;
    for (const cluster of [
      { x: 120, y: 0, side: "left", height: 420 },
      { x: 1080, y: 0, side: "right", height: 380 }
    ]) {
      drawForegroundSilhouetteCluster(cluster.x, cluster.y, cluster.side, cluster.height);
    }
    ctx.restore();
  }

  function drawForegroundSilhouetteCluster(x: number, y: number, side: string, height: number): void {
    const sign = side === "left" ? 1 : -1;
    ctx.fillStyle = "rgba(8, 9, 16, 0.82)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sign * 46, y + 26);
    ctx.lineTo(x + sign * 88, y + height * 0.25);
    ctx.lineTo(x + sign * 70, y + height * 0.55);
    ctx.lineTo(x + sign * 28, y + height * 0.88);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(185, 196, 224, 0.06)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + sign * (14 + i * 8), y + 30 + i * 24);
      ctx.quadraticCurveTo(x + sign * (50 + i * 10), y + 90 + i * 50, x + sign * (24 + i * 6), y + 170 + i * 44);
      ctx.stroke();
    }
  }

  // ─── shared drawing utilities ────────────────────────────────────────────

  function strokeBlobOutline(drawPath: () => void): void {
    ctx.save();
    ctx.strokeStyle = "rgba(10, 11, 17, 0.75)";
    ctx.lineWidth = 2.5;
    drawPath();
    ctx.stroke();
    ctx.restore();
  }

  function drawOvalShadow(x: number, y: number, rx: number, ry: number, color: string): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHealthBar(x: number, y: number, width: number, height: number, hp: number, displayHp: number, maxHp: number): void {
    ctx.save();
    ctx.fillStyle = "rgba(7, 9, 14, 0.82)";
    roundRectPath(x, y, width, height, 999);
    ctx.fill();
    const delayedWidth = clamp(displayHp / maxHp, 0, 1) * width;
    const liveWidth = clamp(hp / maxHp, 0, 1) * width;
    ctx.fillStyle = "rgba(170, 68, 68, 0.42)";
    roundRectPath(x, y, delayedWidth, height, 999);
    ctx.fill();
    ctx.fillStyle = "#f1ede5";
    roundRectPath(x, y, liveWidth, height, 999);
    ctx.fill();
    ctx.restore();
  }

  function roundRectPath(x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  // ─── public API ──────────────────────────────────────────────────────────

  return { draw };
}
