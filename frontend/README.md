# BevSense Frontend

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

Starting the presentation creates a URL-backed `demoStartedAt` clock. The frontend derives deterministic gross-weight depletion from the approved fixtures and continues to calculate remaining inventory through the existing weight model. Restarting the presentation replaces that clock and returns the presentation to its fixture baseline. Supervisor and organization-admin Analytics views include clearly labeled demo projections based only on this deterministic model; they are not production forecasts.

## Human authentication

Human sign-in is disabled by default and is independent from the public presentation personas:

```bash
BIB_HUMAN_AUTH_ENABLED=false
BIB_SELF_SIGNUP_ENABLED=false
BIB_APP_BASE_URL=http://localhost:3000
# BIB_SUPABASE_URL=https://project-ref.supabase.co
# BIB_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example
```

Only exact `true` and `false` values are accepted. When enabled, both Supabase values are required by the server runtime. They are intentionally not `NEXT_PUBLIC` variables, and no Supabase service-role key, database credential, or controller credential belongs in the frontend. Next.js server actions handle password sign-in/sign-out, the Next.js 16 proxy refreshes auth cookies, and server-rendered FastAPI requests forward the user's access token. FastAPI remains responsible for organization/location authorization.

The authenticated production path does not reuse `persona` query values. Demo personas remain presentation-only, and the explicit demo remains usable without human authentication or FastAPI. With hardware connections disabled, a signed-in user still receives the truthful hardware-disconnected state. Production forecasting is not shown because no production usage-history model exists yet.

Self-service signup is independently disabled by default. When both human auth and self-signup are enabled, `/signup` obtains only organization and workplace labels from FastAPI, creates the identity through Supabase Auth, and submits a separate BevSense access request after email verification (or immediately when confirmation is disabled). Requested metadata never grants authorization. FastAPI creates real membership and location access only after a supervisor or organization admin approves the request at `/access-requests`.

`BIB_APP_BASE_URL` is the server-side public origin used for confirmation redirects. For projects that require email confirmation, configure the Supabase confirmation template to send `token_hash` and `type` to `/auth/confirm`, then test delivery manually. No external SMTP provider or privileged Supabase key is configured by this code.

Run the product, demo, telemetry-contract, live-demo, auth-boundary, and access-onboarding verifiers followed by `npm run lint`, `npx tsc --noEmit`, and `npm run build` before submitting frontend changes.
