export type PriorityLevel = "critical" | "high" | "medium" | "low";

export interface EmergencyPriority {
  value: PriorityLevel;
  tier: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  emoji: string;
}

export const EMERGENCY_PRIORITIES: EmergencyPriority[] = [
  {
    value: "critical",
    tier: "P1",
    label: "Organs / Transplants",
    description: "Organ transport, transplant cases, time-critical deliveries",
    color: "#dc2626",
    bgColor: "rgba(220, 38, 38, 0.08)",
    emoji: "🔴",
  },
  {
    value: "high",
    tier: "P2",
    label: "Critical Stages",
    description: "Cardiac arrest, severe trauma, life-threatening injuries",
    color: "#E8571A",
    bgColor: "rgba(232, 87, 26, 0.08)",
    emoji: "🟠",
  },
  {
    value: "medium",
    tier: "P3",
    label: "Minor Accidents",
    description: "Minor injuries, non-life-threatening, stable patients",
    color: "#ca8a04",
    bgColor: "rgba(202, 138, 4, 0.08)",
    emoji: "🟡",
  },
];

export function getPriorityColor(level: PriorityLevel): string {
  const colors: Record<PriorityLevel, string> = {
    critical: "#dc2626",
    high: "#E8571A",
    medium: "#ca8a04",
    low: "#16a34a",
  };
  return colors[level];
}

export function getPriorityLabel(level: PriorityLevel): string {
  const match = EMERGENCY_PRIORITIES.find((p) => p.value === level);
  if (match) return `${match.tier} — ${match.label}`;
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function getPriorityByValue(level: PriorityLevel): EmergencyPriority | undefined {
  return EMERGENCY_PRIORITIES.find((p) => p.value === level);
}
