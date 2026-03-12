export type PriorityLevel = "critical" | "high" | "medium" | "low";

export interface SubCategory {
  id: string;
  label: string;
  icon: string;
}

export interface EmergencyPriority {
  value: PriorityLevel;
  tier: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  emoji: string;
  subCategories: SubCategory[];
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
    subCategories: [
      { id: "heart-transplant", label: "Heart Transplant", icon: "❤️" },
      { id: "kidney-transplant", label: "Kidney Transplant", icon: "🫘" },
      { id: "liver-transplant", label: "Liver Transplant", icon: "🫁" },
      { id: "lung-transplant", label: "Lung Transplant", icon: "🫁" },
      { id: "cornea-transport", label: "Cornea Transport", icon: "👁️" },
      { id: "bone-marrow", label: "Bone Marrow Transfer", icon: "🦴" },
      { id: "blood-platelet", label: "Blood / Platelet Delivery", icon: "🩸" },
      { id: "organ-harvest", label: "Organ Harvest (Cadaver)", icon: "🏥" },
    ],
  },
  {
    value: "high",
    tier: "P2",
    label: "Critical Stages",
    description: "Cardiac arrest, severe trauma, life-threatening injuries",
    color: "#E8571A",
    bgColor: "rgba(232, 87, 26, 0.08)",
    emoji: "🟠",
    subCategories: [
      { id: "cardiac-arrest", label: "Cardiac Arrest", icon: "💔" },
      { id: "stroke", label: "Stroke / Brain Hemorrhage", icon: "🧠" },
      { id: "severe-bleeding", label: "Severe Bleeding / Hemorrhage", icon: "🩸" },
      { id: "respiratory-failure", label: "Respiratory Failure", icon: "😮‍💨" },
      { id: "multi-organ-failure", label: "Multi-Organ Failure", icon: "⚠️" },
      { id: "severe-burns", label: "Severe Burns (>40%)", icon: "🔥" },
      { id: "anaphylaxis", label: "Anaphylactic Shock", icon: "💉" },
      { id: "poisoning", label: "Poisoning / Overdose", icon: "☠️" },
      { id: "drowning", label: "Drowning / Near-Drowning", icon: "🌊" },
      { id: "electrocution", label: "Electrocution", icon: "⚡" },
      { id: "pregnancy-emergency", label: "Pregnancy Complication", icon: "🤰" },
      { id: "gunshot-stab", label: "Gunshot / Stab Wound", icon: "🔪" },
    ],
  },
  {
    value: "medium",
    tier: "P3",
    label: "Minor Accidents",
    description: "Minor injuries, non-life-threatening, stable patients",
    color: "#ca8a04",
    bgColor: "rgba(202, 138, 4, 0.08)",
    emoji: "🟡",
    subCategories: [
      { id: "fracture", label: "Fracture / Bone Injury", icon: "🦴" },
      { id: "minor-cuts", label: "Minor Cuts / Lacerations", icon: "🩹" },
      { id: "sprain-strain", label: "Sprain / Strain", icon: "🦶" },
      { id: "road-accident-minor", label: "Road Accident (Minor)", icon: "🚗" },
      { id: "fall-injury", label: "Fall Injury", icon: "⬇️" },
      { id: "animal-bite", label: "Animal Bite / Sting", icon: "🐍" },
      { id: "allergic-reaction", label: "Allergic Reaction (Mild)", icon: "🤧" },
      { id: "seizure-stable", label: "Seizure (Stable)", icon: "⚡" },
      { id: "chest-pain-stable", label: "Chest Pain (Stable)", icon: "💗" },
      { id: "dislocation", label: "Joint Dislocation", icon: "🤕" },
    ],
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
