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

export async function requestMaidLocationPermission(): Promise<boolean> {
  const {
    status: existingStatus,
  } = await Location.getForegroundPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  const {
    status,
  } = await Location.requestForegroundPermissionsAsync();

  return status === 'granted';
}

export async function getMaidCurrentLocation(): Promise<MaidCurrentLocation> {
  const hasPermission =
    await requestMaidLocationPermission();

  if (!hasPermission) {
    throw new Error(
      'Location permission is required to receive nearby booking requests.',
    );
  }

  const position =
    await Location.getCurrentPositionAsync({
      accuracy:
        Location.Accuracy.Balanced,
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
    accuracy,
    heading,
    speed,
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

export async function startMaidLocationTracking(
  maidId: string,
  onLocation?: (
    location: MaidCurrentLocation,
  ) => void,
  onError?: (
    error: Error,
  ) => void,
): Promise<() => void> {
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

  try {
    const subscription =
      await Location.watchPositionAsync(
        {
          accuracy:
            Location.Accuracy.Balanced,
          timeInterval: 60_000,
          distanceInterval: 100,
        },
        async (position) => {
          const {
            latitude,
            longitude,
            accuracy,
            heading,
            speed,
          } = position.coords;

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
              accuracy,
              heading,
              speed,
            };

          try {
            await updateMaidCurrentLocation(
              maidId,
              location,
            );

            onLocation?.(
              location,
            );
          } catch (error) {
            const normalizedError =
              error instanceof Error
                ? error
                : new Error(
                    'Unable to update current location.',
                  );

            onError?.(
              normalizedError,
            );
          }
        },
      );

    return () => {
      subscription.remove();
    };
  } catch (error) {
    const normalizedError =
      error instanceof Error
        ? error
        : new Error(
            'Unable to start location tracking.',
          );

    onError?.(
      normalizedError,
    );

    return () => undefined;
  }
}