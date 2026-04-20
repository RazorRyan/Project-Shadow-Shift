export interface Entity {
  id: string;
  type: string;
  source: unknown;
  components: Record<string, unknown>;
}

export interface EntityRegistry {
  register(type: string, source: unknown, components?: Record<string, unknown>): Entity;
  clear(): void;
  getByType(type: string): Entity[];
}

export function createEntityRegistry(): EntityRegistry {
  const entities = new Map<string, Entity>();
  const byType = new Map<string, Entity[]>();
  let nextId = 1;

  function register(type: string, source: unknown, components: Record<string, unknown> = {}): Entity {
    const entity: Entity = { id: `${type}-${nextId++}`, type, source, components };
    entities.set(entity.id, entity);
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(entity);
    return entity;
  }

  function clear(): void {
    entities.clear();
    byType.clear();
    nextId = 1;
  }

  function getByType(type: string): Entity[] {
    return byType.get(type) ?? [];
  }

  return { register, clear, getByType };
}
