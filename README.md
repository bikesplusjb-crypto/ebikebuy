# EbikeBuy

The ebikebuy.com website: plain HTML pages, no build step. Render publishes this repo as a static site, and **every commit to `main` goes live within about a minute**. Make changes on a branch, open a pull request, and merge when it's ready.

## Pages

| Page | What it is |
|---|---|
| `index.html` | Home: e-bikes, trikes, accessories, Bikes Plus assembly |
| `diagnose.html` | "What's wrong with my e-bike?" step-by-step checks |
| `battery-safety.html` | Battery warning signs, charging, storage, recalls |
| `error-codes/` | Error-code library (generated from `data/error-codes.json`) |
| `broke-down.html` | Stuck on the road: share location, what to do, getting home |
| `ride-ready.html` | Pre-ride check and repair-bag builder |
| `recalls.html` | E-bike recalls and CPSC warnings (generated from `data/recalls.json`) |
| `learn/` | Plain-English articles (generated from `data/learn.json`) |
| `garage.html` | My garage: bikes, service log, reminders, saved checks, stored on the rider's phone (`js/garage-store.js`) |
| `florida-ebike-laws.html` | Florida e-bike laws |
| `about.html`, `policies.html` | About/contact, and shipping/warranty/privacy/terms |

## Editing the diagnose questions

All the questions and answers live in **`js/diagnose-data.js`**. You can edit the wording there (on GitHub: open the file, tap the pencil). Each result has:

- `level`: `danger` (red), `stop` (amber: don't ride, see a mechanic) or `check` (green: safe things to try)
- `confidence`: `Likely`, `Possible` or `Needs a mechanic`

Rules the checks enforce: every flow starts with the battery-danger question, every answer leads somewhere, and no page tells anyone to open a battery, bypass its protection or remove a speed limit. Manufacturer error codes don't go in this file; they get their own pages with a source for each code.

When a mechanic has reviewed the flows, set `reviewed:` at the top of the file to their name and the date.

## Error codes

Codes live in **`data/error-codes.json`**, one entry per system + code (a number means nothing without its system). Each entry needs the maker's own source page (`source_url`) and the date it was checked (`verified_on`). Never add a code from a forum or a seller's blog.

After editing, rebuild the pages and sitemap:

```
node tools/build-codes.js
```

That writes `error-codes/*.html` and the error-code section of `sitemap.xml`. The same goes for `node tools/build-recalls.js` and `node tools/build-learn.js`. Commit the generated files too, since Render serves them as they are.

## Offline

`sw.js` keeps the safety pages (Broke down, Battery safety, Diagnose, My garage, Get it repaired) working with no signal after one visit. It always fetches the live page first when online. If you rename or add a safety page, update the list in `sw.js` and change `VERSION`.

## Checks

```
node tests/run.js
```

No install needed (just Node). It checks the diagnose flows and the error-code data (every code has a maker source and date, and the pages are up to date), scans every page for unsafe advice, and confirms every internal link and sitemap entry points at a real page.
