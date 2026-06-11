import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Program() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    return { time: '', title: '', description: '', location: '', duration_min: 30, sort_order: 0 }
  }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('program_events').select('*').order('time')
    if (data) setEvents(data)
    setLoading(false)
  }

  async function save() {
    if (!form.time || !form.title.trim()) return
    const payload = { ...form, sort_order: parseInt(form.sort_order) || 0, duration_min: parseInt(form.duration_min) || 30 }
    if (editing) {
      await supabase.from('program_events').update(payload).eq('id', editing)
    } else {
      await supabase.from('program_events').insert(payload)
    }
    setShowModal(false); setEditing(null); setForm(defaultForm()); load()
  }

  async function remove(id) {
    if (!confirm('Supprimer cet événement ?')) return
    await supabase.from('program_events').delete().eq('id', id)
    load()
  }

  function openEdit(e) {
    setForm({ time: e.time, title: e.title, description: e.description || '', location: e.location || '', duration_min: e.duration_min, sort_order: e.sort_order })
    setEditing(e.id); setShowModal(true)
  }

  const ICONS = {
    'cérémonie': '💍', 'cocktail': '🥂', 'repas': '🍽', 'dîner': '🍽',
    'soirée': '🎶', 'musique': '🎶', 'danse': '💃', 'photo': '📸',
    'accueil': '🤝', 'discours': '🎤', 'gâteau': '🎂', 'animation': '🎉',
    'départ': '🚗', 'nuit': '🌙'
  }

  function getIcon(title) {
    const lower = title.toLowerCase()
    for (const [key, icon] of Object.entries(ICONS)) {
      if (lower.includes(key)) return icon
    }
    return '📍'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 28 }}>Programme jour J</h2>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm()); setEditing(null); setShowModal(true) }}>+ Événement</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Chargement…</div>
      ) : events.length === 0 ? (
        <div className="empty-state"><div className="icon">📋</div><p>Programme vide — ajoutez vos événements</p></div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 40 }}>
          {/* Timeline line */}
          <div style={{ position: 'absolute', left: 12, top: 8, bottom: 8, width: 2, background: 'var(--blush)', borderRadius: 1 }} />

          {events.map((event, i) => (
            <div key={event.id} style={{ position: 'relative', marginBottom: 20 }}>
              {/* Timeline dot */}
              <div style={{
                position: 'absolute', left: -34, top: 14,
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--rose)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, border: '2px solid var(--ivory)', zIndex: 1
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
              </div>

              <div className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>{getIcon(event.title)}</span>
                      <div>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--rose)', fontWeight: 600 }}>{event.time}</span>
                        <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 8 }}>({event.duration_min} min)</span>
                      </div>
                    </div>
                    <div style={{ fontWeight: 500, fontSize: 15, marginBottom: event.description || event.location ? 6 : 0 }}>{event.title}</div>
                    {event.location && <div style={{ fontSize: 13, color: 'var(--muted)' }}>📍 {event.location}</div>}
                    {event.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{event.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(event)}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(event.id)}>🗑</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2>{editing ? 'Modifier' : 'Nouvel événement'}</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Heure *</label>
                <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Durée (minutes)</label>
                <input type="number" min="5" value={form.duration_min} onChange={e => setForm({ ...form, duration_min: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Titre *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex : Cérémonie civile" />
            </div>
            <div className="form-group">
              <label>Lieu</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Ex : Mairie de Paris" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
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
