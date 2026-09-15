type BookingStatus =
  | "pending"
  | "assigned"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_maid_found";

type Booking = {
  customerId?: string;
  maidId?: string | null;
  winningMaidId?: string | null;
  categories?: string[];
  duration?: number;
  scheduledDateTime?: unknown;
  totalPrice?: number;

  status?: BookingStatus;

  billing?: {
    baseAmount?: number;
    extraTimeMinutes?: number;
    extraTimeAmount?: number;
    totalAmount?: number;
    currency?: string;
    generatedAt?: unknown;
  };

  customerAddress?: {
    formatted?: string;
    landmark?: string;
    latitude?: number | null;
    longitude?: number | null;
  };

  maidDetails?: {
    name?: string;
    phoneNumber?: string;
    photoUrl?: string;
    verificationStatus?: string;
    serviceCategories?: string[];
    serviceArea?: string;
    distanceMeters?: number | null;
    distanceText?: string | null;
    etaText?: string | null;
  };

  createdAt?: unknown;
  startedAt?: unknown;
  completedAt?: unknown;
  cancelledAt?: unknown;

  cancellationReason?: string | null;

  extraTimeStatus?:
    | "none"
    | "requested"
    | "accepted"
    | "rejected";
  requestedExtraMinutes?: number;
  approvedExtraMinutes?: number;
  totalDurationMinutes?: number;
  extraTimeRequestedAt?: unknown;
  extraTimeRespondedAt?: unknown;
};

type CancelReason =
  | "Changed my plans"
  | "Booked by mistake"
  | "Found another Help"
  | "Schedule no longer works"
  | "Other";

export const CANCEL_REASONS: CancelReason[] = [
  "Changed my plans",
  "Booked by mistake",
  "Found another Help",
  "Schedule no longer works",
  "Other",
];

export const STATUS_LABELS: Record<
  BookingStatus,
  string
> = {
  pending: "Searching",
  assigned: "Request sent",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_maid_found: "No Help found",
};


export type { BookingStatus, Booking, CancelReason };
