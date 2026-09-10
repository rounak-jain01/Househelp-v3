import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import {
  getMessaging,
  getToken,
  onTokenRefresh,
  requestPermission,
  AuthorizationStatus,
  onMessage,
} from '@react-native-firebase/messaging';

import {
  arrayUnion,
  arrayRemove,
  doc,
  getFirestore,
  updateDoc,
} from '@react-native-firebase/firestore';

import { getAuth } from '@react-native-firebase/auth';

/**
 * Foreground notification behaviour.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Android notification channel.
 */
async function createAndroidNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    'homehelp-default',
    {
      name: 'HomeHelp',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    },
  );
}

/**
 * Ask notification permission.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await createAndroidNotificationChannel();

    const currentPermission =
      await Notifications.getPermissionsAsync();

    let expoStatus = currentPermission.status;

    if (expoStatus !== 'granted') {
      const requestedPermission =
        await Notifications.requestPermissionsAsync();

      expoStatus = requestedPermission.status;
    }

    if (expoStatus !== 'granted') {
      console.warn(
        '[Notifications] Notification permission not granted.',
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      '[Notifications] Permission request failed:',
      error,
    );

    return false;
  }
}

/**
 * Get native FCM token.
 */
export async function getHomeHelpFcmToken(): Promise<
  string | null
> {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    const hasPermission =
      await requestNotificationPermission();

    if (!hasPermission) {
      return null;
    }

    const messaging = getMessaging();

    const token = await getToken(messaging);

    if (!token) {
      console.warn(
        '[Notifications] FCM token is empty.',
      );
      return null;
    }

    console.log(
      '[Notifications] FCM token received.',
    );

    return token;
  } catch (error) {
    console.error(
      '[Notifications] Failed to get FCM token:',
      error,
    );

    return null;
  }
}

/**
 * Save FCM token to customer/maid profile.
 */
export async function registerFcmToken(
  collectionName: 'users' | 'maids',
  uid: string,
): Promise<string | null> {
  if (!uid) {
    return null;
  }

  try {
    const token =
      await getHomeHelpFcmToken();

    if (!token) {
      return null;
    }

    await updateDoc(
      doc(
        getFirestore(),
        collectionName,
        uid,
      ),
      {
        fcmTokens: arrayUnion(token),
      },
    );

    console.log(
      `[Notifications] Token saved for ${collectionName}/${uid}`,
    );

    return token;
  } catch (error) {
    console.error(
      '[Notifications] Failed to save FCM token:',
      error,
    );

    return null;
  }
}

/**
 * Remove current device token.
 */
export async function removeFcmToken(
  collectionName: 'users' | 'maids',
  uid: string,
  token?: string,
): Promise<void> {
  if (!uid) {
    return;
  }

  try {
    let tokenToRemove = token;

    if (!tokenToRemove) {
      tokenToRemove =
        await getToken(
          getMessaging(),
        );
    }

    if (!tokenToRemove) {
      return;
    }

    await updateDoc(
      doc(
        getFirestore(),
        collectionName,
        uid,
      ),
      {
        fcmTokens: arrayRemove(
          tokenToRemove,
        ),
      },
    );

    console.log(
      `[Notifications] Token removed for ${collectionName}/${uid}`,
    );
  } catch (error) {
    console.error(
      '[Notifications] Failed to remove FCM token:',
      error,
    );
  }
}

/**
 * Listen for FCM token changes.
 */
export function subscribeToFcmTokenRefresh(
  collectionName: 'users' | 'maids',
  uid: string,
) {
  return () => {
    // Token refresh listener temporarily disabled.
  };
}

/**
 * Register notification token for current user
 * and return token-refresh unsubscribe function.
 */
export async function registerCurrentUserNotificationToken(
  role: 'customer' | 'maid',
): Promise<(() => void) | null> {
  const user = getAuth().currentUser;

  if (!user) {
    return null;
  }

  const collectionName =
    role === 'maid'
      ? 'maids'
      : 'users';

  await registerFcmToken(
    collectionName,
    user.uid,
  );

  return subscribeToFcmTokenRefresh(
    collectionName,
    user.uid,
  );
}

/**
 * Background FCM handler.
 *
 * This must be registered once when the app starts.
 */
export function configureBackgroundNotifications(): void {
  // Background notification display is handled by
  // Android/FCM when the server sends a notification payload.
  //
  // We intentionally do not register
  // setBackgroundMessageHandler() here because the current
  // Android native build is throwing:
  // Native module NativeRNFBTurboMessaging is not registered.
}

/**
 * Foreground FCM listener.
 *
 * Since FCM foreground messages do not automatically create
 * a visible Android notification, we create an Expo local
 * notification from the FCM payload.
 */
export function subscribeToForegroundNotifications() {
  // Foreground FCM listener is temporarily disabled.
  //
  // The current Android native build is reporting:
  // NativeRNFBTurboMessaging is not registered.
  //
  // Background notification testing does not require
  // a JS foreground listener when the backend sends
  // a standard notification payload.

  return () => {
    // no-op cleanup
  };
}

/**
 * Notification tap listener.
 */
export function subscribeToNotificationResponse(
  callback: (payload: {
    type?: string;
    bookingId?: string;
  }) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data =
        response.notification.request.content
          .data as {
          type?: string;
          bookingId?: string;
        };

      callback({
        type: data?.type,
        bookingId: data?.bookingId,
      });
    },
  );
}

/**
 * Get notification response when app was opened
 * from a completely closed state.
 */
export async function getInitialNotificationResponse(): Promise<{
  type?: string;
  bookingId?: string;
} | null> {
  const response =
    await Notifications.getLastNotificationResponseAsync();

  if (!response) {
    return null;
  }

  const data =
    response.notification.request.content
      .data as {
      type?: string;
      bookingId?: string;
    };

  return {
    type: data?.type,
    bookingId: data?.bookingId,
  };
}