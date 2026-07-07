import { useEffect, useMemo, useRef, useState } from 'react'
import {
  clearAuthSession,
  consumeAuthCallbackFromHash,
  fetchAuthSession,
  getAuthStartUrl,
  getCurrentAppUrl,
  getLogoutUrl,
} from './lib/auth'
import { saveRemoteData } from './lib/api'
import { formatRemainingMinutes, getArrivalTime, getEffectiveSpeed, summarizeVoyage } from './lib/calculations'
import { loadAppData, loadLatestAppData, saveAppData } from './lib/storage'
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
  const [shipSettingsDirty, setShipSettingsDirty] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [authUser, setAuthUser] = useState<string | null>(null)
  const committedDataRef = useRef<AppData>(loadAppData())

  useEffect(() => {
    const callbackResult = consumeAuthCallbackFromHash()
    if (callbackResult.changed) {
      if (callbackResult.user) {
        setAuthUser(callbackResult.user)
      }
      setStatusMessage('ログインが完了しました。')
      return
    }

    fetchAuthSession().then((session) => {
      if (session.isAuthenticated && session.user) {
        setAuthUser(session.user)
      }
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    void loadLatestAppData().then((remoteData) => {
      if (cancelled || !remoteData) {
        return
      }

      setData(remoteData)
      committedDataRef.current = remoteData
      setShipSettingsDirty(false)
    })

    return () => {
      cancelled = true
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

  function discardShipSettingsChanges() {
    setData(committedDataRef.current)
    setShipSettingsDirty(false)
    setStatusMessage('未保存の艦船設定変更を破棄しました。')
  }

  const hasUnsavedShipChanges = shipSettingsDirty

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedShipChanges) {
        return
      }

      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedShipChanges])

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

    if (result.ok) {
      committedDataRef.current = nextData
      setShipSettingsDirty(false)
    }
  }

  function confirmNavigation(nextView: View): boolean {
    if (!hasUnsavedShipChanges || nextView === view) {
      return true
    }

    return window.confirm('艦船設定に未保存の変更があります。保存せずに移動しますか？')
  }

  function navigateToView(nextView: View) {
    if (!confirmNavigation(nextView)) {
      return
    }

    if (hasUnsavedShipChanges) {
      discardShipSettingsChanges()
    }

    setView(nextView)
  }

  function updateShipDraft(updatedShip: Ship) {
    setData((currentData) => ({
      ...currentData,
      ships: currentData.ships.map((ship) => (ship.id === updatedShip.id ? updatedShip : ship)),
    }))
    setShipSettingsDirty(true)
  }

  function saveShipSettings() {
    if (!shipSettingsDirty) {
      setStatusMessage('保存する変更はありません。')
      return
    }

    void persist(data, '艦船設定を保存しました。')
  }

  function deleteShip(shipId: number) {
    const target = data.ships.find((ship) => ship.id === shipId)
    if (!target) {
      return
    }

    setData((currentData) => ({
      ...currentData,
      ships: currentData.ships.filter((ship) => ship.id !== shipId),
      voyages: currentData.voyages.filter((voyage) => voyage.shipId !== shipId),
    }))
    setShipSettingsDirty(true)
    setStatusMessage(`${target.name} を削除しました。保存してください。`)
  }

  function moveShip(shipId: number, direction: 'up' | 'down') {
    const index = data.ships.findIndex((ship) => ship.id === shipId)
    if (index < 0) {
      return
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= data.ships.length) {
      return
    }

    const nextShips = [...data.ships]
    const [moved] = nextShips.splice(index, 1)
    nextShips.splice(targetIndex, 0, moved)

    setData({
      ...data,
      ships: nextShips,
    })
    setShipSettingsDirty(true)
    setStatusMessage(`${moved.name} の表示順を変更しました。保存してください。`)
  }

  function addShip(account: string, name: string, rank: number) {
    const hull = data.parts.find((part) => part.type === 'hull')?.id
    const stern = data.parts.find((part) => part.type === 'stern')?.id
    const bow = data.parts.find((part) => part.type === 'bow')?.id
    const bridge = data.parts.find((part) => part.type === 'bridge')?.id
    const defaultRouteId = data.routes[0]?.id

    if (!hull || !stern || !bow || !bridge || !defaultRouteId) {
      setStatusMessage('初期パーツまたは初期航路が不足しているため、艦船を追加できません。')
      return
    }

    const nextId = data.ships.reduce((maxId, ship) => Math.max(maxId, ship.id), 0) + 1
    const nextShip: Ship = {
      id: nextId,
      account,
      name,
      rank,
      parts: {
        hull,
        stern,
        bow,
        bridge,
      },
      lastRouteId: defaultRouteId,
    }

    setData((currentData) => ({
      ...currentData,
      ships: [...currentData.ships, nextShip],
    }))
    setShipSettingsDirty(true)
    setStatusMessage(`${nextShip.name} を追加しました。保存してください。`)
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
    if (!confirmNavigation(view)) {
      return
    }

    if (hasUnsavedShipChanges) {
      discardShipSettingsChanges()
    }

    window.location.href = getAuthStartUrl()
  }

  function logout() {
    if (!confirmNavigation(view)) {
      return
    }

    if (hasUnsavedShipChanges) {
      discardShipSettingsChanges()
    }

    const currentAppUrl = getCurrentAppUrl()
    const logoutUrl = getLogoutUrl()

    clearAuthSession()

    if (logoutUrl) {
      const iframe = document.createElement('iframe')
      iframe.hidden = true
      iframe.setAttribute('aria-hidden', 'true')
      iframe.src = logoutUrl
      document.body.appendChild(iframe)

      window.setTimeout(() => {
        iframe.remove()
      }, 5_000)
    }

    window.location.replace(currentAppUrl)
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
            onClick={() => navigateToView(tab as View)}
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
              <span>必要数を追加可能</span>
            </div>
            <div className="summary-row">
              <button className="primary-button" type="button" onClick={saveShipSettings} disabled={!hasUnsavedShipChanges}>
                艦船設定を保存
              </button>
              {hasUnsavedShipChanges && <span className="helper-text">未保存の変更があります。</span>}
            </div>
            <ShipCreateForm ships={data.ships} onAdd={addShip} />
            {data.ships.map((ship, index) => (
              <ShipEditor
                key={ship.id}
                ship={ship}
                parts={data.parts}
                onSave={saveShipSettings}
                onDelete={deleteShip}
                onMoveUp={() => moveShip(ship.id, 'up')}
                onMoveDown={() => moveShip(ship.id, 'down')}
                canMoveUp={index > 0}
                canMoveDown={index < data.ships.length - 1}
                onChange={updateShipDraft}
              />
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
  onSave: () => void
  onDelete: (shipId: number) => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  onChange: (ship: Ship) => void
}

interface ShipCreateFormProps {
  ships: Ship[]
  onAdd: (account: string, name: string, rank: number) => void
}

function ShipCreateForm({ ships, onAdd }: ShipCreateFormProps) {
  const defaultAccount = ships[0]?.account ?? 'メイン'
  const nextNumber = ships.length + 1
  const [account, setAccount] = useState(defaultAccount)
  const [name, setName] = useState(`${nextNumber}号艦`)
  const [rank, setRank] = useState(1)

  const accountCandidates = Array.from(new Set(ships.map((ship) => ship.account)))

  return (
    <form
      className="editor-card"
      onSubmit={(event) => {
        event.preventDefault()
        const trimmedAccount = account.trim()
        const trimmedName = name.trim()

        if (!trimmedAccount || !trimmedName) {
          return
        }

        onAdd(trimmedAccount, trimmedName, Math.max(1, rank))
        setName(`${nextNumber + 1}号艦`)
        setRank(1)
      }}
    >
      <div className="section-header">
        <h3>新規艦船を追加</h3>
        <span>新規アカウント名も入力可能</span>
      </div>
      <div className="form-grid">
        <label>
          アカウント
          <input list="account-candidates" value={account} onChange={(event) => setAccount(event.target.value)} />
          <datalist id="account-candidates">
            {accountCandidates.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>
        <label>
          艦名
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          ランク
          <input type="number" min={1} value={rank} onChange={(event) => setRank(Number(event.target.value))} />
        </label>
      </div>
      <button className="primary-button" type="submit">
        艦船を追加
      </button>
    </form>
  )
}

function ShipEditor({ ship, parts, onSave, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown, onChange }: ShipEditorProps) {
  return (
    <form
      className="editor-card"
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
    >
      <div className="section-header">
        <h3>{ship.name}</h3>
        <div className="summary-row">
          <span>{ship.account}</span>
          <button className="secondary-button" type="button" onClick={onMoveUp} disabled={!canMoveUp}>
            上へ
          </button>
          <button className="secondary-button" type="button" onClick={onMoveDown} disabled={!canMoveDown}>
            下へ
          </button>
        </div>
      </div>
      <div className="form-grid">
        <label>
          艦名
          <input value={ship.name} onChange={(event) => onChange({ ...ship, name: event.target.value })} />
        </label>
        <label>
          アカウント
          <input value={ship.account} onChange={(event) => onChange({ ...ship, account: event.target.value })} />
        </label>
        <label>
          ランク
          <input
            type="number"
            value={ship.rank}
            onChange={(event) => onChange({ ...ship, rank: Number(event.target.value) })}
          />
        </label>
        {(['hull', 'stern', 'bow', 'bridge'] as PartType[]).map((partType) => (
          <label key={partType}>
            {partLabels[partType]}
            <select
              value={ship.parts[partType]}
              onChange={(event) =>
                onChange({
                  ...ship,
                  parts: {
                    ...ship.parts,
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
      <div className="summary-row">
        <button className="primary-button" type="submit">
          艦船設定を保存
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            const ok = window.confirm(`${ship.name} を削除します。よろしいですか？`)
            if (ok) {
              onDelete(ship.id)
            }
          }}
        >
          艦船を削除
        </button>
      </div>
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
  const formatDateTimeLocal = (date: Date): string => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 16)
  }

  const defaultDepartureTime = formatDateTimeLocal(new Date())
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
        <label>
          時刻操作
          <button className="secondary-button" type="button" onClick={() => setDepartureTime(formatDateTimeLocal(new Date()))}>
            現在時刻をセット
          </button>
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