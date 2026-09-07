export const ACTIVITY_STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "ongoing", label: "Ongoing" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "not_applicable", label: "Not Applicable" },
] as const;

export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]["value"];

export const ACTIVITY_UNITS = [
  "Creatives",
  "Posters",
  "Videos",
  "Animations",
  "Pages",
  "Campaigns",
  "Articles",
  "Logos",
  "Boards",
  "Hours",
  "Tasks",
  "Projects",
  "Posts",
  "Custom",
] as const;

export const PAYMENT_STATUSES = [
  { value: "not_applicable", label: "Not Applicable" },
  { value: "pending", label: "Pending" },
  { value: "received", label: "Received" },
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]["value"];

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function monthTitle(year: number, month: number) {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}

export function statusLabel(value: string) {
  return (
    ACTIVITY_STATUSES.find((s) => s.value === value)?.label ??
    PAYMENT_STATUSES.find((s) => s.value === value)?.label ??
    value
  );
}

export function currentPeriod(now = new Date()) {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
