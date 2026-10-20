/**
 * A preview of the sign-in screen. Nothing here is sent anywhere yet:
 * the backend always acts as the seeded demo reader until real login exists.
 */
export function LoginPage({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="login">
      <h1 className="brand">Leaf &amp; Lore</h1>
      <p className="tagline">Read a little each day, say what it stirred, watch a leaf grow.</p>

      <form className="card login__form" onSubmit={(e) => e.preventDefault()} aria-describedby="login-note">
        <label>
          Email
          <input type="email" placeholder="you@example.com" disabled />
        </label>
        <label>
          Password
          <input type="password" placeholder="••••••••" disabled />
        </label>
        <button type="button" disabled>Sign in</button>
        <p id="login-note" className="muted">Sign-in is a preview. Accounts come in a later slice.</p>
      </form>

      <button className="primary" onClick={onContinue}>Continue as Demo Reader</button>
    </main>
  )
}
