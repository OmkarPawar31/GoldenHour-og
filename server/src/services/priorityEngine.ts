export function calculatePriority(factors: {
  severity: number;
  distance: number;
  waitTime: number;
}): "critical" | "high" | "medium" | "low" {
  const score = factors.severity * 0.5 + (1 / factors.distance) * 0.3 + factors.waitTime * 0.2;

  if (score > 0.8) return "critical";
  if (score > 0.6) return "high";
  if (score > 0.3) return "medium";
  return "low";
}
