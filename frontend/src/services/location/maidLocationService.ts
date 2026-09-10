import * as Location from 'expo-location';

import {
  doc,
  getFirestore,
  serverTimestamp,
  updateDoc,
} from '@react-native-firebase/firestore';

export type MaidCurrentLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  updatedAt?: unknown;
};

const LOCATION_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 60_000,
  distanceInterval: 100,
};

function normalizeError(
  error: unknown,
  fallbackMessage: string,
): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}

export async function requestMaidLocationPermission(): Promise<boolean> {
  const existingPermission =
    await Location.getForegroundPermissionsAsync();

  if (
    existingPermission.status ===
    'granted'
  ) {
    return true;
  }

  const requestedPermission =
    await Location.requestForegroundPermissionsAsync();

  return (
    requestedPermission.status ===
    'granted'
  );
}

export async function getMaidCurrentLocation(): Promise<MaidCurrentLocation> {
  const hasPermission =
    await requestMaidLocationPermission();

  if (!hasPermission) {
    throw new Error(
      'Location permission is required to receive nearby booking requests.',
    );
  }

  /*
   * Use a fresh GPS reading.
   */
  const position =
    await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

  const {
    latitude,
    longitude,
    accuracy,
    heading,
    speed,
  } = position.coords;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error(
      'Unable to determine your current location.',
    );
  }

  return {
    latitude,
    longitude,
    accuracy:
      Number.isFinite(accuracy ?? NaN)
        ? accuracy
        : null,
    heading:
      Number.isFinite(heading ?? NaN)
        ? heading
        : null,
    speed:
      Number.isFinite(speed ?? NaN)
        ? speed
        : null,
  };
}

export async function updateMaidCurrentLocation(
  maidId: string,
  location: MaidCurrentLocation,
): Promise<void> {
  if (!maidId) {
    throw new Error(
      'Maid information is missing.',
    );
  }

  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude)
  ) {
    throw new Error(
      'Invalid location coordinates.',
    );
  }

  await updateDoc(
    doc(
      getFirestore(),
      'maids',
      maidId,
    ),
    {
      currentLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy:
          location.accuracy ?? null,
        heading:
          location.heading ?? null,
        speed:
          location.speed ?? null,
        updatedAt:
          serverTimestamp(),
      },
      updatedAt:
        serverTimestamp(),
    },
  );
}

export async function refreshMaidCurrentLocation(
  maidId: string,
): Promise<MaidCurrentLocation> {
  const location =
    await getMaidCurrentLocation();

  await updateMaidCurrentLocation(
    maidId,
    location,
  );

  return location;
}

/**
 * Starts location tracking for the maid.
 *
 * IMPORTANT:
 * We intentionally fetch and save one location immediately
 * before starting the watcher. This prevents a race condition
 * where a booking is created before watchPositionAsync emits
 * its first location update.
 */
export async function startMaidLocationTracking(
  maidId: string,
  onLocation?: (
    location: MaidCurrentLocation,
  ) => void,
  onError?: (
    error: Error,
  ) => void,
): Promise<() => void> {
  if (!maidId) {
    const error =
      new Error(
        'Maid information is missing.',
      );

    onError?.(error);

    return () => undefined;
  }

  const hasPermission =
    await requestMaidLocationPermission();

  if (!hasPermission) {
    const error =
      new Error(
        'Location permission is required to receive nearby booking requests.',
      );

    onError?.(error);

    return () => undefined;
  }

  let isStopped = false;
  let watcher:
    | Location.LocationSubscription
    | null = null;

  /*
   * STEP 1:
   * Immediately get the current position and save it.
   */
  try {
    const initialLocation =
      await getMaidCurrentLocation();

    if (!isStopped) {
      await updateMaidCurrentLocation(
        maidId,
        initialLocation,
      );

      onLocation?.(
        initialLocation,
      );
    }
  } catch (error) {
    const normalizedError =
      normalizeError(
        error,
        'Unable to get your current location.',
      );

    console.error(
      '[MaidLocation] Initial location update failed:',
      normalizedError,
    );

    onError?.(
      normalizedError,
    );

    /*
     * Do not immediately stop here.
     * The watcher can still recover and get a location.
     */
  }

  if (isStopped) {
    return () => undefined;
  }

  /*
   * STEP 2:
   * Continue watching for meaningful movement/time changes.
   */
  try {
    watcher =
      await Location.watchPositionAsync(
        LOCATION_OPTIONS,
        async (position) => {
          if (isStopped) {
            return;
          }

          const {
            latitude,
            longitude,
            accuracy,
            heading,
            speed,
          } =
            position.coords;

          if (
            !Number.isFinite(
              latitude,
            ) ||
            !Number.isFinite(
              longitude,
            )
          ) {
            return;
          }

          const location: MaidCurrentLocation =
            {
              latitude,
              longitude,
              accuracy:
                Number.isFinite(
                  accuracy ?? NaN,
                )
                  ? accuracy
                  : null,
              heading:
                Number.isFinite(
                  heading ?? NaN,
                )
                  ? heading
                  : null,
              speed:
                Number.isFinite(
                  speed ?? NaN,
                )
                  ? speed
                  : null,
            };

          try {
            await updateMaidCurrentLocation(
              maidId,
              location,
            );

            if (!isStopped) {
              onLocation?.(
                location,
              );
            }
          } catch (error) {
            if (isStopped) {
              return;
            }

            const normalizedError =
              normalizeError(
                error,
                'Unable to update current location.',
              );

            console.error(
              '[MaidLocation] Location update failed:',
              normalizedError,
            );

            onError?.(
              normalizedError,
            );
          }
        },
      );
  } catch (error) {
    const normalizedError =
      normalizeError(
        error,
        'Unable to start location tracking.',
      );

    console.error(
      '[MaidLocation] Tracking start failed:',
      normalizedError,
    );

    onError?.(
      normalizedError,
    );
  }

  /*
   * Unified cleanup function.
   */
  return () => {
    isStopped = true;

    if (watcher) {
      watcher.remove();
      watcher = null;
    }
  };
}