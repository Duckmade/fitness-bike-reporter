export type PublicStatsPeriod = '7d' | '30d' | 'all'

export function getPublicStatsPeriodStart(period: PublicStatsPeriod, now = Date.now()) {
  if (period === 'all') return null

  const days = period === '7d' ? 7 : 30
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString()
}

export function getConversionRate(visits: number, submissions: number) {
  return visits > 0 ? submissions / visits * 100 : null
}

