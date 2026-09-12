import {
  doc,
  getFirestore,
  serverTimestamp,
  updateDoc,
} from '@react-native-firebase/firestore';

export type AvailabilitySlot = {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
};

export type AvailabilityOverrideMode =
  | 'on'
  | 'off'
  | null;

export type AvailabilityOverride = {
  mode: AvailabilityOverrideMode;
  updatedAt?: unknown;
  expiresAt?: unknown;
};

type FirestoreTimestampLike = {
  toDate: () => Date;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}`;
}

export function formatTimeKey(date: Date): string {
  return `${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

export function getDateLabel(
  dateKey: string,
  language: 'en' | 'hi',
): string {
  const [year, month, day] = dateKey
    .split('-')
    .map(Number);

  if (!year || !month || !day) {
    return dateKey;
  }

  const date = new Date(
    year,
    month - 1,
    day,
  );

  return date.toLocaleDateString(
    language === 'hi'
      ? 'hi-IN'
      : 'en-IN',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    },
  );
}

function timeToMinutes(
  value: string,
): number {
  const [hours, minutes] = value
    .split(':')
    .map(Number);

  return hours * 60 + minutes;
}

function getExpiryDate(
  value: unknown,
): Date | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const timestamp =
    value as Partial<FirestoreTimestampLike>;

  if (
    typeof timestamp.toDate ===
    'function'
  ) {
    return timestamp.toDate();
  }

  return null;
}

export function isWithinAvailabilitySlot(
  slot: AvailabilitySlot,
  now = new Date(),
): boolean {
  const today = formatDateKey(now);

  if (slot.date !== today) {
    return false;
  }

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  const start = timeToMinutes(
    slot.startTime,
  );

  const end = timeToMinutes(
    slot.endTime,
  );

  return (
    currentMinutes >= start &&
    currentMinutes < end
  );
}

export function getEffectiveAvailability(
  slots: AvailabilitySlot[],
  override?: AvailabilityOverride | null,
  now = new Date(),
): boolean {
  const expiryDate = getExpiryDate(
    override?.expiresAt,
  );

  const overrideActive =
    override?.mode != null &&
    (
      expiryDate === null ||
      expiryDate > now
    );

  // Manual preference always wins while active.
  if (overrideActive) {
    return override!.mode === 'on';
  }

  // Otherwise follow the scheduled availability.
  return slots.some((slot) =>
    isWithinAvailabilitySlot(slot, now),
  );
}

export function getCurrentOrNextSlot(
  slots: AvailabilitySlot[],
  now = new Date(),
): AvailabilitySlot | null {
  const today = formatDateKey(now);

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  const sorted = [...slots].sort(
    (a, b) => {
      const first =
        `${a.date} ${a.startTime}`;

      const second =
        `${b.date} ${b.startTime}`;

      return first.localeCompare(second);
    },
  );

  return (
    sorted.find((slot) => {
      if (slot.date > today) {
        return true;
      }

      if (slot.date < today) {
        return false;
      }

      return (
        timeToMinutes(slot.endTime) >
        currentMinutes
      );
    }) ?? null
  );
}

export async function saveMaidAvailability(
  maidId: string,
  slots: AvailabilitySlot[],
): Promise<void> {
  const firestore = getFirestore();

  await updateDoc(
    doc(
      firestore,
      'maids',
      maidId,
    ),
    {
      availabilitySlots: slots,
      updatedAt: serverTimestamp(),
    },
  );
}

export async function setMaidAvailabilityOverride(
  maidId: string,
  mode: 'on' | 'off' | null,
  expiresAt?: Date | null,
): Promise<void> {
  const firestore = getFirestore();

  await updateDoc(
    doc(
      firestore,
      'maids',
      maidId,
    ),
    {
      availabilityOverride: mode
        ? {
            mode,
            updatedAt:
              serverTimestamp(),
            expiresAt:
              expiresAt ?? null,
          }
        : null,

      updatedAt:
        serverTimestamp(),
    },
  );
}