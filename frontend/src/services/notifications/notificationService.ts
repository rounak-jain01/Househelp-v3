import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import {
  getMessaging,
  getToken,
  onTokenRefresh,
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

export type NotificationPayload = {
  type?: string;
  bookingId?: string;
};

const ANDROID_CHANNEL_ID = 'homehelp-default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function createAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    ANDROID_CHANNEL_ID,
    {
      name: 'HomeHelp',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    },
  );
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await createAndroidNotificationChannel();

    const currentPermission =
      await Notifications.getPermissionsAsync();

    let status = currentPermission.status;

    if (status !== 'granted') {
      const requestedPermission =
        await Notifications.requestPermissionsAsync();

      status = requestedPermission.status;
    }

    if (status !== 'granted') {
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

export async function getHomeHelpFcmToken(): Promise<string | null> {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    const hasPermission =
      await requestNotificationPermission();

    if (!hasPermission) {
      return null;
    }

    const token = await getToken(getMessaging());

    if (!token) {
      console.warn(
        '[Notifications] FCM token is empty.',
      );
      return null;
    }

    return token;
  } catch (error) {
    console.error(
      '[Notifications] Failed to get FCM token:',
      error,
    );
    return null;
  }
}

export async function registerFcmToken(
  collectionName: 'users' | 'maids',
  uid: string,
): Promise<string | null> {
  if (!uid) {
    return null;
  }

  try {
    const token = await getHomeHelpFcmToken();

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

export async function removeFcmToken(
  uid: string,
  token: string,
  role: 'customer' | 'maid',
): Promise<void> {
  const normalizedUid = uid.trim();
  const normalizedToken = token.trim();

  if (!normalizedUid || !normalizedToken) {
    return;
  }

  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser || currentUser.uid !== normalizedUid) {
      console.warn(
        `[Notifications] Skipping FCM token removal because auth user changed: ${normalizedUid}`,
      );
      return;
    }

    const collectionName =
      role === 'maid' ? 'maids' : 'users';

    await updateDoc(
      doc(
        getFirestore(),
        collectionName,
        normalizedUid,
      ),
      {
        fcmTokens: arrayRemove(normalizedToken),
      },
    );

    console.log(
      `[Notifications] FCM token removed from ${collectionName}/${normalizedUid}`,
    );
  } catch (error) {
    console.warn(
      '[Notifications] Failed to remove FCM token:',
      error,
    );
  }
}

export function subscribeToFcmTokenRefresh(
  collectionName: 'users' | 'maids',
  uid: string,
) {
  const messaging = getMessaging();

  return onTokenRefresh(
    messaging,
    async (newToken) => {
      if (!newToken || !uid) {
        return;
      }

      try {
        const currentUser = getAuth().currentUser;

        if (!currentUser || currentUser.uid !== uid) {
          return;
        }

        await updateDoc(
          doc(
            getFirestore(),
            collectionName,
            uid,
          ),
          {
            fcmTokens: arrayUnion(newToken),
          },
        );

        console.log(
          `[Notifications] Refreshed FCM token saved for ${collectionName}/${uid}`,
        );
      } catch (error) {
        console.error(
          '[Notifications] Failed to save refreshed token:',
          error,
        );
      }
    },
  );
}

export async function registerCurrentUserNotificationToken(
  role: 'customer' | 'maid',
): Promise<{
  token: string | null;
  unsubscribe: () => void;
} | null> {
  const user = getAuth().currentUser;

  if (!user) {
    return null;
  }

  const collectionName =
    role === 'maid' ? 'maids' : 'users';

  const token = await registerFcmToken(
    collectionName,
    user.uid,
  );

  const unsubscribe = subscribeToFcmTokenRefresh(
    collectionName,
    user.uid,
  );

  return {
    token,
    unsubscribe,
  };
}

/**
 * Background notification display is intentionally delegated to Android/FCM.
 * A normal FCM notification payload will be shown automatically when the app
 * is backgrounded or terminated.
 */
export function configureBackgroundNotifications(): void {
  // Intentionally no JS background handler.
}

export function subscribeToForegroundNotifications() {
  return onMessage(
    getMessaging(),
    async (remoteMessage) => {
      try {
        await createAndroidNotificationChannel();

        const title =
          remoteMessage.notification?.title ?? 'HomeHelp';

        const body =
          remoteMessage.notification?.body ??
          'You have a new notification.';

        const data: NotificationPayload = {
          type:
            typeof remoteMessage.data?.type === 'string'
              ? remoteMessage.data.type
              : undefined,
          bookingId:
            typeof remoteMessage.data?.bookingId === 'string'
              ? remoteMessage.data.bookingId
              : undefined,
        };

        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data,
          },
          trigger: null,
        });

        console.log(
          '[Notifications] Foreground notification displayed.',
          remoteMessage.messageId,
        );
      } catch (error) {
        console.error(
          '[Notifications] Foreground notification failed:',
          error,
        );
      }
    },
  );
}

export function subscribeToNotificationResponse(
  callback: (payload: NotificationPayload) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data =
        response.notification.request.content.data as
          | NotificationPayload
          | undefined;

      callback({
        type:
          typeof data?.type === 'string'
            ? data.type
            : undefined,
        bookingId:
          typeof data?.bookingId === 'string'
            ? data.bookingId
            : undefined,
      });
    },
  );
}

export async function getInitialNotificationResponse(): Promise<NotificationPayload | null> {
  try {
    const response =
      await Notifications.getLastNotificationResponseAsync();

    if (!response) {
      return null;
    }

    const data =
      response.notification.request.content.data as
        | NotificationPayload
        | undefined;

    return {
      type:
        typeof data?.type === 'string'
          ? data.type
          : undefined,
      bookingId:
        typeof data?.bookingId === 'string'
          ? data.bookingId
          : undefined,
    };
  } catch (error) {
    console.error(
      '[Notifications] Failed to read initial notification:',
      error,
    );
    return null;
  }
}
