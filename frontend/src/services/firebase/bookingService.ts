import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from '@react-native-firebase/firestore';

export type BookingStatus =
  | 'pending'
  | 'assigned'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_maid_found';

export type BookingCategory = {
  id: string;
  name?: string;
  ratePerHour: number;
};

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
  scheduledDateTime?: any;
  status: BookingStatus;
  customerName?: string;
  customerAddress?: {
    formatted?: string;
    landmark?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  totalPrice: number;
  createdAt?: any;
  updatedAt?: any;
  assignedAt?: any;
  respondedAt?: any;
  startedAt?: any;
  completedAt?: any;
  cancelledAt?: any;
  offeredMaidIds?: string[];
  maidResponses?: Record<string, string>;
  winningMaidId?: string | null;
  assignmentError?: string | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
};

function getCurrentUserId(): string {
  const user = getAuth().currentUser;

  if (!user) {
    throw new Error(
      'Your session has expired. Please login again.',
    );
  }

  return user.uid;
}

function validateCategories(categoryIds: string[]): void {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    throw new Error('Please select at least one service.');
  }

  if (categoryIds.length > 10) {
    throw new Error('Please select fewer services.');
  }

  if (new Set(categoryIds).size !== categoryIds.length) {
    throw new Error(
      'Invalid service selection. Please try again.',
    );
  }
}

function validateDuration(duration: number): void {
  if (![1, 2, 3, 4].includes(duration)) {
    throw new Error(
      'Please choose a duration between 1 and 4 hours.',
    );
  }
}

function validateScheduledDateTime(
  scheduledDateTime: Date,
): void {
  if (!(scheduledDateTime instanceof Date)) {
    throw new Error(
      'Please choose a valid date and time.',
    );
  }

  if (Number.isNaN(scheduledDateTime.getTime())) {
    throw new Error(
      'Please choose a valid date and time.',
    );
  }

  const minimumBookingTime = new Date(
    Date.now() + 2 * 60 * 60 * 1000,
  );

  if (
    scheduledDateTime.getTime() <
    minimumBookingTime.getTime()
  ) {
    throw new Error(
      'Please choose a time at least 2 hours from now.',
    );
  }
}

async function getSelectedCategories(
  categoryIds: string[],
): Promise<BookingCategory[]> {
  const firestore = getFirestore();

  const snapshot = await getDocs(
    collection(firestore, 'categories'),
  );

  const availableCategories = snapshot.docs.map(
    (categoryDocument) =>
      ({
        id: categoryDocument.id,
        ...categoryDocument.data(),
      }) as BookingCategory,
  );

  const selectedCategories = categoryIds
    .map((categoryId) =>
      availableCategories.find(
        (category) => category.id === categoryId,
      ),
    )
    .filter(
      (category): category is BookingCategory =>
        Boolean(category),
    );

  if (
    selectedCategories.length !== categoryIds.length
  ) {
    throw new Error(
      'One or more selected services are currently unavailable.',
    );
  }

  for (const category of selectedCategories) {
    if (
      typeof category.ratePerHour !== 'number' ||
      !Number.isFinite(category.ratePerHour) ||
      category.ratePerHour <= 0
    ) {
      throw new Error(
        'A selected service has invalid pricing.',
      );
    }
  }

  return selectedCategories;
}

function calculateTotalPrice(
  categories: BookingCategory[],
  duration: number,
): number {
  const total = categories.reduce(
    (sum, category) =>
      sum + category.ratePerHour * duration,
    0,
  );

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error(
      'Unable to calculate the booking price.',
    );
  }

  return total;
}

async function getCustomerProfile(userId: string) {
  const firestore = getFirestore();

  const userRef = doc(
    firestore,
    'users',
    userId,
  );

  const snapshot = await getDoc(userRef);

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

  const address = data.address ?? {};

  const formattedAddress =
    typeof address.formatted === 'string'
      ? address.formatted.trim()
      : '';

  const landmark =
    typeof address.landmark === 'string'
      ? address.landmark.trim()
      : '';

  const latitude =
    typeof address.latitude === 'number'
      ? address.latitude
      : null;

  const longitude =
    typeof address.longitude === 'number'
      ? address.longitude
      : null;

  if (!name) {
    throw new Error(
      'Please complete your profile before booking.',
    );
  }

  if (!formattedAddress) {
    throw new Error(
      'Please add your service address before booking.',
    );
  }

  return {
    name,
    address: {
      formatted: formattedAddress,
      landmark,
      latitude,
      longitude,
    },
  };
}

export async function createBooking(
  params: CreateBookingParams,
): Promise<CreatedBooking> {
  const userId = getCurrentUserId();

  validateCategories(params.categoryIds);
  validateDuration(params.duration);
  validateScheduledDateTime(
    params.scheduledDateTime,
  );

  const customer = await getCustomerProfile(userId);

  const selectedCategories =
    await getSelectedCategories(
      params.categoryIds,
    );

  const totalPrice = calculateTotalPrice(
    selectedCategories,
    params.duration,
  );

  const firestore = getFirestore();

  const bookingRef = doc(
    collection(firestore, 'bookings'),
  );

  await setDoc(bookingRef, {
    customerId: userId,

    maidId: null,

    categories: selectedCategories.map(
      (category) => category.id,
    ),

    duration: params.duration,

    scheduledDateTime: Timestamp.fromDate(
      params.scheduledDateTime,
    ),

    status: 'pending' as BookingStatus,

    customerName: customer.name,

    customerAddress: {
      formatted: customer.address.formatted,
      landmark: customer.address.landmark,
      latitude: customer.address.latitude,
      longitude: customer.address.longitude,
    },

    totalPrice,

    offeredMaidIds: [],

    maidResponses: {},

    winningMaidId: null,

    assignedAt: null,

    respondedAt: null,

    startedAt: null,

    completedAt: null,

    cancelledAt: null,

    cancellationReason: null,

    cancelledBy: null,

    assignmentError: null,

    createdAt: serverTimestamp(),

    updatedAt: serverTimestamp(),
  });

  console.log(
    '[BookingService] Booking created:',
    bookingRef.id,
  );

  return {
    bookingId: bookingRef.id,
    totalPrice,
  };
}

/**
 * Listen to one customer's booking in real time.
 *
 * This is used by the waiting/status screen.
 */
export function subscribeToBooking(
  bookingId: string,
  onBooking: (booking: BookingDocument | null) => void,
  onError?: (error: Error) => void,
) {
  try {
    if (!bookingId) {
      throw new Error('Booking ID is missing.');
    }

    const userId = getCurrentUserId();
    const firestore = getFirestore();

    const bookingRef = doc(
      firestore,
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

        const data = snapshot.data();

        /**
         * Safety check:
         * Customer should only see their own booking.
         */
        if (data.customerId !== userId) {
          onError?.(
            new Error(
              'You do not have access to this booking.',
            ),
          );
          return;
        }

        onBooking({
          bookingId: snapshot.id,
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
    const normalizedError =
      error instanceof Error
        ? error
        : new Error(
            'Unable to load booking.',
          );

    onError?.(normalizedError);

    return () => {};
  }
}