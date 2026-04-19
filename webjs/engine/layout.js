(function initializeShadowShiftLayout(global) {
  function hashSeed(input) {
    const text = String(input ?? "shadow-shift");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createSeededRng(seedInput) {
    let seed = hashSeed(seedInput) || 1;
    return function nextRandom() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function pickWeightedTemplate(templates, random) {
    const totalWeight = templates.reduce((sum, template) => sum + (template.weight ?? 1), 0);
    if (totalWeight <= 0) {
      return templates[0] ?? null;
    }

    let roll = random() * totalWeight;
    for (const template of templates) {
      roll -= template.weight ?? 1;
      if (roll <= 0) {
        return template;
      }
    }

    return templates[templates.length - 1] ?? null;
  }

  function areConnectionsCompatible(fromTemplate, toTemplate) {
    const fromExits = fromTemplate.connections?.out ?? [];
    const toEntries = toTemplate.connections?.in ?? [];
    return fromExits.some((connection) => toEntries.includes(connection));
  }

  function validateLayoutChain(chain, templatesById, options = {}) {
    const validation = {
      valid: true,
      errors: []
    };

    if (!chain?.length) {
      validation.valid = false;
      validation.errors.push("No chain was generated.");
      return validation;
    }

    if (chain[0]?.role !== "start") {
      validation.valid = false;
      validation.errors.push("Generated chain is missing a start template.");
    }

    if (chain[chain.length - 1]?.role !== "finale") {
      validation.valid = false;
      validation.errors.push("Generated chain is missing a finale template.");
    }

    const meetsRequirements = options.meetsRequirements ?? (() => true);
    const requirementState = options.requirementState ?? null;
    const maxCombatDensity = options.maxCombatDensity ?? Infinity;

    for (let index = 0; index < chain.length; index += 1) {
      const template = templatesById.get(chain[index].templateId);
      if (!template) {
        validation.valid = false;
        validation.errors.push(`Missing template ${chain[index].templateId}.`);
        continue;
      }

      if (!meetsRequirements(template.requirements, requirementState)) {
        validation.valid = false;
        validation.errors.push(`Requirements failed for ${template.id}.`);
      }

      if ((template.combatDensity ?? 0) > maxCombatDensity) {
        validation.valid = false;
        validation.errors.push(`Combat density too high for ${template.id}.`);
      }

      if (index > 0) {
        const previousTemplate = templatesById.get(chain[index - 1].templateId);
        if (!areConnectionsCompatible(previousTemplate, template)) {
          validation.valid = false;
          validation.errors.push(`Connection mismatch between ${previousTemplate.id} and ${template.id}.`);
        }
      }
    }

    return validation;
  }

  function generateRoomChain(roomTemplates, options = {}) {
    const templates = roomTemplates ?? [];
    const random = createSeededRng(options.seed ?? "shadow-shift-layout");
    const chainLength = Math.max(3, options.chainLength ?? 4);
    const meetsRequirements = options.meetsRequirements ?? (() => true);
    const requirementState = options.requirementState ?? null;
    const maxCombatDensity = options.maxCombatDensity ?? 3;
    const desiredTheme = options.theme ?? null;
    const preferCheckpoint = options.preferCheckpoint !== false;
    const templatesById = new Map(templates.map((template) => [template.id, template]));

    const compatibleTemplates = templates.filter((template) => {
      return meetsRequirements(template.requirements, requirementState) && (template.combatDensity ?? 0) <= maxCombatDensity;
    });

    let availableTemplates = compatibleTemplates;
    if (desiredTheme) {
      const themeMatched = compatibleTemplates.filter((template) => (template.themes ?? []).includes(desiredTheme));
      const hasThemeStart = themeMatched.some((template) => template.role === "start");
      const hasThemeFinale = themeMatched.some((template) => template.role === "finale");
      if (themeMatched.length >= 3 && hasThemeStart && hasThemeFinale) {
        availableTemplates = themeMatched;
      }
    }

    const startCandidates = availableTemplates.filter((template) => template.role === "start");
    const finaleCandidates = availableTemplates.filter((template) => template.role === "finale");

    const chain = [];
    const usedTemplateIds = new Set();
    let previousTemplate = pickWeightedTemplate(startCandidates.length ? startCandidates : availableTemplates, random);

    if (!previousTemplate) {
      return {
        seed: String(options.seed ?? "shadow-shift-layout"),
        chain,
        validation: {
          valid: false,
          errors: ["No compatible templates available."]
        }
      };
    }

    chain.push({
      templateId: previousTemplate.id,
      label: previousTemplate.label,
      role: previousTemplate.role
    });
    usedTemplateIds.add(previousTemplate.id);

    for (let index = 1; index < chainLength - 1; index += 1) {
      const needsCheckpoint = preferCheckpoint && index === Math.floor((chainLength - 1) * 0.5);
      const candidates = availableTemplates.filter((template) => {
        if (usedTemplateIds.has(template.id)) {
          return false;
        }
        if (template.role === "start" || template.role === "finale") {
          return false;
        }
        if (needsCheckpoint && !template.checkpointSuitable) {
          return false;
        }
        return areConnectionsCompatible(previousTemplate, template);
      });

      const nextTemplate = pickWeightedTemplate(candidates.length ? candidates : availableTemplates.filter((template) => {
        if (usedTemplateIds.has(template.id) || template.role === "start" || template.role === "finale") {
          return false;
        }
        return areConnectionsCompatible(previousTemplate, template);
      }), random);

      if (!nextTemplate) {
        break;
      }

      chain.push({
        templateId: nextTemplate.id,
        label: nextTemplate.label,
        role: nextTemplate.role
      });
      usedTemplateIds.add(nextTemplate.id);
      previousTemplate = nextTemplate;
    }

    const compatibleFinales = finaleCandidates.filter((template) => areConnectionsCompatible(previousTemplate, template));
    const finaleTemplate = pickWeightedTemplate(compatibleFinales.length ? compatibleFinales : finaleCandidates, random);
    if (finaleTemplate && !usedTemplateIds.has(finaleTemplate.id)) {
      chain.push({
        templateId: finaleTemplate.id,
        label: finaleTemplate.label,
        role: finaleTemplate.role
      });
    }

    const validation = validateLayoutChain(chain, templatesById, {
      meetsRequirements,
      requirementState,
      maxCombatDensity
    });

    return {
      seed: String(options.seed ?? "shadow-shift-layout"),
      chain,
      validation
    };
  }

  global.ShadowShiftLayout = {
    createSeededRng,
    generateRoomChain,
    validateLayoutChain
  };
})(window);
