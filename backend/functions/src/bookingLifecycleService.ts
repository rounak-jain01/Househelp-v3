import {
  onCall,
  HttpsError,
} from "firebase-functions/v2/https";

import {
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

import {
  getMessaging,
} from "firebase-admin/messaging";

import {
  createHash,
  randomInt,
} from "node:crypto";

const INDIA_TIMEZONE =
  "Asia/Kolkata";

const FUNCTIONS_REGION =
  "asia-south1";

const MAX_OTP_ATTEMPTS =
  5;

const OTP_LOCK_MS =
  10 * 60 * 1000;

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

  scheduledDateTime?: Timestamp;

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

  startOtpHash?: string | null;

  startOtpAttempts?: number;

  startOtpLockedUntil?: Timestamp | null;

  startOtpUsedAt?: Timestamp | null;

  startedAt?: Timestamp | null;

  completedAt?: Timestamp | null;

  cancelledAt?: Timestamp | null;

  cancellationReason?: string | null;
};

type MaidRequest = {
  maidId?: string;

  response?:
    | "pending"
    | "accepted"
    | "rejected"
    | "expired";

  distanceMeters?: number | null;

  distanceText?: string | null;

  estimatedTravelSeconds?:
    | number
    | null;

  etaText?: string | null;
};

const db =
  getFirestore();

const messaging =
  getMessaging();

/* -----------------------------------------
 * OTP HELPERS
 * ----------------------------------------- */

function generateStartOtp(): string {
  return String(
    randomInt(
      100000,
      1000000,
    ),
  );
}

function hashOtp(
  otp: string,
): string {
  return createHash(
    "sha256",
  )
    .update(otp)
    .digest("hex");
}

function otpMatches(
  otp: string,
  hash: string,
): boolean {
  return (
    hashOtp(otp) ===
    hash
  );
}

/* -----------------------------------------
 * DATE HELPERS
 * ----------------------------------------- */

function timestampToDate(
  value:
    | Timestamp
    | null
    | undefined,
): Date | null {
  if (!value) {
    return null;
  }

  if (
    typeof value.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  return null;
}

/* -----------------------------------------
 * PUSH HELPER
 * ----------------------------------------- */

async function sendPush(
  collectionName:
    | "users"
    | "maids",

  recipientId: string,

  type: string,

  title: string,

  body: string,

  bookingId: string,
): Promise<void> {
  try {
    const snapshot =
      await db
        .collection(
          collectionName,
        )
        .doc(recipientId)
        .get();

    if (
      !snapshot.exists
    ) {
      return;
    }

    const tokens =
      (snapshot.data()
        ?.fcmTokens as
        | string[]
        | undefined) ??
      [];

    if (!tokens.length) {
      return;
    }

    await messaging.sendEachForMulticast(
      {
        tokens,

        notification: {
          title,
          body,
        },

        data: {
          type,
          bookingId,
        },
      },
    );
  } catch (error) {
    console.error(
      `[BookingLifecycle] Notification failed for ${collectionName}/${recipientId}:`,
      error,
    );
  }
}

/* -----------------------------------------
 * CONFIRMED BOOKING
 * ----------------------------------------- */

/**
 * When assignment changes a booking to CONFIRMED:
 *
 * 1. Generate a 6-digit start OTP.
 * 2. Store only its SHA-256 hash on booking.
 * 3. Store plaintext OTP in customer-only secret.
 * 4. Copy distance / ETA from winning maid request.
 * 5. Notify customer.
 *
 * This is intentionally separate from the assignment
 * transaction so the existing assignment flow remains
 * stable.
 */
export const handleBookingConfirmed =
  onDocumentUpdated(
    {
      document:
        "bookings/{bookingId}",

      region:
        FUNCTIONS_REGION,

      maxInstances: 10,
    },

    async (event) => {
      const before =
        event.data?.before.data() as
          | Booking
          | undefined;

      const after =
        event.data?.after.data() as
          | Booking
          | undefined;

      if (
        !before ||
        !after
      ) {
        return;
      }

      if (
        before.status ===
          after.status
      ) {
        return;
      }

      if (
        after.status !==
        "confirmed"
      ) {
        return;
      }

      const bookingId =
        event.params.bookingId;

      const maidId =
        after.winningMaidId ??
        after.maidId;

      const customerId =
        after.customerId;

      if (
        !maidId ||
        !customerId
      ) {
        console.error(
          "[BookingLifecycle] Confirmed booking missing maid/customer:",
          bookingId,
        );

        return;
      }

      /*
       * Generate once. If the event is retried,
       * transaction will detect existing hash.
       */
      const startOtp =
        generateStartOtp();

      const startOtpHash =
        hashOtp(startOtp);

      let created =
        false;

      await db.runTransaction(
        async (
          transaction,
        ) => {
          const bookingRef =
            db
              .collection("bookings")
              .doc(bookingId);

          const bookingSnapshot =
            await transaction.get(
              bookingRef,
            );

          if (
            !bookingSnapshot.exists
          ) {
            return;
          }

          const current =
            bookingSnapshot.data() as Booking;

          /*
           * Another invocation may have already
           * generated the OTP.
           */
          if (
            current.startOtpHash
          ) {
            return;
          }

          /*
           * Pull route information from the winning
           * maid request.
           */
          const requestRef =
            bookingRef
              .collection(
                "maidRequests",
              )
              .doc(maidId);

          const requestSnapshot =
            await transaction.get(
              requestRef,
            );

          const request =
            requestSnapshot.exists
              ? (requestSnapshot.data() as MaidRequest)
              : null;

          const existingMaidDetails =
            current.maidDetails ??
            {};

          transaction.update(
            bookingRef,
            {
              startOtpHash:
                startOtpHash,

              startOtpAttempts:
                0,

              startOtpLockedUntil:
                null,

              startOtpUsedAt:
                null,

              maidDetails: {
                ...existingMaidDetails,

                distanceMeters:
                  request
                    ?.distanceMeters ??
                  null,

                distanceText:
                  request
                    ?.distanceText ??
                  null,

                etaText:
                  request
                    ?.etaText ??
                  null,
              },

              updatedAt:
                FieldValue.serverTimestamp(),
            },
          );

          const secretRef =
            bookingRef
              .collection(
                "customerSecrets",
              )
              .doc("startOtp");

          transaction.set(
            secretRef,
            {
              type:
                "start_otp",

              otp:
                startOtp,

              usedAt:
                null,

              createdAt:
                FieldValue.serverTimestamp(),

              updatedAt:
                FieldValue.serverTimestamp(),
            },
          );

          created =
            true;
        },
      );

      if (!created) {
        return;
      }

      /*
       * Send OTP to customer's registered
       * FCM devices.
       */
      await sendPush(
        "users",

        customerId,

        "booking_start_otp",

        "Your HomeHelp start code",

        `Your Help is assigned. Your start code is ${startOtp}. Share it only when the Help arrives.`,

        bookingId,
      );
    },
  );

/* -----------------------------------------
 * CUSTOMER CANCEL
 * ----------------------------------------- */

export const cancelCustomerBooking =
  onCall(
    {
      region:
        FUNCTIONS_REGION,

      maxInstances: 20,
    },

    async (
      request,
    ) => {
      const customerId =
        request.auth?.uid;

      if (!customerId) {
        throw new HttpsError(
          "unauthenticated",
          "You must be signed in to cancel a booking.",
        );
      }

      const bookingId =
        typeof request.data
          ?.bookingId ===
        "string"
          ? request.data
              .bookingId.trim()
          : "";

      const reason =
        typeof request.data
          ?.reason ===
        "string"
          ? request.data.reason.trim()
          : "";

      if (
        !bookingId ||
        !reason
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Booking ID and cancellation reason are required.",
        );
      }

      const bookingRef =
        db
          .collection(
            "bookings",
          )
          .doc(bookingId);

      let cancelled =
        false;

      let maidId:
        | string
        | null = null;

      await db.runTransaction(
        async (
          transaction,
        ) => {
          const snapshot =
            await transaction.get(
              bookingRef,
            );

          if (
            !snapshot.exists
          ) {
            throw new HttpsError(
              "not-found",
              "Booking not found.",
            );
          }

          const booking =
            snapshot.data() as Booking;

          if (
            booking.customerId !==
            customerId
          ) {
            throw new HttpsError(
              "permission-denied",
              "You cannot cancel this booking.",
            );
          }

          const allowedStatuses:
            BookingStatus[] = [
              "pending",
              "assigned",
              "confirmed",
            ];

          if (
            !allowedStatuses.includes(
              booking.status as BookingStatus,
            )
          ) {
            throw new HttpsError(
              "failed-precondition",
              "This booking can no longer be cancelled.",
            );
          }

          const scheduledAt =
            timestampToDate(
              booking.scheduledDateTime,
            );

          if (!scheduledAt) {
            throw new HttpsError(
              "failed-precondition",
              "Booking time is unavailable.",
            );
          }

          const cancellationDeadline =
            Date.now() +
            60 *
              60 *
              1000;

          if (
            scheduledAt.getTime() <=
            cancellationDeadline
          ) {
            throw new HttpsError(
              "failed-precondition",
              "Cancellation is available only more than 1 hour before the booking time.",
            );
          }

          maidId =
            booking.maidId ??
            booking.winningMaidId ??
            null;

          transaction.update(
            bookingRef,
            {
              status:
                "cancelled",

              cancelledAt:
                FieldValue.serverTimestamp(),

              cancellationReason:
                reason,

              requestExpiresAt:
                null,

              updatedAt:
                FieldValue.serverTimestamp(),
            },
          );

          cancelled =
            true;
        },
      );

      /*
       * Expire outstanding requests.
       */
      if (cancelled) {
        const requests =
          await bookingRef
            .collection(
              "maidRequests",
            )
            .get();

        const batch =
          db.batch();

        for (
          const requestDoc of
            requests.docs
        ) {
          const data =
            requestDoc.data() as MaidRequest;

          if (
            data.response ===
            "pending"
          ) {
            batch.update(
              requestDoc.ref,
              {
                response:
                  "expired",

                responseReason:
                  "Customer cancelled the booking.",

                updatedAt:
                  FieldValue.serverTimestamp(),
              },
            );
          }
        }

        await batch.commit();
      }

      if (
        cancelled &&
        maidId
      ) {
        await sendPush(
          "maids",

          maidId,

          "booking_cancelled",

          "Booking cancelled",

          "The customer has cancelled this booking.",

          bookingId,
        );
      }

      return {
        success:
          true,
      };
    },
  );

/* -----------------------------------------
 * START JOB WITH OTP
 * ----------------------------------------- */

export const startJobWithOtp =
  onCall(
    {
      region:
        FUNCTIONS_REGION,

      maxInstances: 20,
    },

    async (
      request,
    ) => {
      const maidId =
        request.auth?.uid;

      if (!maidId) {
        throw new HttpsError(
          "unauthenticated",
          "You must be signed in.",
        );
      }

      const bookingId =
        typeof request.data
          ?.bookingId ===
        "string"
          ? request.data
              .bookingId.trim()
          : "";

      const otp =
        typeof request.data
          ?.otp ===
        "string"
          ? request.data.otp.trim()
          : "";

      if (
        !bookingId ||
        !/^\d{6}$/.test(otp)
      ) {
        throw new HttpsError(
          "invalid-argument",
          "A valid 6-digit start code is required.",
        );
      }

      const bookingRef =
        db
          .collection(
            "bookings",
          )
          .doc(bookingId);

      let customerId:
        | string
        | null = null;

      let started =
        false;

      const result =
        await db.runTransaction(
          async (
            transaction,
          ) => {
            const snapshot =
              await transaction.get(
                bookingRef,
              );

            if (
              !snapshot.exists
            ) {
              throw new HttpsError(
                "not-found",
                "Booking not found.",
              );
            }

            const booking =
              snapshot.data() as Booking;

            if (
              booking.maidId !==
              maidId &&
              booking.winningMaidId !==
              maidId
            ) {
              throw new HttpsError(
                "permission-denied",
                "You are not assigned to this booking.",
              );
            }

            if (
              booking.status !==
              "confirmed"
            ) {
              if (
                booking.status ===
                "in_progress"
              ) {
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

            if (
              booking.startOtpUsedAt
            ) {
              throw new HttpsError(
                "already-exists",
                "This start code has already been used.",
              );
            }

            const lockedUntil =
              booking.startOtpLockedUntil
                ? timestampToDate(
                    booking.startOtpLockedUntil,
                  )
                : null;

            if (
              lockedUntil &&
              lockedUntil.getTime() >
                Date.now()
            ) {
              throw new HttpsError(
                "resource-exhausted",
                "Too many incorrect attempts. Try again later.",
              );
            }

            if (
              !booking.startOtpHash
            ) {
              throw new HttpsError(
                "failed-precondition",
                "Start code is not available.",
              );
            }

            const attempts =
              booking.startOtpAttempts ??
              0;

            if (
              !otpMatches(
                otp,
                booking.startOtpHash,
              )
            ) {
              const nextAttempts =
                attempts + 1;

              const updates: Record<
                string,
                unknown
              > = {
                startOtpAttempts:
                  nextAttempts,

                updatedAt:
                  FieldValue.serverTimestamp(),
              };

              if (
                nextAttempts >=
                MAX_OTP_ATTEMPTS
              ) {
                updates.startOtpLockedUntil =
                  Timestamp.fromMillis(
                    Date.now() +
                      OTP_LOCK_MS,
                  );
              }

              transaction.update(
                bookingRef,
                updates,
              );

              return {
                started:
                  false,

                attempts:
                  nextAttempts,
              };
            }

            customerId =
              booking.customerId ??
              null;

            transaction.update(
              bookingRef,
              {
                status:
                  "in_progress",

                startedAt:
                  FieldValue.serverTimestamp(),

                startOtpUsedAt:
                  FieldValue.serverTimestamp(),

                startOtpHash:
                  null,

                startOtpAttempts:
                  0,

                startOtpLockedUntil:
                  null,

                updatedAt:
                  FieldValue.serverTimestamp(),
              },
            );

            const secretRef =
              bookingRef
                .collection(
                  "customerSecrets",
                )
                .doc("startOtp");

            transaction.update(
              secretRef,
              {
                usedAt:
                  FieldValue.serverTimestamp(),

                updatedAt:
                  FieldValue.serverTimestamp(),
              },
            );

            started =
              true;

            return {
              started:
                true,

              attempts:
                0,
            };
          },
        );

      if (
        !result.started
      ) {
        if (
          result.attempts >=
          MAX_OTP_ATTEMPTS
        ) {
          throw new HttpsError(
            "resource-exhausted",
            "Too many incorrect attempts. Start code is locked temporarily.",
          );
        }

        throw new HttpsError(
          "invalid-argument",
          "Incorrect start code.",
        );
      }

      if (
        started &&
        customerId
      ) {
        await sendPush(
          "users",

          customerId,

          "job_started",

          "Your HomeHelp has started",

          "Your Help has verified the start code and the booked time is now running.",

          bookingId,
        );
      }

      return {
        success:
          true,
      };
    },
  );

/* -----------------------------------------
 * COMPLETE BOOKING
 * ----------------------------------------- */

export const completeBooking =
  onCall(
    {
      region:
        FUNCTIONS_REGION,

      maxInstances: 20,
    },

    async (
      request,
    ) => {
      const maidId =
        request.auth?.uid;

      if (!maidId) {
        throw new HttpsError(
          "unauthenticated",
          "You must be signed in.",
        );
      }

      const bookingId =
        typeof request.data
          ?.bookingId ===
        "string"
          ? request.data
              .bookingId.trim()
          : "";

      if (!bookingId) {
        throw new HttpsError(
          "invalid-argument",
          "Booking ID is required.",
        );
      }

      const bookingRef =
        db
          .collection(
            "bookings",
          )
          .doc(bookingId);

      let customerId:
        | string
        | null = null;

      await db.runTransaction(
        async (
          transaction,
        ) => {
          const snapshot =
            await transaction.get(
              bookingRef,
            );

          if (
            !snapshot.exists
          ) {
            throw new HttpsError(
              "not-found",
              "Booking not found.",
            );
          }

          const booking =
            snapshot.data() as Booking;

          if (
            booking.maidId !==
              maidId &&
            booking.winningMaidId !==
              maidId
          ) {
            throw new HttpsError(
              "permission-denied",
              "You are not assigned to this booking.",
            );
          }

          if (
            booking.status !==
            "in_progress"
          ) {
            throw new HttpsError(
              "failed-precondition",
              "Only an in-progress job can be completed.",
            );
          }

          customerId =
            booking.customerId ??
            null;

          transaction.update(
            bookingRef,
            {
              status:
                "completed",

              completedAt:
                FieldValue.serverTimestamp(),

              updatedAt:
                FieldValue.serverTimestamp(),
            },
          );

          const maidRef =
            db
              .collection(
                "maids",
              )
              .doc(maidId);

          transaction.update(
            maidRef,
            {
              activeBookingId:
                null,

              updatedAt:
                FieldValue.serverTimestamp(),
            },
          );
        },
      );

      if (
        customerId
      ) {
        await sendPush(
          "users",

          customerId,

          "booking_completed",

          "Booking completed",

          "Your HomeHelp booking has been completed.",

          bookingId,
        );
      }

      return {
        success:
          true,
      };
    },
  );


export const requestExtraTime = onCall(
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in.",
      );
    }

    const {
      bookingId,
      extraMinutes,
    } = request.data ?? {};

    if (
      typeof bookingId !== "string" ||
      !bookingId.trim()
    ) {
      throw new HttpsError(
        "invalid-argument",
        "bookingId is required.",
      );
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

    const db = getFirestore();

    const bookingRef = db
      .collection("bookings")
      .doc(bookingId);

    const result = await db.runTransaction(
      async (transaction) => {
        const bookingSnapshot =
          await transaction.get(
            bookingRef,
          );

        if (!bookingSnapshot.exists) {
          throw new HttpsError(
            "not-found",
            "Booking not found.",
          );
        }

        const booking =
          bookingSnapshot.data() ?? {};

        if (
          booking.customerId !==
          request.auth!.uid
        ) {
          throw new HttpsError(
            "permission-denied",
            "You do not own this booking.",
          );
        }

        if (
          booking.status !==
          "in_progress"
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Extra time can only be requested while the job is in progress.",
          );
        }

        const existingStatus =
          booking.extraTimeStatus ??
          "none";

        if (
          existingStatus === "requested"
        ) {
          throw new HttpsError(
            "failed-precondition",
            "An extra-time request is already waiting for the Help.",
          );
        }

        const startedAt =
          booking.startedAt?.toDate?.();

        const originalMinutes =
          Number(
            booking.duration ?? 0,
          ) * 60;

        if (
          !startedAt ||
          !originalMinutes
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Job timing information is unavailable.",
          );
        }

        const elapsedMinutes =
          (Date.now() -
            startedAt.getTime()) /
          60000;

        if (
          elapsedMinutes <
          originalMinutes
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Extra time can only be requested after the booked time is completed.",
          );
        }

        transaction.update(
          bookingRef,
          {
            extraTimeStatus:
              "requested",

            requestedExtraMinutes:
              extraMinutes,

            extraTimeRequestedAt:
              FieldValue.serverTimestamp(),

            extraTimeRespondedAt:
              null,
          },
        );

        return {
          maidId:
            booking.maidId ??
            booking.winningMaidId ??
            null,
          extraMinutes,
        };
      },
    );

    if (result.maidId) {
      await db
        .collection("maids")
        .doc(result.maidId)
        .collection("notifications")
        .add({
          type: "extra_time_requested",
          bookingId,
          extraMinutes:
            result.extraMinutes,
          createdAt:
            FieldValue.serverTimestamp(),
          read: false,
        });
    }

    return {
      success: true,
      extraMinutes:
        result.extraMinutes,
    };
  },
);

export const respondToExtraTime = onCall(
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in.",
      );
    }

    const {
      bookingId,
      response,
    } = request.data ?? {};

    if (
      typeof bookingId !== "string" ||
      !bookingId.trim()
    ) {
      throw new HttpsError(
        "invalid-argument",
        "bookingId is required.",
      );
    }

    if (
      response !== "accepted" &&
      response !== "rejected"
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid extra-time response.",
      );
    }

    const db = getFirestore();

    const bookingRef = db
      .collection("bookings")
      .doc(bookingId);

    const result = await db.runTransaction(
      async (transaction) => {
        const bookingSnapshot =
          await transaction.get(
            bookingRef,
          );

        if (!bookingSnapshot.exists) {
          throw new HttpsError(
            "not-found",
            "Booking not found.",
          );
        }

        const booking =
          bookingSnapshot.data() ?? {};

        const assignedMaidId =
          booking.maidId ??
          booking.winningMaidId ??
          null;

        if (
          assignedMaidId !==
          request.auth!.uid
        ) {
          throw new HttpsError(
            "permission-denied",
            "You are not the assigned Help.",
          );
        }

        if (
          booking.status !==
          "in_progress"
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Extra time is only available for an active job.",
          );
        }

        if (
          booking.extraTimeStatus !==
          "requested"
        ) {
          throw new HttpsError(
            "failed-precondition",
            "There is no pending extra-time request.",
          );
        }

        const requestedMinutes =
          Number(
            booking.requestedExtraMinutes ??
              0,
          );

        if (
          ![30, 60, 120].includes(
            requestedMinutes,
          )
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Extra-time request is invalid.",
          );
        }

        if (
          response === "rejected"
        ) {
          transaction.update(
            bookingRef,
            {
              extraTimeStatus:
                "rejected",

              approvedExtraMinutes: 0,

              extraTimeRespondedAt:
                FieldValue.serverTimestamp(),
            },
          );

          return {
            customerId:
              booking.customerId,
            requestedMinutes,
            approvedMinutes: 0,
          };
        }

        const existingExtraMinutes =
          Number(
            booking.approvedExtraMinutes ??
              0,
          );

        const approvedMinutes =
          existingExtraMinutes +
          requestedMinutes;

        transaction.update(
          bookingRef,
          {
            extraTimeStatus:
              "accepted",

            approvedExtraMinutes:
              approvedMinutes,

            totalDurationMinutes:
              Number(
                booking.duration ?? 0,
              ) *
                60 +
              approvedMinutes,

            extraTimeRespondedAt:
              FieldValue.serverTimestamp(),
          },
        );

        return {
          customerId:
            booking.customerId,
          requestedMinutes,
          approvedMinutes,
        };
      },
    );

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

          extraMinutes:
            result.requestedMinutes,

          approvedMinutes:
            result.approvedMinutes,

          createdAt:
            FieldValue.serverTimestamp(),

          read: false,
        });
    }

    return {
      success: true,
      response,
      approvedMinutes:
        result.approvedMinutes,
    };
  },
);