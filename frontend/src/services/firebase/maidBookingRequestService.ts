import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
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

function getCurrentMaidId(): string {
  const user = getAuth().currentUser;

  if (!user) {
    throw new Error(
      'Your session has expired. Please login again.',
    );
  }

  return user.uid;
}

function validateBookingId(bookingId: string): string {
  const normalized = bookingId.trim();

  if (
    normalized.length < 8 ||
    normalized.length > 100 ||
    !/^[A-Za-z0-9_-]+$/.test(normalized)
  ) {
    throw new Error(
      'Invalid booking request.',
    );
  }

  return normalized;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(
    'Unable to process the booking request.',
  );
}

/**
 * Subscribe to one specific booking request
 * for the currently logged-in maid.
 *
 * Path:
 * bookings/{bookingId}/maidRequests/{maidId}
 *
 * The request is additionally filtered by maidId so a
 * malformed/incorrectly addressed request document is
 * never surfaced to the UI.
 */
export function subscribeToMaidBookingRequest(
  bookingId: string,
  onRequest: (
    request: MaidBookingRequest | null,
  ) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let normalizedBookingId: string;

  try {
    normalizedBookingId =
      validateBookingId(bookingId);
  } catch (error) {
    onError?.(
      normalizeError(error),
    );

    return () => {};
  }

  let maidId: string;

  try {
    maidId =
      getCurrentMaidId();
  } catch (error) {
    onError?.(
      normalizeError(error),
    );

    return () => {};
  }

  const db = getFirestore();

  const requestDocument = doc(
    db,
    'bookings',
    normalizedBookingId,
    'maidRequests',
    maidId,
  );

  return onSnapshot(
    requestDocument,
    (snapshot) => {
      if (!snapshot.exists) {
        // The screen intentionally keeps showing its loader while the
        // booking request document is being propagated/created.
        return;
      }

      const data =
        snapshot.data() as Partial<MaidBookingRequest>;

      if (data.maidId !== maidId) {
        onRequest(null);
        return;
      }

      onRequest({
        bookingId: normalizedBookingId,
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
 * Subscribe to newly pending booking requests for one maid.
 *
 * We query maidId + response so this listener uses the
 * deployed collection-group composite index.
 *
 * The callback fires once when a booking first becomes
 * visible as pending. When that request later becomes
 * accepted/rejected/expired, it is removed from the local
 * pending set.
 */
export function subscribeToPendingMaidBookingRequestIds(
  maidId: string,
  onRequest: (
    bookingId: string,
  ) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const normalizedMaidId =
    maidId.trim();

  if (!normalizedMaidId) {
    const error = new Error(
      'Maid ID is missing.',
    );

    onError?.(error);

    return () => {};
  }

  const db = getFirestore();

  const requestsQuery = query(
    collectionGroup(
      db,
      'maidRequests',
    ),
    where(
      'maidId',
      '==',
      normalizedMaidId,
    ),
    where(
      'response',
      '==',
      'pending',
    ),
  );

  const pendingBookingIds =
    new Set<string>();

  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      const currentlyPending =
        new Set<string>();

      snapshot.docs.forEach(
        (requestDocument) => {
          const data =
            requestDocument.data() as Partial<MaidBookingRequest>;

          if (
            data.maidId !==
              normalizedMaidId ||
            data.response !==
              'pending'
          ) {
            return;
          }

          const bookingDocument =
            requestDocument.ref.parent.parent;

          if (!bookingDocument) {
            return;
          }

          const bookingId =
            bookingDocument.id;

          currentlyPending.add(
            bookingId,
          );

          if (
            !pendingBookingIds.has(
              bookingId,
            )
          ) {
            onRequest(
              bookingId,
            );
          }
        },
      );

      pendingBookingIds.clear();

      currentlyPending.forEach(
        (bookingId) => {
          pendingBookingIds.add(
            bookingId,
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
 * The client writes only the response fields permitted
 * by Firestore rules. The backend trigger performs the
 * authoritative first-accept-wins transaction.
 */
export async function respondToMaidBookingRequest(
  bookingId: string,
  response:
    | 'accepted'
    | 'rejected',
): Promise<void> {
  const normalizedBookingId =
    validateBookingId(bookingId);

  if (
    response !== 'accepted' &&
    response !== 'rejected'
  ) {
    throw new Error(
      'Invalid booking response.',
    );
  }

  const maidId =
    getCurrentMaidId();

  const db = getFirestore();

  const requestsCollection =
    collection(
      db,
      'bookings',
      normalizedBookingId,
      'maidRequests',
    );

  const requestQuery =
    query(
      requestsCollection,
      where(
        'maidId',
        '==',
        maidId,
      ),
    );

  const snapshot =
    await getDocs(
      requestQuery,
    );

  if (snapshot.empty) {
    throw new Error(
      'Booking request not found.',
    );
  }

  const requestDocument =
    snapshot.docs[0];

  if (
    requestDocument.id !==
    maidId
  ) {
    throw new Error(
      'Invalid booking request.',
    );
  }

  const current =
    requestDocument.data() as Partial<MaidBookingRequest>;

  if (
    current.maidId !== maidId
  ) {
    throw new Error(
      'This booking request does not belong to you.',
    );
  }

  if (
    current.response !==
    'pending'
  ) {
    if (
      current.response ===
      response
    ) {
      return;
    }

    if (
      current.response ===
      'expired'
    ) {
      throw new Error(
        'This booking request has expired.',
      );
    }

    throw new Error(
      'This booking request has already been processed.',
    );
  }

  try {
    await updateDoc(
      requestDocument.ref,
      {
        response,
        responseReason: null,
        updatedAt:
          serverTimestamp(),
      },
    );
  } catch (error) {
    console.error(
      '[MaidBookingRequest] Failed to update request:',
      error,
    );

    /*
     * A simultaneous backend winner/expiry can change
     * pending -> accepted/rejected/expired between the
     * read above and this write. The authoritative backend
     * transaction decides the final state.
     */
    throw new Error(
      'This booking request is no longer available. Please refresh and try again.',
    );
  }
}
