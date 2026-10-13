import { useState } from 'react'
import { LoginPage } from './LoginPage'
import { LogPage } from './LogPage'

export default function App() {
  const [entered, setEntered] = useState(false)
  return entered ? <LogPage /> : <LoginPage onContinue={() => setEntered(true)} />
}
