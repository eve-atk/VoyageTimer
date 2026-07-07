export type PartType = 'hull' | 'stern' | 'bow' | 'bridge'

export interface PartMaster {
  id: string
  type: PartType
  name: string
  requiredRank: number
  surveillance: number
  retrieval: number
  speed: number
  range: number
  favor: number
}

export interface RouteMaster {
  id: string
  name: string
  baseSpeed: number
  baseDurationMinutes: number
}

export interface RankBonus {
  [rank: string]: number
}

export interface ShipParts {
  hull: string
  stern: string
  bow: string
  bridge: string
}

export interface Ship {
  id: number
  account: string
  name: string
  rank: number
  parts: ShipParts
  lastRouteId: string
}

export interface Voyage {
  shipId: number
  routeId: string
  departureTime: string
  arrivalTime: string
  notified: boolean
}

export interface AppData {
  parts: PartMaster[]
  rankBonus: RankBonus
  routes: RouteMaster[]
  ships: Ship[]
  voyages: Voyage[]
}

export interface VoyageSummary {
  ship: Ship
  route?: RouteMaster
  voyage?: Voyage
  remainingMinutes: number
  hasArrived: boolean
  effectiveSpeed: number
}