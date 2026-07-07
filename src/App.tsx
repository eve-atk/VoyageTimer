import { useEffect, useMemo, useState } from 'react'
import { clearAuthSession, consumeAuthCallbackFromHash, getAuthStartUrl, getStoredAuthUser } from './lib/auth'
import { saveRemoteData } from './lib/api'
import { formatRemainingMinutes, getArrivalTime, getEffectiveSpeed, summarizeVoyage } from './lib/calculations'
import { loadAppData, saveAppData } from './lib/storage'
import type { AppData, PartMaster, PartType, RouteMaster, Ship, Voyage } from './types'

type View = 'dashboard' | 'ships' | 'departures'

const partLabels: Record<PartType, string> = {
  hull: '船体',
  stern: '艦尾',
  bow: '艦首',
  bridge: '艦橋',
}

function App() {
  const [data, setData] = useState<AppData>(() => loadAppData())
  const [view, setView] = useState<View>('dashboard')
  const [statusMessage, setStatusMessage] = useState('初期データを読み込みました。')
  const [saving, setSaving] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [authUser, setAuthUser] = useState<string | null>(() => getStoredAuthUser())

  useEffect(() => {
    const result = consumeAuthCallbackFromHash()
    if (result.changed) {
      setAuthUser(result.user ?? null)
      setStatusMessage(`GitHub ユーザー ${result.user ?? ''} でログインしました。`)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date())
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    saveAppData(data)
  }, [data])

  const voyagesByShipId = useMemo(() => {
    return new Map(data.voyages.map((voyage) => [voyage.shipId, voyage]))
  }, [data.voyages])

  const voyageSummaries = useMemo(() => {
    return data.ships.map((ship) => summarizeVoyage(ship, voyagesByShipId.get(ship.id), data.routes, data.parts, data.rankBonus, now))
  }, [data.parts, data.rankBonus, data.routes, data.ships, voyagesByShipId, now])

  const groupedSummaries = useMemo(() => {
    return voyageSummaries.reduce<Record<string, typeof voyageSummaries>>((groups, summary) => {
      const key = summary.ship.account
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(summary)
      return groups
    }, {})
  }, [voyageSummaries])

  async function persist(nextData: AppData, message: string) {
    setData(nextData)
    setStatusMessage(message)
    setSaving(true)
    const result = await saveRemoteData(nextData)
    setSaving(false)
    setStatusMessage(result.message)
  }

  function updateShip(updatedShip: Ship) {
    const nextData = {
      ...data,
      ships: data.ships.map((ship) => (ship.id === updatedShip.id ? updatedShip : ship)),
    }
    void persist(nextData, `${updatedShip.name} の設定を保存しました。`)
  }

  function registerDeparture(shipId: number, routeId: string, departureTime: string) {
    const ship = data.ships.find((item) => item.id === shipId)
    const route = data.routes.find((item) => item.id === routeId)
    if (!ship || !route) {
      setStatusMessage('艦船または航路が見つかりません。')
      return
    }

    const effectiveSpeed = getEffectiveSpeed(ship, data.parts, data.rankBonus)
    const arrivalTime = getArrivalTime(departureTime, route, effectiveSpeed)
    const voyage: Voyage = {
      shipId,
      routeId,
      departureTime,
      arrivalTime,
      notified: false,
    }

    const nextShips = data.ships.map((item) => {
      if (item.id !== shipId) {
        return item
      }

      return {
        ...item,
        lastRouteId: routeId,
      }
    })

    const existing = data.voyages.some((item) => item.shipId === shipId)
    const nextVoyages = existing
      ? data.voyages.map((item) => (item.shipId === shipId ? voyage : item))
      : [...data.voyages, voyage]

    const nextData = {
      ...data,
      ships: nextShips,
      voyages: nextVoyages,
    }

    void persist(nextData, `${ship.name} を ${route.name} に出港登録しました。`)
  }

  function startLogin() {
    window.location.href = getAuthStartUrl()
  }

  function logout() {
    clearAuthSession()
    setAuthUser(null)
    setStatusMessage('ログアウトしました。')
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">FF14 Submarine Ops</p>
          <h1>潜水艦帰港管理ツール</h1>
          <p className="hero-copy">
            艦船設定、出港登録、帰港時刻計算、ダッシュボード確認までをひとつの画面で管理します。
          </p>
        </div>
        <div className="hero-panel">
          <div className="status-badge">{saving ? '保存中...' : statusMessage}</div>
          <p>認証: {authUser ? `${authUser} でログイン中` : '未ログイン'}</p>
          <p>現在時刻: {now.toLocaleString('ja-JP')}</p>
          <div className="summary-row">
            {authUser ? (
              <button className="secondary-button" type="button" onClick={logout}>
                ログアウト
              </button>
            ) : (
              <button className="secondary-button" type="button" onClick={startLogin}>
                GitHubでログイン
              </button>
            )}
          </div>
        </div>
      </header>

      <nav className="nav-tabs" aria-label="Primary navigation">
        {[
          ['dashboard', 'ダッシュボード'],
          ['ships', '艦船設定'],
          ['departures', '出港登録'],
        ].map(([tab, label]) => (
          <button
            key={tab}
            className={view === tab ? 'tab is-active' : 'tab'}
            onClick={() => setView(tab as View)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="content-grid">
        {view === 'dashboard' && (
          <section className="panel stack-gap">
            {Object.entries(groupedSummaries).map(([account, summaries]) => (
              <div key={account} className="stack-gap">
                <div className="section-header">
                  <h2>{account}</h2>
                  <span>{summaries.length}隻</span>
                </div>
                <div className="summary-grid">
                  {summaries.map((summary) => (
                    <article key={summary.ship.id} className={summary.hasArrived ? 'summary-card is-arrived' : 'summary-card'}>
                      <div className="summary-row">
                        <h3>{summary.ship.name}</h3>
                        <span className="pill">Rank {summary.ship.rank}</span>
                      </div>
                      <p>現在航路: {summary.route?.name ?? '未出港'}</p>
                      <p>{formatRemainingMinutes(summary.remainingMinutes)}</p>
                      <p>実行速度: {summary.effectiveSpeed}</p>
                      <p>帰港時刻: {summary.voyage ? new Date(summary.voyage.arrivalTime).toLocaleString('ja-JP') : '-'}</p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {view === 'ships' && (
          <section className="panel stack-gap">
            <div className="section-header">
              <h2>艦船設定</h2>
              <span>最大8隻を想定</span>
            </div>
            {data.ships.map((ship) => (
              <ShipEditor key={ship.id} ship={ship} parts={data.parts} onSave={updateShip} />
            ))}
          </section>
        )}

        {view === 'departures' && (
          <section className="panel stack-gap">
            <div className="section-header">
              <h2>出港登録</h2>
              <span>前回航路の再利用に対応</span>
            </div>
            {data.ships.map((ship) => (
              <DepartureEditor
                key={ship.id}
                ship={ship}
                routes={data.routes}
                currentVoyage={voyagesByShipId.get(ship.id)}
                onSubmit={registerDeparture}
              />
            ))}
          </section>
        )}

      </main>
    </div>
  )
}

interface ShipEditorProps {
  ship: Ship
  parts: PartMaster[]
  onSave: (ship: Ship) => void
}

function ShipEditor({ ship, parts, onSave }: ShipEditorProps) {
  const [draft, setDraft] = useState(ship)

  useEffect(() => {
    setDraft(ship)
  }, [ship])

  return (
    <form
      className="editor-card"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(draft)
      }}
    >
      <div className="section-header">
        <h3>{ship.name}</h3>
        <span>{ship.account}</span>
      </div>
      <div className="form-grid">
        <label>
          艦名
          <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <label>
          アカウント
          <input value={draft.account} onChange={(event) => setDraft({ ...draft, account: event.target.value })} />
        </label>
        <label>
          ランク
          <input
            type="number"
            value={draft.rank}
            onChange={(event) => setDraft({ ...draft, rank: Number(event.target.value) })}
          />
        </label>
        {(['hull', 'stern', 'bow', 'bridge'] as PartType[]).map((partType) => (
          <label key={partType}>
            {partLabels[partType]}
            <select
              value={draft.parts[partType]}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  parts: {
                    ...draft.parts,
                    [partType]: event.target.value,
                  },
                })
              }
            >
              {parts
                .filter((part) => part.type === partType)
                .map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.name}
                  </option>
                ))}
            </select>
          </label>
        ))}
      </div>
      <button className="primary-button" type="submit">
        艦船設定を保存
      </button>
    </form>
  )
}

interface DepartureEditorProps {
  ship: Ship
  routes: RouteMaster[]
  currentVoyage?: Voyage
  onSubmit: (shipId: number, routeId: string, departureTime: string) => void
}

function DepartureEditor({ ship, routes, currentVoyage, onSubmit }: DepartureEditorProps) {
  const defaultDepartureTime = new Date().toISOString().slice(0, 16)
  const [routeId, setRouteId] = useState(ship.lastRouteId)
  const [departureTime, setDepartureTime] = useState(defaultDepartureTime)

  useEffect(() => {
    setRouteId(ship.lastRouteId)
  }, [ship.lastRouteId])

  return (
    <form
      className="editor-card"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(ship.id, routeId, new Date(departureTime).toISOString())
      }}
    >
      <div className="section-header">
        <h3>{ship.name}</h3>
        <span>前回航路: {ship.lastRouteId}</span>
      </div>
      <div className="form-grid">
        <label>
          航路
          <select value={routeId} onChange={(event) => setRouteId(event.target.value)}>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          出港時刻
          <input type="datetime-local" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} />
        </label>
      </div>
      <p className="helper-text">
        現在の登録: {currentVoyage ? new Date(currentVoyage.arrivalTime).toLocaleString('ja-JP') : '未登録'}
      </p>
      <button className="primary-button" type="submit">
        出港登録
      </button>
    </form>
  )
}

export default App