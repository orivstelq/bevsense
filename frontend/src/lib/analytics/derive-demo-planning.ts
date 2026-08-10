import { deriveCurrentInventoryEntries } from "../inventory/current-inventory.ts";
import { getDemoDailyConsumptionPercentage } from "../demo-simulation.ts";
import type { LocationTelemetrySnapshot } from "@/types/domain";

export function projectReplacementCount(
  remainingPercentage: number,
  dailyConsumptionPercentage: number,
  horizonDays: number,
) {
  if (
    !Number.isFinite(remainingPercentage) ||
    !Number.isFinite(dailyConsumptionPercentage) ||
    !Number.isFinite(horizonDays) ||
    dailyConsumptionPercentage <= 0 ||
    horizonDays < 0
  ) {
    return 0;
  }

  const remaining = Math.min(100, Math.max(0, remainingPercentage));
  const consumed = dailyConsumptionPercentage * horizonDays;
  if (remaining <= 10) {
    return 1 + Math.floor(consumed / 90);
  }

  const consumptionUntilFirstReplacement = remaining - 10;
  return consumed < consumptionUntilFirstReplacement
    ? 0
    : 1 +
        Math.floor((consumed - consumptionUntilFirstReplacement) / 90);
}

export function deriveDemoPlanning(
  snapshots: readonly LocationTelemetrySnapshot[],
) {
  const positions = snapshots.flatMap((snapshot) =>
    deriveCurrentInventoryEntries(snapshot).flatMap((entry) => {
      const remainingPercentage = entry.derivedState?.remainingPercentage;
      if (
        !entry.inventoryItem ||
        remainingPercentage == null ||
        !entry.rackPosition
      ) {
        return [];
      }

      const dailyConsumptionPercentage = getDemoDailyConsumptionPercentage(
        entry.inventoryItem,
        entry.tray,
      );
      return [
        {
          locationId: snapshot.locationId,
          productName: entry.inventoryItem.productName,
          rackNumber: entry.rackPosition.rackNumber,
          positionNumber: entry.rackPosition.positionNumber,
          remainingPercentage,
          dailyConsumptionPercentage,
          daysUntilReplacement:
            dailyConsumptionPercentage > 0
              ? Math.max(0, remainingPercentage - 10) /
                dailyConsumptionPercentage
              : null,
        },
      ];
    }),
  );

  const productRates = new Map<string, number>();
  for (const position of positions) {
    productRates.set(
      position.productName,
      (productRates.get(position.productName) ?? 0) +
        position.dailyConsumptionPercentage / 100,
    );
  }

  const projectForDays = (days: number) =>
    positions.reduce(
      (total, position) =>
        total +
        projectReplacementCount(
          position.remainingPercentage,
          position.dailyConsumptionPercentage,
          days,
        ),
      0,
    );

  return {
    projectedReplacements7Days: projectForDays(7),
    projectedReplacements30Days: projectForDays(30),
    nextLikelyReplacement:
      [...positions]
        .filter((position) => position.daysUntilReplacement !== null)
        .sort(
          (left, right) =>
            (left.daysUntilReplacement ?? 0) -
              (right.daysUntilReplacement ?? 0) ||
            left.locationId.localeCompare(right.locationId) ||
            left.rackNumber - right.rackNumber ||
            left.positionNumber - right.positionNumber,
        )[0] ?? null,
    highestConsumptionProducts: [...productRates]
      .map(([productName, fullBibEquivalentsPerDay]) => ({
        productName,
        fullBibEquivalentsPerDay,
      }))
      .sort(
        (left, right) =>
          right.fullBibEquivalentsPerDay - left.fullBibEquivalentsPerDay ||
          left.productName.localeCompare(right.productName),
      )
      .slice(0, 5),
    locationOutlook: snapshots.map((snapshot) => {
      const locationPositions = positions.filter(
        (position) => position.locationId === snapshot.locationId,
      );
      const countForDays = (days: number) =>
        locationPositions.reduce(
          (total, position) =>
            total +
            projectReplacementCount(
              position.remainingPercentage,
              position.dailyConsumptionPercentage,
              days,
            ),
          0,
        );

      return {
        locationId: snapshot.locationId,
        projectedReplacements7Days: countForDays(7),
        projectedReplacements30Days: countForDays(30),
      };
    }),
  } as const;
}

export type DemoPlanning = ReturnType<typeof deriveDemoPlanning>;
