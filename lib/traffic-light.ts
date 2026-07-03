import { differenceInDays } from "date-fns";

export type TrafficLight = "green" | "amber" | "red";

export interface TrafficLightResult {
  light: TrafficLight;
  daysOverdue: number;
  daysUntilDue: number;
}

/**
 * Compute traffic light for an invoice.
 * - Red: 8+ days overdue
 * - Amber: due in ≤7 days OR 1–7 days overdue
 * - Green: paid OR >7 days until due OR due in future with no overdue
 */
export function computeTrafficLight(
  status: string,
  dueDate: Date | null
): TrafficLightResult {
  if (status === "paid") {
    return { light: "green", daysOverdue: 0, daysUntilDue: 999 };
  }

  if (!dueDate) {
    return { light: "green", daysOverdue: 0, daysUntilDue: 999 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diff = differenceInDays(today, due); // positive = overdue

  if (status === "paid") {
    return { light: "green", daysOverdue: 0, daysUntilDue: 999 };
  }

  if (diff >= 8) {
    return { light: "red", daysOverdue: diff, daysUntilDue: 0 };
  }

  if (diff >= 1) {
    // 1–7 days overdue → amber
    return { light: "amber", daysOverdue: diff, daysUntilDue: 0 };
  }

  // Not yet overdue
  const daysUntilDue = Math.abs(diff);
  if (daysUntilDue <= 7) {
    return { light: "amber", daysOverdue: 0, daysUntilDue };
  }

  return { light: "green", daysOverdue: 0, daysUntilDue };
}

/** How many weeks overdue (for tone selection within Red) */
export function redToneTier(daysOverdue: number): "amber" | "firm" | "action-oriented" {
  if (daysOverdue >= 21) return "firm";
  if (daysOverdue >= 8) return "action-oriented";
  return "amber";
}
