import { useState } from 'react'
import { SETUP_SQL } from '../supabase'

export default function SetupGuide() {
  const [copiedSql, setCopiedSql] = useState(false)
  const [copiedEnv, setCopiedEnv] = useState(false)

  const copy = (text, setter) => {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>💍</div>
        <h1 style={{ fontSize: 36, fontFamily: "'Cormorant Garamond', serif", marginBottom: 8 }}>Planificateur de mariage</h1>
        <p style={{ color: '#8A7060' }}>Configuration initiale — 4 étapes rapides</p>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ background: '#3D2B1F', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>1</span>
          Créer un compte Supabase
        </h2>
        <p style={{ color: '#8A7060', marginBottom: 16, fontSize: 14 }}>Supabase est gratuit jusqu'à 500 MB — suffisant pour 150+ invités.</p>
        <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '10px 18px', background: '#3D2B1F', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>→ Aller sur supabase.com</a>
        <p style={{ marginTop: 12, fontSize: 13, color: '#8A7060' }}>Crée un compte → <strong>New Project</strong> → donne un nom → retiens le mot de passe.</p>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ background: '#3D2B1F', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>2</span>
          Créer les tables
        </h2>
        <p style={{ color: '#8A7060', marginBottom: 12, fontSize: 14 }}>Dans Supabase → <strong>SQL Editor</strong> → colle ce code et clique <strong>Run</strong> :</p>
        <div style={{ background: '#F2EDE4', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 11, color: '#3D2B1F', maxHeight: 180, overflowY: 'auto', marginBottom: 12, whiteSpace: 'pre', lineHeight: 1.5 }}>{SETUP_SQL}</div>
        <button onClick={() => copy(SETUP_SQL, setCopiedSql)} style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid rgba(61,43,31,0.12)', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
          {copiedSql ? '✓ Copié !' : '📋 Copier le SQL'}
        </button>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ background: '#3D2B1F', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>3</span>
          Récupérer les clés API
        </h2>
        <p style={{ color: '#8A7060', fontSize: 14 }}>Dans Supabase → <strong>Settings → API</strong> :</p>
        <ul style={{ paddingLeft: 20, color: '#8A7060', fontSize: 14, lineHeight: 2, marginTop: 8 }}>
          <li><strong>Project URL</strong> → valeur pour <code>VITE_SUPABASE_URL</code></li>
          <li><strong>anon public</strong> → valeur pour <code>VITE_SUPABASE_ANON_KEY</code></li>
        </ul>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ background: '#3D2B1F', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>4</span>
          Déployer sur Vercel (gratuit)
        </h2>
        <ol style={{ paddingLeft: 20, color: '#8A7060', fontSize: 14, lineHeight: 2 }}>
          <li>Upload ce projet sur GitHub</li>
          <li>Va sur <strong>vercel.com</strong> → importe le repo → Deploy</li>
          <li>Dans <strong>Settings → Environment Variables</strong>, ajoute :</li>
        </ol>
        <div style={{ background: '#F2EDE4', borderRadius: 8, padding: 14, fontFamily: 'monospace', fontSize: 13, margin: '12px 0', lineHeight: 2 }}>
          VITE_SUPABASE_URL=https://xxxxx.supabase.co<br />
          VITE_SUPABASE_ANON_KEY=eyJxxx...
        </div>
        <button onClick={() => copy('VITE_SUPABASE_URL=https://xxxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJxxx...', setCopiedEnv)} style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid rgba(61,43,31,0.12)', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
          {copiedEnv ? '✓ Copié !' : '📋 Copier le modèle'}
        </button>
        <p style={{ marginTop: 12, fontSize: 13, color: '#8A7060' }}>Vercel génère un lien partageable sans authentification.</p>
      </div>

      <div style={{ background: '#D4E4D1', borderRadius: 12, padding: 16, fontSize: 13, color: '#2D5A27', textAlign: 'center' }}>
        ✓ Une fois configuré, recharge la page — l'app s'ouvrira automatiquement.
      </div>
    </div>
  )
}
