import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import QRCode from 'qrcode'

const RSVP_COLORS = { 'confirmé': 'badge-green', 'décliné': 'badge-red', 'en attente': 'badge-orange' }
const GROUPS = ['famille mariée', 'famille mariée(e)', 'amis', 'autres']
const TICKET_TYPES = ['individuel', 'couple', 'famille']
const TICKET_LABELS = { individuel: '👤 Individuel', couple: '👫 Couple', famille: '👨‍👩‍👧 Famille' }

export default function Guests() {
  const [guests, setGuests] = useState([])
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [filterRsvp, setFilterRsvp] = useState('tous')
  const [filterGroup, setFilterGroup] = useState('tous')
  const [form, setForm] = useState(defaultForm())
  const [qrVisible, setQrVisible] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [dupWarning, setDupWarning] = useState(null)
  const nameTimeout = useRef(null)

  function defaultForm() {
    return { name: '', email: '', phone: '', rsvp: 'en attente', ticket_type: 'individuel', children_count: 0, babies_count: 0, guest_group: 'amis', table_id: '', notes: '' }
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

  async function checkDuplicate(name) {
    if (!name.trim() || name.length < 2) { setDupWarning(null); return }
    const { data } = await supabase.from('guests').select('id,name').ilike('name', `%${name.trim()}%`)
    const matches = (data || []).filter(d => editing ? d.id !== editing : true)
    if (matches.length > 0) {
      setDupWarning(`⚠️ Doublon possible : ${matches.map(d => d.name).join(', ')}`)
    } else {
      setDupWarning(null)
    }
  }

  function onNameChange(val) {
    setForm({ ...form, name: val })
    clearTimeout(nameTimeout.current)
    nameTimeout.current = setTimeout(() => checkDuplicate(val), 500)
  }

  async function save() {
    if (!form.name.trim()) return
    if (dupWarning && !editing) {
      if (!confirm('Un invité similaire existe déjà. Continuer quand même ?')) return
    }
    const payload = {
      name: form.name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      rsvp: form.rsvp,
      ticket_type: form.ticket_type,
      children_count: parseInt(form.children_count) || 0,
      babies_count: parseInt(form.babies_count) || 0,
      guest_group: form.guest_group,
      table_id: form.table_id || null,
      notes: form.notes || null,
    }
    if (editing) {
      await supabase.from('guests').update(payload).eq('id', editing)
    } else {
      await supabase.from('guests').insert(payload)
    }
    setShowModal(false); setEditing(null); setForm(defaultForm()); setDupWarning(null); load()
  }

  async function remove(id) {
    if (!confirm('Supprimer cet invité ?')) return
    await supabase.from('guests').delete().eq('id', id)
    load()
  }

  function openEdit(g) {
    setForm({ name: g.name, email: g.email || '', phone: g.phone || '', rsvp: g.rsvp, ticket_type: g.ticket_type || 'individuel', children_count: g.children_count || 0, babies_count: g.babies_count || 0, guest_group: g.guest_group || 'amis', table_id: g.table_id || '', notes: g.notes || '' })
    setEditing(g.id); setShowModal(true)
  }

  async function showQr(g) {
    const label = g.ticket_type === 'famille'
      ? `${g.name} — Famille (${g.children_count} enfant(s), ${g.babies_count} bébé(s))`
      : g.ticket_type === 'couple' ? `${g.name} — Couple` : g.name
    const url = await QRCode.toDataURL(g.ticket_code, { width: 220, margin: 2 })
    setQrDataUrl(url)
    setQrVisible({ ...g, label })
  }

  const filtered = guests.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) || (g.email || '').toLowerCase().includes(search.toLowerCase())
    const matchRsvp = filterRsvp === 'tous' || g.rsvp === filterRsvp
    const matchGroup = filterGroup === 'tous' || g.guest_group === filterGroup
    return matchSearch && matchRsvp && matchGroup
  })

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvp === 'confirmé').length,
    pending: guests.filter(g => g.rsvp === 'en attente').length,
    declined: guests.filter(g => g.rsvp === 'décliné').length,
  }

  // Count total seats (couple = 2, famille = 2 + children)
  const totalSeats = guests.filter(g => g.rsvp === 'confirmé').reduce((s, g) => {
    if (g.ticket_type === 'couple') return s + 2
    if (g.ticket_type === 'famille') return s + 2 + (g.children_count || 0)
    return s + 1
  }, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 28 }}>Invités</h2>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm()); setEditing(null); setDupWarning(null); setShowModal(true) }}>+ Ajouter</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
        {[
          { label: 'Total invités', value: stats.total },
          { label: 'Confirmés', value: stats.confirmed },
          { label: 'En attente', value: stats.pending },
          { label: 'Places chaises', value: totalSeats },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
        <select value={filterRsvp} onChange={e => setFilterRsvp(e.target.value)} style={{ width: 'auto', minWidth: 130 }}>
          <option value="tous">Tous RSVP</option>
          <option value="confirmé">Confirmés</option>
          <option value="en attente">En attente</option>
          <option value="décliné">Déclinés</option>
        </select>
        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
          <option value="tous">Tous groupes</option>
          {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="icon">👥</div><p>Aucun invité trouvé</p></div>
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
                      <span className={`badge ${RSVP_COLORS[g.rsvp]}`}>{g.rsvp}</span>
                      <span className="badge badge-gray">{TICKET_LABELS[g.ticket_type || 'individuel']}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {g.guest_group && <span>👥 {g.guest_group}</span>}
                      {g.ticket_type === 'famille' && <span>🧒 {g.children_count} enfant(s) · 👶 {g.babies_count} bébé(s)</span>}
                      {table && <span>🪑 {table.name}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => showQr(g)}>🎫</button>
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
              <input value={form.name} onChange={e => onNameChange(e.target.value)} placeholder="Prénom Nom" />
              {dupWarning && <div style={{ fontSize: 13, color: '#92400E', background: '#FEF3C7', padding: '8px 12px', borderRadius: 6, marginTop: 4 }}>{dupWarning}</div>}
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
                  <option>confirmé</option><option>en attente</option><option>décliné</option>
                </select>
              </div>
              <div className="form-group">
                <label>Groupe</label>
                <select value={form.guest_group} onChange={e => setForm({ ...form, guest_group: e.target.value })}>
                  {GROUPS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Type de billet</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {TICKET_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, ticket_type: t })}
                    className="btn btn-sm" style={{ flex: 1, background: form.ticket_type === t ? 'var(--deep)' : 'var(--white)', color: form.ticket_type === t ? '#fff' : 'var(--deep)', border: '1.5px solid var(--border)' }}>
                    {TICKET_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            {form.ticket_type === 'famille' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Enfants (chaise)</label>
                  <input type="number" min="0" value={form.children_count} onChange={e => setForm({ ...form, children_count: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Bébés (pas de chaise)</label>
                  <input type="number" min="0" value={form.babies_count} onChange={e => setForm({ ...form, babies_count: e.target.value })} />
                </div>
              </div>
            )}
            <div className="form-group">
              <label>Table</label>
              <select value={form.table_id} onChange={e => setForm({ ...form, table_id: e.target.value })}>
                <option value="">— Non assigné —</option>
                {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
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
            <h2>Billet</h2>
            <p style={{ fontWeight: 500, marginBottom: 4 }}>{qrVisible.label}</p>
            <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: 13 }}>À présenter à l'entrée</p>
            <img src={qrDataUrl} alt="QR" style={{ width: 200, height: 200, margin: '0 auto 16px' }} />
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)', marginBottom: 20 }}>{qrVisible.ticket_code}</p>
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
