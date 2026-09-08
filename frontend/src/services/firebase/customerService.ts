import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  where,
} from '@react-native-firebase/firestore';

export type CustomerProfile = {
  userId: string;
  phoneNumber?: string;
  name?: string;
  gender?: string;
  role?: 'customer';
  photoUrl?: string | null;
  address?: {
    formatted?: string;
    landmark?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
};

export type CustomerBooking = {
  bookingId: string;
  customerId: string;
  maidId?: string | null;
  categories: string[];
  duration: number;
  scheduledDateTime?: any;
  totalPrice: number;
  status:
    | 'pending'
    | 'assigned'
    | 'confirmed'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'no_maid_found';
  customerAddress?: {
    formatted?: string;
    landmark?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  customerName?: string;
  createdAt?: any;
  startedAt?: any;
  completedAt?: any;
  cancelledAt?: any;
};

function getCurrentUserId(): string {
  const user = getAuth().currentUser;

  if (!user) {
    throw new Error('No authenticated user found.');
  }

  return user.uid;
}

export function subscribeToCustomerProfile(
  onProfile: (profile: CustomerProfile | null) => void,
  onError?: (error: Error) => void,
) {
  try {
    const userId = getCurrentUserId();
    const firestore = getFirestore();

    const userRef = doc(
      firestore,
      'users',
      userId,
    );

    return onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onProfile(null);
          return;
        }

        onProfile({
          userId: snapshot.id,
          ...snapshot.data(),
        } as CustomerProfile);
      },
      (error) => {
        console.error(
          '[CustomerService] Profile listener failed:',
          error,
        );

        onError?.(error);
      },
    );
  } catch (error) {
    const normalizedError =
      error instanceof Error
        ? error
        : new Error('Unable to load customer profile.');

    onError?.(normalizedError);

    return () => {};
  }
}

export function subscribeToActiveBooking(
  onBooking: (booking: CustomerBooking | null) => void,
  onError?: (error: Error) => void,
) {
  try {
    const userId = getCurrentUserId();
    const firestore = getFirestore();

    const bookingsRef = collection(
      firestore,
      'bookings',
    );

    const activeStatuses = [
      'pending',
      'assigned',
      'confirmed',
      'in_progress',
    ];

    const bookingsQuery = query(
      bookingsRef,
      where('customerId', '==', userId),
      where('status', 'in', activeStatuses),
    );

    return onSnapshot(
      bookingsQuery,
      (snapshot) => {
        if (snapshot.empty) {
          onBooking(null);
          return;
        }

        const bookings = snapshot.docs.map(
          (bookingDocument) =>
            ({
              bookingId: bookingDocument.id,
              ...bookingDocument.data(),
            }) as CustomerBooking,
        );

        bookings.sort((a, b) => {
          const aTime =
            a.scheduledDateTime?.toMillis?.() ?? 0;

          const bTime =
            b.scheduledDateTime?.toMillis?.() ?? 0;

          return aTime - bTime;
        });

        onBooking(bookings[0] ?? null);
      },
      (error) => {
        console.error(
          '[CustomerService] Booking listener failed:',
          error,
        );

        onError?.(error);
      },
    );
  } catch (error) {
    const normalizedError =
      error instanceof Error
        ? error
        : new Error('Unable to load active booking.');

    onError?.(normalizedError);

    return () => {};
  }
}