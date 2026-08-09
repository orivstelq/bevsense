type AlertsSummaryProps = {
  activeCount: number;
  criticalCount: number;
  warningCount: number;
  deviceFindingCount: number;
};

export function AlertsSummary({
  activeCount,
  criticalCount,
  warningCount,
  deviceFindingCount,
}: AlertsSummaryProps) {
  const summaryItems = [
    { label: "Active findings", value: activeCount },
    { label: "Critical", value: criticalCount },
    { label: "Warning", value: warningCount },
    { label: "Device findings", value: deviceFindingCount },
  ] as const;

  return (
    <section aria-labelledby="alerts-summary-title">
      <h2 className="sr-only" id="alerts-summary-title">
        Alert findings summary
      </h2>
      <dl className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm lg:grid-cols-4">
        {summaryItems.map((item, index) => (
          <div
            className={`min-w-0 px-4 py-4 sm:px-5 ${index % 2 === 1 ? "border-l border-slate-200" : ""} ${index >= 2 ? "border-t border-slate-200 lg:border-t-0" : ""} ${index > 0 ? "lg:border-l lg:border-slate-200" : ""}`}
            key={item.label}
          >
            <dt className="text-xs leading-4 font-medium text-slate-500 sm:text-sm">
              {item.label}
            </dt>
            <dd className="mt-2 text-xl font-semibold text-slate-950 sm:text-2xl">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
