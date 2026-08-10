# BiB Platform Frontend

Responsive operations interface for the Bag-in-Box beverage inventory monitoring platform.

## Local development

Install dependencies, start FastAPI from `backend/`, and then start the frontend:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The production root shows the hardware-disconnected workspace by default. Use `/demo` to deliberately start the simulated presentation experience; no physical hardware is connected.

The hardware-connection feature flag is server-only and defaults to `false`:

```bash
BIB_HARDWARE_CONNECTIONS_ENABLED=false
```

Only the exact values `true` and `false` are accepted. This flag prepares the production shell for a later live-hardware phase. It does not enable physical telemetry in the current release.

By default, server-rendered pages request deterministic simulated telemetry from FastAPI at `http://127.0.0.1:8000`. Configure the server process when needed:

```bash
BIB_TELEMETRY_PROVIDER=http
BIB_API_BASE_URL=http://127.0.0.1:8000
```

Set `BIB_TELEMETRY_PROVIDER=simulated` to deliberately use the existing frontend fixtures without FastAPI. HTTP mode never falls back automatically; an unavailable API produces a telemetry-unavailable state. These modes still represent simulation, not physical hardware.

Telemetry-driven demo routes refresh in the background through Next.js `router.refresh()`. The browser does not call FastAPI directly: server components rerun the existing server-only telemetry loader, whose HTTP requests use `cache: "no-store"`. Refresh pauses while the tab is hidden, resumes with an immediate refresh when visible, and remains polling rather than WebSocket or streaming telemetry. `BIB_API_BASE_URL` remains server-only.

Run `npm run verify:product-experience`, `npm run verify:telemetry-contract`, `npm run lint`, and `npm run build` before submitting frontend changes.
