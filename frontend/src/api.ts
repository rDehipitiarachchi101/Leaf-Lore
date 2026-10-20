// Types and calls for the Spring Boot API. Shapes mirror the backend's records.

export type Book = {
  title: string
  authors: string
  publishedDate: string | null
  genre: string | null
  format: string | null
  isbn: string | null
  asin: string | null
  averageRating: number | null
  pageCount: number | null
}

export type CurrentRead = {
  myBookId: number
  status: 'SEED' | 'READING' | 'PAUSED' | 'FINISHED'
  startingPage: number
  book: Book
}

export type Session = {
  id: number
  localDate: string // YYYY-MM-DD, the reader's calendar day
  loggedAt: string
  pagesRead: number
  goalPages: number // goal snapshot stamped by the server
  pulledForward: string
  dragged: string
}

// Only what the reader knows. The server adds the goal and timestamp.
export type LogSessionInput = {
  pagesRead: number
  localDate: string
  pulledForward: string
  dragged: string
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const problem = await res.json().catch(() => null)
    throw new Error(problem?.detail ?? `${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export const getCurrentRead = () => request<CurrentRead>('/api/me/current-read')

export const getGoal = () => request<{ dailyPageGoal: number }>('/api/me/goal')

export const logSession = (input: LogSessionInput) =>
  request<Session>('/api/me/current-read/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

export function getSessions(book: Pick<Book, 'isbn' | 'asin'>) {
  const params = new URLSearchParams()
  if (book.isbn) params.set('isbn', book.isbn)
  if (book.asin) params.set('asin', book.asin)
  return request<Session[]>(`/api/books/sessions?${params}`)
}

/** Today's date in the reader's own timezone, as YYYY-MM-DD. */
export const localToday = () => new Date().toLocaleDateString('en-CA')
