import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CATS = ['Administratif', 'Lieu & salle', 'Traiteur', 'Tenues', 'Déco & fleurs', 'Musique', 'Faire-part', 'Lune de miel', 'Jour J', 'Divers']
const PRIOS = { haute: 'badge-red', normale: 'badge-gray', basse: 'badge-blue' }

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(defaultForm())
  const [filter, setFilter] = useState('all')

  function defaultForm() {
    return { title: '', category: CATS[0], due_date: '', priority: 'normale', done: false, notes: '' }
  }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*').order('due_date', { nullsLast: true })
    if (data) setTasks(data)
    setLoading(false)
  }

  async function save() {
    if (!form.title.trim()) return
    if (editing) {
      await supabase.from('tasks').update(form).eq('id', editing)
    } else {
      await supabase.from('tasks').insert(form)
    }
    setShowModal(false); setEditing(null); setForm(defaultForm()); load()
  }

  async function toggleDone(task) {
    await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id)
    setTasks(tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t))
  }

  async function remove(id) {
    if (!confirm('Supprimer cette tâche ?')) return
    await supabase.from('tasks').delete().eq('id', id)
    load()
  }

  function openEdit(t) {
    setForm({ title: t.title, category: t.category, due_date: t.due_date || '', priority: t.priority, done: t.done, notes: t.notes || '' })
    setEditing(t.id); setShowModal(true)
  }

  const today = new Date().toISOString().split('T')[0]
  const filtered = tasks.filter(t => {
    if (filter === 'done') return t.done
    if (filter === 'todo') return !t.done
    if (filter === 'late') return !t.done && t.due_date && t.due_date < today
    return true
  })

  const grouped = CATS.reduce((acc, cat) => {
    const catTasks = filtered.filter(t => t.category === cat)
    if (catTasks.length > 0) acc[cat] = catTasks
    return acc
  }, {})

  const doneCount = tasks.filter(t => t.done).length
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 28 }}>Planning</h2>
        <button className="btn btn-primary" onClick={() => { setForm(defaultForm()); setEditing(null); setShowModal(true) }}>+ Tâche</button>
      </div>

      {tasks.length > 0 && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
            <span>{doneCount} / {tasks.length} tâches complétées</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--cream)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${progress}%`, background: 'var(--sage)', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {[['all','Toutes'],['todo','À faire'],['late','En retard'],['done','Terminées']].map(([val, label]) => (
          <button key={val} className="btn btn-sm" onClick={() => setFilter(val)}
            style={{ background: filter === val ? 'var(--deep)' : 'var(--white)', color: filter === val ? '#fff' : 'var(--deep)', border: '1.5px solid var(--border)', flexShrink: 0 }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Chargement…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="empty-state"><div className="icon">✅</div><p>Aucune tâche ici</p></div>
      ) : (
        Object.entries(grouped).map(([cat, catTasks]) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontFamily: 'Inter', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{cat}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {catTasks.map(task => {
                const isLate = !task.done && task.due_date && task.due_date < today
                return (
                  <div key={task.id} className="card" style={{ padding: '12px 16px', opacity: task.done ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button onClick={() => toggleDone(task)} style={{
                        width: 22, height: 22, borderRadius: 6, border: `2px solid ${task.done ? 'var(--sage)' : 'var(--border)'}`,
                        background: task.done ? 'var(--sage)' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12
                      }}>
                        {task.done ? '✓' : ''}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 500, fontSize: 14, textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</span>
                          <span className={`badge ${PRIOS[task.priority]}`}>{task.priority}</span>
                          {isLate && <span className="badge badge-red">En retard</span>}
                        </div>
                        {task.due_date && (
                          <div style={{ fontSize: 12, color: isLate ? '#B91C1C' : 'var(--muted)', marginTop: 2 }}>
                            📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(task)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(task.id)}>🗑</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2>{editing ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>
            <div className="form-group">
              <label>Intitulé *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex : Réserver la salle" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Catégorie</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Priorité</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option>haute</option><option>normale</option><option>basse</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Date limite</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
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
