import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({
    guests: 0, confirmed: 0, pending: 0,
    budget_estimated: 0, budget_actual: 0,
    tasks_total: 0, tasks_done: 0, tasks_late: 0,
    vendors: 0, vendors_confirmed: 0,
    unplaced: 0, events: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const [g, b, t, v, p, pr] = await Promise.all([
        supabase.from('guests').select('rsvp,table_id'),
        supabase.from('budget_items').select('estimated,actual'),
        supabase.from('tasks').select('done,due_date'),
        supabase.from('vendors').select('status'),
        supabase.from('program_events').select('id'),
        supabase.from('seating_tables').select('id')
      ])
      const guests = g.data || []
      const budget = b.data || []
      const tasks = t.data || []
      const vendors = v.data || []
      setStats({
        guests: guests.length,
        confirmed: guests.filter(x => x.rsvp === 'confirmé').length,
        pending: guests.filter(x => x.rsvp === 'en attente').length,
        budget_estimated: budget.reduce((s, i) => s + (i.estimated || 0), 0),
        budget_actual: budget.reduce((s, i) => s + (i.actual || 0), 0),
        tasks_total: tasks.length,
        tasks_done: tasks.filter(x => x.done).length,
        tasks_late: tasks.filter(x => !x.done && x.due_date && x.due_date < today).length,
        vendors: vendors.length,
        vendors_confirmed: vendors.filter(x => x.status === 'confirmé').length,
        unplaced: guests.filter(x => x.rsvp === 'confirmé' && !x.table_id).length,
        events: (p.data || []).length
      })
      setLoading(false)
    }
    load()
  }, [])

  const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  const pct = (a, b) => b ? Math.round((a / b) * 100) : 0

  const tiles = [
    {
      icon: '👥', label: 'Invités', tab: 'guests',
      main: stats.guests,
      detail: `${stats.confirmed} confirmés · ${stats.pending} en attente`,
      alert: stats.pending > 0
    },
    {
      icon: '💰', label: 'Budget', tab: 'budget',
      main: fmt(stats.budget_estimated),
      detail: `${fmt(stats.budget_actual)} dépensé (${pct(stats.budget_actual, stats.budget_estimated)}%)`,
      alert: stats.budget_actual > stats.budget_estimated
    },
    {
      icon: '✅', label: 'Tâches', tab: 'tasks',
      main: `${stats.tasks_done}/${stats.tasks_total}`,
      detail: stats.tasks_late > 0 ? `⚠️ ${stats.tasks_late} en retard` : 'Aucune en retard',
      alert: stats.tasks_late > 0
    },
    {
      icon: '🤝', label: 'Prestataires', tab: 'vendors',
      main: stats.vendors,
      detail: `${stats.vendors_confirmed} confirmés`,
      alert: false
    },
    {
      icon: '🪑', label: 'Plan de table', tab: 'seating',
      main: stats.unplaced,
      detail: stats.unplaced > 0 ? 'invités à placer' : 'Tout le monde est placé',
      alert: stats.unplaced > 0
    },
    {
      icon: '📋', label: 'Programme', tab: 'program',
      main: stats.events,
      detail: stats.events === 0 ? 'Programme vide' : `événements planifiés`,
      alert: false
    },
  ]

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32, paddingTop: 8 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>💍</div>
        <h1 style={{ fontSize: 36, marginBottom: 4 }}>Notre mariage</h1>
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>Tableau de bord</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Chargement…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {tiles.map(tile => (
            <button key={tile.tab} onClick={() => onNavigate(tile.tab)}
              style={{ background: 'var(--white)', borderRadius: 'var(--radius)', border: tile.alert ? '2px solid var(--rose)' : '1px solid var(--border)', padding: '18px 16px', textAlign: 'left', cursor: 'pointer', boxShadow: 'var(--shadow)', transition: 'transform 0.1s' }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{tile.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', marginBottom: 4 }}>{tile.label}</div>
              <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: tile.alert ? 'var(--rose)' : 'var(--deep)', lineHeight: 1.2, marginBottom: 4 }}>{tile.main}</div>
              <div style={{ fontSize: 12, color: tile.alert ? 'var(--rose)' : 'var(--muted)', lineHeight: 1.4 }}>{tile.detail}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
