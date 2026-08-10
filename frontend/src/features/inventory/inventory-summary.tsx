import {
  getDemoTranslations,
  type DemoLanguage,
} from "@/config/demo-translations";

type InventorySummaryProps = {
  configuredTrayCount: number;
  assignedItemCount: number;
  unassignedTrayCount: number;
  language: DemoLanguage;
};

export function InventorySummary({
  configuredTrayCount,
  assignedItemCount,
  unassignedTrayCount,
  language,
}: InventorySummaryProps) {
  const copy = getDemoTranslations(language);
  const summaryItems = [
    { label: copy.configuredPositions, value: configuredTrayCount },
    { label: copy.assignedBibs, value: assignedItemCount },
    { label: copy.unassignedPositions, value: unassignedTrayCount },
  ] as const;

  return (
    <section aria-labelledby="inventory-summary-title">
      <h2 className="sr-only" id="inventory-summary-title">
        Inventory summary
      </h2>
      <dl className="grid grid-cols-3 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        {summaryItems.map((item, index) => (
          <div
            className={`min-w-0 px-3 py-4 sm:px-5 ${index > 0 ? "border-l border-slate-200" : ""}`}
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
