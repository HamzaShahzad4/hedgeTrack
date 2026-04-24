import { NavLink, useNavigate } from 'react-router-dom'
import { setStoredToken } from './ProtectedRoute'

export default function Sidebar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    setStoredToken(null)
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">HedgeTrack</div>
      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/directory"
          className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
        >
          Directory
        </NavLink>
        <NavLink
          to="/tracker"
          className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
        >
          Tracker
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-logout" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </aside>
  )
}

