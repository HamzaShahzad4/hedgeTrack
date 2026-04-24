import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getStoredToken } from '../components/ProtectedRoute'

const INTERACTION_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Call' },
  { value: 'coffee chat', label: 'Coffee chat' },
]

function formatDateTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sortInteractionsChronological(list) {
  return [...list].sort((a, b) => {
    const da = new Date(a.date || 0).getTime()
    const db = new Date(b.date || 0).getTime()
    if (da !== db) return da - db
    const ca = new Date(a.created_at || 0).getTime()
    const cb = new Date(b.created_at || 0).getTime()
    return ca - cb
  })
}

export default function Profile() {
  const { id } = useParams()
  const contactId = id ? parseInt(id, 10) : NaN

  const [contact, setContact] = useState(null)
  const [interactions, setInteractions] = useState([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  const [interactionType, setInteractionType] = useState('email')
  const [interactionDate, setInteractionDate] = useState('')
  const [notes, setNotes] = useState('')
  const [followUpMode, setFollowUpMode] = useState('auto')
  const [customFollowUpDate, setCustomFollowUpDate] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const authHeaders = () => ({
    Authorization: `Bearer ${getStoredToken()}`,
  })

  const loadData = useCallback(async () => {
    if (!Number.isFinite(contactId)) {
      setLoadError('Invalid contact.')
      setContact(null)
      setInteractions([])
      setLoading(false)
      return
    }

    setLoadError('')
    setLoading(true)
    const token = getStoredToken()
    try {
      const [contactsRes, intRes] = await Promise.all([
        fetch('/api/contacts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/contacts/${contactId}/interactions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const contactsData = await contactsRes.json().catch(() => ({}))
      const intData = await intRes.json().catch(() => ({}))

      if (!contactsRes.ok) {
        setLoadError(contactsData.error || 'Failed to load contact')
        setContact(null)
        setInteractions([])
        return
      }

      const found = (Array.isArray(contactsData.contacts) ? contactsData.contacts : []).find(
        (c) => c.id === contactId
      )
      if (!found) {
        setLoadError('Contact not found.')
        setContact(null)
        setInteractions([])
        return
      }

      if (!intRes.ok) {
        setLoadError(intData.error || 'Failed to load interactions')
        setContact(found)
        setInteractions([])
        return
      }

      setContact(found)
      setInteractions(sortInteractionsChronological(intData.interactions || []))
    } catch {
      setLoadError('Network error. Please try again.')
      setContact(null)
      setInteractions([])
    } finally {
      setLoading(false)
    }
  }, [contactId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const t = new Date()
    const y = t.getFullYear()
    const m = String(t.getMonth() + 1).padStart(2, '0')
    const d = String(t.getDate()).padStart(2, '0')
    setInteractionDate(`${y}-${m}-${d}`)
    const in30 = new Date(t)
    in30.setDate(in30.getDate() + 30)
    const y2 = in30.getFullYear()
    const m2 = String(in30.getMonth() + 1).padStart(2, '0')
    const d2 = String(in30.getDate()).padStart(2, '0')
    setCustomFollowUpDate(`${y2}-${m2}-${d2}`)
  }, [])

  const handleLogInteraction = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!Number.isFinite(contactId)) return

    const trimmedNotes = notes.trim()
    if (!trimmedNotes) {
      setFormError('Notes are required.')
      return
    }
    if (followUpMode === 'custom' && !customFollowUpDate) {
      setFormError('Choose a next follow-up date, or switch to automatic.')
      return
    }

    const payload = {
      type: interactionType,
      date: interactionDate ? `${interactionDate}T12:00:00.000Z` : undefined,
      notes: trimmedNotes,
    }
    if (followUpMode === 'custom') {
      payload.next_follow_up = `${customFollowUpDate}T12:00:00.000Z`
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Failed to log interaction')
        return
      }
      if (data.interaction) {
        setInteractions((prev) => sortInteractionsChronological([...prev, data.interaction]))
      }
      if (data.contact) {
        setContact(data.contact)
      }
      setNotes('')
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteInteraction = async (interactionId) => {
    setDeleteError('')
    setDeletingId(interactionId)
    try {
      const res = await fetch(`/api/interactions/${interactionId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError(data.error || 'Failed to delete interaction')
        return
      }
      setInteractions((prev) => prev.filter((i) => i.id !== interactionId))
    } catch {
      setDeleteError('Network error. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  if (!Number.isFinite(contactId)) {
    return (
      <div className="page">
        <p className="alert alert-error">Invalid contact ID.</p>
        <Link className="profile-back" to="/directory">
          Back to Directory
        </Link>
      </div>
    )
  }

  return (
    <div className="page profile-page">
      <div className="profile-header">
        <Link className="profile-back" to="/directory">
          ← Directory
        </Link>
        <h1>Contact profile</h1>
      </div>

      {loadError && !contact && <div className="alert alert-error">{loadError}</div>}

      {loading && !contact ? (
        <p className="muted">Loading…</p>
      ) : contact ? (
        <div className="profile-split">
          <aside className="profile-pane profile-pane-left">
            <h2 className="profile-pane-title">Details</h2>
            <dl className="profile-details">
              <div>
                <dt>Name</dt>
                <dd>{contact.name}</dd>
              </div>
              <div>
                <dt>Firm</dt>
                <dd>{contact.firm}</dd>
              </div>
              <div>
                <dt>Title</dt>
                <dd>{contact.job_title}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </dd>
              </div>
              {contact.next_follow_up && (
                <div>
                  <dt>Next follow-up</dt>
                  <dd>{formatDateTime(contact.next_follow_up)}</dd>
                </div>
              )}
            </dl>
          </aside>

          <section className="profile-pane profile-pane-right">
            <h2 className="profile-pane-title">Interaction history</h2>

            {loadError && <div className="alert alert-error">{loadError}</div>}

            <form className="interaction-form" onSubmit={handleLogInteraction}>
              {formError && <div className="alert alert-error">{formError}</div>}
              <div className="interaction-form-grid">
                <div className="field">
                  <label htmlFor="interaction-type">Type</label>
                  <select
                    id="interaction-type"
                    className="select"
                    value={interactionType}
                    onChange={(e) => setInteractionType(e.target.value)}
                    disabled={submitting}
                  >
                    {INTERACTION_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="interaction-date">Date</label>
                  <input
                    id="interaction-date"
                    type="date"
                    className="input"
                    value={interactionDate}
                    onChange={(e) => setInteractionDate(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="field interaction-notes-field">
                  <label htmlFor="interaction-notes">Notes</label>
                  <textarea
                    id="interaction-notes"
                    className="textarea"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What did you discuss? Next steps?"
                    disabled={submitting}
                  />
                </div>

                <div className="interaction-followup interaction-notes-field">
                  <span className="interaction-followup-label">Next follow-up</span>
                  <div className="interaction-radio-row">
                    <label className="interaction-radio">
                      <input
                        type="radio"
                        name="followUpMode"
                        value="auto"
                        checked={followUpMode === 'auto'}
                        onChange={() => setFollowUpMode('auto')}
                        disabled={submitting}
                      />
                      <span>
                        Automatic — 30 days after the interaction date above
                      </span>
                    </label>
                    <label className="interaction-radio">
                      <input
                        type="radio"
                        name="followUpMode"
                        value="custom"
                        checked={followUpMode === 'custom'}
                        onChange={() => setFollowUpMode('custom')}
                        disabled={submitting}
                      />
                      <span>Choose my own date</span>
                    </label>
                  </div>
                  {followUpMode === 'custom' && (
                    <div className="field interaction-custom-followup-field">
                      <label htmlFor="custom-follow-up">Follow-up date</label>
                      <input
                        id="custom-follow-up"
                        type="date"
                        className="input"
                        value={customFollowUpDate}
                        onChange={(e) => setCustomFollowUpDate(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="form-actions profile-form-actions">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Log interaction'}
                </button>
              </div>
            </form>

            {deleteError && <div className="alert alert-error">{deleteError}</div>}

            <ul className="timeline">
              {interactions.length === 0 ? (
                <li className="timeline-empty">No interactions yet. Log one above.</li>
              ) : (
                interactions.map((item) => (
                  <li key={item.id} className="timeline-item">
                    <button
                      type="button"
                      className="timeline-item-delete"
                      onClick={() => handleDeleteInteraction(item.id)}
                      disabled={deletingId !== null}
                      aria-label={`Delete ${item.type} interaction`}
                      title="Delete interaction"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" x2="10" y1="11" y2="17" />
                        <line x1="14" x2="14" y1="11" y2="17" />
                      </svg>
                    </button>
                    <div className="timeline-meta">
                      <span className="timeline-type">{item.type}</span>
                      <span className="timeline-date">{formatDateTime(item.date)}</span>
                    </div>
                    <p className="timeline-notes">{item.notes}</p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  )
}
