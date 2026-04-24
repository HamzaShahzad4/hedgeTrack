import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStoredToken } from '../components/ProtectedRoute'

function formatDate(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

export default function Directory() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  const [name, setName] = useState('')
  const [firm, setFirm] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [email, setEmail] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [filterBy, setFilterBy] = useState('firm')
  const [search, setSearch] = useState('')

  const fetchContacts = async () => {
    setPageError('')
    setLoading(true)
    try {
      const token = getStoredToken()
      const res = await fetch('/api/contacts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPageError(data.error || 'Failed to load contacts')
        setContacts([])
        return
      }
      setContacts(Array.isArray(data.contacts) ? data.contacts : [])
    } catch (e) {
      setPageError('Network error. Please try again.')
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      await fetchContacts()
    })()
  }, [])

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return contacts
    const key = filterBy === 'job_title' ? 'job_title' : 'firm'
    return contacts.filter((c) => String(c?.[key] || '').toLowerCase().includes(q))
  }, [contacts, filterBy, search])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')

    const payload = {
      name: name.trim(),
      firm: firm.trim(),
      job_title: jobTitle.trim(),
      email: email.trim(),
    }

    const missing = []
    if (!payload.name) missing.push('Name')
    if (!payload.firm) missing.push('Firm')
    if (!payload.job_title) missing.push('Job Title')
    if (!payload.email) missing.push('Email')
    if (missing.length) {
      setSubmitError(`Missing required field(s): ${missing.join(', ')}`)
      return
    }

    setSubmitting(true)
    try {
      const token = getStoredToken()
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to add contact')
        return
      }

      setName('')
      setFirm('')
      setJobTitle('')
      setEmail('')
      await fetchContacts()
    } catch (err) {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <h1>Directory</h1>
      <p className="muted">Store and search your professional contacts.</p>

      <section className="card">
        <h2 className="section-title">Add Contact</h2>
        {submitError && <div className="alert alert-error">{submitError}</div>}
        <form className="grid-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="contact-name">Name</label>
            <input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              disabled={submitting}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-firm">Firm</label>
            <input
              id="contact-firm"
              value={firm}
              onChange={(e) => setFirm(e.target.value)}
              placeholder="Goldman Sachs"
              disabled={submitting}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-title">Job Title</label>
            <input
              id="contact-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Analyst"
              disabled={submitting}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">Email</label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@firm.com"
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Add Contact'}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="toolbar">
          <h2 className="section-title">Contacts</h2>
          <div className="toolbar-controls">
            <select
              className="select"
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              aria-label="Filter field"
            >
              <option value="firm">Firm</option>
              <option value="job_title">Job Title</option>
            </select>
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search by ${filterBy === 'job_title' ? 'job title' : 'firm'}…`}
            />
          </div>
        </div>

        {pageError && <div className="alert alert-error">{pageError}</div>}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Firm</th>
                <th>Title</th>
                <th>Email</th>
                <th>Date Added</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    Loading…
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    No contacts found.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link className="table-link" to={`/contact/${c.id}`}>
                        {c.name}
                      </Link>
                    </td>
                    <td>{c.firm}</td>
                    <td>{c.job_title}</td>
                    <td>{c.email}</td>
                    <td>{formatDate(c.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

