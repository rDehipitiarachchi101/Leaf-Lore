/**
 * Sends a prompt to the model through our own server.
 *
 * The Anthropic key never reaches the browser — see api/claude.js. Anything
 * shipped in client code is readable by anyone who opens devtools.
 */
export async function askClaude(prompt, { maxTokens = 1000 } = {}) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTokens }),
  });

  if (!res.ok) throw new Error(`Model request failed: ${res.status}`);

  const data = await res.json();
  return (data.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");
}
