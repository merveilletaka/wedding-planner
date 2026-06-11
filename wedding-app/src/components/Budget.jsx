import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CATEGORIES = ['Salle & lieu', 'Traiteur', 'Boissons', 'Musique & DJ', 'Fleurs & déco', 'Photographe', 'Vidéaste', 'Robe & tenue', 'Alliances', 'Faire-part', 'Transport', 'Hébergement', 'Lune de miel', 'Divers']

export default function Budget() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    return { category: CATEGORIES[0], label: '', estimated: '', actual: '', paid: false, notes: '' }
  }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('budget_items').select('*').order('category')
    if (data) setItems(data)
    setLoading(false)
  }

  async function save() {
    if (!form.label.trim()) return
    const payload = { ...form, estimated: parseFloat(form.estimated) || 0, actual: parseFloat(form.actual) || 0 }
    if (editing) {
      await supabase.from('budget_items').update(payload).eq('id', editing)
    } else {
      await supabase.from('budget_items').insert(payload)
    }
    setShowModal(false); setEditing(null); setForm(defaultForm()); load()
  }

  async function remove(id) {
    if (!confirm('Supprimer cette dépense ?')) return
    await supabase.from('budget_items').delete().eq('id', id)
    load()
  }

  function openEdit(item) {
    setForm({ category: item.category, label: item.label, estimated: item.estimated, actual: item.actual, paid: item.paid, notes: item.notes || '' })
    setEditing(item.id); setShowModal(true)
  }

  const totalEstimated = items.reduce((s, i) => s + (i.estimated || 0), 0)
  const totalActual = items.reduce((s, i) => s + (i.actual || 0), 0)
  const totalPaid = items.filter(i => i.paid).reduce((s, i) => s + (i.actual || 0), 0)

  const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat)
    if (catItems.length > 0) acc[cat] = catItems
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 28 }}>Budget</h2>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm()); setEditing(null); setShowModal(true) }}>+ Ajouter</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Budget prévu', value: fmt(totalEstimated), color: 'var(--deep)' },
          { label: 'Dépensé réel', value: fmt(totalActual), color: totalActual > totalEstimated ? '#B91C1C' : '#2D5A27' },
          { label: 'Réglé', value: fmt(totalPaid), color: 'var(--muted)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontFamily: "'Cormorant Garamond', serif", color: s.color, fontWeight: 600 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {totalEstimated > 0 && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
            <span>Consommé du budget</span>
            <span>{Math.round((totalActual / totalEstimated) * 100)}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--cream)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${Math.min(100, (totalActual / totalEstimated) * 100)}%`,
              background: totalActual > totalEstimated ? '#EF4444' : 'var(--rose)',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Chargement…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="empty-state"><div className="icon">💰</div><p>Aucune dépense enregistrée</p></div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontFamily: 'Inter', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{cat}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {catItems.map(item => (
                <div key={item.id} className="card" style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{item.label}</span>
                        {item.paid && <span className="badge badge-green">Réglé</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                        Prévu : {fmt(item.estimated)} · Réel : {fmt(item.actual)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(item.id)}>🗑</button>
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
            <h2>{editing ? 'Modifier' : 'Nouvelle dépense'}</h2>
            <div className="form-group">
              <label>Catégorie</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Intitulé *</label>
              <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Ex : Traiteur Dupont" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Montant prévu (€)</label>
                <input type="number" value={form.estimated} onChange={e => setForm({ ...form, estimated: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Montant réel (€)</label>
                <input type="number" value={form.actual} onChange={e => setForm({ ...form, actual: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={form.paid} onChange={e => setForm({ ...form, paid: e.target.checked })} />
                Déjà réglé
              </label>
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
