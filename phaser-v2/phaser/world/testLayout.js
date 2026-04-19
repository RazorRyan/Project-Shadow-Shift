export const TEST_LAYOUT = {
  platforms: [
    { x: 0, y: 620, w: 420, h: 100 },
    { x: 520, y: 620, w: 260, h: 100 },
    { x: 920, y: 620, w: 220, h: 100 },
    { x: 240, y: 530, w: 120, h: 16 },
    { x: 670, y: 470, w: 96, h: 16 }
  ],
  walls: [
    { x: 760, y: 320, w: 28, h: 300 },
    { x: 1120, y: 430, w: 30, h: 190 }
  ]
};

export function spawnTestLayout(scene, solids) {
  for (const platform of TEST_LAYOUT.platforms) {
    createStaticBlock(scene, solids, platform, 0x33405a);
  }

  for (const wall of TEST_LAYOUT.walls) {
    createStaticBlock(scene, solids, wall, 0x2b3650);
  }
}

function createStaticBlock(scene, solids, rect, tint) {
  const block = solids.create(rect.x + rect.w / 2, rect.y + rect.h / 2, "solid-block");
  block.setDisplaySize(rect.w, rect.h);
  block.setTint(tint);
  block.refreshBody();
  return block;
}
