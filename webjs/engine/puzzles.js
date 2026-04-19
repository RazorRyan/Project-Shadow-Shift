(function initializeShadowShiftPuzzles(global) {
  function ensurePuzzleRuntime(puzzle) {
    puzzle.runtime = puzzle.runtime ?? {
      solved: false,
      activeWindowTimer: 0,
      nodes: {}
    };

    for (const node of puzzle.nodes ?? []) {
      puzzle.runtime.nodes[node.id] = puzzle.runtime.nodes[node.id] ?? {
        active: false,
        timer: 0
      };
    }

    return puzzle.runtime;
  }

  function triggerPuzzleNode(puzzle, nodeId, triggerType, options = {}) {
    const runtime = ensurePuzzleRuntime(puzzle);
    const node = (puzzle.nodes ?? []).find((entry) => entry.id === nodeId);
    if (!node) {
      return { accepted: false };
    }

    if (node.triggerType !== triggerType) {
      return { accepted: false };
    }

    if (node.requiredWorld && node.requiredWorld !== options.world) {
      return { accepted: false };
    }

    if (node.requiredElement && node.requiredElement !== options.element) {
      return { accepted: false };
    }

    runtime.nodes[nodeId] = {
      active: true,
      timer: node.duration ?? puzzle.nodeDuration ?? 4
    };

    const allRequiredActive = (puzzle.nodes ?? []).every((entry) => runtime.nodes[entry.id]?.active);
    if (allRequiredActive) {
      runtime.solved = true;
      runtime.activeWindowTimer = puzzle.windowDuration ?? 6;
      return {
        accepted: true,
        solved: true
      };
    }

    return {
      accepted: true,
      solved: false
    };
  }

  function updatePuzzleState(puzzle, dt) {
    const runtime = ensurePuzzleRuntime(puzzle);

    for (const node of puzzle.nodes ?? []) {
      const nodeRuntime = runtime.nodes[node.id];
      if (!nodeRuntime?.active) {
        continue;
      }

      nodeRuntime.timer = Math.max(0, nodeRuntime.timer - dt);
      if (nodeRuntime.timer <= 0 && !runtime.solved) {
        nodeRuntime.active = false;
      }
    }

    if (runtime.activeWindowTimer > 0) {
      runtime.activeWindowTimer = Math.max(0, runtime.activeWindowTimer - dt);
      if (runtime.activeWindowTimer <= 0 && !puzzle.persistent) {
        runtime.solved = false;
        for (const node of puzzle.nodes ?? []) {
          runtime.nodes[node.id] = {
            active: false,
            timer: 0
          };
        }
      }
    }
  }

  function isPuzzleActive(puzzle) {
    return (puzzle.runtime?.activeWindowTimer ?? 0) > 0 || Boolean(puzzle.runtime?.solved);
  }

  function isPuzzleSolved(puzzle) {
    return Boolean(puzzle.runtime?.solved);
  }

  function getPuzzleNodeState(puzzle, nodeId) {
    return puzzle.runtime?.nodes?.[nodeId] ?? { active: false, timer: 0 };
  }

  global.ShadowShiftPuzzles = {
    ensurePuzzleRuntime,
    triggerPuzzleNode,
    updatePuzzleState,
    isPuzzleActive,
    isPuzzleSolved,
    getPuzzleNodeState
  };
})(window);
