# SmartCart - Discount Engine

Opptra FDE Intern assignment. A customer-facing cart pricing engine: item-level offers (max discount, with stacking), a cart-level offer, plain-English rule input parsed by an LLM, and PDF cart upload.

**Live URL:** `https://<your-service>.onrender.com` _(add after deploying)_

## Run locally (3 steps)

```bash
npm run setup      # installs root, backend and frontend dependencies
cp backend/.env.example backend/.env   # optional: add GROQ_API_KEY
npm run dev        # http://localhost:5173  (API on :3001)
```

Then upload `sample-data/rules.csv` and `sample-data/cart.csv` and click **Calculate Discounts**. Expected final total: **Rs.5,339**. `sample-data/cart.pdf` is a sample for the PDF upload.

`npm test` runs the engine tests (frontend, Vitest) and the parser/validator tests (backend, node:test).

## Project structure

```
SmartCart/
├── frontend/                 React + Vite
│   └── src/
│       ├── engine/           PURE discount logic - no UI, no network
│       │   ├── discountEngine.js   item rules, stacking, cart rules, calculateCart()
│       │   ├── csvParser.js
│       │   └── engine.test.js
│       ├── inputs/           input modes: adapt something -> engine objects
│       │   ├── nlRuleInput.js      text -> DiscountRule
│       │   ├── pdfInput.js         PDF  -> CartItem[]
│       │   └── api.js              the only code that calls the backend
│       └── components/       UI (RuleInput, PdfUploader, CsvUploader, DataTable ...)
├── backend/                  Express API (+ serves the built frontend in production)
│   ├── server.js
│   └── src/
│       ├── routes/           POST /api/parse-rule, POST /api/parse-pdf, GET /api/health
│       └── services/         ruleParser (LLM + fallback), ruleValidator, pdfCartParser
├── sample-data/              rules.csv, cart.csv, cart.pdf
└── render.yaml               one-click Render blueprint
```

**Adding a third input mode** means adding a file in `frontend/src/inputs/` that returns `CartItem[]` or a `DiscountRule`. The engine is not touched.

## Deploy on Render

1. Push this repo to GitHub.
2. Render dashboard -> **New -> Blueprint** -> select the repo (it reads `render.yaml`).
3. When prompted, set `GROQ_API_KEY` (free key from console.groq.com). It is optional; see below.
4. Copy the service URL into the "Live URL" line above.

It deploys as a single web service: Express serves `/api/*` and the built React app, so there is no CORS or second service to configure. Manual setup, if you prefer:
Build `npm install --prefix backend && npm install --prefix frontend --include=dev && npm run build --prefix frontend`, Start `node backend/server.js`.

Note: Render's free plan sleeps after inactivity, so the first request can take ~30s. Open the URL once before recording the walkthrough.

## Design decisions and tradeoffs

**Cart offer.** Evaluated after all item offers, against the sum of *final* item prices (`applyCartRules`). Same selection rule as items: the largest saving among non-stackable cart rules wins and stackable ones apply on top. The cart row is shown separately and is hidden when the threshold is not met. Threshold is inclusive (`>=`), matching the brief. When a customer is just below it, the summary says how much more to add (e.g. "Add Rs.1 more to unlock...") rather than silently showing nothing.

**Natural-language rules.**
- LLM output is untrusted. Every rule passes `ruleValidator` (enums, positive value, percentage <= 100, cart rules need a threshold) before it is shown, and the user must confirm before it is added.
- Vague input ("a discount for big orders") returns *unresolvable* with a message saying what to specify. It never guesses numbers.
- If the LLM is down, has no key, or returns an invalid rule, a deterministic keyword parser takes over, and the confirmation card says which one read the rule. Ambiguous input is still refused. This keeps the feature working without an API key.
- A rule naming a brand/platform not in the current cart is allowed but flagged with a warning, since it will not change any price.
- Known gap: "more than Rs.5,000" is stored as `>=` 5,000 because the engine's threshold is inclusive. Strict `>` is not modelled.

**PDF upload.**
- Parsed on the server with `pdfjs-dist`. Text positions are used to rebuild table columns; a gap between cells becomes a column break. A first attempt with `pdf-parse` failed on a valid PDF, so it was replaced.
- A malformed row never aborts the file: valid rows load, bad rows are listed with their line number.
- If *no* valid rows are found, the existing cart is kept instead of being replaced with an empty one.
- If a PDF flattens columns into single-spaced text, the parser falls back to known platform/brand names. If it still cannot split the row, it reports the row instead of guessing.
- Assumption: scanned/image PDFs are not supported (no OCR). Item IDs are generated (`ITEM-01`...) as the PDF has none.

**No persistence.** All state is in the browser session, per the brief.

**Proposed alternative.** The assignment's PDF format has no item ID or currency column. A CSV or JSON export from the order system would be more reliable than parsing PDF text; PDF support is best-effort.
