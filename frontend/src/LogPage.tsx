import { useEffect, useState, type FormEvent } from 'react'
import { getCurrentRead, getGoal, getSessions, localToday, logSession, type CurrentRead, type Session } from './api'
import { Cluster } from './Cluster'

export function LogPage() {
  const [currentRead, setCurrentRead] = useState<CurrentRead | null>(null)
  const [goal, setGoal] = useState<number | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [pagesRead, setPagesRead] = useState('')
  const [pulledForward, setPulledForward] = useState('')
  const [dragged, setDragged] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const today = localToday()

  // 1. Bootstrap: what book are we logging against, and what's the goal?
  // 2. Read back this book's saved sessions so the cluster reflects the database.
  useEffect(() => {
    Promise.all([getCurrentRead(), getGoal()])
      .then(async ([read, g]) => {
        setCurrentRead(read)
        setGoal(g.dailyPageGoal)
        setSessions(await getSessions(read.book))
      })
      .catch((e: Error) => setLoadError(e.message))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!currentRead) return
    setSaving(true)
    setSaveError(null)
    try {
      await logSession({ pagesRead: Number(pagesRead), localDate: today, pulledForward, dragged })
      // Re-fetch rather than appending locally: what's drawn is what the server stored
      setSessions(await getSessions(currentRead.book))
      setPagesRead('')
      setPulledForward('')
      setDragged('')
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loadError) return <main className="page"><p role="alert">Couldn't load: {loadError}</p></main>
  if (!currentRead || goal === null) return <main className="page"><p className="muted">Loading…</p></main>

  const { book } = currentRead
  const currentPage = currentRead.startingPage + sessions.reduce((sum, s) => sum + s.pagesRead, 0)

  return (
    <main className="page">
      <header className="book card">
        <p className="eyebrow">Current read</p>
        <h1>{book.title}</h1>
        <p>{book.authors}</p>
        <dl className="facts">
          <div><dt>Genre</dt><dd>{book.genre ?? '—'}</dd></div>
          <div><dt>Format</dt><dd>{book.format ?? '—'}</dd></div>
          <div><dt>Published</dt><dd>{book.publishedDate ?? '—'}</dd></div>
          <div><dt>Avg rating</dt><dd>{book.averageRating ?? '—'}</dd></div>
          <div><dt>ISBN</dt><dd>{book.isbn ?? '—'}</dd></div>
          <div><dt>ASIN</dt><dd>{book.asin ?? '—'}</dd></div>
        </dl>
        <p className="muted">Page {currentPage} of {book.pageCount ?? '?'} · Daily goal {goal} pages</p>
      </header>

      <section className="card">
        <h2>Today's leaf</h2>
        <form className="log" onSubmit={handleSubmit}>
          <label>
            Pages read this sitting
            <input type="number" min={1} max={2000} required value={pagesRead} onChange={(e) => setPagesRead(e.target.value)} />
          </label>
          <label>
            What pulled you forward?
            <textarea required maxLength={2000} rows={2} value={pulledForward} onChange={(e) => setPulledForward(e.target.value)} />
          </label>
          <label>
            What dragged?
            <textarea required maxLength={2000} rows={2} value={dragged} onChange={(e) => setDragged(e.target.value)} />
          </label>
          <button className="primary" type="submit" disabled={saving}>{saving ? 'Growing…' : 'Grow a leaf'}</button>
          {saveError && <p role="alert" className="error">{saveError}</p>}
        </form>
      </section>

      <section className="card">
        <h2>{book.title}'s cluster</h2>
        {sessions.length === 0 ? (
          <p className="muted">No leaves yet. Log a sitting to grow the first one.</p>
        ) : (
          <>
            <Cluster sessions={sessions} today={today} />
            <ol className="entries">
              {[...sessions].reverse().map((s) => (
                <li key={s.id}>
                  <p className="eyebrow">{s.localDate} · {s.pagesRead} / {s.goalPages} pages</p>
                  <p><span className="muted">Pulled forward:</span> {s.pulledForward}</p>
                  <p><span className="muted">Dragged:</span> {s.dragged}</p>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </main>
  )
}
