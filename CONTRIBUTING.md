# Working on this

## Branches

`main` always builds and deploys. Work happens on short-lived branches:

```
feat/book-search
fix/streak-off-by-one
design/forest-depth
```

## A change, start to finish

```bash
git switch -c feat/book-search
# ... work ...
npm run lint && npm run build
git add -A
git commit -m "Add Open Library search to the add-book sheet"
git push -u origin feat/book-search
gh pr create --fill
```

Open a PR even when working alone — it's where CI reports, and it gives you a
place to describe the change for the version of you who reads it in six months.

## Commits

Write what the change does, not what you touched: "Fix streak breaking on month
boundaries", not "update App.jsx".

## Before merging a visual change

Screenshot the tree at three states: empty, a full month, a thin month. The
generator is easy to break in ways lint won't catch.
