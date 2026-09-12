import {
  onCall,
  HttpsError,
} from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { createHash, randomInt } from "node:crypto";

const FUNCTIONS_REGION = "asia-south1";
const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCK_MS = 10 * 60 * 1000;
const MAX_CANCEL_REASON_LENGTH = 500;

type BookingStatus =
  | "pending"
  | "assigned"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_maid_found";

type ExtraTimeStatus = "none" | "requested" | "accepted" | "rejected";

type Booking = {
  customerId?: string;
  maidId?: string | null;
  winningMaidId?: string | null;
  categories?: string[];
  duration?: number;
  scheduledDateTime?: Timestamp | null;
  status?: BookingStatus;
  customerName?: string;
  customerAddress?: {
    formatted?: string;
    landmark?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  totalPrice?: number;
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
  requestExpiresAt?: Timestamp | null;
  startOtpHash?: string | null;
  startOtpAttempts?: number;
  startOtpLockedUntil?: Timestamp | null;
  startOtpUsedAt?: Timestamp | null;
  startedAt?: Timestamp | null;
  completedAt?: Timestamp | null;
  cancelledAt?: Timestamp | null;
  cancellationReason?: string | null;
  extraTimeStatus?: ExtraTimeStatus;
  requestedExtraMinutes?: number | null;
  approvedExtraMinutes?: number | null;
  totalDurationMinutes?: number | null;
  extraTimeRequestedAt?: Timestamp | null;
  billing?: BillingSummary | null;
  paymentStatus?: "pending" | "received";
  paymentMethod?: "cash" | "upi" | null;
  extraTimeRespondedAt?: Timestamp | null;
};

type BillingSummary = {
  baseAmount: number;
  extraTimeMinutes: number;
  extraTimeAmount: number;
  totalAmount: number;
  currency: "INR";
  generatedAt: Timestamp;
};

type MaidRequest = {
  maidId?: string;
  response?: "pending" | "accepted" | "rejected" | "expired";
  distanceMeters?: number | null;
  distanceText?: string | null;
  estimatedTravelSeconds?: number | null;
  etaText?: string | null;
};

const db = getFirestore();
const messaging = getMessaging();

function generateStartOtp(): string {
  return String(randomInt(100000, 1000000));
}

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

function otpMatches(otp: string, hash: string): boolean {
  return hashOtp(otp) === hash;
}

function timestampToDate(
  value: Timestamp | null | undefined,
): Date | null {
  if (!value || typeof value.toDate !== "function") {
    return null;
  }

  return value.toDate();
}

function getAssignedMaidId(booking: Booking): string | null {
  return booking.maidId ?? booking.winningMaidId ?? null;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildBillingSummary(booking: Booking): BillingSummary {
  const baseAmount = Number(booking.totalPrice ?? 0);
  const durationHours = Number(booking.duration ?? 0);
  const extraTimeMinutes = Math.max(
    0,
    Number(booking.approvedExtraMinutes ?? 0),
  );

  if (
    !Number.isFinite(baseAmount) ||
    baseAmount <= 0 ||
    !Number.isFinite(durationHours) ||
    durationHours <= 0
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Booking pricing information is unavailable.",
    );
  }

  const extraTimeAmount = roundMoney(
    (baseAmount / (durationHours * 60)) * extraTimeMinutes,
  );

  return {
    baseAmount: roundMoney(baseAmount),
    extraTimeMinutes,
    extraTimeAmount,
    totalAmount: roundMoney(baseAmount + extraTimeAmount),
    currency: "INR",
    generatedAt: Timestamp.now(),
  };
}

async function sendPush(
  collectionName: "users" | "maids",
  recipientId: string,
  type: string,
  title: string,
  body: string,
  bookingId: string,
): Promise<void> {
  try {
    const snapshot = await db
      .collection(collectionName)
      .doc(recipientId)
      .get();

    if (!snapshot.exists) return;

    const tokens = (snapshot.data()?.fcmTokens as string[] | undefined) ?? [];
    if (!tokens.length) return;

    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { type, bookingId },
    });

    console.info(
      `[BookingLifecycle] Push ${collectionName}/${recipientId}: success=${result.successCount} failure=${result.failureCount}`,
    );
  } catch (error) {
    console.error(
      `[BookingLifecycle] Notification failed for ${collectionName}/${recipientId}:`,
      error,
    );
  }
}

/* -----------------------------------------
 * CONFIRMED BOOKING -> START OTP
 * ----------------------------------------- */

export const handleBookingConfirmed = onDocumentUpdated(
  {
    document: "bookings/{bookingId}",
    region: FUNCTIONS_REGION,
    maxInstances: 10,
  },
  async (event) => {
    const before = event.data?.before.data() as Booking | undefined;
    const after = event.data?.after.data() as Booking | undefined;

    if (!before || !after) return;
    if (before.status === after.status) return;
    if (after.status !== "confirmed") return;

    const bookingId = event.params.bookingId;
    const maidId = getAssignedMaidId(after);
    const customerId = after.customerId;

    if (!maidId || !customerId) {
      console.error(
        "[BookingLifecycle] Confirmed booking missing customer or maid:",
        bookingId,
      );
      return;
    }

    const bookingRef = db.collection("bookings").doc(bookingId);
    const requestRef = bookingRef
      .collection("maidRequests")
      .doc(maidId);
    const secretRef = bookingRef
      .collection("customerSecrets")
      .doc("startOtp");

    let otpCreated = false;
    let generatedOtp = "";

    await db.runTransaction(async (transaction) => {
      const [bookingSnapshot, requestSnapshot] = await Promise.all([
        transaction.get(bookingRef),
        transaction.get(requestRef),
      ]);

      if (!bookingSnapshot.exists) return;

      const current = bookingSnapshot.data() as Booking;

      // The trigger can be delivered after a fast cancellation.
      // Never create a start code for a booking that is no longer confirmed.
      if (
        current.status !== "confirmed" ||
        getAssignedMaidId(current) !== maidId ||
        current.customerId !== customerId
      ) {
        return;
      }

      // Idempotency for retries / duplicate event delivery.
      if (current.startOtpHash) return;

      generatedOtp = generateStartOtp();
      const startOtpHash = hashOtp(generatedOtp);

      const request = requestSnapshot.exists
        ? (requestSnapshot.data() as MaidRequest)
        : null;

      const existingMaidDetails = current.maidDetails ?? {};

      transaction.update(bookingRef, {
        startOtpHash,
        startOtpAttempts: 0,
        startOtpLockedUntil: null,
        startOtpUsedAt: null,
        maidDetails: {
          ...existingMaidDetails,
          distanceMeters: request?.distanceMeters ?? null,
          distanceText: request?.distanceText ?? null,
          etaText: request?.etaText ?? null,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.set(
        secretRef,
        {
          type: "start_otp",
          otp: generatedOtp,
          usedAt: null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: false },
      );

      otpCreated = true;
    });

    if (!otpCreated || !generatedOtp) return;

    await sendPush(
      "users",
      customerId,
      "booking_start_otp",
      "Your HomeHelp start code",
      `Your Help is assigned. Your start code is ${generatedOtp}. Share it only when the Help arrives.`,
      bookingId,
    );
  },
);

/* -----------------------------------------
 * CUSTOMER CANCEL
 * ----------------------------------------- */

export const cancelCustomerBooking = onCall(
  {
    region: FUNCTIONS_REGION,
    maxInstances: 20,
  },
  async (request) => {
    const customerId = request.auth?.uid;

    if (!customerId) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to cancel a booking.",
      );
    }

    const bookingId =
      typeof request.data?.bookingId === "string"
        ? request.data.bookingId.trim()
        : "";

    const reason =
      typeof request.data?.reason === "string"
        ? request.data.reason.trim()
        : "";

    if (!bookingId || !reason) {
      throw new HttpsError(
        "invalid-argument",
        "Booking ID and cancellation reason are required.",
      );
    }

    if (reason.length > MAX_CANCEL_REASON_LENGTH) {
      throw new HttpsError(
        "invalid-argument",
        `Cancellation reason must be ${MAX_CANCEL_REASON_LENGTH} characters or fewer.`,
      );
    }

    const bookingRef = db.collection("bookings").doc(bookingId);

    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(bookingRef);

      if (!snapshot.exists) {
        throw new HttpsError("not-found", "Booking not found.");
      }

      const booking = snapshot.data() as Booking;

      if (booking.customerId !== customerId) {
        throw new HttpsError(
          "permission-denied",
          "You cannot cancel this booking.",
        );
      }

      const allowedStatuses: BookingStatus[] = [
        "pending",
        "assigned",
        "confirmed",
      ];

      if (!allowedStatuses.includes(booking.status as BookingStatus)) {
        throw new HttpsError(
          "failed-precondition",
          "This booking can no longer be cancelled.",
        );
      }

      const scheduledAt = timestampToDate(booking.scheduledDateTime);
      if (!scheduledAt) {
        throw new HttpsError(
          "failed-precondition",
          "Booking time is unavailable.",
        );
      }

      const cancellationCutoff = Date.now() + 60 * 60 * 1000;
      if (scheduledAt.getTime() <= cancellationCutoff) {
        throw new HttpsError(
          "failed-precondition",
          "Cancellation is available only more than 1 hour before the booking time.",
        );
      }

      const maidId = getAssignedMaidId(booking);

      transaction.update(bookingRef, {
        status: "cancelled",
        cancelledAt: FieldValue.serverTimestamp(),
        cancellationReason: reason,
        requestExpiresAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { maidId };
    });

    const requests = await bookingRef.collection("maidRequests").get();
    if (!requests.empty) {
      const batch = db.batch();

      for (const requestDoc of requests.docs) {
        const data = requestDoc.data() as MaidRequest;
        if (data.response === "pending") {
          batch.update(requestDoc.ref, {
            response: "expired",
            responseReason: "Customer cancelled the booking.",
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      await batch.commit();
    }

    if (result.maidId) {
      // Clear the active lock only when it still belongs to this booking.
      const maidRef = db.collection("maids").doc(result.maidId);
      const maidSnapshot = await maidRef.get();

      if (maidSnapshot.exists && maidSnapshot.data()?.activeBookingId === bookingId) {
        await maidRef.update({
          activeBookingId: null,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      await sendPush(
        "maids",
        result.maidId,
        "booking_cancelled",
        "Booking cancelled",
        "The customer has cancelled this booking.",
        bookingId,
      );
    }

    return { success: true };
  },
);

/* -----------------------------------------
 * START JOB WITH OTP
 * ----------------------------------------- */

export const startJobWithOtp = onCall(
  {
    region: FUNCTIONS_REGION,
    maxInstances: 20,
  },
  async (request) => {
    const maidId = request.auth?.uid;

    if (!maidId) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const bookingId =
      typeof request.data?.bookingId === "string"
        ? request.data.bookingId.trim()
        : "";

    const otp =
      typeof request.data?.otp === "string"
        ? request.data.otp.trim()
        : "";

    if (!bookingId || !/^\d{6}$/.test(otp)) {
      throw new HttpsError(
        "invalid-argument",
        "A valid 6-digit start code is required.",
      );
    }

    const bookingRef = db.collection("bookings").doc(bookingId);
    const secretRef = bookingRef.collection("customerSecrets").doc("startOtp");

    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(bookingRef);

      if (!snapshot.exists) {
        throw new HttpsError("not-found", "Booking not found.");
      }

      const booking = snapshot.data() as Booking;

      if (getAssignedMaidId(booking) !== maidId) {
        throw new HttpsError(
          "permission-denied",
          "You are not assigned to this booking.",
        );
      }

      if (booking.status !== "confirmed") {
        if (booking.status === "in_progress") {
          throw new HttpsError(
            "already-exists",
            "This job has already started.",
          );
        }

        throw new HttpsError(
          "failed-precondition",
          "This booking is not ready to start.",
        );
      }

      if (booking.startOtpUsedAt) {
        throw new HttpsError(
          "already-exists",
          "This start code has already been used.",
        );
      }

      const lockedUntil = timestampToDate(booking.startOtpLockedUntil);
      if (lockedUntil && lockedUntil.getTime() > Date.now()) {
        throw new HttpsError(
          "resource-exhausted",
          "Too many incorrect attempts. Try again later.",
        );
      }

      if (!booking.startOtpHash) {
        throw new HttpsError(
          "failed-precondition",
          "Start code is not available.",
        );
      }

      const attempts = Math.max(0, Number(booking.startOtpAttempts ?? 0));

      if (!otpMatches(otp, booking.startOtpHash)) {
        const nextAttempts = attempts + 1;
        const updates: Record<string, unknown> = {
          startOtpAttempts: nextAttempts,
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (nextAttempts >= MAX_OTP_ATTEMPTS) {
          updates.startOtpLockedUntil = Timestamp.fromMillis(
            Date.now() + OTP_LOCK_MS,
          );
        }

        transaction.update(bookingRef, updates);

        return {
          started: false,
          attempts: nextAttempts,
          customerId: booking.customerId ?? null,
        };
      }

      transaction.update(bookingRef, {
        status: "in_progress",
        startedAt: FieldValue.serverTimestamp(),
        startOtpUsedAt: FieldValue.serverTimestamp(),
        startOtpHash: null,
        startOtpAttempts: 0,
        startOtpLockedUntil: null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.update(secretRef, {
        usedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        started: true,
        attempts: 0,
        customerId: booking.customerId ?? null,
      };
    });

    if (!result.started) {
      if (result.attempts >= MAX_OTP_ATTEMPTS) {
        throw new HttpsError(
          "resource-exhausted",
          "Too many incorrect attempts. Start code is locked temporarily.",
        );
      }

      throw new HttpsError("invalid-argument", "Incorrect start code.");
    }

    if (result.customerId) {
      await sendPush(
        "users",
        result.customerId,
        "job_started",
        "Your HomeHelp has started",
        "Your Help has verified the start code and the booked time is now running.",
        bookingId,
      );
    }

    return { success: true };
  },
);

/* -----------------------------------------
 * COMPLETE BOOKING
 * ----------------------------------------- */

export const completeBooking = onCall(
  {
    region: FUNCTIONS_REGION,
    maxInstances: 20,
  },
  async (request) => {
    const maidId = request.auth?.uid;

    if (!maidId) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const bookingId =
      typeof request.data?.bookingId === "string"
        ? request.data.bookingId.trim()
        : "";

    if (!bookingId) {
      throw new HttpsError("invalid-argument", "Booking ID is required.");
    }

    const bookingRef = db.collection("bookings").doc(bookingId);
    const maidRef = db.collection("maids").doc(maidId);

    const result = await db.runTransaction(async (transaction) => {
      const [bookingSnapshot, maidSnapshot] = await Promise.all([
        transaction.get(bookingRef),
        transaction.get(maidRef),
      ]);

      if (!bookingSnapshot.exists) {
        throw new HttpsError("not-found", "Booking not found.");
      }

      const booking = bookingSnapshot.data() as Booking;

      if (getAssignedMaidId(booking) !== maidId) {
        throw new HttpsError(
          "permission-denied",
          "You are not assigned to this booking.",
        );
      }

      if (booking.status !== "in_progress") {
        if (booking.status === "completed") {
          throw new HttpsError(
            "already-exists",
            "This booking has already been completed.",
          );
        }

        throw new HttpsError(
          "failed-precondition",
          "Only an in-progress job can be completed.",
        );
      }

      if (!booking.startedAt || !booking.startOtpUsedAt) {
        throw new HttpsError(
          "failed-precondition",
          "The job has not been started through the start code.",
        );
      }

      const existingBilling = booking.billing ?? null;
      const billing = existingBilling ?? buildBillingSummary(booking);

      transaction.update(bookingRef, {
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        billing,
        paymentStatus: booking.paymentStatus ?? "pending",
        paymentMethod: booking.paymentMethod ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Do not accidentally clear another active booking.
      if (
        maidSnapshot.exists &&
        maidSnapshot.data()?.activeBookingId === bookingId
      ) {
        transaction.update(maidRef, {
          activeBookingId: null,
          isAvailableNow: false,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      return { customerId: booking.customerId ?? null, billing };
    });

    if (result.customerId) {
      await sendPush(
        "users",
        result.customerId,
        "booking_completed",
        "Booking completed",
        "Your HomeHelp booking has been completed. Your bill is ready.",
        bookingId,
      );
    }

    return { success: true };
  },
);

/* -----------------------------------------
 * CUSTOMER EXTRA TIME REQUEST
 * ----------------------------------------- */

export const requestExtraTime = onCall(
  {
    region: FUNCTIONS_REGION,
    maxInstances: 20,
  },
  async (request) => {
    const customerId = request.auth?.uid;

    if (!customerId) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    const bookingId =
      typeof request.data?.bookingId === "string"
        ? request.data.bookingId.trim()
        : "";

    const extraMinutes = request.data?.extraMinutes;

    if (!bookingId) {
      throw new HttpsError("invalid-argument", "bookingId is required.");
    }

    if (
      !Number.isInteger(extraMinutes) ||
      ![30, 60, 120].includes(extraMinutes)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Extra time must be 30, 60, or 120 minutes.",
      );
    }

    const bookingRef = db.collection("bookings").doc(bookingId);

    const result = await db.runTransaction(async (transaction) => {
      const bookingSnapshot = await transaction.get(bookingRef);

      if (!bookingSnapshot.exists) {
        throw new HttpsError("not-found", "Booking not found.");
      }

      const booking = bookingSnapshot.data() as Booking;

      if (booking.customerId !== customerId) {
        throw new HttpsError(
          "permission-denied",
          "You do not own this booking.",
        );
      }

      if (booking.status !== "in_progress") {
        throw new HttpsError(
          "failed-precondition",
          "Extra time can only be requested while the job is in progress.",
        );
      }

      const assignedMaidId = getAssignedMaidId(booking);
      if (!assignedMaidId) {
        throw new HttpsError(
          "failed-precondition",
          "This booking does not have an assigned Help.",
        );
      }

      if ((booking.extraTimeStatus ?? "none") === "requested") {
        throw new HttpsError(
          "failed-precondition",
          "An extra-time request is already waiting for the Help.",
        );
      }

      const startedAt = timestampToDate(booking.startedAt);
      const originalMinutes = Number(booking.duration ?? 0) * 60;

      if (!startedAt || !Number.isFinite(originalMinutes) || originalMinutes <= 0) {
        throw new HttpsError(
          "failed-precondition",
          "Job timing information is unavailable.",
        );
      }

      const elapsedMinutes = (Date.now() - startedAt.getTime()) / 60000;
      if (elapsedMinutes < originalMinutes) {
        throw new HttpsError(
          "failed-precondition",
          "Extra time can only be requested after the booked time is completed.",
        );
      }

      transaction.update(bookingRef, {
        extraTimeStatus: "requested",
        requestedExtraMinutes: extraMinutes,
        extraTimeRequestedAt: FieldValue.serverTimestamp(),
        extraTimeRespondedAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        maidId: assignedMaidId,
        extraMinutes,
      };
    });

    await db
      .collection("maids")
      .doc(result.maidId)
      .collection("notifications")
      .add({
        type: "extra_time_requested",
        bookingId,
        extraMinutes: result.extraMinutes,
        createdAt: FieldValue.serverTimestamp(),
        read: false,
      });

    await sendPush(
      "maids",
      result.maidId,
      "extra_time_requested",
      "Extra time requested",
      `The customer has requested ${result.extraMinutes} minutes of extra time.`,
      bookingId,
    );

    return {
      success: true,
      extraMinutes: result.extraMinutes,
    };
  },
);

/* -----------------------------------------
 * MAID EXTRA TIME RESPONSE
 * ----------------------------------------- */

export const respondToExtraTime = onCall(
  {
    region: FUNCTIONS_REGION,
    maxInstances: 20,
  },
  async (request) => {
    const maidId = request.auth?.uid;

    if (!maidId) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    const bookingId =
      typeof request.data?.bookingId === "string"
        ? request.data.bookingId.trim()
        : "";

    const response = request.data?.response;

    if (!bookingId) {
      throw new HttpsError("invalid-argument", "bookingId is required.");
    }

    if (response !== "accepted" && response !== "rejected") {
      throw new HttpsError(
        "invalid-argument",
        "Invalid extra-time response.",
      );
    }

    const bookingRef = db.collection("bookings").doc(bookingId);

    const result = await db.runTransaction(async (transaction) => {
      const bookingSnapshot = await transaction.get(bookingRef);

      if (!bookingSnapshot.exists) {
        throw new HttpsError("not-found", "Booking not found.");
      }

      const booking = bookingSnapshot.data() as Booking;
      const assignedMaidId = getAssignedMaidId(booking);

      if (assignedMaidId !== maidId) {
        throw new HttpsError(
          "permission-denied",
          "You are not the assigned Help.",
        );
      }

      if (booking.status !== "in_progress") {
        throw new HttpsError(
          "failed-precondition",
          "Extra time is only available for an active job.",
        );
      }

      if (booking.extraTimeStatus !== "requested") {
        throw new HttpsError(
          "failed-precondition",
          "There is no pending extra-time request.",
        );
      }

      const requestedMinutes = Number(
        booking.requestedExtraMinutes ?? 0,
      );

      if (![30, 60, 120].includes(requestedMinutes)) {
        throw new HttpsError(
          "failed-precondition",
          "Extra-time request is invalid.",
        );
      }

      const currentApprovedMinutes = Math.max(
        0,
        Number(booking.approvedExtraMinutes ?? 0),
      );

      const originalMinutes = Number(booking.duration ?? 0) * 60;
      if (!Number.isFinite(originalMinutes) || originalMinutes <= 0) {
        throw new HttpsError(
          "failed-precondition",
          "Booking duration is invalid.",
        );
      }

      if (response === "rejected") {
        transaction.update(bookingRef, {
          extraTimeStatus: "rejected",
          approvedExtraMinutes: currentApprovedMinutes,
          totalDurationMinutes: originalMinutes + currentApprovedMinutes,
          extraTimeRespondedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        return {
          customerId: booking.customerId ?? null,
          requestedMinutes,
          approvedMinutes: currentApprovedMinutes,
        };
      }

      const approvedMinutes = currentApprovedMinutes + requestedMinutes;
      const totalDurationMinutes = originalMinutes + approvedMinutes;

      transaction.update(bookingRef, {
        extraTimeStatus: "accepted",
        approvedExtraMinutes: approvedMinutes,
        totalDurationMinutes,
        extraTimeRespondedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        customerId: booking.customerId ?? null,
        requestedMinutes,
        approvedMinutes,
      };
    });

    if (result.customerId) {
      await db
        .collection("users")
        .doc(result.customerId)
        .collection("notifications")
        .add({
          type:
            response === "accepted"
              ? "extra_time_accepted"
              : "extra_time_rejected",
          bookingId,
          extraMinutes: result.requestedMinutes,
          approvedMinutes: result.approvedMinutes,
          createdAt: FieldValue.serverTimestamp(),
          read: false,
        });

      await sendPush(
        "users",
        result.customerId,
        response === "accepted"
          ? "extra_time_accepted"
          : "extra_time_rejected",
        response === "accepted"
          ? "Extra time approved"
          : "Extra time declined",
        response === "accepted"
          ? `${result.requestedMinutes} minutes of extra time were approved.`
          : "The Help declined your extra-time request.",
        bookingId,
      );
    }

    return {
      success: true,
      response,
      approvedMinutes: result.approvedMinutes,
    };
  },
);
