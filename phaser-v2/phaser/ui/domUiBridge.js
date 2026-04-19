export function createDomUiBridge(scene, debug = false) {
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
    map: document.getElementById("mapValue"),
    checkpoint: document.getElementById("checkpointValue"),
    hp: document.getElementById("hpValue"),
    hpMeterFill: document.getElementById("hpMeterFill"),
    objective: document.getElementById("objectiveValue"),
    startOverlay: document.getElementById("startOverlay"),
    startButton: document.getElementById("startButton"),
    roomToggleButton: document.getElementById("roomToggleButton"),
    debugTools: document.getElementById("debugTools"),
    touchHud: document.getElementById("touchHud")
  };

  if (debug && hud.debugTools) {
    hud.debugTools.style.display = "";
  }

  hud.world.textContent = "Light";
  hud.element.textContent = "None";
  hud.weapon.textContent = "Shard Blade I";
  hud.objective.textContent = "Reach the Dash Core";
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
    hideStartOverlay(objectiveText = "Reach the Dash Core") {
      hud.startOverlay.classList.add("hidden");
      hud.objective.textContent = objectiveText;
    },
    showStartOverlay() {
      hud.startOverlay.classList.remove("hidden");
      hud.objective.textContent = "Reach the Dash Core";
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
      hud.world.dataset.phase = text.toLowerCase();
    },
    setElement(text) {
      hud.element.textContent = text;
      hud.element.style.color = ELEMENT_CSS[text] ?? "#c8d0e8";
      hud.element.dataset.element = text;
    },
    setWeapon(text) {
      hud.weapon.textContent = text;
      const tierMatch = text.match(/(\d+)/);
      hud.weapon.dataset.weaponTier = tierMatch ? tierMatch[1] : "0";
    },
    setMapSummary(text) {
      if (hud.map) {
        hud.map.textContent = text;
      }
    },
    setCheckpoint(text) {
      if (hud.checkpoint) {
        hud.checkpoint.textContent = text;
      }
    },
    setHp(hp, maxHp) {
      if (hud.hp) {
        hud.hp.textContent = `${hp} / ${maxHp}`;
      }
      if (hud.hpMeterFill) {
        const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
        hud.hpMeterFill.style.width = `${ratio * 100}%`;
        hud.hpMeterFill.dataset.health = ratio <= 0.34 ? "low" : ratio <= 0.67 ? "mid" : "high";
      }
    },
  };
}
