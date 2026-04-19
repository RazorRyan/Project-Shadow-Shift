/**
 * Dialogue renderer — creates a DOM overlay and drives a conversation.
 */
export function createDialogueRenderer() {
  const box = document.createElement("div");
  box.id = "dialogue-box";
  box.className = "dialogue-box";

  const speaker = document.createElement("div");
  speaker.className = "dialogue-speaker";

  const text = document.createElement("div");
  const hint = document.createElement("div");
  hint.className = "dialogue-hint";
  hint.textContent = "[Space / Z] Continue";

  box.append(speaker, text, hint);
  document.body.appendChild(box);

  let lines  = [];
  let cursor = 0;
  let active = false;
  let onDone = null;
  let currentSpeaker = "";

  function showLine() {
    const line = lines[cursor];
    speaker.textContent = line.speaker ?? currentSpeaker;
    text.textContent    = line.text ?? "";
    hint.textContent    = cursor < lines.length - 1 ? "[Space / Z] Continue" : "[Space / Z] Close";
  }

  return {
    isActive() {
      return active;
    },

    start(dialogueLines, options = {}) {
      if (!dialogueLines?.length) return;
      lines  = dialogueLines;
      cursor = 0;
      active = true;
      currentSpeaker = options.speaker ?? "";
      onDone = options.doneCb ?? null;
      box.classList.add("is-visible");
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
      box.classList.remove("is-visible");
      lines  = [];
      cursor = 0;
      currentSpeaker = "";
      if (onDone) {
        const cb = onDone;
        onDone = null;
        cb();
      }
    },
  };
}
