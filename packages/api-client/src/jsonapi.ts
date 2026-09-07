/**
 * Lo justo de JSON:API para aplanar `data` e `included` a objetos planos.
 * No es un cliente JSON:API completo: la app no necesita links ni meta.
 */

export interface ResourceIdentifier {
  type: string
  id: string
}

export interface Resource {
  type: string
  id: string
  attributes?: Record<string, unknown>
  relationships?: Record<string, { data?: ResourceIdentifier | ResourceIdentifier[] | null }>
}

export interface Document<T extends Resource | Resource[] = Resource | Resource[]> {
  data: T
  included?: Resource[]
}

export class Included {
  private readonly index = new Map<string, Resource>()

  constructor(resources: Resource[] | undefined) {
    for (const resource of resources ?? []) this.index.set(key(resource), resource)
  }

  get(identifier: ResourceIdentifier | null | undefined): Resource | null {
    return identifier ? (this.index.get(key(identifier)) ?? null) : null
  }
}

function key(identifier: ResourceIdentifier): string {
  return `${identifier.type}:${identifier.id}`
}

export function relationOne(resource: Resource, name: string): ResourceIdentifier | null {
  const data = resource.relationships?.[name]?.data
  return data && !Array.isArray(data) ? data : null
}

export function relationMany(resource: Resource, name: string): ResourceIdentifier[] {
  const data = resource.relationships?.[name]?.data
  return Array.isArray(data) ? data : []
}

export function attr<T>(resource: Resource | null, name: string, fallback: T): T {
  const value = resource?.attributes?.[name]
  return value === undefined || value === null ? fallback : (value as T)
}
