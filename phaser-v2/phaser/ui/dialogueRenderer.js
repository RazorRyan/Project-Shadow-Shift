/**
 * Dialogue renderer — creates a DOM overlay and drives a conversation.
 */
export function createDialogueRenderer() {
  const box = document.createElement("div");
  box.id = "dialogue-box";
  Object.assign(box.style, {
    position:        "fixed",
    bottom:          "90px",
    left:            "50%",
    transform:       "translateX(-50%)",
    width:           "680px",
    background:      "rgba(10,12,20,0.92)",
    border:          "2px solid #4a6fa8",
    borderRadius:    "8px",
    padding:         "18px 24px",
    color:           "#e0e8ff",
    fontFamily:      "monospace",
    fontSize:        "14px",
    lineHeight:      "1.55",
    display:         "none",
    zIndex:          "9999",
    userSelect:      "none",
    pointerEvents:   "none",
  });

  const speaker = document.createElement("div");
  Object.assign(speaker.style, { fontWeight: "bold", color: "#a0c4ff", marginBottom: "6px" });

  const text = document.createElement("div");
  const hint = document.createElement("div");
  Object.assign(hint.style, { marginTop: "10px", color: "#6a7faa", fontSize: "12px" });
  hint.textContent = "[Space / Z] Continue";

  box.append(speaker, text, hint);
  document.body.appendChild(box);

  let lines  = [];
  let cursor = 0;
  let active = false;
  let onDone = null;

  function showLine() {
    const line = lines[cursor];
    speaker.textContent = line.speaker ?? "";
    text.textContent    = line.text ?? "";
    hint.textContent    = cursor < lines.length - 1 ? "[Space / Z] Continue" : "[Space / Z] Close";
  }

  return {
    isActive() {
      return active;
    },

    start(dialogueLines, doneCb) {
      if (!dialogueLines?.length) return;
      lines  = dialogueLines;
      cursor = 0;
      active = true;
      onDone = doneCb ?? null;
      box.style.display = "block";
      showLine();
    },

    advance() {
      if (!active) return;
      cursor += 1;
      if (cursor >= lines.length) {
        this.close();
      } else {
        showLine();
      }
    },

    close() {
      active = false;
      box.style.display = "none";
      lines  = [];
      cursor = 0;
      if (onDone) {
        const cb = onDone;
        onDone = null;
        cb();
      }
    },
  };
}
