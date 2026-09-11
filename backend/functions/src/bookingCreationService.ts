import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  FieldValue,
  getFirestore,
  Timestamp,
} from 'firebase-admin/firestore';

const FUNCTIONS_REGION = 'asia-south1';
const MIN_BOOKING_LEAD_MS = 2 * 60 * 60 * 1000;
const MAX_CATEGORIES = 10;

type CategoryDocument = {
  ratePerHour?: unknown;
  name?: unknown;
};

type CreateBookingData = {
  bookingId?: unknown;
  categoryIds?: unknown;
  duration?: unknown;
  scheduledDateTime?: unknown;
};

function requireCustomerUid(authUid: string | undefined): string {
  if (!authUid) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to create a booking.',
    );
  }

  return authUid;
}

function validateCategoryIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'Please select at least one service.',
    );
  }

  if (value.length > MAX_CATEGORIES) {
    throw new HttpsError(
      'invalid-argument',
      'Please select fewer services.',
    );
  }

  if (
    value.some(
      (item) =>
        typeof item !== 'string' ||
        item.trim().length === 0 ||
        item.trim().length > 100,
    )
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid service selection.',
    );
  }

  const categoryIds = value.map((item) => item.trim());

  if (new Set(categoryIds).size !== categoryIds.length) {
    throw new HttpsError(
      'invalid-argument',
      'Duplicate services are not allowed.',
    );
  }

  return categoryIds;
}

function validateDuration(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    ![1, 2, 3, 4].includes(value)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Please choose a duration between 1 and 4 hours.',
    );
  }

  return value;
}

function parseScheduledDateTime(value: unknown): Date {
  let date: Date | null = null;

  if (value instanceof Timestamp) {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    date = new Date(value);
  } else if (
    value &&
    typeof value === 'object' &&
    'seconds' in value &&
    typeof (value as { seconds?: unknown }).seconds === 'number'
  ) {
    const input = value as {
      seconds: number;
      nanoseconds?: number;
    };

    date = new Date(
      input.seconds * 1000 +
        Math.floor(
          (typeof input.nanoseconds === 'number'
            ? input.nanoseconds
            : 0) / 1_000_000,
        ),
    );
  }

  if (!date || Number.isNaN(date.getTime())) {
    throw new HttpsError(
      'invalid-argument',
      'Please choose a valid date and time.',
    );
  }

  if (
    date.getTime() <
    Date.now() + MIN_BOOKING_LEAD_MS
  ) {
    throw new HttpsError(
      'failed-precondition',
      'Please choose a time at least 2 hours from now.',
    );
  }

  return date;
}

function validateBookingId(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (
    typeof value !== 'string' ||
    value.length < 8 ||
    value.length > 100 ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid booking request.',
    );
  }

  return value;
}

function parseCustomerProfile(data: FirebaseFirestore.DocumentData) {
  const name =
    typeof data.name === 'string'
      ? data.name.trim()
      : '';

  const address =
    data.address &&
    typeof data.address === 'object'
      ? data.address
      : {};

  const formatted =
    typeof address.formatted === 'string'
      ? address.formatted.trim()
      : '';

  const landmark =
    typeof address.landmark === 'string'
      ? address.landmark.trim()
      : '';

  const latitude =
    typeof address.latitude === 'number' &&
    Number.isFinite(address.latitude) &&
    address.latitude >= -90 &&
    address.latitude <= 90
      ? address.latitude
      : null;

  const longitude =
    typeof address.longitude === 'number' &&
    Number.isFinite(address.longitude) &&
    address.longitude >= -180 &&
    address.longitude <= 180
      ? address.longitude
      : null;

  if (!name) {
    throw new HttpsError(
      'failed-precondition',
      'Please complete your profile before booking.',
    );
  }

  if (!formatted) {
    throw new HttpsError(
      'failed-precondition',
      'Please add your service address before booking.',
    );
  }

  return {
    name,
    address: {
      formatted,
      landmark,
      latitude,
      longitude,
    },
  };
}

export const createBooking = onCall(
  {
    region: FUNCTIONS_REGION,
    maxInstances: 20,
  },
  async (request) => {
    const uid = requireCustomerUid(request.auth?.uid);

    const data =
      (request.data ?? {}) as CreateBookingData;

    const categoryIds = validateCategoryIds(
      data.categoryIds,
    );
    const duration = validateDuration(
      data.duration,
    );
    const scheduledDateTime =
      parseScheduledDateTime(
        data.scheduledDateTime,
      );
    const requestedBookingId =
      validateBookingId(data.bookingId);

    const db = getFirestore();

    const customerRef = db
      .collection('users')
      .doc(uid);

    const customerSnapshot =
      await customerRef.get();

    if (!customerSnapshot.exists) {
      throw new HttpsError(
        'failed-precondition',
        'Your profile could not be found. Please complete your profile first.',
      );
    }

    const customer = parseCustomerProfile(
      customerSnapshot.data() ?? {},
    );

    const categoriesSnapshot =
      await db
        .collection('categories')
        .get();

    const categoryMap = new Map<
      string,
      CategoryDocument
    >();

    for (const categoryDoc of categoriesSnapshot.docs) {
      categoryMap.set(
        categoryDoc.id,
        categoryDoc.data() as CategoryDocument,
      );
    }

    let totalPrice = 0;

    for (const categoryId of categoryIds) {
      const category =
        categoryMap.get(categoryId);

      if (!category) {
        throw new HttpsError(
          'failed-precondition',
          'One or more selected services are currently unavailable.',
        );
      }

      const ratePerHour =
        category.ratePerHour;

      if (
        typeof ratePerHour !== 'number' ||
        !Number.isFinite(ratePerHour) ||
        ratePerHour <= 0
      ) {
        throw new HttpsError(
          'failed-precondition',
          'A selected service has invalid pricing.',
        );
      }

      totalPrice +=
        ratePerHour * duration;
    }

    if (
      !Number.isFinite(totalPrice) ||
      totalPrice <= 0
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Unable to calculate the booking price.',
      );
    }

    const bookingRef =
      requestedBookingId
        ? db
            .collection('bookings')
            .doc(requestedBookingId)
        : db
            .collection('bookings')
            .doc();

    let created = false;

    await db.runTransaction(
      async (transaction) => {
        const existing =
          await transaction.get(
            bookingRef,
          );

        if (existing.exists) {
          const existingData =
            existing.data() ?? {};

          if (
            existingData.customerId !== uid
          ) {
            throw new HttpsError(
              'already-exists',
              'This booking request is already in use.',
            );
          }

          created = false;
          return;
        }

        transaction.set(
          bookingRef,
          {
            customerId: uid,
            maidId: null,
            winningMaidId: null,

            categories: categoryIds,
            duration,

            scheduledDateTime:
              Timestamp.fromDate(
                scheduledDateTime,
              ),

            status: 'pending',

            customerName:
              customer.name,

            customerAddress:
              customer.address,

            totalPrice,

            offeredMaidIds: [],
            maidResponses: {},

            assignedAt: null,
            respondedAt: null,
            startedAt: null,
            completedAt: null,
            cancelledAt: null,

            cancellationReason: null,
            cancelledBy: null,
            assignmentError: null,

            requestExpiresAt: null,

            createdAt:
              FieldValue.serverTimestamp(),
            updatedAt:
              FieldValue.serverTimestamp(),
          },
        );

        created = true;
      },
    );

    return {
      bookingId: bookingRef.id,
      totalPrice,
      created,
    };
  },
);
