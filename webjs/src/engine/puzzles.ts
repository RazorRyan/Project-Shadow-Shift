export function ensurePuzzleRuntime(puzzle: any) {
  puzzle.runtime = puzzle.runtime ?? { solved: false, activeWindowTimer: 0, nodes: {} };
  for (const node of puzzle.nodes ?? []) {
    puzzle.runtime.nodes[node.id] = puzzle.runtime.nodes[node.id] ?? { active: false, timer: 0 };
  }
  return puzzle.runtime;
}

export function triggerPuzzleNode(puzzle: any, nodeId: string, triggerType: string, options: any = {}) {
  const runtime = ensurePuzzleRuntime(puzzle);
  const node = (puzzle.nodes ?? []).find((e: any) => e.id === nodeId);
  if (!node) return { accepted: false };
  if (node.triggerType !== triggerType) return { accepted: false };
  if (node.requiredWorld && node.requiredWorld !== options.world) return { accepted: false };
  if (node.requiredElement && node.requiredElement !== options.element) return { accepted: false };

  runtime.nodes[nodeId] = { active: true, timer: node.duration ?? puzzle.nodeDuration ?? 4 };
  const allActive = (puzzle.nodes ?? []).every((e: any) => runtime.nodes[e.id]?.active);
  if (allActive) {
    runtime.solved = true;
    runtime.activeWindowTimer = puzzle.windowDuration ?? 6;
    return { accepted: true, solved: true };
  }
  return { accepted: true, solved: false };
}

export function updatePuzzleState(puzzle: any, dt: number) {
  const runtime = ensurePuzzleRuntime(puzzle);
  for (const node of puzzle.nodes ?? []) {
    const nr = runtime.nodes[node.id];
    if (!nr?.active) continue;
    nr.timer = Math.max(0, nr.timer - dt);
    if (nr.timer <= 0 && !runtime.solved) nr.active = false;
  }
  if (runtime.activeWindowTimer > 0) {
    runtime.activeWindowTimer = Math.max(0, runtime.activeWindowTimer - dt);
    if (runtime.activeWindowTimer <= 0 && !puzzle.persistent) {
      runtime.solved = false;
      for (const node of puzzle.nodes ?? []) {
        runtime.nodes[node.id] = { active: false, timer: 0 };
      }
    }
  }
}

export function isPuzzleActive(puzzle: any): boolean {
  return (puzzle.runtime?.activeWindowTimer ?? 0) > 0 || Boolean(puzzle.runtime?.solved);
}

export function getPuzzleNodeState(puzzle: any, nodeId: string) {
  return puzzle.runtime?.nodes?.[nodeId] ?? { active: false, timer: 0 };
}
