export type InventoryLevelBand =
  | "healthy"
  | "monitor"
  | "low"
  | "replace";

const inventoryLevelStyles = {
  healthy: {
    barClassName: "bg-emerald-600",
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  monitor: {
    barClassName: "bg-yellow-400",
    badgeClassName: "border-yellow-300 bg-yellow-50 text-yellow-900",
  },
  low: {
    barClassName: "bg-orange-500",
    badgeClassName: "border-orange-300 bg-orange-50 text-orange-900",
  },
  replace: {
    barClassName: "bg-red-600",
    badgeClassName: "border-red-300 bg-red-50 text-red-800",
  },
} as const;

export function getInventoryLevelPresentation(percentage: number) {
  const roundedPercentage = Math.round(percentage);
  const band: InventoryLevelBand =
    percentage >= 81
      ? "healthy"
      : percentage >= 51
        ? "monitor"
        : percentage >= 11
          ? "low"
          : "replace";

  return {
    band,
    roundedPercentage,
    ...inventoryLevelStyles[band],
  } as const;
}
