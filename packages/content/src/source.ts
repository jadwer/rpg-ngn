/**
 * Acceso a archivos abstracto. packages/* no importa node:fs (ADR D8);
 * tools/validate y apps/* implementan esto con fs, fetch o un zip.
 * Las rutas son relativas al directorio raiz del pack, con `/`.
 */
export interface FileSource {
  readText(path: string): Promise<string>
  exists(path: string): Promise<boolean>
  /** Nombres de archivo (sin directorio) dentro de `dir`; [] si no existe. */
  list(dir: string): Promise<string[]>
}

export async function readJson(source: FileSource, path: string): Promise<unknown> {
  const text = await source.readText(path)
  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    throw new Error(`${path}: JSON invalido (${(error as Error).message})`)
  }
}

/** FileSource en memoria, para tests y para packs ya descomprimidos. */
export function memorySource(files: Record<string, string>): FileSource {
  const normalized = new Map(Object.entries(files).map(([k, v]) => [k.replace(/^\.?\//, ''), v]))
  return {
    async readText(path) {
      const value = normalized.get(path)
      if (value === undefined) throw new Error(`${path}: no existe`)
      return value
    },
    async exists(path) {
      return normalized.has(path)
    },
    async list(dir) {
      const prefix = dir.replace(/\/?$/, '/')
      return [...normalized.keys()].filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/')).map((k) => k.slice(prefix.length))
    },
  }
}
