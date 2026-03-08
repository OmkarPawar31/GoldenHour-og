export type PriorityLevel = "critical" | "high" | "medium" | "low";

export function getPriorityColor(level: PriorityLevel): string {
  const colors: Record<PriorityLevel, string> = {
    critical: "#dc2626",
    high: "#ea580c",
    medium: "#ca8a04",
    low: "#16a34a",
  };
  return colors[level];
}

export function getPriorityLabel(level: PriorityLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}
