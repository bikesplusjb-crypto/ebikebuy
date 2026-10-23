# EbikeBuy

The ebikebuy.com website: plain HTML pages, no build step. Render publishes this repo as a static site, and **every commit to `main` goes live within about a minute**. Make changes on a branch, open a pull request, and merge when it's ready.

## Pages

| Page | What it is |
|---|---|
| `index.html` | Home: e-bikes, trikes, accessories, Bikes Plus assembly |
| `diagnose.html` | "What's wrong with my e-bike?" step-by-step checks |
| `battery-safety.html` | Battery warning signs, charging, storage, recalls |
| `florida-ebike-laws.html` | Florida e-bike laws |
| `about.html`, `policies.html` | About/contact, and shipping/warranty/privacy/terms |

## Editing the diagnose questions

All the questions and answers live in **`js/diagnose-data.js`**. You can edit the wording there (on GitHub: open the file, tap the pencil). Each result has:

- `level`: `danger` (red), `stop` (amber: don't ride, see a mechanic) or `check` (green: safe things to try)
- `confidence`: `Likely`, `Possible` or `Needs a mechanic`

Rules the checks enforce: every flow starts with the battery-danger question, every answer leads somewhere, and no page tells anyone to open a battery, bypass its protection or remove a speed limit. Manufacturer error codes don't go in this file; they get their own pages with a source for each code.

When a mechanic has reviewed the flows, set `reviewed:` at the top of the file to their name and the date.

## Checks

```
node tests/run.js
```

No install needed (just Node). It checks the diagnose flows, scans every page for unsafe advice, and confirms every internal link and sitemap entry points at a real page.
