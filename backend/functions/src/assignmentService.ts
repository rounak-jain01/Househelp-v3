import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const GOOGLE_MAPS_API_KEY = defineSecret('GOOGLE_MAPS_API_KEY');

const INDIA_TIMEZONE = 'Asia/Kolkata';
const RESPONSE_WINDOW_MS = 3 * 60 * 1000;

type BookingStatus =
  | 'pending'
  | 'assigned'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_maid_found';

type AvailabilitySlot = {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
};

type AvailabilityOverride = {
  mode?: 'on' | 'off';
  expiresAt?: Timestamp | { toDate?: () => Date } | null;
} | 'manual_on' | 'manual_off' | null;

type Maid = {
  maidId: string;
  name?: string;
  phoneNumber?: string;
  photoUrl?: string;
  verificationStatus?: string;
  serviceCategories?: string[];
  serviceArea?: string;
  isAvailableNow?: boolean;
  availabilitySlots?: AvailabilitySlot[];
  availabilityOverride?: AvailabilityOverride;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  activeBookingId?: string | null;
  assignmentVersion?: number;
};

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
  offeredMaidIds?: string[];
  maidResponses?: Record<string, string>;
  requestExpiresAt?: Timestamp | null;
  createdAt?: Timestamp;
  assignmentClaimedAt?: Timestamp;
  assignmentClaimToken?: string;
};

type MaidRequest = {
  bookingId: string;
  maidId: string;
  response?: 'pending' | 'accepted' | 'rejected' | 'expired';
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
  scheduledDateTime?: Timestamp;
  totalPrice?: number;
  distanceMeters?: number | null;
  estimatedTravelSeconds?: number | null;
  requestExpiresAt?: Timestamp;
};

const db = getFirestore();
const messaging = getMessaging();

function indiaParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const value = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? '';

  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}`,
  };
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function getBookingRange(booking: Booking) {
  if (!booking.scheduledDateTime) return null;

  const start = booking.scheduledDateTime.toDate();
  const durationHours = Number(booking.duration ?? 0);

  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    return null;
  }

  const end = new Date(
    start.getTime() + durationHours * 60 * 60 * 1000,
  );

  const startParts = indiaParts(start);
  const endParts = indiaParts(end);

  return {
    start,
    end,
    startDate: startParts.date,
    startTime: startParts.time,
    endDate: endParts.date,
    endTime: endParts.time,
  };
}

function slotCoversBooking(
  booking: Booking,
  slot: AvailabilitySlot,
): boolean {
  const range = getBookingRange(booking);
  if (!range) return false;

  if (
    range.startDate !== slot.date ||
    range.endDate !== slot.date
  ) {
    return false;
  }

  const bookingStart = timeToMinutes(range.startTime);
  const bookingEnd = timeToMinutes(range.endTime);
  const slotStart = timeToMinutes(slot.startTime);
  const slotEnd = timeToMinutes(slot.endTime);

  return bookingStart >= slotStart && bookingEnd <= slotEnd;
}

function overrideMode(
  value: AvailabilityOverride | undefined,
): 'on' | 'off' | null {
  if (!value) return null;

  if (value === 'manual_on') return 'on';
  if (value === 'manual_off') return 'off';

  if (typeof value === 'object') {
    return value.mode ?? null;
  }

  return null;
}

function overrideIsActive(
  value: AvailabilityOverride | undefined,
  now: Date,
): boolean {
  if (!value) return false;
  if (typeof value === 'string') return true;

  const expiresAt = value.expiresAt;

  if (!expiresAt) return true;

  if (typeof expiresAt.toDate === 'function') {
    return expiresAt.toDate().getTime() > now.getTime();
  }

  return true;
}

function maidMatchesBooking(
  maid: Maid,
  booking: Booking,
): boolean {
  const requested = booking.categories ?? [];
  const supported = maid.serviceCategories ?? [];

  return (
    requested.length > 0 &&
    requested.every((category) =>
      supported.includes(category),
    )
  );
}

function maidIsAvailable(
  maid: Maid,
  booking: Booking,
): boolean {
  const now = new Date();
  const mode = overrideMode(
    maid.availabilityOverride,
  );

  if (
    mode === 'off' &&
    overrideIsActive(
      maid.availabilityOverride,
      now,
    )
  ) {
    return false;
  }

  if (
    mode === 'on' &&
    overrideIsActive(
      maid.availabilityOverride,
      now,
    )
  ) {
    return true;
  }

  const slots = maid.availabilitySlots ?? [];

  if (
    slots.some((slot) =>
      slotCoversBooking(booking, slot),
    )
  ) {
    return true;
  }

  const range = getBookingRange(booking);

  if (!range || range.start.getTime() <= now.getTime()) {
    return false;
  }

  const hoursAway =
    (range.start.getTime() - now.getTime()) /
    (60 * 60 * 1000);

  return hoursAway <= 4 &&
    maid.isAvailableNow === true;
}

async function hasExistingConflict(
  maidId: string,
  booking: Booking,
): Promise<boolean> {
  const range = getBookingRange(booking);
  if (!range) return true;

  const snapshot = await db
    .collection('bookings')
    .where('maidId', '==', maidId)
    .get();

  const activeStatuses: BookingStatus[] = [
    'assigned',
    'confirmed',
    'in_progress',
  ];

  for (const item of snapshot.docs) {
    const existing = item.data() as Booking;

    if (
      !activeStatuses.includes(
        existing.status as BookingStatus,
      )
    ) {
      continue;
    }

    const existingRange = getBookingRange(existing);
    if (!existingRange) continue;

    const overlaps =
      range.start.getTime() <
        existingRange.end.getTime() &&
      range.end.getTime() >
        existingRange.start.getTime();

    if (overlaps) return true;
  }

  return false;
}

async function sendPushToMaid(
  maidId: string,
  bookingId: string,
): Promise<void> {
  try {
    const snapshot = await db
      .collection('maids')
      .doc(maidId)
      .get();

    if (!snapshot.exists) return;

    const tokens =
      (snapshot.data()?.fcmTokens as string[] | undefined) ??
      [];

    if (!tokens.length) return;

    for (let i = 0; i < tokens.length; i += 500) {
      const chunk = tokens.slice(i, i + 500);

      const result =
        await messaging.sendEachForMulticast({
          tokens: chunk,
          notification: {
            title: 'New booking request',
            body:
              'A customer nearby needs your help. Open the request to accept or reject.',
          },
          data: {
            type: 'booking_request',
            bookingId,
          },
        });

      console.log(
        `[Assignment] booking request push maid=${maidId} tokenCount=${chunk.length} success=${result.successCount} failure=${result.failureCount}`,
      );
    }
  } catch (error) {
    console.error(
      `[Assignment] Failed push for maid ${maidId}:`,
      error,
    );
  }
}

function calculateHaversineDistance(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
): number | null {
  const values = [
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude,
  ];

  if (!values.every((value) => Number.isFinite(value))) {
    return null;
  }

  if (
    Math.abs(origin.latitude) > 90 ||
    Math.abs(destination.latitude) > 90 ||
    Math.abs(origin.longitude) > 180 ||
    Math.abs(destination.longitude) > 180
  ) {
    return null;
  }

  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) =>
    (degrees * Math.PI) / 180;

  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);
  const deltaLat = toRadians(
    destination.latitude - origin.latitude,
  );
  const deltaLon = toRadians(
    destination.longitude - origin.longitude,
  );

  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);

  const a =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  const clampedA = Math.min(1, Math.max(0, a));

  return (
    2 *
    earthRadiusMeters *
    Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA))
  );
}

async function calculateDrivingDistance(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
): Promise<{
  distanceMeters: number | null;
  estimatedTravelSeconds: number | null;
}> {
  const fallbackDistance = calculateHaversineDistance(
    origin,
    destination,
  );

  const fallback =
    fallbackDistance != null
      ? {
          distanceMeters: fallbackDistance,
          estimatedTravelSeconds:
            fallbackDistance / 8.33, // ~30 km/h conservative fallback
        }
      : {
          distanceMeters: null,
          estimatedTravelSeconds: null,
        };

  const key = GOOGLE_MAPS_API_KEY.value();

  if (!key) {
    return fallback;
  }

  try {
    const response = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask':
            'routes.distanceMeters,routes.duration',
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: origin.latitude,
                longitude: origin.longitude,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.latitude,
                longitude: destination.longitude,
              },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: false,
          languageCode: 'en-IN',
          units: 'METRIC',
        }),
      },
    );

    if (!response.ok) {
      console.error(
        '[Assignment] Routes API error:',
        response.status,
        await response.text(),
      );
      return fallback;
    }

    const body = (await response.json()) as {
      routes?: Array<{
        distanceMeters?: number;
        duration?: string;
      }>;
    };

    const route = body.routes?.[0];

    if (!route) {
      return fallback;
    }

    const seconds = route.duration
      ? Number.parseFloat(route.duration.replace(/s$/, ''))
      : null;

    return {
      distanceMeters:
        typeof route.distanceMeters === 'number'
          ? route.distanceMeters
          : fallback.distanceMeters,
      estimatedTravelSeconds:
        Number.isFinite(seconds ?? NaN)
          ? seconds
          : fallback.estimatedTravelSeconds,
    };
  } catch (error) {
    console.error('[Assignment] Distance calculation failed:', error);
    return fallback;
  }
}

function buildRequestTexts(
  distanceMeters: number | null,
  estimatedTravelSeconds: number | null,
) {
  const distanceText =
    typeof distanceMeters === 'number'
      ? distanceMeters < 1000
        ? `${Math.round(distanceMeters)} m`
        : `${(distanceMeters / 1000).toFixed(1)} km`
      : 'Distance unavailable';

  const etaText =
    typeof estimatedTravelSeconds === 'number'
      ? `${Math.max(
          1,
          Math.round(estimatedTravelSeconds / 60),
        )} min`
      : 'ETA unavailable';

  return {
    distanceText,
    etaText,
  };
}

async function createMaidRequest(
  bookingId: string,
  booking: Booking,
  maid: Maid,
  expiresAt: Timestamp,
): Promise<void> {
  const destination =
    booking.customerAddress?.latitude != null &&
    booking.customerAddress?.longitude != null
      ? {
          latitude: booking.customerAddress.latitude,
          longitude: booking.customerAddress.longitude,
        }
      : null;

  let distanceMeters: number | null = null;
  let estimatedTravelSeconds: number | null = null;

  if (
    destination &&
    maid.currentLocation &&
    Number.isFinite(maid.currentLocation.latitude) &&
    Number.isFinite(maid.currentLocation.longitude)
  ) {
    const result =
      await calculateDrivingDistance(
        maid.currentLocation,
        destination,
      );

    distanceMeters = result.distanceMeters;
    estimatedTravelSeconds =
      result.estimatedTravelSeconds;
  }

  const requestRef = db
    .collection('bookings')
    .doc(bookingId)
    .collection('maidRequests')
    .doc(maid.maidId);

  await requestRef.set({
    bookingId,
    maidId: maid.maidId,
    response: 'pending',
    responseReason: null,

    customerName: booking.customerName ?? '',
    customerAddress: {
      formatted:
        booking.customerAddress?.formatted ?? '',
      landmark:
        booking.customerAddress?.landmark ?? '',
    },
    customerLatitude:
      booking.customerAddress?.latitude ?? null,
    customerLongitude:
      booking.customerAddress?.longitude ?? null,

    categories: booking.categories ?? [],
    duration: booking.duration ?? 0,
    scheduledDateTime:
      booking.scheduledDateTime ?? null,
    totalPrice: booking.totalPrice ?? 0,

    distanceMeters,
    estimatedTravelSeconds,
    ...buildRequestTexts(
      distanceMeters,
      estimatedTravelSeconds,
    ),

    requestExpiresAt: expiresAt,

    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await sendPushToMaid(
    maid.maidId,
    bookingId,
  );
}

/**
 * New booking:
 * Find ALL currently eligible maids and create a request for
 * every one of them at the same time.
 */
export const dispatchBookingRequests = onDocumentCreated(
  {
    document: 'bookings/{bookingId}',
    region: 'asia-south1',
    maxInstances: 10,
    secrets: [GOOGLE_MAPS_API_KEY],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const bookingId = snapshot.id;
    const bookingRef = snapshot.ref;

    /*
     * Firestore triggers are at-least-once. Claim the dispatch in a
     * transaction so a duplicate trigger cannot create multiple request
     * waves for the same booking.
     */
    const claimed = await db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(bookingRef);

      if (!currentSnapshot.exists) return null;

      const booking = currentSnapshot.data() as Booking;

      if (
        booking.status !== 'pending' ||
        !booking.customerId ||
        booking.assignmentClaimToken
      ) {
        return null;
      }

      const now = FieldValue.serverTimestamp();
      const claimToken = `${bookingId}:${Date.now()}`;

      transaction.update(bookingRef, {
        assignmentClaimedAt: now,
        assignmentClaimToken: claimToken,
        updatedAt: now,
      });

      return {
        ...(booking as Booking),
        assignmentClaimToken: claimToken,
      };
    });

    if (!claimed) return;

    const maidSnapshot =
      await db.collection('maids').get();

    const eligible: Maid[] = [];

    for (const maidDoc of maidSnapshot.docs) {
      const maid = {
        ...(maidDoc.data() as Maid),
        maidId: maidDoc.id,
      };

      if (maid.verificationStatus !== 'verified') {
        continue;
      }

      if (!maidMatchesBooking(maid, claimed)) {
        continue;
      }

      if (!maidIsAvailable(maid, claimed)) {
        continue;
      }

      if (
        await hasExistingConflict(
          maid.maidId,
          claimed,
        )
      ) {
        continue;
      }

      eligible.push(maid);
    }

    if (!eligible.length) {
      await db.runTransaction(async (transaction) => {
        const current = await transaction.get(bookingRef);
        if (!current.exists) return;

        const currentBooking =
          current.data() as Booking;

        if (
          currentBooking.status !== 'pending' ||
          currentBooking.winningMaidId
        ) {
          return;
        }

        transaction.update(bookingRef, {
          status: 'no_maid_found',
          assignmentError:
            'No eligible maid is available for this booking.',
          offeredMaidIds: [],
          maidResponses: {},
          requestExpiresAt: null,
          assignmentClaimedAt: FieldValue.delete(),
          assignmentClaimToken: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      return;
    }

    const expiresAt = Timestamp.fromMillis(
      Date.now() + RESPONSE_WINDOW_MS,
    );

    /*
     * Move to assigned atomically after eligibility is calculated. If a
     * duplicate delivery somehow reaches this point, it cannot overwrite
     * a booking that has already moved to another lifecycle state.
     */
    const assigned = await db.runTransaction(async (transaction) => {
      const current = await transaction.get(bookingRef);

      if (!current.exists) return false;

      const currentBooking =
        current.data() as Booking;

      if (
        currentBooking.status !== 'pending' ||
        currentBooking.assignmentClaimToken !==
          claimed.assignmentClaimToken ||
        currentBooking.winningMaidId
      ) {
        return false;
      }

      transaction.update(bookingRef, {
        status: 'assigned',
        offeredMaidIds: eligible.map(
          (maid) => maid.maidId,
        ),
        maidResponses: Object.fromEntries(
          eligible.map((maid) => [
            maid.maidId,
            'pending',
          ]),
        ),
        requestExpiresAt: expiresAt,
        assignmentClaimedAt: FieldValue.delete(),
        assignmentClaimToken: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return true;
    });

    if (!assigned) return;

    const results = await Promise.allSettled(
      eligible.map((maid) =>
        createMaidRequest(
          bookingId,
          claimed,
          maid,
          expiresAt,
        ),
      ),
    );

    const successfulRequests =
      results.filter(
        (result) => result.status === 'fulfilled',
      ).length;

    /*
     * If every request write failed, there is nobody who can accept the
     * booking. Close it instead of leaving the customer stuck in assigned.
     */
    if (successfulRequests === 0) {
      await db.runTransaction(async (transaction) => {
        const current = await transaction.get(bookingRef);
        if (!current.exists) return;

        const currentBooking =
          current.data() as Booking;

        if (
          currentBooking.status === 'assigned' &&
          !currentBooking.winningMaidId
        ) {
          transaction.update(bookingRef, {
            status: 'no_maid_found',
            assignmentError:
              'Booking requests could not be delivered.',
            requestExpiresAt: null,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      });
    }
  },
);

/**
 * Maid Accept / Reject.
 * First valid accept wins through a Firestore transaction.
 */
export const handleMaidBookingResponse =
  onDocumentUpdated(
    {
      document:
        'bookings/{bookingId}/maidRequests/{maidId}',
      region: 'asia-south1',
      maxInstances: 20,
    },
    async (event) => {
      const before = event.data?.before.data() as MaidRequest | undefined;
      const after = event.data?.after.data() as MaidRequest | undefined;

      if (!before || !after) return;

      if (
        before.response === after.response ||
        !['accepted', 'rejected'].includes(
          after.response ?? '',
        )
      ) {
        return;
      }

      const bookingId = event.params.bookingId;
      const maidId = event.params.maidId;

      const requestRef = db
        .collection('bookings')
        .doc(bookingId)
        .collection('maidRequests')
        .doc(maidId);

      const bookingRef =
        db.collection('bookings').doc(bookingId);

      if (after.response === 'rejected') {
        /*
         * Reject is guarded by the booking state so a late reject cannot
         * mutate the response map after another Help has already won.
         */
        await db.runTransaction(async (transaction) => {
          const bookingSnapshot = await transaction.get(bookingRef);
          const requestSnapshot = await transaction.get(requestRef);

          if (!bookingSnapshot.exists || !requestSnapshot.exists) return;

          const booking = bookingSnapshot.data() as Booking;
          const request = requestSnapshot.data() as MaidRequest;

          if (request.response !== 'rejected') return;

          if (
            booking.status !== 'assigned' ||
            booking.winningMaidId
          ) {
            return;
          }

          transaction.update(bookingRef, {
            [`maidResponses.${maidId}`]: 'rejected',
            updatedAt: FieldValue.serverTimestamp(),
          });
        });

        return;
      }

      let won = false;

      await db.runTransaction(
        async (transaction) => {
          const bookingSnapshot =
            await transaction.get(bookingRef);

          const requestSnapshot =
            await transaction.get(requestRef);

          const maidRef =
            db.collection('maids').doc(maidId);

          const maidSnapshot =
            await transaction.get(maidRef);

          if (
            !bookingSnapshot.exists ||
            !requestSnapshot.exists ||
            !maidSnapshot.exists
          ) {
            return;
          }

          const booking =
            bookingSnapshot.data() as Booking;

          const request =
            requestSnapshot.data() as MaidRequest;

          const maid =
            maidSnapshot.data() as Maid;

          /*
           * The backend itself writes response='accepted' after a successful
           * transaction. That write triggers this function again. If this
           * request is already the winning request, it is already processed.
           */
          if (
            booking.status === 'confirmed' &&
            booking.winningMaidId === maidId
          ) {
            return;
          }

          /* First valid accept wins. */
          if (
            booking.status !== 'assigned' ||
            booking.winningMaidId
          ) {
            transaction.update(requestRef, {
              response: 'expired',
              responseReason:
                'Another Help accepted this booking first.',
              updatedAt:
                FieldValue.serverTimestamp(),
            });

            return;
          }

          /* The request itself must belong to the Help in the path. */
          if (request.maidId !== maidId) {
            transaction.update(requestRef, {
              response: 'expired',
              responseReason: 'Invalid Help request.',
              updatedAt: FieldValue.serverTimestamp(),
            });

            return;
          }

          /* Only a Help explicitly offered this booking may accept it. */
          if (!booking.offeredMaidIds?.includes(maidId)) {
            transaction.update(requestRef, {
              response: 'expired',
              responseReason:
                'This booking was not offered to this Help.',
              updatedAt: FieldValue.serverTimestamp(),
            });

            return;
          }

          if (request.response !== 'accepted') {
            return;
          }

          const nowMs = Date.now();
          const requestExpiryMs =
            request.requestExpiresAt?.toDate().getTime() ?? 0;
          const bookingExpiryMs =
            booking.requestExpiresAt?.toDate().getTime() ?? 0;

          /* Both request and booking assignment windows must still be open. */
          if (
            requestExpiryMs <= nowMs ||
            bookingExpiryMs <= nowMs
          ) {
            transaction.update(requestRef, {
              response: 'expired',
              responseReason:
                'The response window has expired.',
              updatedAt:
                FieldValue.serverTimestamp(),
            });

            return;
          }

          /* Re-check current availability at the exact acceptance time. */
          if (!maidIsAvailable(maid, booking)) {
            transaction.update(requestRef, {
              response: 'expired',
              responseReason:
                'You are no longer available for this booking.',
              updatedAt:
                FieldValue.serverTimestamp(),
            });

            return;
          }

          const bookingRange = getBookingRange(booking);

          if (!bookingRange) {
            transaction.update(requestRef, {
              response: 'expired',
              responseReason:
                'The booking time or duration is invalid.',
              updatedAt:
                FieldValue.serverTimestamp(),
            });

            return;
          }

          /*
           * The current MVP allows one assigned booking per Help at a time.
           * The maid document is deliberately read in this transaction and
           * written only after all reads are complete. That write makes
           * simultaneous accept attempts for the same Help conflict and
           * retry, so only one can win.
           *
           * A stale activeBookingId is recoverable when its booking is
           * terminal or missing. A live non-terminal booking blocks this
           * acceptance.
           */
          let activeBookingCanProceed = true;

          if (
            maid.activeBookingId &&
            maid.activeBookingId !== bookingId
          ) {
            const activeBookingRef = db
              .collection('bookings')
              .doc(maid.activeBookingId);

            const activeBookingSnapshot =
              await transaction.get(activeBookingRef);

            if (activeBookingSnapshot.exists) {
              const activeBooking =
                activeBookingSnapshot.data() as Booking;

              const terminalStatuses: BookingStatus[] = [
                'completed',
                'cancelled',
                'no_maid_found',
              ];

              if (
                !terminalStatuses.includes(
                  activeBooking.status as BookingStatus,
                )
              ) {
                activeBookingCanProceed = false;
              }
            }
          }

          if (!activeBookingCanProceed) {
            transaction.update(requestRef, {
              response: 'expired',
              responseReason:
                'You already have another assigned booking.',
              updatedAt:
                FieldValue.serverTimestamp(),
            });

            return;
          }

          const activeStatuses: BookingStatus[] = [
            'assigned',
            'confirmed',
            'in_progress',
          ];

          /*
           * Final overlap check is retained as a second safety layer.
           * The maid document is written after this read so concurrent
           * accept attempts for the same Help cannot both commit.
           */
          const existingBookingsSnapshot =
            await transaction.get(
              db
                .collection('bookings')
                .where('maidId', '==', maidId),
            );

          const hasOverlap = existingBookingsSnapshot.docs.some(
            (existingDoc) => {
              if (existingDoc.id === bookingId) return false;

              const existing =
                existingDoc.data() as Booking;

              if (
                !activeStatuses.includes(
                  existing.status as BookingStatus,
                )
              ) {
                return false;
              }

              const existingRange =
                getBookingRange(existing);

              if (!existingRange) return false;

              return (
                bookingRange.start.getTime() <
                  existingRange.end.getTime() &&
                bookingRange.end.getTime() >
                  existingRange.start.getTime()
              );
            },
          );

          if (hasOverlap) {
            transaction.update(requestRef, {
              response: 'expired',
              responseReason:
                'You already have another booking at this time.',
              updatedAt:
                FieldValue.serverTimestamp(),
            });

            return;
          }

          transaction.update(maidRef, {
            activeBookingId: bookingId,
            assignmentVersion:
              FieldValue.increment(1),
            lastAssignedAt:
              FieldValue.serverTimestamp(),
            updatedAt:
              FieldValue.serverTimestamp(),
          });

          transaction.update(
            bookingRef,
            {
              status: 'confirmed',
              maidId,
              winningMaidId: maidId,
              maidDetails: {
                name: maid.name ?? '',
                phoneNumber:
                  maid.phoneNumber ?? '',
                photoUrl:
                  maid.photoUrl ?? '',
                verificationStatus:
                  maid.verificationStatus ??
                  'verified',
                serviceCategories:
                  maid.serviceCategories ??
                  [],
                serviceArea:
                  maid.serviceArea ??
                  '',
              },
              assignedAt:
                FieldValue.serverTimestamp(),
              respondedAt:
                FieldValue.serverTimestamp(),
              requestExpiresAt: null,
              updatedAt:
                FieldValue.serverTimestamp(),
              [`maidResponses.${maidId}`]:
                'accepted',
            },
          );

          transaction.update(
            maidRef,
            {
              activeBookingId:
                maid.activeBookingId ?? null,
              assignmentVersion:
                FieldValue.increment(1),
              lastAssignedAt:
                FieldValue.serverTimestamp(),
              updatedAt:
                FieldValue.serverTimestamp(),
            },
          );

          transaction.update(
            requestRef,
            {
              response: 'accepted',
              responseReason: null,
              updatedAt:
                FieldValue.serverTimestamp(),
            },
          );

          won = true;
        },
      );

      if (won) {
        await notifyBookingWinner(
          bookingId,
          maidId,
        );

        await expireLosingRequests(
          bookingId,
          maidId,
        );
      }
    },
  );

async function notifyBookingWinner(
  bookingId: string,
  maidId: string,
): Promise<void> {
  const bookingSnapshot =
    await db
      .collection('bookings')
      .doc(bookingId)
      .get();

  if (!bookingSnapshot.exists) return;

  const booking =
    bookingSnapshot.data() as Booking;

  if (booking.customerId) {
    await sendPush(
      'users',
      booking.customerId,
      'booking_confirmed',
      'Help found',
      `${booking.customerName ?? 'Your'} booking has been accepted by a Help.`,
      bookingId,
    );
  }

  await sendPush(
    'maids',
    maidId,
    'booking_confirmed',
    'Booking accepted',
    'You got the booking. Open it to see the customer details.',
    bookingId,
  );
}

async function expireLosingRequests(
  bookingId: string,
  winningMaidId: string,
): Promise<void> {
  const requests =
    await db
      .collection('bookings')
      .doc(bookingId)
      .collection('maidRequests')
      .get();

  const batch = db.batch();

  for (const request of requests.docs) {
    if (request.id === winningMaidId) {
      continue;
    }

    const data = request.data() as MaidRequest;

    if (data.response === 'pending') {
      batch.update(request.ref, {
        response: 'expired',
        responseReason:
          'Another Help accepted this booking first.',
        updatedAt:
          FieldValue.serverTimestamp(),
      });
    }
  }

  await batch.commit();
}

async function sendPush(
  collectionName: 'users' | 'maids',
  recipientId: string,
  type: string,
  title: string,
  body: string,
  bookingId: string,
): Promise<void> {
  try {
    const snapshot =
      await db
        .collection(collectionName)
        .doc(recipientId)
        .get();

    if (!snapshot.exists) return;

    const tokens =
      (snapshot.data()?.fcmTokens as string[] | undefined) ??
      [];

    if (!tokens.length) return;

    for (let i = 0; i < tokens.length; i += 500) {
      const chunk = tokens.slice(i, i + 500);

      const result =
        await messaging.sendEachForMulticast({
          tokens: chunk,
          notification: { title, body },
          data: { type, bookingId },
        });

      console.log(
        `[Assignment] push ${collectionName}/${recipientId} tokenCount=${chunk.length} success=${result.successCount} failure=${result.failureCount}`,
      );
    }
  } catch (error) {
    console.error(
      `[Assignment] Notification failed for ${collectionName}/${recipientId}:`,
      error,
    );
  }
}

/**
 * Every minute, close expired assignment windows.
 */
export const expireBookingRequests = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: INDIA_TIMEZONE,
    region: 'asia-south1',
    maxInstances: 1,
  },
  async () => {
    const now = Timestamp.now();

    /*
     * Query only requestExpiresAt so this scheduler does not require a
     * composite status + requestExpiresAt index. We verify status in code.
     * Single-field indexing of requestExpiresAt is automatic.
     */
    const snapshot =
      await db
        .collection('bookings')
        .where('requestExpiresAt', '<=', now)
        .limit(100)
        .get();

    for (const bookingDoc of snapshot.docs) {
      const expiredBooking =
        await db.runTransaction<Booking | null>(
          async (transaction) => {
            const current =
              await transaction.get(
                bookingDoc.ref,
              );

            if (!current.exists) return null;

            const booking =
              current.data() as Booking;

            /*
             * Re-check status and expiry inside the transaction. This is the
             * important race protection against a simultaneous Help accept.
             */
            if (
              booking.status !== 'assigned' ||
              booking.winningMaidId
            ) {
              return null;
            }

            const expiresAtMs =
              booking.requestExpiresAt
                ?.toDate()
                .getTime() ?? 0;

            if (expiresAtMs > Date.now()) {
              return null;
            }

            transaction.update(
              bookingDoc.ref,
              {
                status: 'no_maid_found',
                assignmentError:
                  'No Help accepted the request within the response window.',
                requestExpiresAt: null,
                updatedAt:
                  FieldValue.serverTimestamp(),
              },
            );

            return booking;
          },
        );

      if (!expiredBooking) {
        continue;
      }

      const booking = expiredBooking;

      if (booking.customerId) {
        await sendPush(
          'users',
          booking.customerId,
          'no_maid_found',
          'No Help available',
          'No Help accepted your booking request. Please try again.',
          bookingDoc.id,
        );
      }

      const requests =
        await bookingDoc.ref
          .collection('maidRequests')
          .get();

      const batch = db.batch();

      for (const request of requests.docs) {
        const data =
          request.data() as MaidRequest;

        if (data.response === 'pending') {
          batch.update(
            request.ref,
            {
              response: 'expired',
              responseReason:
                'The response window has expired.',
              updatedAt:
                FieldValue.serverTimestamp(),
            },
          );
        }
      }

      await batch.commit();
    }
  },
);
