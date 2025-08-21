import React, { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'fantasy-draft-board-v1'
const uid = () => Math.random().toString(36).slice(2, 9)

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  const starters = [
    'Justin Jefferson WR MIN',
    "Ja'Marr Chase WR CIN",
    'Christian McCaffrey RB SF',
    'CeeDee Lamb WR DAL',
    'Bijan Robinson RB ATL',
    'Breece Hall RB NYJ',
    'Amon-Ra St. Brown WR DET',
    'Tyreek Hill WR MIA',
    'Garrett Wilson WR NYJ',
    'Jonathan Taylor RB IND',
  ]
  return starters.map((s, i) => ({ id: uid(), name: s, tier: 1 + Math.floor(i / 3) }))
}

function save(players) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(players)) } catch {}
}

const Button = ({ className = '', ...p }) => (
  <button {...p} className={`px-3 py-2 rounded-2xl shadow text-sm hover:shadow-md active:scale-[0.99] ${p.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`} />
)
const Input = ({ className = '', ...p }) => (
  <input {...p} className={`px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring w-full ${className}`} />
)
const Textarea = ({ className = '', ...p }) => (
  <textarea {...p} className={`px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring w-full ${className}`} />
)

export default function App() {
  const [players, setPlayers] = useState(loadInitial())
  const [editMode, setEditMode] = useState(false)
  const [showDrafted, setShowDrafted] = useState(false)
  const [filter, setFilter] = useState('')
  const [newPlayer, setNewPlayer] = useState('')
  const [importText, setImportText] = useState('')
  const [selected, setSelected] = useState({})

  useEffect(() => save(players), [players])

  const tiers = useMemo(() => {
    const t = new Map()
    players
      .slice()
      .sort((a, b) => (a.tier - b.tier) || a.name.localeCompare(b.name))
      .forEach(p => {
        if (!t.has(p.tier)) t.set(p.tier, [])
        t.get(p.tier).push(p)
      })
    return Array.from(t.entries()).sort((a, b) => a[0] - b[0])
  }, [players])

  const visiblePlayers = (list) => list.filter(p => {
    if (!showDrafted && p.drafted) return false
    if (!filter) return true
    return (p.name + ' ' + (p.pos||'') + ' ' + (p.team||'')).toLowerCase().includes(filter.toLowerCase())
  })

  const toggleDrafted = (id) => setPlayers(ps => ps.map(p => p.id === id ? { ...p, drafted: !p.drafted } : p))
  const deletePlayer = (id) => setPlayers(ps => ps.filter(p => p.id !== id))
  const moveTier = (ids, delta) => setPlayers(ps => ps.map(p => ids.includes(p.id) ? { ...p, tier: Math.max(1, p.tier + delta) } : p))
  const setTier = (ids, tier) => setPlayers(ps => ps.map(p => ids.includes(p.id) ? { ...p, tier } : p))
  const selectAllVisible = () => {
    const ids = players.filter(p => visiblePlayers([p]).length).map(p => p.id)
    const next = {}; ids.forEach(id => next[id] = true); setSelected(next)
  }

  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)

  const addPlayer = () => {
    const t = newPlayer.trim()
    if (!t) return
    setPlayers(ps => [...ps, { id: uid(), name: t, tier: 1 }])
    setNewPlayer('')
  }

  const escapeCSV = (s) => (/[,\"\n]/.test(s) ? '"' + s.replace(/\"/g, '""') + '"' : s)
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(players, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'players.json'; a.click(); URL.revokeObjectURL(url)
  }
  const exportCSV = () => {
    const header = 'name,pos,team,tier,drafted\n'
    const rows = players.map(p => `${escapeCSV(p.name)},${p.pos||''},${p.team||''},${p.tier},${p.drafted?'yes':'no'}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'players.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const importFromText = () => {
    const lines = importText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return
    const next = lines.map((line, i) => {
      let name = line; let pos = ''; let team = ''; let tier = 1
      const tierMatch = line.match(/T(\d+)/i); if (tierMatch) { tier = parseInt(tierMatch[1], 10) }
      const pt = line.match(/([A-Za-z\.\-'\s]+)\s+(QB|RB|WR|TE|K|DST)\s+([A-Z]{2,3})/i)
      if (pt) { name = pt[1].trim(); pos = pt[2].toUpperCase(); team = pt[3].toUpperCase() }
      return { id: uid(), name, pos, team, tier }
    })
    setPlayers(next)
    setImportText('')
    setEditMode(false)
  }

  const resetBoard = () => {
    if (confirm('Reset to empty board?')) setPlayers([])
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">Fantasy Draft Board</h1>
          <div className="flex gap-2">
            <Button onClick={() => setEditMode(v => !v)} className="bg-white">{editMode ? 'Exit Edit' : 'Edit Mode'}</Button>
            <Button onClick={() => setShowDrafted(v => !v)} className="bg-white">{showDrafted ? 'Hide' : 'Show'} Drafted</Button>
            <Button onClick={exportCSV} className="bg-white">Export CSV</Button>
            <Button onClick={exportJSON} className="bg-white">Export JSON</Button>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-4 items-start">
          <section className="md:col-span-2 space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Search by name / pos / team" value={filter} onChange={e => setFilter(e.target.value)} />
              <Button onClick={() => setFilter('')} className="bg-white">Clear</Button>
            </div>

            <div className="flex gap-2">
              <Input placeholder="Add player (e.g., Puka Nacua WR LAR)" value={newPlayer} onChange={e => setNewPlayer(e.target.value)} />
              <Button onClick={addPlayer} className="bg-white">Add</Button>
              <Button onClick={resetBoard} className="bg-white">Reset</Button>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-4 space-y-3">
            <h2 className="font-semibold">Bulk actions</h2>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setSelected({})} className="bg-gray-100">Clear selection</Button>
              <Button onClick={selectAllVisible} className="bg-gray-100">Select visible</Button>
              <Button onClick={() => moveTier(selectedIds, -1)} className="bg-gray-100" disabled={!selectedIds.length}>Tier -1</Button>
              <Button onClick={() => moveTier(selectedIds, 1)} className="bg-gray-100" disabled={!selectedIds.length}>Tier +1</Button>
              <Button onClick={() => setTier(selectedIds, 1)} className="bg-gray-100" disabled={!selectedIds.length}>Set Tier 1</Button>
              <Button onClick={() => setPlayers(ps => ps.filter(p => !selectedIds.includes(p.id)))} className="bg-gray-100" disabled={!selectedIds.length}>Delete</Button>
            </div>
            <div className="text-xs text-gray-500">Tip: In Draft Mode, click a player to toggle drafted. In Edit Mode, use checkboxes + bulk actions.</div>
          </section>
        </div>

        {editMode && (
          <section className="bg-white rounded-2xl shadow p-4 space-y-2">
            <details>
              <summary className="cursor-pointer font-semibold">Quick Import (paste one per line, optional 'POS TEAM' and 'T#')</summary>
              <Textarea rows={6} placeholder={`Example lines:\nPuka Nacua WR LAR T1\nSaquon Barkley RB PHI T2\nSam LaPorta TE DET T3`} value={importText} onChange={e => setImportText(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={importFromText} className="bg-white">Replace List</Button>
              </div>
            </details>
          </section>
        )}

        <section className="space-y-4">
          {tiers.length === 0 && (
            <div className="text-center text-gray-500">No players yet. Use <b>Add player</b> or <b>Quick Import</b>.</div>
          )}
          {tiers.map(([tierNum, list]) => (
            <div key={tierNum} className="bg-white rounded-2xl shadow">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold">Tier {tierNum}</span>
                  {editMode && (
                    <div className="flex gap-2">
                      <Button onClick={() => setPlayers(ps => ps.map(p => p.tier === tierNum ? { ...p, tier: Math.max(1, p.tier - 1) } : p))} className="bg-gray-100">Tier -1 (all)</Button>
                      <Button onClick={() => setPlayers(ps => ps.map(p => p.tier === tierNum ? { ...p, tier: p.tier + 1 } : p))} className="bg-gray-100">Tier +1 (all)</Button>
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-500">{visiblePlayers(list).length} / {list.length} visible</div>
              </div>

              <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {visiblePlayers(list).map(p => (
                  <li key={p.id} className={`rounded-xl border ${p.drafted ? 'opacity-50' : ''} hover:shadow transition bg-white` }>
                    <div className="flex items-center justify-between gap-3 p-3">
                      <div className="flex items-center gap-3">
                        {editMode && (
                          <input type="checkbox" className="h-4 w-4" checked={!!selected[p.id]} onChange={e => setSelected(s => ({ ...s, [p.id]: e.target.checked }))} />
                        )}
                        <div>
                          <div className="font-semibold leading-tight">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.pos || 'POS'} {p.team || 'TEAM'} • Tier {p.tier}</div>
                        </div>
                      </div>

                      {editMode ? (
                        <div className="flex items-center gap-1">
                          <Button className="bg-gray-100" onClick={() => setPlayers(ps => ps.map(x => x.id===p.id?{...x,tier:Math.max(1,x.tier-1)}:x))}>-Tier</Button>
                          <Button className="bg-gray-100" onClick={() => setPlayers(ps => ps.map(x => x.id===p.id?{...x,tier:x.tier+1}:x))}>+Tier</Button>
                          <Button className="bg-gray-100" onClick={() => deletePlayer(p.id)}>Delete</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button className="bg-gray-100" onClick={() => toggleDrafted(p.id)}>{p.drafted ? 'Undraft' : 'Draft'}</Button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <footer className="text-xs text-gray-500 pt-6">
          <p>
            This board saves to your browser (localStorage) and works offline. Use Export/Import to move lists between devices. Deploy free on GitHub Pages or Netlify.
          </p>
        </footer>
      </div>
    </div>
  )
}
