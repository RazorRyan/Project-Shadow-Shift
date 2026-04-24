import { createGame } from "./core/createGame.js";

const game = createGame();

// Re-read parent bounds after the first paint so any dvh/layout timing
// mismatches are corrected before the player sees the game.
requestAnimationFrame(() => game.scale.refresh());

// Keep the canvas filling the screen when the viewport changes (orientation
// change, address-bar show/hide, or browser resize on desktop).
const refreshScale = () => game.scale.refresh();
window.addEventListener("resize", refreshScale);
window.addEventListener("orientationchange", () => {
  // Give the browser ~150 ms to finish its viewport recalculation before
  // asking Phaser to re-measure the parent.
  setTimeout(refreshScale, 150);
});
