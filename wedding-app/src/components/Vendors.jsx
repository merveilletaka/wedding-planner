import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CATS = ['Salle & lieu', 'Traiteur', 'Boissons', 'Photographe', 'Vidéaste', 'DJ & musique', 'Fleuriste', 'Décoration', 'Coiffure & maquillage', 'Transport', 'Animation', 'Officiant', 'Faire-part', 'Divers']
const STATUS_COLORS = { 'confirmé': 'badge-green', 'en discussion': 'badge-orange', 'annulé': 'badge-red' }

export default function Vendors() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    return { name: '', category: CATS[0], contact_name: '', phone: '', email: '', price: '', deposit_paid: '', status: 'en discussion', contract_signed: false, notes: '' }
  }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('vendors').select('*').order('category')
    if (data) setVendors(data)
    setLoading(false)
  }

  async function save() {
    if (!form.name.trim()) return
    const payload = { ...form, price: parseFloat(form.price) || 0, deposit_paid: parseFloat(form.deposit_paid) || 0 }
    if (editing) {
      await supabase.from('vendors').update(payload).eq('id', editing)
    } else {
      await supabase.from('vendors').insert(payload)
    }
    setShowModal(false); setEditing(null); setForm(defaultForm()); load()
  }

  async function remove(id) {
    if (!confirm('Supprimer ce prestataire ?')) return
    await supabase.from('vendors').delete().eq('id', id)
    load()
  }

  function openEdit(v) {
    setForm({ name: v.name, category: v.category, contact_name: v.contact_name || '', phone: v.phone || '', email: v.email || '', price: v.price, deposit_paid: v.deposit_paid, status: v.status, contract_signed: v.contract_signed, notes: v.notes || '' })
    setEditing(v.id); setShowModal(true)
  }

  const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
  const confirmed = vendors.filter(v => v.status === 'confirmé')
  const totalConfirmed = confirmed.reduce((s, v) => s + (v.price || 0), 0)

  const grouped = CATS.reduce((acc, cat) => {
    const catV = vendors.filter(v => v.category === cat)
    if (catV.length > 0) acc[cat] = catV
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 28 }}>Prestataires</h2>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm()); setEditing(null); setShowModal(true) }}>+ Ajouter</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total prestataires', value: vendors.length },
          { label: 'Confirmés', value: confirmed.length },
          { label: 'Budget confirmés', value: fmt(totalConfirmed) },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Chargement…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="empty-state"><div className="icon">🤝</div><p>Aucun prestataire enregistré</p></div>
      ) : (
        Object.entries(grouped).map(([cat, catV]) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontFamily: 'Inter', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{cat}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {catV.map(v => (
                <div key={v.id} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 500 }}>{v.name}</span>
                        <span className={`badge ${STATUS_COLORS[v.status]}`}>{v.status}</span>
                        {v.contract_signed && <span className="badge badge-blue">Contrat signé</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {v.contact_name && <span>👤 {v.contact_name}</span>}
                        {v.phone && <a href={`tel:${v.phone}`} style={{ color: 'var(--rose)', textDecoration: 'none' }}>📞 {v.phone}</a>}
                        {v.price > 0 && <span>💶 {fmt(v.price)}{v.deposit_paid > 0 ? ` (acompte: ${fmt(v.deposit_paid)})` : ''}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(v)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(v.id)}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2>{editing ? 'Modifier' : 'Nouveau prestataire'}</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Nom *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Catégorie</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Contact</label>
                <input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Prix total (€)</label>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Acompte versé (€)</label>
                <input type="number" value={form.deposit_paid} onChange={e => setForm({ ...form, deposit_paid: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Statut</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option>en discussion</option><option>confirmé</option><option>annulé</option>
                </select>
              </div>
              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 'auto' }} checked={form.contract_signed} onChange={e => setForm({ ...form, contract_signed: e.target.checked })} />
                  Contrat signé
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
    </div>
  )
}
