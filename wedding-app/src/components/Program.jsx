import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Program() {
  const [events, setEvents] = useState([])
  const [menus, setMenus] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(defaultForm())
  const [menuForm, setMenuForm] = useState(defaultMenu())

  function defaultForm() {
    return { time: '', title: '', description: '', location: '', duration_min: 30, capacity: 0, sub_program: '' }
  }
  function defaultMenu() {
    return { starter: '', main_course: '', dessert: '', drinks: '', notes: '' }
  }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [ev, mn] = await Promise.all([
      supabase.from('program_events').select('*').order('time'),
      supabase.from('event_menus').select('*')
    ])
    if (ev.data) setEvents(ev.data)
    if (mn.data) {
      const map = {}
      mn.data.forEach(m => { map[m.event_id] = m })
      setMenus(map)
    }
    setLoading(false)
  }

  async function save() {
    if (!form.time || !form.title.trim()) return
    const payload = { ...form, duration_min: parseInt(form.duration_min) || 30, capacity: parseInt(form.capacity) || 0 }
    if (editing) {
      await supabase.from('program_events').update(payload).eq('id', editing)
    } else {
      await supabase.from('program_events').insert(payload)
    }
    setShowModal(false); setEditing(null); setForm(defaultForm()); load()
  }

  async function saveMenu(eventId) {
    const existing = menus[eventId]
    if (existing) {
      await supabase.from('event_menus').update(menuForm).eq('id', existing.id)
    } else {
      await supabase.from('event_menus').insert({ ...menuForm, event_id: eventId })
    }
    setShowMenuModal(null); setMenuForm(defaultMenu()); load()
  }

  async function remove(id) {
    if (!confirm('Supprimer cet événement ?')) return
    await supabase.from('program_events').delete().eq('id', id)
    load()
  }

  function openEdit(e) {
    setForm({ time: e.time, title: e.title, description: e.description || '', location: e.location || '', duration_min: e.duration_min, capacity: e.capacity || 0, sub_program: e.sub_program || '' })
    setEditing(e.id); setShowModal(true)
  }

  function openMenu(e) {
    const existing = menus[e.id]
    setMenuForm(existing ? { starter: existing.starter || '', main_course: existing.main_course || '', dessert: existing.dessert || '', drinks: existing.drinks || '', notes: existing.notes || '' } : defaultMenu())
    setShowMenuModal(e)
  }

  const ICONS = { 'cérémonie': '💍', 'cocktail': '🥂', 'repas': '🍽', 'dîner': '🍽', 'soirée': '🎶', 'musique': '🎶', 'danse': '💃', 'photo': '📸', 'accueil': '🤝', 'discours': '🎤', 'gâteau': '🎂', 'animation': '🎉', 'départ': '🚗' }
  function getIcon(title) {
    const lower = title.toLowerCase()
    for (const [key, icon] of Object.entries(ICONS)) { if (lower.includes(key)) return icon }
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
        <div className="empty-state"><div className="icon">📋</div><p>Programme vide</p></div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 40 }}>
          <div style={{ position: 'absolute', left: 12, top: 8, bottom: 8, width: 2, background: 'var(--blush)', borderRadius: 1 }} />
          {events.map(event => {
            const menu = menus[event.id]
            return (
              <div key={event.id} style={{ position: 'relative', marginBottom: 20 }}>
                <div style={{ position: 'absolute', left: -34, top: 14, width: 18, height: 18, borderRadius: '50%', background: 'var(--rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--ivory)', zIndex: 1 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                </div>
                <div className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 18 }}>{getIcon(event.title)}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--rose)', fontWeight: 600 }}>{event.time}</span>
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>({event.duration_min} min)</span>
                        {event.capacity > 0 && <span className="badge badge-blue">👥 {event.capacity} pers.</span>}
                      </div>
                      <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>{event.title}</div>
                      {event.location && <div style={{ fontSize: 13, color: 'var(--muted)' }}>📍 {event.location}</div>}
                      {event.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{event.description}</div>}
                      {event.sub_program && (
                        <div style={{ marginTop: 8, background: 'var(--cream)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                          <div style={{ fontWeight: 500, marginBottom: 4, color: 'var(--muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Programme détaillé</div>
                          <div style={{ whiteSpace: 'pre-line', color: 'var(--deep)' }}>{event.sub_program}</div>
                        </div>
                      )}
                      {menu && (
                        <div style={{ marginTop: 8, background: 'var(--sage-light)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                          <div style={{ fontWeight: 500, marginBottom: 6, color: '#2D5A27', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🍽 Menu</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {menu.starter && <span>Entrée : {menu.starter}</span>}
                            {menu.main_course && <span>Plat : {menu.main_course}</span>}
                            {menu.dessert && <span>Dessert : {menu.dessert}</span>}
                            {menu.drinks && <span>Boissons : {menu.drinks}</span>}
                            {menu.notes && <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>{menu.notes}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openMenu(event)} title="Menu">🍽</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(event)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(event.id)}>🗑</button>
                    </div>
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
            <h2>{editing ? 'Modifier' : 'Nouvel événement'}</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Heure *</label>
                <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Durée (min)</label>
                <input type="number" min="5" value={form.duration_min} onChange={e => setForm({ ...form, duration_min: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Titre *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex : Cérémonie civile" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Lieu</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Nb de personnes</label>
                <input type="number" min="0" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="0 = tous" />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="form-group">
              <label>Programme détaillé (une étape par ligne)</label>
              <textarea value={form.sub_program} onChange={e => setForm({ ...form, sub_program: e.target.value })} placeholder={"14h00 — Arrivée des invités\n14h30 — Discours\n15h00 — Vin d'honneur"} rows={4} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={save}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {showMenuModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMenuModal(null)}>
          <div className="modal">
            <h2>Menu — {showMenuModal.title}</h2>
            {[['starter','Entrée'],['main_course','Plat principal'],['dessert','Dessert'],['drinks','Boissons']].map(([key, label]) => (
              <div key={key} className="form-group">
                <label>{label}</label>
                <input value={menuForm[key]} onChange={e => setMenuForm({ ...menuForm, [key]: e.target.value })} />
              </div>
            ))}
            <div className="form-group">
              <label>Notes</label>
              <textarea value={menuForm.notes} onChange={e => setMenuForm({ ...menuForm, notes: e.target.value })} rows={2} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowMenuModal(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={() => saveMenu(showMenuModal.id)}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
