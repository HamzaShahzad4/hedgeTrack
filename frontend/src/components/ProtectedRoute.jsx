import { Navigate, useLocation } from 'react-router-dom'

const TOKEN_KEY = 'hedgetrack_token'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function ProtectedRoute({ children }) {
  const location = useLocation()
  const token = getStoredToken()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
