export function createDomUiBridge(scene) {
  const hud = {
    world: document.getElementById("worldValue"),
    element: document.getElementById("elementValue"),
    weapon: document.getElementById("weaponValue"),
    objective: document.getElementById("objectiveValue"),
    startOverlay: document.getElementById("startOverlay"),
    startButton: document.getElementById("startButton"),
    touchHud: document.getElementById("touchHud")
  };

  hud.world.textContent = "Light";
  hud.element.textContent = "None";
  hud.weapon.textContent = "Shard Blade I";
  hud.objective.textContent = "Press Enter or click Enter the Ruin";
  hud.touchHud.classList.add("hidden");

  const tryStart = () => {
    if (!scene.scene.isActive()) {
      return;
    }
    scene.startRun();
  };

  const onKeyDown = (event) => {
    if (!scene.isStarted && (event.code === "Enter" || event.code === "Space")) {
      event.preventDefault();
      tryStart();
    }
  };

  hud.startButton.addEventListener("click", tryStart);
  window.addEventListener("keydown", onKeyDown);

  scene.events.once("shutdown", () => {
    hud.startButton.removeEventListener("click", tryStart);
    window.removeEventListener("keydown", onKeyDown);
  });

  return {
    hideStartOverlay() {
      hud.startOverlay.classList.add("hidden");
      hud.objective.textContent = "Movement + combat sandbox: jump, dash, slash";
    },
    showStartOverlay() {
      hud.startOverlay.classList.remove("hidden");
      hud.objective.textContent = "Press Enter or click Enter the Ruin";
    },
    setObjective(text) {
      hud.objective.textContent = text;
    }
  };
}
