import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';

import { onSchedule } from 'firebase-functions/v2/scheduler';

import { defineSecret } from 'firebase-functions/params';

import {
  getFirestore,
  FieldValue,
  Timestamp,
} from 'firebase-admin/firestore';

import {
  getMessaging,
} from 'firebase-admin/messaging';

const GOOGLE_MAPS_API_KEY =
  defineSecret(
    'GOOGLE_MAPS_API_KEY',
  );

const INDIA_TIMEZONE =
  'Asia/Kolkata';

const RESPONSE_WINDOW_MS =
  3 * 60 * 1000;

/* -----------------------------------------
 * TYPES
 * ----------------------------------------- */

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

type AvailabilityOverride =
  | {
      mode?: 'on' | 'off';
      expiresAt?:
        | Timestamp
        | {
            toDate?: () => Date;
          }
        | null;
    }
  | 'manual_on'
  | 'manual_off'
  | null;

type Coordinates = {
  latitude: number;
  longitude: number;
};

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

  currentLocation?: Coordinates;

  activeBookingId?: string | null;
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

  /*
   * Current schema stores coordinates
   * inside customerAddress.
   */
  customerAddress?: {
    formatted?: string;
    landmark?: string;

    latitude?: number | null;
    longitude?: number | null;
  };

  /*
   * Also support top-level coordinates
   * if a future client stores them there.
   */
  customerLatitude?: number | null;
  customerLongitude?: number | null;

  totalPrice?: number;

  offeredMaidIds?: string[];

  maidResponses?: Record<
    string,
    string
  >;

  requestExpiresAt?:
    | Timestamp
    | null;

  createdAt?: Timestamp;
};

type MaidRequest = {
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

  scheduledDateTime?: Timestamp;

  totalPrice?: number;

  distanceMeters?: number | null;
  estimatedTravelSeconds?: number | null;

  requestExpiresAt?: Timestamp;
};

/* -----------------------------------------
 * FIREBASE
 * ----------------------------------------- */

const db =
  getFirestore();

const messaging =
  getMessaging();

/* -----------------------------------------
 * DATE / TIME
 * ----------------------------------------- */

function indiaParts(
  date: Date,
) {
  const formatter =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          INDIA_TIMEZONE,

        year: 'numeric',
        month: '2-digit',
        day: '2-digit',

        hour: '2-digit',
        minute: '2-digit',

        hourCycle: 'h23',
      },
    );

  const parts =
    formatter.formatToParts(
      date,
    );

  const value = (
    type: string,
  ) =>
    parts.find(
      (item) =>
        item.type === type,
    )?.value ?? '';

  return {
    date:
      `${value('year')}-${value(
        'month',
      )}-${value('day')}`,

    time:
      `${value('hour')}:${value(
        'minute',
      )}`,
  };
}

function timeToMinutes(
  value: string,
): number {
  const [
    hours,
    minutes,
  ] =
    value
      .split(':')
      .map(Number);

  return (
    hours * 60 +
    minutes
  );
}

/* -----------------------------------------
 * BOOKING RANGE
 * ----------------------------------------- */

function getBookingRange(
  booking: Booking,
) {
  if (
    !booking.scheduledDateTime
  ) {
    return null;
  }

  const start =
    booking.scheduledDateTime.toDate();

  const durationHours =
    Number(
      booking.duration ?? 0,
    );

  if (
    !Number.isFinite(
      durationHours,
    ) ||
    durationHours <= 0
  ) {
    return null;
  }

  const end =
    new Date(
      start.getTime() +
        durationHours *
          60 *
          60 *
          1000,
    );

  const startParts =
    indiaParts(start);

  const endParts =
    indiaParts(end);

  return {
    start,
    end,

    startDate:
      startParts.date,

    startTime:
      startParts.time,

    endDate:
      endParts.date,

    endTime:
      endParts.time,
  };
}

/* -----------------------------------------
 * AVAILABILITY
 * ----------------------------------------- */

function slotCoversBooking(
  booking: Booking,
  slot: AvailabilitySlot,
): boolean {
  const range =
    getBookingRange(
      booking,
    );

  if (!range) {
    return false;
  }

  if (
    range.startDate !==
      slot.date ||
    range.endDate !==
      slot.date
  ) {
    return false;
  }

  const bookingStart =
    timeToMinutes(
      range.startTime,
    );

  const bookingEnd =
    timeToMinutes(
      range.endTime,
    );

  const slotStart =
    timeToMinutes(
      slot.startTime,
    );

  const slotEnd =
    timeToMinutes(
      slot.endTime,
    );

  return (
    bookingStart >=
      slotStart &&
    bookingEnd <=
      slotEnd
  );
}

function overrideMode(
  value:
    | AvailabilityOverride
    | undefined,
):
  | 'on'
  | 'off'
  | null {
  if (!value) {
    return null;
  }

  if (
    value ===
    'manual_on'
  ) {
    return 'on';
  }

  if (
    value ===
    'manual_off'
  ) {
    return 'off';
  }

  if (
    typeof value ===
    'object'
  ) {
    return (
      value.mode ?? null
    );
  }

  return null;
}

function overrideIsActive(
  value:
    | AvailabilityOverride
    | undefined,
  now: Date,
): boolean {
  if (!value) {
    return false;
  }

  if (
    typeof value ===
    'string'
  ) {
    return true;
  }

  const expiresAt =
    value.expiresAt;

  if (!expiresAt) {
    return true;
  }

  if (
    typeof expiresAt.toDate ===
    'function'
  ) {
    return (
      expiresAt
        .toDate()
        .getTime() >
      now.getTime()
    );
  }

  return true;
}

function maidMatchesBooking(
  maid: Maid,
  booking: Booking,
): boolean {
  const requested =
    booking.categories ??
    [];

  const supported =
    maid.serviceCategories ??
    [];

  return (
    requested.length > 0 &&
    requested.every(
      (category) =>
        supported.includes(
          category,
        ),
    )
  );
}

function maidIsAvailable(
  maid: Maid,
  booking: Booking,
): boolean {
  const now =
    new Date();

  const mode =
    overrideMode(
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

  const slots =
    maid.availabilitySlots ??
    [];

  if (
    slots.some(
      (slot) =>
        slotCoversBooking(
          booking,
          slot,
        ),
    )
  ) {
    return true;
  }

  const range =
    getBookingRange(
      booking,
    );

  if (
    !range ||
    range.start.getTime() <=
      now.getTime()
  ) {
    return false;
  }

  const hoursAway =
    (
      range.start.getTime() -
      now.getTime()
    ) /
    (60 * 60 * 1000);

  return (
    hoursAway <= 4 &&
    maid.isAvailableNow ===
      true
  );
}

/* -----------------------------------------
 * CUSTOMER LOCATION
 * ----------------------------------------- */

function getCustomerCoordinates(
  booking: Booking,
): Coordinates | null {
  const latitude =
    booking.customerLatitude ??
    booking.customerAddress
      ?.latitude ??
    null;

  const longitude =
    booking.customerLongitude ??
    booking.customerAddress
      ?.longitude ??
    null;

  if (
    typeof latitude !==
      'number' ||
    typeof longitude !==
      'number'
  ) {
    return null;
  }

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

/* -----------------------------------------
 * EXISTING BOOKING CONFLICT
 * ----------------------------------------- */

async function hasExistingConflict(
  maidId: string,
  booking: Booking,
): Promise<boolean> {
  const range =
    getBookingRange(
      booking,
    );

  if (!range) {
    return true;
  }

  const snapshot =
    await db
      .collection('bookings')
      .where(
        'maidId',
        '==',
        maidId,
      )
      .get();

  const activeStatuses:
    BookingStatus[] = [
      'assigned',
      'confirmed',
      'in_progress',
    ];

  for (
    const item of
      snapshot.docs
  ) {
    const existing =
      item.data() as Booking;

    if (
      !activeStatuses.includes(
        existing.status as BookingStatus,
      )
    ) {
      continue;
    }

    const existingRange =
      getBookingRange(
        existing,
      );

    if (!existingRange) {
      continue;
    }

    const overlaps =
      range.start.getTime() <
        existingRange.end.getTime() &&
      range.end.getTime() >
        existingRange.start.getTime();

    if (overlaps) {
      return true;
    }
  }

  return false;
}

/* -----------------------------------------
 * GOOGLE ROUTES API
 * ----------------------------------------- */

async function calculateDrivingDistance(
  origin: Coordinates,
  destination: Coordinates,
): Promise<{
  distanceMeters:
    | number
    | null;

  estimatedTravelSeconds:
    | number
    | null;
}> {
  const key =
    GOOGLE_MAPS_API_KEY.value();

  if (!key) {
    console.error(
      '[Assignment] GOOGLE_MAPS_API_KEY is empty.',
    );

    return {
      distanceMeters: null,
      estimatedTravelSeconds:
        null,
    };
  }

  try {
    const response =
      await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            'X-Goog-Api-Key':
              key,

            /*
             * Only request the fields we need.
             */
            'X-Goog-FieldMask':
              'routes.distanceMeters,routes.duration',
          },

          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude:
                    origin.latitude,

                  longitude:
                    origin.longitude,
                },
              },
            },

            destination: {
              location: {
                latLng: {
                  latitude:
                    destination.latitude,

                  longitude:
                    destination.longitude,
                },
              },
            },

            travelMode:
              'DRIVE',

            routingPreference:
              'TRAFFIC_AWARE',

            computeAlternativeRoutes:
              false,

            languageCode:
              'en-IN',

            units:
              'METRIC',
          }),
        },
      );

    if (!response.ok) {
      const errorBody =
        await response.text();

      console.error(
        '[Assignment] Google Routes API error:',
        {
          status:
            response.status,

          statusText:
            response.statusText,

          body:
            errorBody,
        },
      );

      return {
        distanceMeters:
          null,

        estimatedTravelSeconds:
          null,
      };
    }

    const body =
      (await response.json()) as {
        routes?: Array<{
          distanceMeters?: number;
          duration?: string;
        }>;
      };

    const route =
      body.routes?.[0];

    if (!route) {
      console.error(
        '[Assignment] Google Routes API returned no route.',
      );

      return {
        distanceMeters:
          null,

        estimatedTravelSeconds:
          null,
      };
    }

    const seconds =
      route.duration
        ? Number.parseFloat(
            route.duration.replace(
              /s$/,
              '',
            ),
          )
        : null;

    return {
      distanceMeters:
        typeof route.distanceMeters ===
        'number'
          ? route.distanceMeters
          : null,

      estimatedTravelSeconds:
        Number.isFinite(
          seconds ?? NaN,
        )
          ? seconds
          : null,
    };
  } catch (error) {
    console.error(
      '[Assignment] Distance calculation failed:',
      error,
    );

    return {
      distanceMeters:
        null,

      estimatedTravelSeconds:
        null,
    };
  }
}

/* -----------------------------------------
 * DISPLAY TEXT
 * ----------------------------------------- */

function buildRequestTexts(
  distanceMeters:
    | number
    | null,
  estimatedTravelSeconds:
    | number
    | null,
) {
  const distanceText =
    typeof distanceMeters ===
    'number'
      ? distanceMeters <
        1000
        ? `${Math.round(
            distanceMeters,
          )} m`
        : `${(
            distanceMeters /
            1000
          ).toFixed(1)} km`
      : 'Distance unavailable';

  const etaText =
    typeof estimatedTravelSeconds ===
    'number'
      ? `${Math.max(
          1,
          Math.round(
            estimatedTravelSeconds /
              60,
          ),
        )} min`
      : 'ETA unavailable';

  return {
    distanceText,
    etaText,
  };
}

/* -----------------------------------------
 * PUSH TO MAID
 * ----------------------------------------- */

async function sendPushToMaid(
  maidId: string,
  bookingId: string,
): Promise<void> {
  try {
    const snapshot =
      await db
        .collection('maids')
        .doc(maidId)
        .get();

    if (!snapshot.exists) {
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

    await messaging
      .sendEachForMulticast(
        {
          tokens,

          notification: {
            title:
              'New booking request',

            body:
              'A customer nearby needs your help. Open the request to accept or reject.',
          },

          data: {
            type:
              'booking_request',

            bookingId,
          },
        },
      );
  } catch (error) {
    console.error(
      `[Assignment] Failed push for maid ${maidId}:`,
      error,
    );
  }
}

/* -----------------------------------------
 * CREATE REQUEST
 * ----------------------------------------- */

async function createMaidRequest(
  bookingId: string,
  booking: Booking,
  maid: Maid,
  expiresAt: Timestamp,
): Promise<void> {
  const destination =
    getCustomerCoordinates(
      booking,
    );

  const origin =
    maid.currentLocation &&
    Number.isFinite(
      maid.currentLocation
        .latitude,
    ) &&
    Number.isFinite(
      maid.currentLocation
        .longitude,
    )
      ? {
          latitude:
            maid.currentLocation
              .latitude,

          longitude:
            maid.currentLocation
              .longitude,
        }
      : null;

  let distanceMeters:
    | number
    | null = null;

  let estimatedTravelSeconds:
    | number
    | null = null;

  /*
   * Calculate actual driving distance
   * only when both locations are valid.
   */
  if (
    origin &&
    destination
  ) {
    const result =
      await calculateDrivingDistance(
        origin,
        destination,
      );

    distanceMeters =
      result.distanceMeters;

    estimatedTravelSeconds =
      result.estimatedTravelSeconds;
  } else {
    console.warn(
      '[Assignment] Missing coordinates for distance calculation:',
      {
        bookingId,

        maidId:
          maid.maidId,

        maidLocation:
          origin,

        customerLocation:
          destination,
      },
    );
  }

  const requestRef =
    db
      .collection('bookings')
      .doc(bookingId)
      .collection(
        'maidRequests',
      )
      .doc(maid.maidId);

  await requestRef.set({
    bookingId,

    maidId:
      maid.maidId,

    response:
      'pending',

    responseReason:
      null,

    customerName:
      booking.customerName ??
      '',

    customerAddress: {
      formatted:
        booking
          .customerAddress
          ?.formatted ??
        '',

      landmark:
        booking
          .customerAddress
          ?.landmark ??
        '',
    },

    customerLatitude:
      destination
        ?.latitude ??
      null,

    customerLongitude:
      destination
        ?.longitude ??
      null,

    categories:
      booking.categories ??
      [],

    duration:
      booking.duration ??
      0,

    scheduledDateTime:
      booking
        .scheduledDateTime ??
      null,

    totalPrice:
      booking.totalPrice ??
      0,

    distanceMeters,

    estimatedTravelSeconds,

    ...buildRequestTexts(
      distanceMeters,
      estimatedTravelSeconds,
    ),

    requestExpiresAt:
      expiresAt,

    createdAt:
      FieldValue.serverTimestamp(),

    updatedAt:
      FieldValue.serverTimestamp(),
  });

  await sendPushToMaid(
    maid.maidId,
    bookingId,
  );
}

/* -----------------------------------------
 * NEW BOOKING ASSIGNMENT
 * ----------------------------------------- */

export const dispatchBookingRequests =
  onDocumentCreated(
    {
      document:
        'bookings/{bookingId}',

      region:
        'asia-south1',

      maxInstances:
        10,

      secrets: [
        GOOGLE_MAPS_API_KEY,
      ],
    },

    async (event) => {
      const snapshot =
        event.data;

      if (!snapshot) {
        return;
      }

      const booking =
        snapshot.data() as Booking;

      const bookingId =
        snapshot.id;

      if (
        booking.status !==
          'pending' ||
        !booking.customerId
      ) {
        return;
      }

      const maidSnapshot =
        await db
          .collection('maids')
          .get();

      const eligible:
        Maid[] = [];

      for (
        const maidDoc of
          maidSnapshot.docs
      ) {
        const maid: Maid = {
          ...(maidDoc.data() as Maid),

          maidId:
            maidDoc.id,
        };

        if (
          maid.verificationStatus !==
          'verified'
        ) {
          continue;
        }

        if (
          !maidMatchesBooking(
            maid,
            booking,
          )
        ) {
          continue;
        }

        if (
          !maidIsAvailable(
            maid,
            booking,
          )
        ) {
          continue;
        }

        if (
          await hasExistingConflict(
            maid.maidId,
            booking,
          )
        ) {
          continue;
        }

        eligible.push(
          maid,
        );
      }

      if (
        !eligible.length
      ) {
        await snapshot.ref.update(
          {
            status:
              'no_maid_found',

            assignmentError:
              'No eligible maid is available for this booking.',

            offeredMaidIds:
              [],

            maidResponses:
              {},

            requestExpiresAt:
              null,

            updatedAt:
              FieldValue.serverTimestamp(),
          },
        );

        return;
      }

      const expiresAt =
        Timestamp.fromMillis(
          Date.now() +
            RESPONSE_WINDOW_MS,
        );

      /*
       * Mark assigned before requests
       * are distributed.
       */
      await snapshot.ref.update(
        {
          status:
            'assigned',

          offeredMaidIds:
            eligible.map(
              (maid) =>
                maid.maidId,
            ),

          maidResponses:
            Object.fromEntries(
              eligible.map(
                (maid) => [
                  maid.maidId,
                  'pending',
                ],
              ),
            ),

          requestExpiresAt:
            expiresAt,

          updatedAt:
            FieldValue.serverTimestamp(),
        },
      );

      /*
       * Send to ALL eligible maids
       * simultaneously.
       */
      await Promise.allSettled(
        eligible.map(
          (maid) =>
            createMaidRequest(
              bookingId,
              booking,
              maid,
              expiresAt,
            ),
        ),
      );
    },
  );

/* -----------------------------------------
 * MAID ACCEPT / REJECT
 * ----------------------------------------- */

export const handleMaidBookingResponse =
  onDocumentUpdated(
    {
      document:
        'bookings/{bookingId}/maidRequests/{maidId}',

      region:
        'asia-south1',

      maxInstances:
        20,
    },

    async (event) => {
      const before =
        event.data
          ?.before.data() as
          | MaidRequest
          | undefined;

      const after =
        event.data
          ?.after.data() as
          | MaidRequest
          | undefined;

      if (
        !before ||
        !after
      ) {
        return;
      }

      if (
        before.response ===
        after.response
      ) {
        return;
      }

      if (
        ![
          'accepted',
          'rejected',
        ].includes(
          after.response ??
            '',
        )
      ) {
        return;
      }

      const bookingId =
        event.params
          .bookingId;

      const maidId =
        event.params
          .maidId;

      const bookingRef =
        db
          .collection('bookings')
          .doc(bookingId);

      const requestRef =
        db
          .collection('bookings')
          .doc(bookingId)
          .collection(
            'maidRequests',
          )
          .doc(maidId);

      /*
       * Reject case does not need
       * the winner transaction.
       */
      if (
        after.response ===
        'rejected'
      ) {
        await bookingRef.update(
          {
            [`maidResponses.${maidId}`]:
              'rejected',

            updatedAt:
              FieldValue.serverTimestamp(),
          },
        );

        return;
      }

      let won =
        false;

      await db.runTransaction(
        async (
          transaction,
        ) => {
          const bookingSnapshot =
            await transaction.get(
              bookingRef,
            );

          const requestSnapshot =
            await transaction.get(
              requestRef,
            );

          const maidRef =
            db
              .collection('maids')
              .doc(maidId);

          const maidSnapshot =
            await transaction.get(
              maidRef,
            );

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
           * First valid accept wins.
           */
          if (
            booking.status !==
              'assigned' ||
            booking.winningMaidId
          ) {
            transaction.update(
              requestRef,
              {
                response:
                  'expired',

                responseReason:
                  'Another Help accepted this booking first.',

                updatedAt:
                  FieldValue.serverTimestamp(),
              },
            );

            return;
          }

          if (
            request.response !==
            'accepted'
          ) {
            return;
          }

          if (
            request.requestExpiresAt &&
            request.requestExpiresAt
              .toDate()
              .getTime() <
              Date.now()
          ) {
            transaction.update(
              requestRef,
              {
                response:
                  'expired',

                responseReason:
                  'The response window has expired.',

                updatedAt:
                  FieldValue.serverTimestamp(),
              },
            );

            return;
          }

          /*
           * Re-check availability at the exact
           * time of acceptance.
           */
          if (
            !maidIsAvailable(
              maid,
              booking,
            )
          ) {
            transaction.update(
              requestRef,
              {
                response:
                  'expired',

                responseReason:
                  'You are no longer available for this booking.',

                updatedAt:
                  FieldValue.serverTimestamp(),
              },
            );

            return;
          }

          /*
           * Confirm booking.
           */
          transaction.update(
            bookingRef,
            {
              status:
                'confirmed',

              maidId:
                maidId,

              winningMaidId:
                maidId,

              maidDetails: {
                name:
                  maid.name ??
                  '',

                phoneNumber:
                  maid.phoneNumber ??
                  '',

                photoUrl:
                  maid.photoUrl ??
                  '',

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

              updatedAt:
                FieldValue.serverTimestamp(),

              [`maidResponses.${maidId}`]:
                'accepted',
            },
          );

          /*
           * Lock the maid to this active booking.
           */
          transaction.update(
            maidRef,
            {
              activeBookingId:
                bookingId,

              isAvailableNow:
                false,

              lastAssignedAt:
                FieldValue.serverTimestamp(),

              updatedAt:
                FieldValue.serverTimestamp(),
            },
          );

          /*
           * Mark winning request accepted.
           */
          transaction.update(
            requestRef,
            {
              response:
                'accepted',

              responseReason:
                null,

              updatedAt:
                FieldValue.serverTimestamp(),
            },
          );

          won =
            true;
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

/* -----------------------------------------
 * WINNER NOTIFICATION
 * ----------------------------------------- */

async function notifyBookingWinner(
  bookingId: string,
  maidId: string,
): Promise<void> {
  const bookingSnapshot =
    await db
      .collection('bookings')
      .doc(bookingId)
      .get();

  if (
    !bookingSnapshot.exists
  ) {
    return;
  }

  const booking =
    bookingSnapshot.data() as Booking;

  if (
    booking.customerId
  ) {
    await sendPush(
      'users',
      booking.customerId,

      'booking_confirmed',

      'Help found',

      `${
        booking.customerName ??
        'Your'
      } booking has been accepted by a Help.`,

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

/* -----------------------------------------
 * EXPIRE LOSING REQUESTS
 * ----------------------------------------- */

async function expireLosingRequests(
  bookingId: string,
  winningMaidId: string,
): Promise<void> {
  const requests =
    await db
      .collection('bookings')
      .doc(bookingId)
      .collection(
        'maidRequests',
      )
      .get();

  const batch =
    db.batch();

  for (
    const request of
      requests.docs
  ) {
    if (
      request.id ===
      winningMaidId
    ) {
      continue;
    }

    const data =
      request.data() as MaidRequest;

    if (
      data.response ===
      'pending'
    ) {
      batch.update(
        request.ref,
        {
          response:
            'expired',

          responseReason:
            'Another Help accepted this booking first.',

          updatedAt:
            FieldValue.serverTimestamp(),
        },
      );
    }
  }

  await batch.commit();
}

/* -----------------------------------------
 * GENERIC PUSH
 * ----------------------------------------- */

async function sendPush(
  collectionName:
    | 'users'
    | 'maids',

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

    await messaging
      .sendEachForMulticast(
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
      `[Assignment] Notification failed for ${collectionName}/${recipientId}:`,
      error,
    );
  }
}

/* -----------------------------------------
 * EXPIRE ASSIGNMENT WINDOWS
 * ----------------------------------------- */

export const expireBookingRequests =
  onSchedule(
    {
      schedule:
        'every 1 minutes',

      timeZone:
        INDIA_TIMEZONE,

      region:
        'asia-south1',

      maxInstances:
        1,
    },

    async () => {
      const now =
        Timestamp.now();

      const snapshot =
        await db
          .collection(
            'bookings',
          )
          .where(
            'status',
            '==',
            'assigned',
          )
          .where(
            'requestExpiresAt',
            '<=',
            now,
          )
          .limit(50)
          .get();

      for (
        const bookingDoc of
          snapshot.docs
      ) {
        const result =
          await db.runTransaction(
            async (
              transaction,
            ) => {
              const current =
                await transaction.get(
                  bookingDoc.ref,
                );

              if (
                !current.exists
              ) {
                return false;
              }

              const booking =
                current.data() as Booking;

              if (
                booking.status !==
                  'assigned' ||
                booking.winningMaidId
              ) {
                return false;
              }

              transaction.update(
                bookingDoc.ref,
                {
                  status:
                    'no_maid_found',

                  assignmentError:
                    'No Help accepted the request within the response window.',

                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
              );

              return true;
            },
          );

        if (!result) {
          continue;
        }

        const booking =
          bookingDoc.data() as Booking;

        if (
          booking.customerId
        ) {
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
            .collection(
              'maidRequests',
            )
            .get();

        const batch =
          db.batch();

        for (
          const request of
            requests.docs
        ) {
          const data =
            request.data() as MaidRequest;

          if (
            data.response ===
            'pending'
          ) {
            batch.update(
              request.ref,
              {
                response:
                  'expired',

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