import { loadRoom } from "./roomLoader.js";

const ROOM_LAYOUTS = {
  presentation: {
    label: "Ruin Hall",
    spawn: { x: 120, y: 540 },
    dummySpawns: [
      { x: 920, y: 534, label: "Ruin Husk" },
      { x: 1070, y: 534, label: "Guard Shell" }
    ],
    enemySpawns: [
      { x: 760, y: 534, statKey: "ruin_husk" }
    ],
    platforms: [
      { x: 0, y: 620, w: 420, h: 100 },
      { x: 520, y: 620, w: 260, h: 100 },
      { x: 920, y: 620, w: 220, h: 100 },
      { x: 240, y: 530, w: 120, h: 16 },
      { x: 670, y: 470, w: 96, h: 16 },
      { x: 1000, y: 392, w: 82, h: 16 }
    ],
    walls: [
      { x: 760, y: 320, w: 28, h: 300 },
      { x: 1120, y: 430, w: 30, h: 190 }
    ],
    arches: [
      { x: 170, y: 280, w: 120, h: 220, color: 0x182031, alpha: 0.55 },
      { x: 564, y: 240, w: 138, h: 250, color: 0x141c2b, alpha: 0.48 },
      { x: 1010, y: 250, w: 150, h: 230, color: 0x141b29, alpha: 0.5 }
    ],
    braziers: [
      { x: 340, y: 598, tint: 0xf2bf75 },
      { x: 980, y: 598, tint: 0x9bb8ff }
    ],
    chains: [
      { x: 212, y: 0, h: 144 },
      { x: 641, y: 0, h: 118 },
      { x: 1048, y: 0, h: 132 }
    ],
    foregroundRubble: [
      { x: 148, y: 607, w: 74, h: 16, color: 0x38445e },
      { x: 724, y: 607, w: 92, h: 13, color: 0x313b52 },
      { x: 1188, y: 607, w: 84, h: 18, color: 0x38445e }
    ]
  },
  test: {
    label: "Test Room",
    spawn: { x: 120, y: 540 },
    dummySpawns: [
      { x: 870, y: 534, label: "Ruin Husk" },
      { x: 980, y: 534, label: "Guard Shell" }
    ],
    enemySpawns: [
      { x: 730, y: 534, statKey: "ruin_husk" }
    ],
    platforms: [
      { x: 0, y: 620, w: 500, h: 100 },
      { x: 560, y: 620, w: 460, h: 100 },
      { x: 1080, y: 620, w: 200, h: 100 },
      { x: 330, y: 510, w: 120, h: 18 },
      { x: 690, y: 438, w: 120, h: 18 }
    ],
    walls: [
      { x: 540, y: 340, w: 24, h: 280 },
      { x: 1030, y: 390, w: 24, h: 230 }
    ],
    arches: [],
    braziers: [],
    chains: [],
    foregroundRubble: []
  }
};

export function getRoomLayout(mode = "presentation") {
  return ROOM_LAYOUTS[mode] ?? ROOM_LAYOUTS.presentation;
}

export function spawnRoomLayout(scene, solids, mode = "presentation") {
  // Phase 10: "presentation" uses the tilemap pipeline
  if (mode === "presentation") {
    return loadRoom(scene, solids, "ruin-hall");
  }

  const layout = getRoomLayout(mode);

  for (const platform of layout.platforms) {
    createStaticBlock(scene, solids, platform, mode === "test" ? 0x3b4763 : 0x33405a);
  }

  for (const wall of layout.walls) {
    createStaticBlock(scene, solids, wall, mode === "test" ? 0x2f3a53 : 0x2b3650);
  }

  addEnvironmentDressings(scene, layout, mode);
  return layout;
}

function createStaticBlock(scene, solids, rect, tint) {
  const block = solids.create(rect.x + rect.w / 2, rect.y + rect.h / 2, "solid-block");
  block.setDisplaySize(rect.w, rect.h);
  block.setTint(tint);
  block.refreshBody();
  return block;
}

function addEnvironmentDressings(scene, layout, mode) {
  if (mode === "test") {
    const frame = scene.add.graphics().setDepth(0);
    frame.lineStyle(4, 0x566789, 0.5);
    frame.strokeRect(40, 38, 1200, 644);
    frame.lineStyle(2, 0x8da0c9, 0.16);
    frame.strokeRect(72, 70, 1136, 580);
    scene.add.text(640, 86, "COMBAT TEST ROOM", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#a8b9dd"
    }).setOrigin(0.5, 0.5).setDepth(1);
    return;
  }

  for (const arch of layout.arches) {
    scene.add.rectangle(arch.x, arch.y, arch.w, arch.h, arch.color, arch.alpha).setOrigin(0.5, 0.5).setDepth(0);
    scene.add.ellipse(arch.x, arch.y - arch.h * 0.34, arch.w * 0.72, arch.w * 0.5, arch.color, arch.alpha * 1.1).setDepth(0);
  }

  for (const chain of layout.chains) {
    const chainLine = scene.add.graphics().setDepth(1);
    chainLine.lineStyle(2, 0x5b6786, 0.34);
    chainLine.beginPath();
    chainLine.moveTo(chain.x, 0);
    chainLine.lineTo(chain.x, chain.h);
    chainLine.strokePath();

    for (let y = 12; y < chain.h; y += 18) {
      scene.add.ellipse(chain.x, y, 8, 12, 0x7b88a7, 0.18).setDepth(1);
    }
  }

  for (const brazier of layout.braziers) {
    scene.add.rectangle(brazier.x, 600, 18, 24, 0x2a3044).setDepth(4);
    scene.add.circle(brazier.x, 585, 10, brazier.tint, 0.78).setDepth(4);
    scene.add.circle(brazier.x, 580, 18, brazier.tint, 0.12).setDepth(3);
  }

  for (const rubble of layout.foregroundRubble) {
    scene.add.rectangle(rubble.x, rubble.y, rubble.w, rubble.h, rubble.color, 0.96).setDepth(4).setOrigin(0.5, 0.5);
  }
}
