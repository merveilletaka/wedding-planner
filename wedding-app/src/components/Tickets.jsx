import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import jsQR from 'jsqr'

export default function Tickets() {
  const [mode, setMode] = useState('stats') // stats | scan | search
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ total: 0, used: 0, confirmed: 0 })
  const [guests, setGuests] = useState([])
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const { data } = await supabase.from('guests').select('rsvp,ticket_used')
    if (data) {
      setStats({
        total: data.length,
        confirmed: data.filter(g => g.rsvp === 'confirmé').length,
        used: data.filter(g => g.ticket_used).length
      })
    }
  }

  async function startScan() {
    setResult(null)
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        requestAnimationFrame(scanFrame)
      }
    } catch (e) {
      setResult({ error: true, message: 'Impossible d\'accéder à la caméra. Utilisez la recherche manuelle.' })
      setScanning(false)
    }
  }

  function stopScan() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (animRef.current) cancelAnimationFrame(animRef.current)
    setScanning(false)
  }

  function scanFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(scanFrame)
      return
    }
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    if (code) {
      stopScan()
      validateTicket(code.data)
    } else {
      animRef.current = requestAnimationFrame(scanFrame)
    }
  }

  async function validateTicket(code) {
    const { data, error } = await supabase.from('guests').select('*').eq('ticket_code', code).single()
    if (!data || error) {
      setResult({ valid: false, type: 'unknown', message: 'QR code inconnu. Ce billet ne figure pas dans notre liste.' })
      loadStats()
      return
    }
    if (data.ticket_used) {
      setResult({ valid: false, type: 'used', guest: data, message: 'Ce billet a déjà été utilisé.' })
      return
    }
    if (data.rsvp !== 'confirmé') {
      setResult({ valid: false, type: 'not_confirmed', guest: data, message: `${data.name} n'a pas confirmé sa présence.` })
      return
    }
    await supabase.from('guests').update({ ticket_used: true }).eq('id', data.id)
    setResult({ valid: true, guest: data, message: `Bienvenue, ${data.name} !` })
    loadStats()
  }

  async function searchGuest(q) {
    setSearch(q)
    if (q.length < 2) { setGuests([]); return }
    const { data } = await supabase.from('guests').select('*').ilike('name', `%${q}%`).limit(10)
    if (data) setGuests(data)
  }

  async function manualValidate(guest) {
    if (guest.ticket_used) { alert('Billet déjà utilisé'); return }
    await supabase.from('guests').update({ ticket_used: true }).eq('id', guest.id)
    setResult({ valid: true, guest, message: `Bienvenue, ${guest.name} !` })
    setGuests([]); setSearch(''); loadStats()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 28 }}>Billets & entrée</h2>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Invités total', value: stats.total },
          { label: 'Confirmés', value: stats.confirmed },
          { label: 'Entrés', value: stats.used },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {stats.confirmed > 0 && (
        <div className="card" style={{ padding: '14px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
            <span>Présences validées</span>
            <span>{Math.round((stats.used / stats.confirmed) * 100)}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--cream)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${(stats.used / stats.confirmed) * 100}%`, background: 'var(--sage)' }} />
          </div>
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div style={{
          padding: 20, borderRadius: 12, marginBottom: 20,
          background: result.valid ? '#DCFCE7' : '#FEE2E2',
          color: result.valid ? '#166534' : '#B91C1C',
          textAlign: 'center', fontSize: 16, fontWeight: 500
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{result.valid ? '✅' : '❌'}</div>
          {result.message}
          {result.guest && !result.valid && (
            <div style={{ fontSize: 13, marginTop: 6, opacity: 0.8 }}>
              RSVP : {result.guest.rsvp} · Billet utilisé : {result.guest.ticket_used ? 'oui' : 'non'}
            </div>
          )}
          <button className="btn btn-sm" onClick={() => setResult(null)} style={{ marginTop: 12, background: 'rgba(0,0,0,0.1)', border: 'none', color: 'inherit' }}>
            Fermer
          </button>
        </div>
      )}

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className="btn btn-sm" onClick={() => { stopScan(); setMode('scan') }}
          style={{ background: mode === 'scan' ? 'var(--deep)' : 'var(--white)', color: mode === 'scan' ? '#fff' : 'var(--deep)', border: '1.5px solid var(--border)', flex: 1 }}>
          📷 Scanner QR
        </button>
        <button className="btn btn-sm" onClick={() => { stopScan(); setMode('search') }}
          style={{ background: mode === 'search' ? 'var(--deep)' : 'var(--white)', color: mode === 'search' ? '#fff' : 'var(--deep)', border: '1.5px solid var(--border)', flex: 1 }}>
          🔍 Recherche manuelle
        </button>
      </div>

      {/* Scanner */}
      {mode === 'scan' && (
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          {!scanning ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
              <p style={{ color: 'var(--muted)', marginBottom: 16, fontSize: 14 }}>
                Activez la caméra pour scanner les QR codes à l'entrée
              </p>
              <button className="btn btn-primary" onClick={startScan}>Démarrer le scanner</button>
            </>
          ) : (
            <>
              <video ref={videoRef} style={{ width: '100%', maxWidth: 320, borderRadius: 12, marginBottom: 12 }} playsInline muted />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 12 }}>Pointez vers le QR code du billet…</p>
              <button className="btn btn-ghost" onClick={stopScan}>Arrêter</button>
            </>
          )}
        </div>
      )}

      {/* Manual search */}
      {mode === 'search' && (
        <div className="card" style={{ padding: 20 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Nom de l'invité</label>
            <input placeholder="Rechercher par nom…" value={search} onChange={e => searchGuest(e.target.value)} autoFocus />
          </div>
          {guests.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {guests.map(g => (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--cream)', borderRadius: 8 }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{g.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>
                      RSVP: {g.rsvp} · {g.ticket_used ? '✅ Entré' : '⏳ Pas encore'}
                    </span>
                  </div>
                  {!g.ticket_used && g.rsvp === 'confirmé' && (
                    <button className="btn btn-primary btn-sm" onClick={() => manualValidate(g)}>Valider</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
