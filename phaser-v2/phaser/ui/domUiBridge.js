export function createDomUiBridge(scene) {
  /** Hex CSS colors for each element */
  const ELEMENT_CSS = {
    None: "#c8d0e8",
    Fire: "#ff6030",
    Ice:  "#60d0ff",
    Wind: "#90ffb0",
  };
  const hud = {
    room: document.getElementById("roomValue"),
    world: document.getElementById("worldValue"),
    element: document.getElementById("elementValue"),
    weapon: document.getElementById("weaponValue"),
    hp: document.getElementById("hpValue"),
    objective: document.getElementById("objectiveValue"),
    startOverlay: document.getElementById("startOverlay"),
    startButton: document.getElementById("startButton"),
    roomToggleButton: document.getElementById("roomToggleButton"),
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

  const toggleRoom = () => {
    if (!scene.scene.isActive()) {
      return;
    }
    scene.toggleRoomMode();
  };

  hud.startButton.addEventListener("click", tryStart);
  hud.roomToggleButton.addEventListener("click", toggleRoom);

  scene.events.once("shutdown", () => {
    hud.startButton.removeEventListener("click", tryStart);
    hud.roomToggleButton.removeEventListener("click", toggleRoom);
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
    },
    setRoomLabel(text) {
      hud.room.textContent = text;
    },
    setRoomModeButtonLabel(text) {
      hud.roomToggleButton.textContent = text;
    },
    setWorldPhase(text) {
      hud.world.textContent = text;
    },
    setElement(text) {
      hud.element.textContent = text;
      hud.element.style.color = ELEMENT_CSS[text] ?? "#c8d0e8";
    },
    setWeapon(text) {
      hud.weapon.textContent = text;
    },
    setHp(hp, maxHp) {
      if (hud.hp) hud.hp.textContent = `${hp} / ${maxHp}`;
    },
  };
}
