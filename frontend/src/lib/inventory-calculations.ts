import type { InventoryItem, TelemetryReading } from "@/types/domain";

type OptionalWeight = number | null | undefined;

export interface DerivedInventoryState {
  readonly netProductWeightGrams: number | null;
  readonly remainingPercentage: number | null;
}

function isFiniteWeight(value: OptionalWeight): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function calculateNetProductWeightGrams(
  grossWeightGrams: OptionalWeight,
  tareWeightGrams: OptionalWeight,
): number | null {
  if (
    !isFiniteWeight(grossWeightGrams) ||
    !isFiniteWeight(tareWeightGrams) ||
    grossWeightGrams < 0 ||
    tareWeightGrams < 0
  ) {
    return null;
  }

  return Math.max(0, grossWeightGrams - tareWeightGrams);
}

export function calculateRemainingPercentage(
  netProductWeightGrams: OptionalWeight,
  fullProductWeightGrams: OptionalWeight,
): number | null {
  if (
    !isFiniteWeight(netProductWeightGrams) ||
    !isFiniteWeight(fullProductWeightGrams) ||
    fullProductWeightGrams <= 0
  ) {
    return null;
  }

  const percentage = (netProductWeightGrams / fullProductWeightGrams) * 100;

  return Math.min(100, Math.max(0, percentage));
}

export function deriveInventoryState(
  reading: Pick<TelemetryReading, "grossWeightGrams">,
  inventoryItem: Pick<
    InventoryItem,
    "tareWeightGrams" | "fullProductWeightGrams"
  >,
): DerivedInventoryState {
  const netProductWeightGrams = calculateNetProductWeightGrams(
    reading.grossWeightGrams,
    inventoryItem.tareWeightGrams,
  );

  return {
    netProductWeightGrams,
    remainingPercentage: calculateRemainingPercentage(
      netProductWeightGrams,
      inventoryItem.fullProductWeightGrams,
    ),
  };
}
