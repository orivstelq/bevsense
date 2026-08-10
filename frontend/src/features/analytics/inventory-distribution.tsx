import {
  getDemoTranslations,
  type DemoLanguage,
} from "@/config/demo-translations";
import { getInventoryLevelPresentation } from "@/config/inventory-levels";
import type { CurrentInventoryLevel } from "@/types/analytics";

type InventoryDistributionProps = {
  levels: readonly CurrentInventoryLevel[];
  language: DemoLanguage;
};

export function InventoryDistribution({
  levels,
  language,
}: InventoryDistributionProps) {
  const copy = getDemoTranslations(language);
  return (
    <section aria-labelledby="inventory-distribution-title">
      <div className="mb-4">
        <h2
          className="text-lg font-semibold text-slate-950"
          id="inventory-distribution-title"
        >
          Current inventory distribution
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Valid assigned BiBs ordered from lowest to highest remaining level.
          This is a current-state comparison, not a trend.
        </p>
      </div>

      {levels.length > 0 ? (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          {levels.map((level) => {
            const presentation = getInventoryLevelPresentation(
              level.remainingPercentage,
            );
            const levelLabel = copy[presentation.band];

            return (
              <li className="min-w-0 px-4 py-4 sm:px-5" key={level.inventoryItemId}>
                <div className="flex min-w-0 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-slate-950">
                      {level.productName}
                    </h3>
                    <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                      {level.trayName} · Current simulated snapshot
                    </p>
                  </div>
                  <span className="shrink-0 text-lg font-semibold text-slate-950">
                    {presentation.roundedPercentage}%
                  </span>
                </div>
                <div
                  aria-label={`${level.productName} remaining`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={presentation.roundedPercentage}
                  aria-valuetext={`${presentation.roundedPercentage}% remaining, ${levelLabel}`}
                  className="mt-3 h-2 w-full overflow-hidden rounded-sm bg-slate-200"
                  role="progressbar"
                >
                  <div
                    className={`h-full transition-[width] duration-500 motion-reduce:transition-none ${presentation.barClassName}`}
                    style={{ width: `${presentation.roundedPercentage}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-medium text-slate-600">
                  {levelLabel}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
          No valid current inventory levels are available for this location.
        </div>
      )}
    </section>
  );
}
