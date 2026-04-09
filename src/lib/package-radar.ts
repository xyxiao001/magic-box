export interface PackageSearchItem {
  name: string
  version: string
  description: string
  date: string
  npmUrl: string
}

export interface PackageVersionEntry {
  version: string
  publishedAt: string
}

export interface PackageLink {
  label: string
  url: string
}

export interface PackageDetail {
  name: string
  description: string
  latestVersion: string
  license: string
  publishedAt: string
  maintainers: string[]
  recentVersions: PackageVersionEntry[]
  links: PackageLink[]
}

interface NpmSearchResponse {
  objects?: Array<{
    package?: {
      name?: string
      version?: string
      description?: string
      date?: string
      links?: {
        npm?: string
      }
    }
  }>
}

interface NpmPackageManifest {
  name?: string
  description?: string
  license?: string
  homepage?: string
  repository?: string | { url?: string }
  maintainers?: Array<{ name?: string }>
  time?: Record<string, string>
  'dist-tags'?: Record<string, string>
}

export function buildInstallCommands(name: string) {
  return {
    npm: `npm install ${name}`,
    pnpm: `pnpm add ${name}`,
    yarn: `yarn add ${name}`,
  }
}

export function buildPackageSearchUrl(query: string) {
  return `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=8`
}

export function buildPackageDetailUrl(name: string) {
  return `https://registry.npmjs.org/${encodeURIComponent(name)}`
}

export function formatPackageDate(raw: string | undefined) {
  if (!raw) {
    return '未知'
  }

  const date = new Date(raw)

  if (Number.isNaN(date.getTime())) {
    return '未知'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function normalizeRepositoryUrl(raw: string | { url?: string } | undefined) {
  const source = typeof raw === 'string' ? raw : raw?.url

  if (!source) {
    return ''
  }

  return source
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\.git$/, '')
}

export function buildPackageLinks(
  name: string,
  homepage: string | undefined,
  repository: string | { url?: string } | undefined
) {
  const links: PackageLink[] = [
    {
      label: 'npm',
      url: `https://www.npmjs.com/package/${name}`,
    },
  ]

  if (homepage) {
    links.push({
      label: 'homepage',
      url: homepage,
    })
  }

  const repositoryUrl = normalizeRepositoryUrl(repository)

  if (repositoryUrl) {
    links.push({
      label: 'repository',
      url: repositoryUrl,
    })
  }

  return links
}

export function extractRecentVersions(time: Record<string, string> | undefined, limit = 6) {
  if (!time) {
    return []
  }

  return Object.entries(time)
    .filter(([version]) => version !== 'created' && version !== 'modified')
    .map(([version, publishedAt]) => ({
      version,
      publishedAt,
    }))
    .sort(
      (left, right) =>
        new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
    )
    .slice(0, limit)
}

export function normalizePackageSearchResults(payload: NpmSearchResponse) {
  return (payload.objects ?? [])
    .map((item) => item.package)
    .filter((pkg): pkg is NonNullable<typeof pkg> => Boolean(pkg?.name))
    .map((pkg) => ({
      name: pkg.name ?? '',
      version: pkg.version ?? '未知',
      description: pkg.description ?? '暂无描述',
      date: formatPackageDate(pkg.date),
      npmUrl: pkg.links?.npm ?? `https://www.npmjs.com/package/${pkg.name}`,
    }))
}

export function normalizePackageDetail(payload: NpmPackageManifest): PackageDetail {
  const latestVersion = payload['dist-tags']?.latest ?? '未知'
  const latestPublishedAt = payload.time?.[latestVersion]

  return {
    name: payload.name ?? '',
    description: payload.description ?? '暂无描述',
    latestVersion,
    license: payload.license ?? '未知',
    publishedAt: formatPackageDate(latestPublishedAt),
    maintainers: (payload.maintainers ?? [])
      .map((maintainer) => maintainer.name ?? '')
      .filter(Boolean),
    recentVersions: extractRecentVersions(payload.time),
    links: buildPackageLinks(payload.name ?? '', payload.homepage, payload.repository),
  }
}
