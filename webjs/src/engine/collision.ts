import { isWorldEntityActive } from "./shadow";

const EPSILON = 0.001;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  world?: string;
  active?: boolean;
}

export function createRect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

export function aabbOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function collectWorldSolids(state: any): Rect[] {
  const solids: Rect[] = [...state.platforms, ...state.walls];
  for (const platform of state.shadowPlatforms) {
    if (isWorldEntityActive(platform, state.world)) solids.push(platform);
  }
  for (const platform of state.puzzlePlatforms ?? []) {
    if (platform.active && isWorldEntityActive(platform, state.world)) solids.push(platform);
  }
  if (state.barrier.active) solids.push(state.barrier);
  if (state.gate.active) solids.push(state.gate);
  return solids;
}

export function resolveHorizontal(body: Rect, deltaX: number, solids: Rect[]) {
  let nextX = body.x + deltaX;
  let collided = false;
  const testRect = createRect(nextX, body.y, body.w, body.h);
  for (const solid of solids) {
    testRect.x = nextX;
    if (!aabbOverlap(testRect, solid)) continue;
    collided = true;
    if (deltaX > 0) nextX = solid.x - body.w - EPSILON;
    else if (deltaX < 0) nextX = solid.x + solid.w + EPSILON;
  }
  return { x: nextX, collided };
}

export function resolveVertical(body: Rect, deltaY: number, solids: Rect[]) {
  let nextY = body.y + deltaY;
  let collided = false;
  let grounded = false;
  let ceilingHit = false;
  const testRect = createRect(body.x, nextY, body.w, body.h);
  for (const solid of solids) {
    testRect.y = nextY;
    if (!aabbOverlap(testRect, solid)) continue;
    collided = true;
    if (deltaY > 0) { nextY = solid.y - body.h - EPSILON; grounded = true; }
    else if (deltaY < 0) { nextY = solid.y + solid.h + EPSILON; ceilingHit = true; }
  }
  return { y: nextY, collided, grounded, ceilingHit };
}

export function probeOverlap(rect: Rect, solids: Rect[]): Rect | null {
  for (const solid of solids) {
    if (aabbOverlap(rect, solid)) return solid;
  }
  return null;
}
