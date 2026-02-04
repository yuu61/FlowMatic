import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { DEADLINE_NEAR_DAYS } from "../constants";

dayjs.extend(utc);

export const formatUTC = (iso: string): string => dayjs.utc(iso).format("YYYY/MM/DD HH:mm");

export const formatDateJP = (date: Date): string => {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Check if a deadline is within the near threshold (default 7 days)
 * @param deadline - The deadline date string or Date object
 * @param thresholdDays - Number of days to consider "near" (default from constants)
 * @returns true if the deadline is within the threshold and not past
 */
export function isDeadlineNear(
  deadline: string | Date | null | undefined,
  thresholdDays: number = DEADLINE_NEAR_DAYS,
): boolean {
  if (!deadline) return false;

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= thresholdDays;
}
