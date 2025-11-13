import { useState } from 'react'
import Sidebar from './components/Sidebar'
import TranscribePage from './components/TranscribePage'
import SettingsPage from './components/SettingsPage'
import './App.css'

type TabType = 'transcribe' | 'settings'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('transcribe')

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="main-content">
        {activeTab === 'transcribe' && <TranscribePage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}

export default App
