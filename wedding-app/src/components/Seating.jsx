import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Seating() {
  const [tables, setTables] = useState([])
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', capacity: 8, notes: '' })
  const [dragGuest, setDragGuest] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [t, g] = await Promise.all([
      supabase.from('seating_tables').select('*').order('name'),
      supabase.from('guests').select('id,name,rsvp,table_id').eq('rsvp', 'confirmé').order('name')
    ])
    if (t.data) setTables(t.data)
    if (g.data) setGuests(g.data)
    setLoading(false)
  }

  async function save() {
    if (!form.name.trim()) return
    const payload = { name: form.name, capacity: parseInt(form.capacity) || 8, notes: form.notes }
    if (editing) {
      await supabase.from('seating_tables').update(payload).eq('id', editing)
    } else {
      await supabase.from('seating_tables').insert(payload)
    }
    setShowModal(false); setEditing(null); setForm({ name: '', capacity: 8, notes: '' }); load()
  }

  async function removeTable(id) {
    if (!confirm('Supprimer cette table ? Les invités assignés seront désassignés.')) return
    await supabase.from('guests').update({ table_id: null }).eq('table_id', id)
    await supabase.from('seating_tables').delete().eq('id', id)
    load()
  }

  async function assignGuest(guestId, tableId) {
    await supabase.from('guests').update({ table_id: tableId }).eq('id', guestId)
    setGuests(guests.map(g => g.id === guestId ? { ...g, table_id: tableId } : g))
  }

  function openEdit(t) {
    setForm({ name: t.name, capacity: t.capacity, notes: t.notes || '' })
    setEditing(t.id); setShowModal(true)
  }

  const unassigned = guests.filter(g => !g.table_id)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 28 }}>Plan de table</h2>
        <button className="btn btn-primary" onClick={() => { setForm({ name: '', capacity: 8, notes: '' }); setEditing(null); setShowModal(true) }}>+ Table</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>{tables.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Tables</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>{guests.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Confirmés</div>
        </div>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: unassigned.length > 0 ? '#92400E' : '#2D5A27' }}>{unassigned.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Non placés</div>
        </div>
      </div>

      {unassigned.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 20, borderLeft: '3px solid var(--blush)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--muted)' }}>INVITÉS À PLACER ({unassigned.length})</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unassigned.map(g => (
              <select key={g.id} onChange={e => e.target.value && assignGuest(g.id, e.target.value)}
                style={{ width: 'auto', padding: '4px 10px', fontSize: 13, background: 'var(--cream)', borderRadius: 20, cursor: 'pointer' }}
                value="">
                <option value="">{g.name}</option>
                {tables.map(t => {
                  const seated = guests.filter(x => x.table_id === t.id).length
                  const isFull = seated >= t.capacity
                  return <option key={t.id} value={t.id} disabled={isFull}>{t.name} ({seated}/{t.capacity})</option>
                })}
              </select>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Chargement…</div>
      ) : tables.length === 0 ? (
        <div className="empty-state"><div className="icon">🪑</div><p>Aucune table créée</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {tables.map(table => {
            const seated = guests.filter(g => g.table_id === table.id)
            const isFull = seated.length >= table.capacity
            return (
              <div key={table.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 15 }}>{table.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {seated.length}/{table.capacity} places
                      {isFull && <span className="badge badge-orange" style={{ marginLeft: 6 }}>Complet</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(table)}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeTable(table.id)}>🗑</button>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--cream)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${(seated.length / table.capacity) * 100}%`, background: isFull ? 'var(--rose)' : 'var(--sage)', transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {seated.map(g => (
                    <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span>{g.name}</span>
                      <button onClick={() => assignGuest(g.id, null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, padding: '2px 6px' }}>✕</button>
                    </div>
                  ))}
                  {seated.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Table vide</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2>{editing ? 'Modifier la table' : 'Nouvelle table'}</h2>
            <div className="form-group">
              <label>Nom *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex : Table des mariés" />
            </div>
            <div className="form-group">
              <label>Capacité</label>
              <input type="number" min="1" max="50" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
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
    </div>
  )
}
