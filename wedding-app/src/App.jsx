import { useState } from 'react'
import { isConfigured } from './supabase'
import SetupGuide from './components/SetupGuide'
import Dashboard from './components/Dashboard'
import Guests from './components/Guests'
import Budget from './components/Budget'
import Tasks from './components/Tasks'
import Vendors from './components/Vendors'
import Seating from './components/Seating'
import Program from './components/Program'
import Tickets from './components/Tickets'
import './App.css'

const TABS = [
  { id: 'home', icon: '🏠', label: 'Accueil' },
  { id: 'guests', icon: '👥', label: 'Invités' },
  { id: 'budget', icon: '💰', label: 'Budget' },
  { id: 'tasks', icon: '✅', label: 'Planning' },
  { id: 'vendors', icon: '🤝', label: 'Prestataires' },
  { id: 'seating', icon: '🪑', label: 'Tables' },
  { id: 'program', icon: '📋', label: 'Programme' },
  { id: 'tickets', icon: '🎫', label: 'Billets' },
]

function TabContent({ tab }) {
  switch (tab) {
    case 'guests': return <Guests />
    case 'budget': return <Budget />
    case 'tasks': return <Tasks />
    case 'vendors': return <Vendors />
    case 'seating': return <Seating />
    case 'program': return <Program />
    case 'tickets': return <Tickets />
    default: return null
  }
}

export default function App() {
  const [tab, setTab] = useState('home')

  if (!isConfigured()) return <SetupGuide />

  return (
    <div className="app-shell">
      <header className="app-header">
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 400 }}>
          💍 Mon mariage
        </span>
      </header>

      <main className="app-main">
        {tab === 'home'
          ? <Dashboard onNavigate={setTab} />
          : <TabContent tab={tab} />
        }
      </main>

      <nav className="app-nav">
        {TABS.map(t => (
          <button key={t.id} className={`nav-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
