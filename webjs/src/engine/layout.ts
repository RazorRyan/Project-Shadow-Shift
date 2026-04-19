import { meetsRequirements } from "./world";

function hashSeed(input: any): number {
  const text = String(input ?? "shadow-shift");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRng(seedInput: any): () => number {
  let seed = hashSeed(seedInput) || 1;
  return function nextRandom() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function pickWeightedTemplate(templates: any[], random: () => number) {
  const total = templates.reduce((s, t) => s + (t.weight ?? 1), 0);
  if (total <= 0) return templates[0] ?? null;
  let roll = random() * total;
  for (const t of templates) {
    roll -= t.weight ?? 1;
    if (roll <= 0) return t;
  }
  return templates[templates.length - 1] ?? null;
}

function areConnectionsCompatible(from: any, to: any): boolean {
  const exits = from.connections?.out ?? [];
  const entries = to.connections?.in ?? [];
  return exits.some((c: string) => entries.includes(c));
}

export function validateLayoutChain(chain: any[], templatesById: Map<string, any>, options: any = {}) {
  const validation: { valid: boolean; errors: string[] } = { valid: true, errors: [] };
  if (!chain?.length) { validation.valid = false; validation.errors.push("No chain was generated."); return validation; }
  if (chain[0]?.role !== "start") { validation.valid = false; validation.errors.push("Generated chain is missing a start template."); }
  if (chain[chain.length - 1]?.role !== "finale") { validation.valid = false; validation.errors.push("Generated chain is missing a finale template."); }

  const req = options.meetsRequirements ?? (() => true);
  const rs = options.requirementState ?? null;
  const maxDensity = options.maxCombatDensity ?? Infinity;

  for (let i = 0; i < chain.length; i++) {
    const t = templatesById.get(chain[i].templateId);
    if (!t) { validation.valid = false; validation.errors.push(`Missing template ${chain[i].templateId}.`); continue; }
    if (!req(t.requirements, rs)) { validation.valid = false; validation.errors.push(`Requirements failed for ${t.id}.`); }
    if ((t.combatDensity ?? 0) > maxDensity) { validation.valid = false; validation.errors.push(`Combat density too high for ${t.id}.`); }
    if (i > 0) {
      const prev = templatesById.get(chain[i - 1].templateId);
      if (!areConnectionsCompatible(prev, t)) { validation.valid = false; validation.errors.push(`Connection mismatch between ${prev.id} and ${t.id}.`); }
    }
  }
  return validation;
}

export function generateRoomChain(roomTemplates: any[], options: any = {}) {
  const templates = roomTemplates ?? [];
  const random = createSeededRng(options.seed ?? "shadow-shift-layout");
  const chainLength = Math.max(3, options.chainLength ?? 4);
  const req = options.meetsRequirements ?? meetsRequirements;
  const rs = options.requirementState ?? null;
  const maxDensity = options.maxCombatDensity ?? 3;
  const desiredTheme = options.theme ?? null;
  const preferCheckpoint = options.preferCheckpoint !== false;
  const byId = new Map(templates.map((t) => [t.id, t]));

  let available = templates.filter((t) => req(t.requirements, rs) && (t.combatDensity ?? 0) <= maxDensity);
  if (desiredTheme) {
    const themed = available.filter((t) => (t.themes ?? []).includes(desiredTheme));
    if (themed.length >= 3 && themed.some((t: any) => t.role === "start") && themed.some((t: any) => t.role === "finale")) {
      available = themed;
    }
  }

  const starts = available.filter((t) => t.role === "start");
  const finales = available.filter((t) => t.role === "finale");
  const chain: any[] = [];
  const used = new Set<string>();
  let prev = pickWeightedTemplate(starts.length ? starts : available, random);

  if (!prev) {
    return { seed: String(options.seed ?? "shadow-shift-layout"), chain, validation: { valid: false, errors: ["No compatible templates available."] } };
  }

  chain.push({ templateId: prev.id, label: prev.label, role: prev.role });
  used.add(prev.id);

  for (let i = 1; i < chainLength - 1; i++) {
    const needsCheckpoint = preferCheckpoint && i === Math.floor((chainLength - 1) * 0.5);
    let candidates = available.filter((t) => {
      if (used.has(t.id) || t.role === "start" || t.role === "finale") return false;
      if (needsCheckpoint && !t.checkpointSuitable) return false;
      return areConnectionsCompatible(prev, t);
    });
    if (!candidates.length) {
      candidates = available.filter((t) => !used.has(t.id) && t.role !== "start" && t.role !== "finale" && areConnectionsCompatible(prev, t));
    }
    const next = pickWeightedTemplate(candidates, random);
    if (!next) break;
    chain.push({ templateId: next.id, label: next.label, role: next.role });
    used.add(next.id);
    prev = next;
  }

  const compatibleFinales = finales.filter((t) => areConnectionsCompatible(prev, t));
  const finale = pickWeightedTemplate(compatibleFinales.length ? compatibleFinales : finales, random);
  if (finale && !used.has(finale.id)) {
    chain.push({ templateId: finale.id, label: finale.label, role: finale.role });
  }

  const validation = validateLayoutChain(chain, byId, { meetsRequirements: req, requirementState: rs, maxCombatDensity: maxDensity });
  return { seed: String(options.seed ?? "shadow-shift-layout"), chain, validation };
}

export const PROCEDURAL_ROOM_TEMPLATES = [
  { id: "rampart-breach",    label: "Rampart Breach",    role: "start",  themes: ["rampart", "ash"],            connections: { in: ["entry"],                           out: ["ground", "climb"] },             requirements: null,                      combatDensity: 1, checkpointSuitable: false, weight: 2 },
  { id: "shadow-span",       label: "Shadow Span",       role: "mid",    themes: ["rampart", "galleries"],      connections: { in: ["ground", "climb"],                 out: ["ground", "shadow"] },            requirements: { abilities: ["ShadowSwap"] }, combatDensity: 1, checkpointSuitable: false, weight: 2 },
  { id: "dash-crucible",     label: "Dash Crucible",     role: "mid",    themes: ["ash", "galleries"],          connections: { in: ["ground", "shadow", "climb"],       out: ["ground", "climb"] },             requirements: { abilities: ["Dash"] },   combatDensity: 2, checkpointSuitable: false, weight: 3 },
  { id: "ember-gauntlet",    label: "Ember Gauntlet",    role: "mid",    themes: ["ash"],                       connections: { in: ["ground", "climb"],                 out: ["ground", "checkpoint"] },        requirements: { element: "Fire" },       combatDensity: 3, checkpointSuitable: false, weight: 1 },
  { id: "galleries-rest",    label: "Galleries Rest",    role: "mid",    themes: ["galleries", "ash"],          connections: { in: ["ground", "checkpoint", "climb"],   out: ["ground", "climb", "checkpoint"] }, requirements: null,                    combatDensity: 1, checkpointSuitable: true,  weight: 2 },
  { id: "reliquary-ascent",  label: "Reliquary Ascent",  role: "mid",    themes: ["galleries", "boss"],         connections: { in: ["ground", "climb", "checkpoint"],   out: ["ground", "climb"] },             requirements: { minWeaponStage: 1 },     combatDensity: 2, checkpointSuitable: true,  weight: 2 },
  { id: "eclipse-approach",  label: "Eclipse Approach",  role: "finale", themes: ["boss", "galleries"],         connections: { in: ["ground", "climb", "checkpoint"],   out: ["exit"] },                        requirements: null,                      combatDensity: 2, checkpointSuitable: false, weight: 2 }
];
