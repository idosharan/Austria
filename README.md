# Austria Trip 2026

A static Hebrew RTL travel itinerary. No backend, account, framework, or production dependency is required.

## Run

Open `index.html` directly for local viewing. Service Worker installation requires HTTPS or localhost. Keep the adjacent CSS, JavaScript, manifest, and icon files with the HTML.

For local PWA testing with Node.js 20 or later:

```powershell
npm start
```

Open `http://127.0.0.1:4173`. To choose another port, run `npm start -- 4174`. The server binds only to loopback and serves only application assets.

## Files

- `index.html`: full itinerary and page structure; all original activity descriptions remain accessible.
- `styles.css`: responsive layout, themes, print and reduced-motion styles.
- `app.js`: browser interactions, storage, search, calendar export and PWA status.
- `trip-data.js`: day summaries, Vienna dates, stable check migration and backup validation.
- `sw.js`: offline cache and readiness reporting.

## Saved Data

Bookings, activity checks, packing checks, and navigation preferences use localStorage in the current browser and origin. They are not uploaded or synchronized between devices. Multiple tabs reconcile changes to different fields; simultaneous edits of the same field are last-writer-wins.

On first use, old `austria2026-checks` and `austria2026-booking` values migrate to `austria2026-state-v1`. The original keys are not deleted. Each itinerary activity has a permanent `data-activity-id`; do not renumber or reuse IDs when inserting/reordering activities. `data-legacy-key` records its original position for migration and must not be recalculated.

Backup downloads are plain JSON containing personal booking data. Keep them private. Import validates application/version, fields, types, known check IDs, and a 128 KiB limit before asking to replace existing data. A failed import leaves existing state unchanged. Corrupt saved data is not overwritten automatically.

## Offline

Wait until the status confirms that the trip is available offline. It checks every core asset and shows the latest successful document save. External maps, linked websites and bookings opened elsewhere are not included. Google fonts are opportunistically cached; system fallback fonts work without them. Browser storage may be evicted by the browser or cleared by the user.

The worker uses network-first navigation with a four-second timeout and cached fallback for network/HTTP failures. It deletes only older `austria2026-` caches. Deploy all application assets together and bump the worker cache version for structural changes; do not deploy only the HTML after this extraction.

## Tests

The workspace is kept below 100 files by leaving `node_modules/` uninstalled. `npm start` and `npm test` work without installing any packages. Installing the browser-test dependencies with `npm ci` recreates that folder and exceeds the file budget; do not run it in this workspace while the limit applies.

```powershell
npm test
```

Browser tests require the development dependencies and run with `npm run test:browser`. They use installed Microsoft Edge by default. Set `PLAYWRIGHT_CHANNEL` to `chrome` to use installed Chrome. The tests start their own loopback server on port 4173; stop a manually running server on that port before testing. Screenshots are produced under `test-results/`.

## Content Limits

The dashboard uses planned, approximate travel times, not live routing. The next stop is the first incomplete activity, not a real-time prediction. Current-day selection uses Europe/Vienna and updates on focus and at midnight checks. Before/after the trip it selects the first/last day.

The museum time-budget warning and ice-cave booking summary were made internally consistent. Current prices, card eligibility, opening times, route timings and official hotel street address were not independently reverified. The hotel copy action deliberately copies the destination name, not an unverified street address.