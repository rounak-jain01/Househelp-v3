import {
  getAuth,
  onAuthStateChanged,
} from '@react-native-firebase/auth';

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

/**
 * Safely normalize unknown errors.
 */
function normalizeError(
  error: unknown,
  fallbackMessage: string,
): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}

/**
 * Subscribe to the authenticated customer's profile.
 *
 * The Firestore listener is attached only while a Firebase
 * Auth user exists. It is automatically removed as soon
 * as the user signs out.
 */
export function subscribeToCustomerProfile(
  onProfile: (
    profile: CustomerProfile | null,
  ) => void,
  onError?: (error: Error) => void,
) {
  const auth = getAuth();
  const firestore = getFirestore();

  let firestoreUnsubscribe:
    | (() => void)
    | null = null;

  let isDisposed = false;

  const stopFirestoreListener = () => {
    if (firestoreUnsubscribe) {
      firestoreUnsubscribe();
      firestoreUnsubscribe = null;
    }
  };

  const authUnsubscribe =
    onAuthStateChanged(
      auth,
      (user) => {
        if (isDisposed) {
          return;
        }

        /*
         * User has signed out.
         * Stop Firestore listener immediately.
         */
        if (!user) {
          stopFirestoreListener();
          onProfile(null);
          return;
        }

        /*
         * Prevent duplicate listeners if auth
         * changes from one account to another.
         */
        stopFirestoreListener();

        const userRef = doc(
          firestore,
          'users',
          user.uid,
        );

        firestoreUnsubscribe =
          onSnapshot(
            userRef,
            (snapshot) => {
              if (isDisposed) {
                return;
              }

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
              /*
               * Firebase may deliver a final error while
               * logout is already in progress. Ignore it
               * when there is no authenticated user.
               */
              if (
                isDisposed ||
                !getAuth().currentUser
              ) {
                return;
              }

              const normalizedError =
                normalizeError(
                  error,
                  'Unable to load customer profile.',
                );

              console.error(
                '[CustomerService] Profile listener failed:',
                normalizedError,
              );

              onError?.(
                normalizedError,
              );
            },
          );
      },
    );

  return () => {
    isDisposed = true;

    stopFirestoreListener();
    authUnsubscribe();
  };
}

/**
 * Subscribe to the customer's currently active booking.
 *
 * Automatically stops the Firestore listener after logout.
 */
export function subscribeToActiveBooking(
  onBooking: (
    booking: CustomerBooking | null,
  ) => void,
  onError?: (error: Error) => void,
) {
  const auth = getAuth();
  const firestore = getFirestore();

  let firestoreUnsubscribe:
    | (() => void)
    | null = null;

  let isDisposed = false;

  const stopFirestoreListener = () => {
    if (firestoreUnsubscribe) {
      firestoreUnsubscribe();
      firestoreUnsubscribe = null;
    }
  };

  const authUnsubscribe =
    onAuthStateChanged(
      auth,
      (user) => {
        if (isDisposed) {
          return;
        }

        /*
         * Signed out → remove booking listener.
         */
        if (!user) {
          stopFirestoreListener();
          onBooking(null);
          return;
        }

        /*
         * Remove old listener before creating
         * a new one.
         */
        stopFirestoreListener();

        const bookingsRef =
          collection(
            firestore,
            'bookings',
          );

        const activeStatuses = [
          'pending',
          'assigned',
          'confirmed',
          'in_progress',
        ];

        const bookingsQuery =
          query(
            bookingsRef,
            where(
              'customerId',
              '==',
              user.uid,
            ),
            where(
              'status',
              'in',
              activeStatuses,
            ),
          );

        firestoreUnsubscribe =
          onSnapshot(
            bookingsQuery,
            (snapshot) => {
              if (isDisposed) {
                return;
              }

              if (snapshot.empty) {
                onBooking(null);
                return;
              }

              const bookings =
                snapshot.docs.map(
                  (
                    bookingDocument,
                  ) =>
                    ({
                      bookingId:
                        bookingDocument.id,
                      ...bookingDocument.data(),
                    }) as CustomerBooking,
                );

              bookings.sort(
                (a, b) => {
                  const aTime =
                    a.scheduledDateTime
                      ?.toMillis?.() ??
                    0;

                  const bTime =
                    b.scheduledDateTime
                      ?.toMillis?.() ??
                    0;

                  return (
                    aTime - bTime
                  );
                },
              );

              onBooking(
                bookings[0] ??
                  null,
              );
            },
            (error) => {
              /*
               * Ignore stale Firestore errors that arrive
               * after the user has already signed out.
               */
              if (
                isDisposed ||
                !getAuth().currentUser
              ) {
                return;
              }

              const normalizedError =
                normalizeError(
                  error,
                  'Unable to load active booking.',
                );

              console.error(
                '[CustomerService] Booking listener failed:',
                normalizedError,
              );

              onError?.(
                normalizedError,
              );
            },
          );
      },
    );

  return () => {
    isDisposed = true;

    stopFirestoreListener();
    authUnsubscribe();
  };
}