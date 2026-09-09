import {
  collection,
  collectionGroup,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from '@react-native-firebase/firestore';

import { getAuth } from '@react-native-firebase/auth';

export type MaidBookingRequest = {
  bookingId: string;
  maidId: string;

  response?:
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'expired';

  responseReason?: string | null;

  customerName?: string;

  customerAddress?: {
    formatted?: string;
    landmark?: string;
  };

  customerLatitude?: number | null;
  customerLongitude?: number | null;

  categories?: string[];
  duration?: number;

  scheduledDateTime?: unknown;
  totalPrice?: number;

  distanceMeters?: number | null;
  estimatedTravelSeconds?: number | null;

  distanceText?: string | null;
  etaText?: string | null;

  requestExpiresAt?: unknown;

  createdAt?: unknown;
  updatedAt?: unknown;
};

/**
 * Subscribe to one specific booking request
 * for the currently logged-in maid.
 *
 * Path:
 * bookings/{bookingId}/maidRequests/{maidId}
 */
export function subscribeToMaidBookingRequest(
  bookingId: string,
  onRequest: (
    request: MaidBookingRequest | null,
  ) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const user =
    getAuth().currentUser;

  if (!user) {
    const error = new Error(
      'Your session has expired. Please login again.',
    );

    onError?.(error);

    return () => {};
  }

  const maidId = user.uid;
  const db = getFirestore();

  /*
   * We query the subcollection instead of using
   * doc(), because the current RNFirebase runtime
   * in this project does not expose doc() correctly.
   */
  const requestsCollection = collection(
    db,
    'bookings',
    bookingId,
    'maidRequests',
  );

  const requestQuery = query(
    requestsCollection,
    where(
      'maidId',
      '==',
      maidId,
    ),
  );

  return onSnapshot(
    requestQuery,
    (snapshot) => {
      if (snapshot.empty) {
        onRequest(null);
        return;
      }

      const requestDocument =
        snapshot.docs[0];

      const data =
        requestDocument.data() as Partial<MaidBookingRequest>;

      onRequest({
        bookingId,
        maidId,
        ...data,
      });
    },
    (error) => {
      console.error(
        '[MaidBookingRequest] Request listener failed:',
        error,
      );

      onError?.(error);
    },
  );
}

/**
 * Subscribe to all pending requests
 * belonging to one maid.
 *
 * This uses the Firestore collection-group
 * composite index:
 *
 * maidId     ASCENDING
 * response   ASCENDING
 * __name__   ASCENDING
 */
export function subscribeToPendingMaidBookingRequestIds(
  maidId: string,
  onRequest: (
    bookingId: string,
  ) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirestore();

  const requestsQuery = query(
    collectionGroup(
      db,
      'maidRequests',
    ),
    where(
      'maidId',
      '==',
      maidId,
    ),
    where(
      'response',
      '==',
      'pending',
    ),
  );

  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      snapshot.docs.forEach(
        (requestDocument) => {
          /*
           * bookings/{bookingId}/maidRequests/{maidId}
           */
          const bookingDocument =
            requestDocument.ref.parent.parent;

          if (!bookingDocument) {
            return;
          }

          onRequest(
            bookingDocument.id,
          );
        },
      );
    },
    (error) => {
      console.error(
        '[MaidBookingRequest] Pending request listener failed:',
        error,
      );

      onError?.(error);
    },
  );
}

/**
 * Accept or reject the currently logged-in
 * maid's booking request.
 *
 * The backend performs the actual first-accept-wins
 * transaction and booking assignment.
 */
export async function respondToMaidBookingRequest(
  bookingId: string,
  response:
    | 'accepted'
    | 'rejected',
): Promise<void> {
  const user =
    getAuth().currentUser;

  if (!user) {
    throw new Error(
      'Your session has expired. Please login again.',
    );
  }

  const maidId = user.uid;
  const db = getFirestore();

  const requestsCollection = collection(
    db,
    'bookings',
    bookingId,
    'maidRequests',
  );

  const requestQuery = query(
    requestsCollection,
    where(
      'maidId',
      '==',
      maidId,
    ),
  );

  const snapshot = await getDocs(
    requestQuery,
  );

  if (snapshot.empty) {
    throw new Error(
      'Booking request not found.',
    );
  }

  const requestDocument =
    snapshot.docs[0];

  await updateDoc(
    requestDocument.ref,
    {
      response,
      updatedAt: new Date(),
    },
  );
}