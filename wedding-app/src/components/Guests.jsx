import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import QRCode from 'qrcode'

const DIETS = ['standard', 'végétarien', 'vegan', 'sans gluten', 'halal', 'casher', 'autre']
const RSVP_COLORS = { 'confirmé': 'badge-green', 'décliné': 'badge-red', 'en attente': 'badge-orange' }

export default function Guests() {
  const [guests, setGuests] = useState([])
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tous')
  const [form, setForm] = useState(defaultForm())
  const [qrVisible, setQrVisible] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  function defaultForm() {
    return { name: '', email: '', phone: '', rsvp: 'en attente', diet: 'standard', table_id: '', plus_one: false, notes: '' }
  }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [g, t] = await Promise.all([
      supabase.from('guests').select('*').order('name'),
      supabase.from('seating_tables').select('*').order('name')
    ])
    if (g.data) setGuests(g.data)
    if (t.data) setTables(t.data)
    setLoading(false)
  }

  async function save() {
    if (!form.name.trim()) return
    const payload = {
      ...form,
      table_id: form.table_id || null,
      email: form.email || null,
      phone: form.phone || null,
      notes: form.notes || null,
    }
    if (editing) {
      await supabase.from('guests').update(payload).eq('id', editing)
    } else {
      await supabase.from('guests').insert(payload)
    }
    setShowModal(false)
    setEditing(null)
    setForm(defaultForm())
    load()
  }

  async function remove(id) {
    if (!confirm('Supprimer cet invité ?')) return
    await supabase.from('guests').delete().eq('id', id)
    load()
  }

  function openEdit(g) {
    setForm({ name: g.name, email: g.email || '', phone: g.phone || '', rsvp: g.rsvp, diet: g.diet, table_id: g.table_id || '', plus_one: g.plus_one, notes: g.notes || '' })
    setEditing(g.id)
    setShowModal(true)
  }

  async function showQr(g) {
    const url = await QRCode.toDataURL(g.ticket_code, { width: 200, margin: 2 })
    setQrDataUrl(url)
    setQrVisible(g)
  }

  const filtered = guests.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) || (g.email || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'tous' || g.rsvp === filter
    return matchSearch && matchFilter
  })

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvp === 'confirmé').length,
    pending: guests.filter(g => g.rsvp === 'en attente').length,
    declined: guests.filter(g => g.rsvp === 'décliné').length,
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 28 }}>Invités</h2>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm()); setEditing(null); setShowModal(true) }}>
          + Ajouter
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--deep)' },
          { label: 'Confirmés', value: stats.confirmed, color: '#2D5A27' },
          { label: 'En attente', value: stats.pending, color: '#92400E' },
          { label: 'Déclinés', value: stats.declined, color: '#B91C1C' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontFamily: "'Cormorant Garamond', serif", color: s.color, fontWeight: 600 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Rechercher un invité..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
          <option value="tous">Tous</option>
          <option value="confirmé">Confirmés</option>
          <option value="en attente">En attente</option>
          <option value="décliné">Déclinés</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">👥</div>
          <p>Aucun invité {filter !== 'tous' ? `"${filter}"` : ''} pour l'instant</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(g => {
            const table = tables.find(t => t.id === g.table_id)
            return (
              <div key={g.id} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 500 }}>{g.name}</span>
                      {g.plus_one && <span className="badge badge-gray">+1</span>}
                      <span className={`badge ${RSVP_COLORS[g.rsvp]}`}>{g.rsvp}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {g.email && <span>{g.email}</span>}
                      {g.diet !== 'standard' && <span>🍽 {g.diet}</span>}
                      {table && <span>🪑 {table.name}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => showQr(g)} title="QR ticket">🎫</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(g.id)}>🗑</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2>{editing ? 'Modifier' : 'Nouvel invité'}</h2>
            <div className="form-group">
              <label>Nom complet *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Prénom Nom" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>RSVP</label>
                <select value={form.rsvp} onChange={e => setForm({ ...form, rsvp: e.target.value })}>
                  <option>confirmé</option>
                  <option>en attente</option>
                  <option>décliné</option>
                </select>
              </div>
              <div className="form-group">
                <label>Régime alimentaire</label>
                <select value={form.diet} onChange={e => setForm({ ...form, diet: e.target.value })}>
                  {DIETS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Table</label>
                <select value={form.table_id} onChange={e => setForm({ ...form, table_id: e.target.value })}>
                  <option value="">— Non assigné —</option>
                  {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 'auto' }} checked={form.plus_one} onChange={e => setForm({ ...form, plus_one: e.target.checked })} />
                  Accompagné(e)
                </label>
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={save}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {qrVisible && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setQrVisible(null)}>
          <div className="modal" style={{ textAlign: 'center' }}>
            <h2>Billet de {qrVisible.name}</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: 14 }}>À présenter à l'entrée</p>
            <img src={qrDataUrl} alt="QR code" style={{ width: 200, height: 200, margin: '0 auto 16px' }} />
            <p style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>{qrVisible.ticket_code}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <a href={qrDataUrl} download={`billet-${qrVisible.name}.png`} className="btn btn-primary">⬇ Télécharger</a>
              <button className="btn btn-ghost" onClick={() => setQrVisible(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
