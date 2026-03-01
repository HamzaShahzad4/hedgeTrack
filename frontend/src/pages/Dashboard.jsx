import { useNavigate } from 'react-router-dom'
import { setStoredToken } from '../components/ProtectedRoute'

export default function Dashboard() {
  const navigate = useNavigate()

  const handleLogout = () => {
    setStoredToken(null)
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>
      <p>Welcome to HedgeTrack. You are logged in.</p>
      <p>This is a placeholder dashboard. Contacts, interactions, and the application tracker will be added in later checkpoints.</p>
      <button type="button" className="logout-btn" onClick={handleLogout}>
        Log out
      </button>
    </div>
  )
}
