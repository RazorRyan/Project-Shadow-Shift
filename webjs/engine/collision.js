(function initializeShadowShiftCollision(global) {
  const EPSILON = 0.001;

  function createRect(x, y, w, h) {
    return { x, y, w, h };
  }

  function aabbOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function collectWorldSolids(state) {
    const solids = [...state.platforms, ...state.walls];
    for (const platform of state.shadowPlatforms) {
      if (state.world === platform.world) {
        solids.push(platform);
      }
    }
    if (state.barrier.active) {
      solids.push(state.barrier);
    }
    if (state.gate.active) {
      solids.push(state.gate);
    }
    return solids;
  }

  function resolveHorizontal(body, deltaX, solids) {
    let nextX = body.x + deltaX;
    let collided = false;
    const testRect = createRect(nextX, body.y, body.w, body.h);

    for (const solid of solids) {
      testRect.x = nextX;
      if (!aabbOverlap(testRect, solid)) {
        continue;
      }

      collided = true;
      if (deltaX > 0) {
        nextX = solid.x - body.w - EPSILON;
      } else if (deltaX < 0) {
        nextX = solid.x + solid.w + EPSILON;
      }
    }

    return { x: nextX, collided };
  }

  function resolveVertical(body, deltaY, solids) {
    let nextY = body.y + deltaY;
    let collided = false;
    let grounded = false;
    let ceilingHit = false;
    const testRect = createRect(body.x, nextY, body.w, body.h);

    for (const solid of solids) {
      testRect.y = nextY;
      if (!aabbOverlap(testRect, solid)) {
        continue;
      }

      collided = true;
      if (deltaY > 0) {
        nextY = solid.y - body.h - EPSILON;
        grounded = true;
      } else if (deltaY < 0) {
        nextY = solid.y + solid.h + EPSILON;
        ceilingHit = true;
      }
    }

    return { y: nextY, collided, grounded, ceilingHit };
  }

  function probeOverlap(rect, solids) {
    for (const solid of solids) {
      if (aabbOverlap(rect, solid)) {
        return solid;
      }
    }
    return null;
  }

  global.ShadowShiftCollision = {
    EPSILON,
    createRect,
    aabbOverlap,
    collectWorldSolids,
    resolveHorizontal,
    resolveVertical,
    probeOverlap
  };
})(window);
