import { useCallback, useEffect, useMemo, useState } from 'react'
import { getStoredToken } from '../components/ProtectedRoute'

const STATUS_COLUMNS = [
  { status: 'Applied' },
  { status: 'First Round' },
  { status: 'Superday' },
  { status: 'Offer' },
]

function authHeaders() {
  return { Authorization: `Bearer ${getStoredToken()}` }
}

export default function Tracker() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [firmName, setFirmName] = useState('')
  const [role, setRole] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverStatus, setDragOverStatus] = useState(null)

  const fetchApplications = useCallback(async () => {
    setPageError('')
    setLoading(true)
    try {
      const res = await fetch('/api/applications', { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPageError(data.error || 'Failed to load applications')
        setApplications([])
        return
      }
      setApplications(Array.isArray(data.applications) ? data.applications : [])
    } catch {
      setPageError('Network error. Please try again.')
      setApplications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const byStatus = useMemo(() => {
    const allowed = new Set(STATUS_COLUMNS.map((c) => c.status))
    const map = Object.fromEntries(STATUS_COLUMNS.map((c) => [c.status, []]))
    for (const a of applications) {
      const key = allowed.has(a.status) ? a.status : 'Applied'
      map[key].push(a)
    }
    return map
  }, [applications])

  const handleAddApplication = async (e) => {
    e.preventDefault()
    setFormError('')
    const fn = firmName.trim()
    const r = role.trim()
    if (!fn || !r) {
      setFormError('Firm name and role are required.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ firm_name: fn, role: r }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Failed to add application')
        return
      }
      setFirmName('')
      setRole('')
      if (data.application) {
        setApplications((prev) => [data.application, ...prev])
      } else {
        await fetchApplications()
      }
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /** Optimistic column move + background PUT; revert this card on failure. */
  const moveCardToStatus = (applicationId, newStatus, previousStatus) => {
    setPageError('')
    setApplications((apps) =>
      apps.map((a) => (a.id === applicationId ? { ...a, status: newStatus } : a))
    )

    void fetch(`/api/applications/${applicationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ status: newStatus }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setApplications((apps) =>
            apps.map((a) =>
              a.id === applicationId ? { ...a, status: previousStatus } : a
            )
          )
          setPageError(data.error || 'Failed to move card')
          return
        }
        if (data.application) {
          setApplications((apps) =>
            apps.map((a) => (a.id === applicationId ? data.application : a))
          )
        }
      })
      .catch(() => {
        setApplications((apps) =>
          apps.map((a) =>
            a.id === applicationId ? { ...a, status: previousStatus } : a
          )
        )
        setPageError('Network error while moving card.')
      })
  }

  const onDragStart = (e, appId) => {
    setDraggingId(appId)
    e.dataTransfer.setData('applicationId', String(appId))
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragEnd = () => {
    setDraggingId(null)
    setDragOverStatus(null)
  }

  const onDragOverColumn = (e, status) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }

  const onDrop = (e, status) => {
    e.preventDefault()
    setDragOverStatus(null)
    const id = parseInt(e.dataTransfer.getData('applicationId'), 10)
    setDraggingId(null)
    if (!Number.isFinite(id)) return
    const app = applications.find((a) => a.id === id)
    if (!app || app.status === status) return
    moveCardToStatus(id, status, app.status)
  }

  return (
    <div className="page tracker-page">
      <h1>Application tracker</h1>
      <p className="muted">
        Pipeline: Applied → First Round → Superday → Offer. Drag cards between columns or add a new
        application below.
      </p>

      {pageError && <div className="alert alert-error">{pageError}</div>}

      <section className="card tracker-add-card" aria-labelledby="tracker-form-heading">
        <h2 id="tracker-form-heading" className="section-title">
          Add application
        </h2>
        <p className="tracker-form-hint muted">
          New cards start in <strong>Applied</strong>. Drag them across the board as you progress.
        </p>
        {formError && <div className="alert alert-error">{formError}</div>}
        <form className="tracker-form" onSubmit={handleAddApplication}>
          <div className="field">
            <label htmlFor="tracker-firm">Firm name</label>
            <input
              id="tracker-firm"
              className="input"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="e.g. Goldman Sachs"
              disabled={submitting}
              autoComplete="organization"
            />
          </div>
          <div className="field">
            <label htmlFor="tracker-role">Role</label>
            <input
              id="tracker-role"
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Summer Analyst"
              disabled={submitting}
              autoComplete="off"
            />
          </div>
          <div className="tracker-form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add to board'}
            </button>
          </div>
        </form>
      </section>

      <div
        className={`tracker-board${loading ? ' tracker-board--loading' : ''}`}
        aria-label="Application pipeline by status"
      >
        {loading ? (
          <div className="tracker-board-loading" aria-busy="true">
            <p className="tracker-loading muted">Loading board…</p>
            <div className="tracker-board-skeleton">
              {STATUS_COLUMNS.map((col) => (
                <div key={col.status} className="tracker-column tracker-column--skeleton">
                  <div className="tracker-skeleton-head" />
                  <div className="tracker-skeleton-card" />
                  <div className="tracker-skeleton-card" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          STATUS_COLUMNS.map((col) => (
            <div
              key={col.status}
              className={`tracker-column${dragOverStatus === col.status ? ' tracker-column--drop-target' : ''}`}
              data-status={col.status}
              onDragOver={(e) => onDragOverColumn(e, col.status)}
              onDrop={(e) => onDrop(e, col.status)}
            >
              <div className="tracker-column-head">
                <h3 className="tracker-column-title">{col.status}</h3>
                <span className="tracker-column-count" aria-label={`${byStatus[col.status].length} in ${col.status}`}>
                  {byStatus[col.status].length}
                </span>
              </div>
              <div className="tracker-column-body" role="list" aria-label={`Applications in ${col.status}`}>
                {byStatus[col.status].map((app) => (
                  <div
                    key={app.id}
                    className={`tracker-card${draggingId === app.id ? ' tracker-card--dragging' : ''}`}
                    role="listitem"
                    draggable
                    onDragStart={(e) => onDragStart(e, app.id)}
                    onDragEnd={onDragEnd}
                  >
                    <div className="tracker-card-firm">{app.firm_name}</div>
                    <div className="tracker-card-role">{app.role}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
