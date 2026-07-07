import type { AppData } from './types'
import partsJson from '../data/part-master.json'
import rankBonusJson from '../data/rank-bonus.json'
import routesJson from '../data/route-master.json'
import shipsJson from '../data/ship-data.json'
import voyagesJson from '../data/voyage-data.json'

const parts = partsJson as AppData['parts']
const rankBonus = rankBonusJson as AppData['rankBonus']
const routes = routesJson as AppData['routes']
const ships = shipsJson as AppData['ships']
const voyages = voyagesJson as AppData['voyages']

export const initialData: AppData = {
  parts,
  rankBonus,
  routes,
  ships,
  voyages,
}