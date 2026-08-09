# BiB Platform Frontend

Responsive operations interface for the Bag-in-Box beverage inventory monitoring platform.

## Local development

Install dependencies, start FastAPI from `backend/`, and then start the frontend:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The current interface retrieves deterministic simulation snapshots from FastAPI by default; no physical hardware is connected.

By default, server-rendered pages request deterministic simulated telemetry from FastAPI at `http://127.0.0.1:8000`. Configure the server process when needed:

```bash
BIB_TELEMETRY_PROVIDER=http
BIB_API_BASE_URL=http://127.0.0.1:8000
```

Set `BIB_TELEMETRY_PROVIDER=simulated` to deliberately use the existing frontend fixtures without FastAPI. HTTP mode never falls back automatically; an unavailable API produces a telemetry-unavailable state. These modes still represent simulation—not physical hardware.

Run `npm run verify:telemetry-contract`, `npm run lint`, and `npm run build` before submitting frontend changes.
