export type VarianceLabel = "balanced" | "over" | "short";

/**
 * Classifies a drawer variance for display. The backend returns
 * variance = counted − expected (positive = over, negative = short).
 */
export function varianceLabel(variance: string): VarianceLabel {
  const n = Number(variance);
  if (n > 0) return "over";
  if (n < 0) return "short";
  return "balanced";
}
