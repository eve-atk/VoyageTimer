import type { PartMaster, RankBonus, RouteMaster, Ship, Voyage, VoyageSummary } from '../types'

function findPartSpeed(partId: string, parts: PartMaster[]): number {
  return parts.find((part) => part.id === partId)?.speed ?? 0
}

export function getRankSpeedBonus(rank: number, rankBonus: RankBonus): number {
  return rankBonus[String(rank)] ?? 0
}

export function getEffectiveSpeed(ship: Ship, parts: PartMaster[], rankBonus: RankBonus): number {
  const partsSpeed = Object.values(ship.parts).reduce((total, partId) => total + findPartSpeed(partId, parts), 0)
  return partsSpeed + getRankSpeedBonus(ship.rank, rankBonus)
}

export function getTravelMinutes(route: RouteMaster, effectiveSpeed: number): number {
  if (effectiveSpeed <= 0) {
    return route.baseDurationMinutes
  }

  return Math.round(route.baseDurationMinutes * (route.baseSpeed / effectiveSpeed))
}

export function getArrivalTime(departureTime: string, route: RouteMaster, effectiveSpeed: number): string {
  const departure = new Date(departureTime)
  const travelMinutes = getTravelMinutes(route, effectiveSpeed)
  const arrival = new Date(departure.getTime() + travelMinutes * 60 * 1000)
  return arrival.toISOString()
}

export function summarizeVoyage(
  ship: Ship,
  voyage: Voyage | undefined,
  routes: RouteMaster[],
  parts: PartMaster[],
  rankBonus: RankBonus,
  now: Date,
): VoyageSummary {
  const route = voyage ? routes.find((item) => item.id === voyage.routeId) : undefined
  const effectiveSpeed = getEffectiveSpeed(ship, parts, rankBonus)
  const arrivalTime = voyage ? new Date(voyage.arrivalTime) : undefined
  const remainingMinutes = arrivalTime ? Math.ceil((arrivalTime.getTime() - now.getTime()) / 60000) : 0

  return {
    ship,
    route,
    voyage,
    remainingMinutes,
    hasArrived: arrivalTime ? remainingMinutes <= 0 : false,
    effectiveSpeed,
  }
}

export function formatRemainingMinutes(remainingMinutes: number): string {
  if (remainingMinutes <= 0) {
    return '帰港済み'
  }

  const days = Math.floor(remainingMinutes / (60 * 24))
  const hours = Math.floor((remainingMinutes % (60 * 24)) / 60)
  const minutes = remainingMinutes % 60
  const segments: string[] = []

  if (days > 0) {
    segments.push(`${days}日`)
  }
  if (hours > 0) {
    segments.push(`${hours}時間`)
  }
  if (minutes > 0 || segments.length === 0) {
    segments.push(`${minutes}分`)
  }

  return `残り ${segments.join('')}`
}