(function initializeShadowShiftEntities(global) {
  function createEntityRegistry() {
    const entities = new Map();
    const byType = new Map();
    let nextId = 1;

    function register(type, source, components = {}) {
      const entity = {
        id: `${type}-${nextId++}`,
        type,
        source,
        components
      };
      entities.set(entity.id, entity);
      if (!byType.has(type)) {
        byType.set(type, []);
      }
      byType.get(type).push(entity);
      return entity;
    }

    function clear() {
      entities.clear();
      byType.clear();
      nextId = 1;
    }

    function getByType(type) {
      return byType.get(type) ?? [];
    }

    return {
      register,
      clear,
      getByType
    };
  }

  global.ShadowShiftEntities = {
    createEntityRegistry
  };
})(window);
