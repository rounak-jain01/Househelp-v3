import type { BookingStatus } from "./BookingWaitingTypes";

export function getDate(value: unknown): Date | null {
  if (!value) return null;

  try {
    if (
      typeof (value as any)?.toDate ===
      "function"
    ) {
      return (value as any).toDate();
    }

    const date = new Date(value as any);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  } catch {
    return null;
  }
}

export function formatDateTime(value: unknown) {
  const date = getDate(value);

  if (!date) return "—";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number) {
  const safe = Math.max(
    0,
    Math.floor(seconds),
  );

  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor(
    (safe % 3600) / 60,
  );
  const secs = safe % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(secs).padStart(2, "0"),
  ].join(":");
}

export function getInitials(name?: string) {
  const parts =
    name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean) ?? [];

  if (!parts.length) return "H";

  return parts
    .slice(0, 2)
    .map((part) =>
      part[0]?.toUpperCase(),
    )
    .join("");
}

export function formatCategory(
  category: string,
) {
  return category
    .replace(/[-_]/g, " ")
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    );
}

export function getStatusIndex(
  status: BookingStatus,
) {
  switch (status) {
    case "pending":
      return 0;
    case "assigned":
      return 1;
    case "confirmed":
      return 2;
    case "in_progress":
      return 3;
    case "completed":
      return 4;
    default:
      return -1;
  }
}

