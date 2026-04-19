# Architecture Target

## Target folders
```text
/phaser
  /core
  /systems
  /entities
  /components
  /scenes
  /combat
  /world
  /ui
  /fx
  /data
  /save
  /input
  /helpers
```

## Rules
- Keep scene files thin.
- Move reusable logic into systems, helpers, and data files.
- Prefer data-driven tuning over hardcoded values.
- Keep features incremental and testable.
- Avoid monolithic controller files.
- Preserve current gameplay behavior while modernizing feel.

## Core pillars
- Strong movement feel
- Clean combat timing
- Reusable entity framework
- Tilemap/room-based world structure
- Save-safe progression systems
- Cross-feature integration for Shadow Swap, Element Shift, Weapon Evolution
