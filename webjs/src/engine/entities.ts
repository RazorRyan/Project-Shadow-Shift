export interface Entity {
  id: string;
  type: string;
  source: any;
  components: Record<string, any>;
}

export interface EntityRegistry {
  register(type: string, source: any, components?: Record<string, any>): Entity;
  clear(): void;
  getByType(type: string): Entity[];
}

export function createEntityRegistry(): EntityRegistry {
  const entities = new Map<string, Entity>();
  const byType = new Map<string, Entity[]>();
  let nextId = 1;

  function register(type: string, source: any, components: Record<string, any> = {}): Entity {
    const entity: Entity = { id: `${type}-${nextId++}`, type, source, components };
    entities.set(entity.id, entity);
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(entity);
    return entity;
  }

  function clear() {
    entities.clear();
    byType.clear();
    nextId = 1;
  }

  function getByType(type: string): Entity[] {
    return byType.get(type) ?? [];
  }

  return { register, clear, getByType };
}
