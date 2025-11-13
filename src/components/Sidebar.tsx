import './Sidebar.css'

type TabType = 'transcribe' | 'settings'

interface SidebarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="app-title">Whisper</h1>
      </div>
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeTab === 'transcribe' ? 'active' : ''}`}
          onClick={() => onTabChange('transcribe')}
        >
          <span className="nav-icon">🎤</span>
          <span className="nav-text">语音转文本</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => onTabChange('settings')}
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-text">设置</span>
        </button>
      </nav>
    </div>
  )
}

export default Sidebar
