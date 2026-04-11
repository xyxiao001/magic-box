import { readStorage, writeStorage } from '@/lib/storage'

const FAVORITES_DOMAIN = 'favorites'
const LEGACY_FAVORITES_KEY = 'magic-box.favorite-modules'

export const defaultFavoriteToolIds = ['time-lab', 'json-toolkit']

function parseLegacyFavoriteIds(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown

    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      return undefined
    }

    return parsed
  } catch {
    return undefined
  }
}

export function readFavoriteToolIds(validToolIds: string[]) {
  const favorites = readStorage<string[]>(FAVORITES_DOMAIN, defaultFavoriteToolIds, {
    legacyKeys: [LEGACY_FAVORITES_KEY],
    parseLegacy: (raw) => parseLegacyFavoriteIds(raw),
  })

  return favorites.filter((id, index) => validToolIds.includes(id) && favorites.indexOf(id) === index)
}

export function writeFavoriteToolIds(favoriteToolIds: string[]) {
  writeStorage(FAVORITES_DOMAIN, favoriteToolIds)
}
