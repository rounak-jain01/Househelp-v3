import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  Timestamp,
} from '@react-native-firebase/firestore';
import {
  getFunctions,
  httpsCallable,
} from '@react-native-firebase/functions';

export type BookingStatus =
  | 'pending'
  | 'assigned'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_maid_found';

export type CreateBookingParams = {
  categoryIds: string[];
  duration: number;
  scheduledDateTime: Date;
};

export type CreatedBooking = {
  bookingId: string;
  totalPrice: number;
};

export type BookingDocument = {
  bookingId: string;
  customerId: string;
  maidId?: string | null;
  categories: string[];
  duration: number;
  scheduledDateTime?: unknown;
  status: BookingStatus;
  customerName?: string;
  customerAddress?: {
    formatted?: string;
    landmark?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  totalPrice: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  assignedAt?: unknown;
  respondedAt?: unknown;
  startedAt?: unknown;
  completedAt?: unknown;
  cancelledAt?: unknown;
  offeredMaidIds?: string[];
  maidResponses?: Record<string, string>;
  winningMaidId?: string | null;
  assignmentError?: string | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
};

const FUNCTIONS_REGION =
  'asia-south1';

function getCurrentUserId(): string {
  const user =
    getAuth().currentUser;

  if (!user) {
    throw new Error(
      'Your session has expired. Please login again.',
    );
  }

  return user.uid;
}

function validateCategories(
  categoryIds: string[],
): string[] {
  if (
    !Array.isArray(categoryIds) ||
    categoryIds.length === 0
  ) {
    throw new Error(
      'Please select at least one service.',
    );
  }

  if (categoryIds.length > 10) {
    throw new Error(
      'Please select fewer services.',
    );
  }

  const normalized =
    categoryIds.map((id) =>
      typeof id === 'string'
        ? id.trim()
        : '',
    );

  if (
    normalized.some(
      (id) => !id,
    )
  ) {
    throw new Error(
      'Invalid service selection.',
    );
  }

  if (
    new Set(normalized).size !==
    normalized.length
  ) {
    throw new Error(
      'Duplicate services are not allowed.',
    );
  }

  return normalized;
}

function validateDuration(
  duration: number,
): void {
  if (
    ![1, 2, 3, 4].includes(
      duration,
    )
  ) {
    throw new Error(
      'Please choose a duration between 1 and 4 hours.',
    );
  }
}

function validateScheduledDateTime(
  scheduledDateTime: Date,
): void {
  if (
    !(scheduledDateTime instanceof Date) ||
    Number.isNaN(
      scheduledDateTime.getTime(),
    )
  ) {
    throw new Error(
      'Please choose a valid date and time.',
    );
  }

  if (
    scheduledDateTime.getTime() <
    Date.now() +
      2 * 60 * 60 * 1000
  ) {
    throw new Error(
      'Please choose a time at least 2 hours from now.',
    );
  }
}

function generateClientRequestId(): string {
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 12);

  return `b_${Date.now().toString(36)}_${randomPart}`;
}

function getRegionalFunctions() {
  return getFunctions(
    undefined,
    FUNCTIONS_REGION,
  );
}

export async function createBooking(
  params: CreateBookingParams,
): Promise<CreatedBooking> {
  validateCategories(
    params.categoryIds,
  );

  const categoryIds =
    validateCategories(
      params.categoryIds,
    );

  validateDuration(
    params.duration,
  );

  validateScheduledDateTime(
    params.scheduledDateTime,
  );

  const callable = httpsCallable<
    {
      bookingId: string;
      categoryIds: string[];
      duration: number;
      scheduledDateTime: string;
    },
    {
      bookingId: string;
      totalPrice: number;
      created: boolean;
    }
  >(
    getRegionalFunctions(),
    'createBooking',
  );

  const result = await callable({
    bookingId:
      generateClientRequestId(),
    categoryIds,
    duration: params.duration,
    scheduledDateTime:
      params.scheduledDateTime.toISOString(),
  });

  return {
    bookingId:
      result.data.bookingId,
    totalPrice:
      result.data.totalPrice,
  };
}

export async function getCustomerProfileSummary() {
  const userId =
    getCurrentUserId();

  const snapshot =
    await getDoc(
      doc(
        getFirestore(),
        'users',
        userId,
      ),
    );

  if (!snapshot.exists()) {
    throw new Error(
      'Your profile could not be found. Please complete your profile first.',
    );
  }

  const data = snapshot.data();

  const name =
    typeof data.name === 'string'
      ? data.name.trim()
      : '';

  const address =
    data.address ??
    {};

  const formatted =
    typeof address.formatted === 'string'
      ? address.formatted.trim()
      : '';

  if (!name) {
    throw new Error(
      'Please complete your profile before booking.',
    );
  }

  if (!formatted) {
    throw new Error(
      'Please add your service address before booking.',
    );
  }

  return {
    name,
    address,
  };
}

export function subscribeToBooking(
  bookingId: string,
  onBooking: (
    booking:
      | BookingDocument
      | null,
  ) => void,
  onError?: (
    error: Error,
  ) => void,
) {
  if (!bookingId) {
    const error =
      new Error(
        'Booking ID is missing.',
      );

    onError?.(error);
    return () => {};
  }

  try {
    const userId =
      getCurrentUserId();

    const bookingRef =
      doc(
        getFirestore(),
        'bookings',
        bookingId,
      );

    return onSnapshot(
      bookingRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onBooking(null);
          return;
        }

        const data =
          snapshot.data();

        if (
          data.customerId !==
          userId
        ) {
          onError?.(
            new Error(
              'You do not have access to this booking.',
            ),
          );
          return;
        }

        onBooking({
          bookingId:
            snapshot.id,
          ...data,
        } as BookingDocument);
      },
      (error) => {
        console.error(
          '[BookingService] Booking listener failed:',
          error,
        );

        onError?.(error);
      },
    );
  } catch (error) {
    const normalized =
      error instanceof Error
        ? error
        : new Error(
            'Unable to load booking.',
          );

    onError?.(normalized);
    return () => {};
  }
}
