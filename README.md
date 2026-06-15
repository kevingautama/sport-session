# Sport Session 🏸

A mobile-first web app to track sport (badminton) session costs, manage your
shuttlecock inventory, and split the bill with friends.

## Features

- **New Session** – log court rental, shuttlecock usage (drawn from your tube
  inventory, costed by the price you actually paid), other expenses, and split
  the total across any number of people.
- **History** – past sessions grouped by month; open one to settle up who paid.
- **Stats** – total spend, spending breakdown (donut), monthly trend (line),
  shuttlecock usage by brand, and per-session averages. Filter by month / year /
  all time.
- **Friends** – track who you play with and how much they owe you.
- **Settings** – configurable display currency, inventory management, data
  export and reset.

## Tech

- **React + Vite** – UI and dev/build tooling.
- **sql.js** – a real SQLite database compiled to WebAssembly. The entire DB is
  persisted to `localStorage` (base64) and re-saved on every committed write, so
  your data survives reloads with no backend.
- **Chart.js** – donut and line charts.
- **Intl.NumberFormat** – currency formatting (configurable in Settings).

No custom storage/format/charting code was hand-rolled — each concern uses an
established library.

## Run locally

```bash
npm install
npm run dev      # start the dev server (open the printed URL on your phone too)
npm run build    # production build into dist/
npm run preview  # serve the production build
```

The app seeds itself with sample tubes, friends and sessions on first load. Use
**Settings → Reset data** to return to that sample set at any time.
