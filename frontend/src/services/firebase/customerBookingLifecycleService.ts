import {
  collection,
  collectionGroup,
  getFirestore,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "@react-native-firebase/firestore";

import {
  getFunctions,
  httpsCallable,
} from "@react-native-firebase/functions";

import { getAuth } from "@react-native-firebase/auth";

export type CustomerStartOtp = {
  otp: string;
  usedAt?: unknown;
};

type CallableResult<T> = {
  data: T;
};

const FUNCTIONS_REGION = "asia-south1";

function getRegionalFunctions() {
  const functions = getFunctions(undefined, 'asia-south1');

  /*
   * The functions in this project are deployed in
   * asia-south1. RNFirebase exposes the regional
   * Functions instance through the app-level API.
   */
  return functions;
}

/**
 * Subscribe to the customer's start OTP.
 *
 * OTP is stored outside the main booking document:
 *
 * bookings/{bookingId}/customerSecrets/startOtp
 *
 * Only the booking owner is allowed to read this
 * subcollection through Firestore rules.
 */
export function subscribeToCustomerStartOtp(
  bookingId: string,
  onOtp: (
    value: CustomerStartOtp | null,
  ) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirestore();

  const secretCollection = collection(
    db,
    "bookings",
    bookingId,
    "customerSecrets",
  );

  const otpQuery = query(
    secretCollection,
    where(
      "type",
      "==",
      "start_otp",
    ),
  );

  return onSnapshot(
    otpQuery,
    (snapshot) => {
      if (snapshot.empty) {
        onOtp(null);
        return;
      }

      const data =
        snapshot.docs[0].data() as {
          otp?: unknown;
          usedAt?: unknown;
        };

      if (
        typeof data.otp !== "string" ||
        !/^\d{6}$/.test(data.otp)
      ) {
        onOtp(null);
        return;
      }

      onOtp({
        otp: data.otp,
        usedAt: data.usedAt,
      });
    },
    (error) => {
      console.error(
        "[CustomerBookingLifecycle] OTP listener failed:",
        error,
      );

      onError?.(error);
    },
  );
}

/**
 * Cancel a booking as the customer.
 *
 * Server validates the one-hour cancellation rule.
 */
export async function cancelCustomerBooking(
  bookingId: string,
  reason: string,
): Promise<void> {
  const trimmedReason =
    reason.trim();

  if (!trimmedReason) {
    throw new Error(
      "Please select a cancellation reason.",
    );
  }

  const functions =
    getRegionalFunctions();

  const callable =
    httpsCallable(
      functions,
      "cancelCustomerBooking",
    );

  await callable({
    bookingId,
    reason: trimmedReason,
  });
}

/**
 * Start a job using the customer's OTP.
 *
 * Only the assigned maid can call this function.
 */
export async function startBookingWithOtp(
  bookingId: string,
  otp: string,
): Promise<void> {
  const normalizedOtp =
    otp.trim();

  if (
    !/^\d{6}$/.test(normalizedOtp)
  ) {
    throw new Error(
      "Enter the 6-digit start code.",
    );
  }

  const functions =
    getRegionalFunctions();

  const callable =
    httpsCallable(
      functions,
      "startJobWithOtp",
    );

  await callable({
    bookingId,
    otp: normalizedOtp,
  });
}

/**
 * Mark an in-progress job completed.
 *
 * Only the assigned maid can call this.
 */
export async function completeBooking(
  bookingId: string,
): Promise<void> {
  const functions =
    getRegionalFunctions();

  const callable =
    httpsCallable(
      functions,
      "completeBooking",
    );

  await callable({
    bookingId,
  });
}

/**
 * Subscribe to one booking for the currently
 * logged-in maid.
 *
 * We use a query on maidId and then match the
 * supplied booking ID locally. This avoids the
 * problematic doc() helper in the current RNFirebase
 * runtime used by this project.
 */
export function subscribeToMaidBooking(
  bookingId: string,
  onBooking: (
    booking: Record<string, unknown> | null,
  ) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const user =
    getAuth().currentUser;

  if (!user) {
    const error = new Error(
      "Your session has expired. Please login again.",
    );

    onError?.(error);

    return () => {};
  }

  const db = getFirestore();

  const bookingsQuery = query(
    collection(
      db,
      "bookings",
    ),
    where(
      "maidId",
      "==",
      user.uid,
    ),
  );

  return onSnapshot(
    bookingsQuery,
    (snapshot) => {
      const matchingDocument =
        snapshot.docs.find(
          (item) =>
            item.id === bookingId,
        );

      if (!matchingDocument) {
        onBooking(null);
        return;
      }

      onBooking(
        matchingDocument.data() as Record<
          string,
          unknown
        >,
      );
    },
    (error) => {
      console.error(
        "[CustomerBookingLifecycle] Maid booking listener failed:",
        error,
      );

      onError?.(error);
    },
  );
}

export async function requestExtraTime(
  bookingId: string,
  extraMinutes: number,
): Promise<void> {
  if (
    ![30, 60, 120].includes(extraMinutes)
  ) {
    throw new Error(
      "Extra time must be 30 minutes, 1 hour, or 2 hours.",
    );
  }

  const functions = getFunctions(
    undefined,
    "asia-south1",
  );

  const callable = httpsCallable<
    {
      bookingId: string;
      extraMinutes: number;
    },
    {
      success: boolean;
      extraMinutes: number;
    }
  >(
    functions,
    "requestExtraTime",
  );

  await callable({
    bookingId,
    extraMinutes,
  });
}