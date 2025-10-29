
# Bargaining Game: BATNA (Realtime)

English-only, realtime 2‑player bargaining with private BATNAs and midpoint theory in the intro.

## Quick start
1) **Requirements**: Node.js >= 18
2) In terminal:
```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```
3) Run dev (server + client together):
```bash
npm run dev
```
- Server runs on `http://localhost:5174`
- Client runs on `http://localhost:5173`

4) Open the client URL in **two different browsers** (or devices) to simulate two players.

## Groups
- **Group 1:** Seller=50, Buyer=50
- **Group 2:** Seller=70, Buyer=30
- **Group 3:** Seller=30, Buyer=70

## Notes
- Each player sees **only their own BATNA**.
- Midpoint theory is **explained in the intro screen** and shown again in the **Debrief** (using the real BATNAs revealed after the match).
- Time limit per decision defaults to **45s** (configurable).

## Data export
- Server stores logs in memory and offers a CSV download endpoint at `GET /admin/export`.
- When running dev, it's available at `http://localhost:5174/admin/export`.
