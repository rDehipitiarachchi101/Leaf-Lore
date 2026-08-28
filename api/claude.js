/**
 * Serverless proxy for model calls (Vercel / Netlify functions format).
 * Set ANTHROPIC_API_KEY in your host's environment variables — never in the repo.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const { prompt, maxTokens = 1000 } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json(data);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Upstream request failed" });
  }
}
