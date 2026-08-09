export function TelemetryUnavailable() {
  return (
    <section
      aria-labelledby="telemetry-unavailable-title"
      className="max-w-3xl rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-sm font-medium text-slate-500">Operations</p>
      <h1
        className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
        id="telemetry-unavailable-title"
      >
        Telemetry unavailable
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
        The application could not retrieve the current location snapshot from
        the configured telemetry source.
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        No fallback simulation data has been substituted. Demo location and
        persona controls remain available above.
      </p>
    </section>
  );
}
