# Hors-champ

A personal film and TV journal: every title watched, rated with a colour, dated, and turned into a small dashboard of viewing habits.

Live site: https://journal-de-films.netlify.app

## Features

- **Colour ratings** instead of stars:
  violet (very good, would rewatch), green (good), blue (fine), orange (meh), red (disliked), or unrated.
- **Dashboard**: key figures, a month-by-year heatmap, cumulative months, genres, rating breakdown and release decades.
- **Cross-filtering**: click a year, a rating, a type, a month, a genre or a decade and every view follows.
- **List or poster view**, with search and sorting. Posters are found automatically on Wikipedia or uploaded by hand.
- **"À voir" watchlist**: once a film is seen, it moves into the journal.
- **Letterboxd import**, applied once on the server with a backup taken beforehand.
- Light and dark themes, mobile-first layout, offline fallback on the device.

## Architecture

```
public/index.html            single-page app (vanilla HTML/CSS/JS, no framework, no build step)
public/lbx-import.json       one-off import file (Letterboxd)
netlify/functions/films.mjs  GET / PUT /api/films     journal data
netlify/functions/poster.mjs GET / PUT / DELETE /api/poster/:id   poster images
```

- Data lives in **Netlify Blobs**: the whole journal is one JSON document (store `journal`, key `state`), posters are stored separately (store `posters`).
- Every save also writes a dated backup (`backup/YYYY-MM-DD`, one per day). Imports write `backup/avant-<tag>` first.
- The browser keeps a local copy (IndexedDB, falling back to localStorage) so nothing is lost when offline.

## Edit key

Anyone can read the journal. Writing (saving films, uploading or deleting posters) requires the edit key.

- Set the `EDIT_KEY` environment variable in Netlify (Project configuration > Environment variables).
- **If `EDIT_KEY` is not set, all writes are refused.**
- The page asks for the key the first time you edit and remembers it on that device.

## Importing data

1. Put the import file in `public/lbx-import.json` with a new `tag`.
2. Set `IMPORT_TAG` in `netlify/functions/films.mjs` to the same tag.
3. Deploy. The import is applied on the next page load, once only, after a backup.

## Local development

```
npm install
npx netlify dev
```

## Licence

MIT, see [LICENSE](LICENSE).
