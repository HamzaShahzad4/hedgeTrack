import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStoredToken } from '../components/ProtectedRoute'

function formatFollowUpLabel(isoString) {
  if (!isoString) return ''
  const due = new Date(isoString)
  if (Number.isNaN(due.getTime())) return ''

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffDays = Math.round((startOfDueDay - startOfToday) / (24 * 60 * 60 * 1000))

  const dateStr = due.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  if (diffDays < 0) {
    const n = Math.abs(diffDays)
    const unit = n === 1 ? 'day' : 'days'
    return { dateStr, status: 'overdue', summary: `Overdue by ${n} ${unit}` }
  }
  if (diffDays === 0) {
    return { dateStr, status: 'today', summary: 'Due today' }
  }
  if (diffDays === 1) {
    return { dateStr, status: 'soon', summary: 'Due tomorrow' }
  }
  return { dateStr, status: 'soon', summary: `Due in ${diffDays} days` }
}

export default function Dashboard() {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setError('')
      setLoading(true)
      try {
        const token = getStoredToken()
        const res = await fetch('/api/reminders', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(data.error || 'Failed to load follow-up reminders')
          setReminders([])
          return
        }
        setReminders(Array.isArray(data.contacts) ? data.contacts : [])
      } catch {
        if (!cancelled) {
          setError('Network error. Please try again.')
          setReminders([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page dashboard-page">
      <h1>Dashboard</h1>
      <p className="muted">Welcome to HedgeTrack. You are logged in.</p>

      <section className="dashboard-reminders" aria-labelledby="reminders-heading">
        <div className="dashboard-reminders-header">
          <h2 id="reminders-heading" className="dashboard-reminders-title">
            Follow-up reminders
          </h2>
          <p className="dashboard-reminders-sub muted">
            Contacts with a follow-up in the next 7 days or already overdue.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <p className="muted dashboard-reminders-empty">Loading reminders…</p>
        ) : reminders.length === 0 ? (
          <p className="muted dashboard-reminders-empty">
            No upcoming follow-ups. Log interactions on a contact profile to set the next date.
          </p>
        ) : (
          <div className="reminder-grid">
            {reminders.map((c) => {
              const meta = formatFollowUpLabel(c.next_follow_up)
              return (
                <article key={c.id} className={`reminder-card reminder-card--${meta.status}`}>
                  <div className="reminder-card-top">
                    <span className={`reminder-badge reminder-badge--${meta.status}`}>
                      {meta.summary}
                    </span>
                  </div>
                  <h3 className="reminder-name">{c.name}</h3>
                  <p className="reminder-meta">
                    {c.job_title} · {c.firm}
                  </p>
                  <p className="reminder-due">
                    <span className="reminder-due-label">Follow-up date</span>
                    <span className="reminder-due-value">{meta.dateStr}</span>
                  </p>
                  <Link className="reminder-link" to={`/contact/${c.id}`}>
                    Open profile →
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
