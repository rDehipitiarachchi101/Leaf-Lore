# Leaf & Lore

A reading tracker where every reading session grows a leaf, every book gathers its
leaves into a cluster, and every month grows a tree that stands in your forest.

Read a little, write down what pulled you forward, watch it grow.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

The Discover and Insights screens call a model. Those calls go through
`api/claude.js` so the API key stays on the server:

```bash
cp .env.example .env.local     # add your key
npx vercel dev                 # serves the app and /api together
```

Everything except those two screens works without a key.

## How it's put together

| Path | What lives there |
| --- | --- |
| `src/App.jsx` | The whole app — tree generator, views, sheets |
| `src/lib/storage.js` | Persistence adapter (localStorage today, swappable) |
| `src/lib/claude.js` | Client half of the model call |
| `api/claude.js` | Server half — holds the key, proxies to Anthropic |

### Data model

Two collections plus settings, all in one storage key:

```js
book  = { id, title, author, genre, status, rating, pages, notes, addedAt }
entry = { id, bookId, date, amount, spark, drag, at }   // one reading session
```

Nothing about the tree is stored. Branches, clusters, trunk thickness, and the
forest are derived from entries at render time, so there is no state to migrate
when the visuals change.

### How the tree is drawn

- One **leaf** per entry. Hit the daily goal and it grows full; fall short and it's smaller.
- Leaves for one book spiral into a **cluster**, placed on that genre's **branch**.
- Trunk height and width scale with total sessions.
- A five-star book opens a **flower** at its cluster's centre.
- A month's **vitality** (days read ÷ days in month) drives how barren its tree looks.

## Roadmap

**V1 (here)** — tracking, daily sessions with reflections, tree, forest, recommendations.

**V2** — book search via Open Library so metadata isn't typed by hand; accounts and
sync; export your journal.

**V3** — shared groves, gifting recommendations as seeds.

## Notes

- No browser storage keys beyond `leaflore:v2`; clearing site data resets the app.
- The tree respects `prefers-reduced-motion`.
