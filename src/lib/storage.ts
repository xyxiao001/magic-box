export interface StorageAdapter {
  get<T>(key: string, fallback: T): T
  set<T>(key: string, value: T): void
  remove(key: string): void
}

export interface ReadStorageOptions<T> {
  adapter?: StorageAdapter
  legacyKeys?: string[]
  parseLegacy?: (raw: string, legacyKey: string) => T | undefined
  removeLegacyKey?: boolean
}

const STORAGE_PREFIX = 'magic-box'
const STORAGE_VERSION = 'v1'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function parseStoredValue<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const localStorageAdapter: StorageAdapter = {
  get<T>(key: string, fallback: T) {
    if (!canUseStorage()) {
      return fallback
    }

    const raw = window.localStorage.getItem(key)
    if (raw === null) {
      return fallback
    }

    return parseStoredValue(raw, fallback)
  },
  set<T>(key: string, value: T) {
    if (!canUseStorage()) {
      return
    }

    window.localStorage.setItem(key, JSON.stringify(value))
  },
  remove(key: string) {
    if (!canUseStorage()) {
      return
    }

    window.localStorage.removeItem(key)
  },
}

export function createScopedKey(domain: string) {
  return `${STORAGE_PREFIX}:${STORAGE_VERSION}:${domain}`
}

export function readStorage<T>(
  domain: string,
  fallback: T,
  options: ReadStorageOptions<T> = {}
) {
  const adapter = options.adapter ?? localStorageAdapter
  const key = createScopedKey(domain)
  const currentValue = adapter.get<T | undefined>(key, undefined)

  if (currentValue !== undefined) {
    return currentValue
  }

  if (!canUseStorage() || !options.legacyKeys?.length) {
    return fallback
  }

  for (const legacyKey of options.legacyKeys) {
    const raw = window.localStorage.getItem(legacyKey)

    if (raw === null) {
      continue
    }

    const migratedValue = options.parseLegacy
      ? options.parseLegacy(raw, legacyKey)
      : parseStoredValue(raw, fallback)

    if (migratedValue === undefined) {
      continue
    }

    adapter.set(key, migratedValue)

    if (options.removeLegacyKey !== false) {
      window.localStorage.removeItem(legacyKey)
    }

    return migratedValue
  }

  return fallback
}

export function writeStorage<T>(domain: string, value: T, adapter: StorageAdapter = localStorageAdapter) {
  adapter.set(createScopedKey(domain), value)
}

export function removeStorage(domain: string, adapter: StorageAdapter = localStorageAdapter) {
  adapter.remove(createScopedKey(domain))
}
