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
 *
 * We use a single-field query on maidId and match
 * the request document locally. This avoids requiring
 * a composite Firestore index.
 */
export function subscribeToMaidBookingRequest(
  bookingId: string,
  onRequest: (
    request: MaidBookingRequest | null,
  ) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const user = getAuth().currentUser;

  if (!user) {
    const error = new Error(
      'Your session has expired. Please login again.',
    );

    onError?.(error);

    return () => {};
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
    where('maidId', '==', maidId),
  );

  return onSnapshot(
    requestQuery,
    (snapshot) => {
      if (snapshot.empty) {
        onRequest(null);
        return;
      }

      const requestDocument = snapshot.docs[0];
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
 * Subscribe to pending booking requests belonging to one maid.
 *
 * IMPORTANT:
 * We intentionally query ONLY by maidId.
 * Filtering response == "pending" is done locally.
 *
 * The old two-field collectionGroup query:
 *   maidId == ...
 *   response == "pending"
 *
 * requires a composite Firestore index and caused:
 * firestore/failed-precondition
 * "Ensure your query has been indexed..."
 *
 * This implementation needs only the default single-field index.
 */
export function subscribeToPendingMaidBookingRequestIds(
  maidId: string,
  onRequest: (
    bookingId: string,
  ) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!maidId) {
    const error = new Error('Invalid maid ID.');
    onError?.(error);
    return () => {};
  }

  const db = getFirestore();

  const requestsQuery = query(
    collectionGroup(db, 'maidRequests'),
    where('maidId', '==', maidId),
  );

  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      snapshot.docs.forEach((requestDocument) => {
        const data =
          requestDocument.data() as Partial<MaidBookingRequest>;

        // Only pending requests should reach the UI.
        if (data.response !== 'pending') {
          return;
        }

        /*
         * bookings/{bookingId}/maidRequests/{maidId}
         */
        const bookingDocument =
          requestDocument.ref.parent.parent;

        if (!bookingDocument) {
          return;
        }

        onRequest(bookingDocument.id);
      });
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
 * Respond to the currently logged-in maid's booking request.
 *
 * The client writes only the response fields allowed by Firestore
 * rules. The backend remains authoritative for first-accept-wins.
 */
export async function respondToMaidBookingRequest(
  bookingId: string,
  response:
    | 'accepted'
    | 'rejected',
): Promise<void> {
  const user = getAuth().currentUser;

  if (!user) {
    throw new Error(
      'Your session has expired. Please login again.',
    );
  }

  if (!bookingId) {
    throw new Error('Invalid booking ID.');
  }

  if (
    response !== 'accepted' &&
    response !== 'rejected'
  ) {
    throw new Error('Invalid booking response.');
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
    where('maidId', '==', maidId),
  );

  const snapshot = await getDocs(requestQuery);

  if (snapshot.empty) {
    throw new Error(
      'Booking request not found.',
    );
  }

  const requestDocument = snapshot.docs.find(
    (document) => {
      const data =
        document.data() as Partial<MaidBookingRequest>;

      return data.maidId === maidId;
    },
  );

  if (!requestDocument) {
    throw new Error(
      'Booking request not found.',
    );
  }

  const currentData =
    requestDocument.data() as Partial<MaidBookingRequest>;

  if (currentData.response !== 'pending') {
    throw new Error(
      'This booking request is no longer pending.',
    );
  }

  await updateDoc(
    requestDocument.ref,
    {
      response,
      updatedAt: new Date(),
    },
  );
}
