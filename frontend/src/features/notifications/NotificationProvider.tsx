import {
  ReactNode,
  useEffect,
  useRef,
} from 'react';

import {
  getAuth,
  onAuthStateChanged,
} from '@react-native-firebase/auth';

import {
  doc,
  getDoc,
  getFirestore,
} from '@react-native-firebase/firestore';

import {
  router,
} from 'expo-router';

import {
  getInitialNotificationResponse,
  registerCurrentUserNotificationToken,
  removeFcmToken,
  subscribeToForegroundNotifications,
  subscribeToNotificationResponse,
} from '../../services/notifications/notificationService';

import type {
  NotificationPayload,
} from '../../services/notifications/notificationService';

type Props = {
  children: ReactNode;
};

type ActiveRegistration = {
  uid: string;
  collectionName: 'users' | 'maids';
  token: string | null;
  unsubscribe: () => void;
};

async function getUserRole(
  uid: string,
): Promise<'customer' | 'maid' | null> {
  const db = getFirestore();

  const customerSnapshot = await getDoc(
    doc(db, 'users', uid),
  );

  if (customerSnapshot.exists()) {
    return 'customer';
  }

  const maidSnapshot = await getDoc(
    doc(db, 'maids', uid),
  );

  if (maidSnapshot.exists()) {
    return 'maid';
  }

  return null;
}

function isUsableBookingId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0
  );
}

function navigateFromNotification(
  role: 'customer' | 'maid',
  payload: NotificationPayload,
): void {
  const bookingId = payload.bookingId?.trim();

  if (!isUsableBookingId(bookingId)) {
    return;
  }

  if (role === 'maid') {
    if (payload.type === 'booking_request') {
      router.push({
        pathname: '/maid/booking-request/[bookingId]',
        params: { bookingId },
      });
      return;
    }

    router.push({
      pathname: '/maid/booking/[bookingId]',
      params: { bookingId },
    });
    return;
  }

  router.push({
    pathname: '/customer/booking/[bookingId]',
    params: { bookingId },
  });
}

export default function NotificationProvider({
  children,
}: Props) {
  const activeRegistrationRef =
    useRef<ActiveRegistration | null>(null);

  const roleRef = useRef<
    'customer' | 'maid' | null
  >(null);

  const pendingInitialNotificationRef =
    useRef<NotificationPayload | null>(null);

  const initialNotificationHandledRef =
    useRef(false);

  useEffect(() => {
    let isMounted = true;

    const cleanupRegistration = async () => {
      const active =
        activeRegistrationRef.current;

      if (!active) {
        return;
      }

      activeRegistrationRef.current = null;
      active.unsubscribe();

      await removeFcmToken(
        active.collectionName,
        active.uid,
        active.token ?? undefined,
      );
    };

    const handleNotification = (
      payload: NotificationPayload,
    ) => {
      if (!isMounted) {
        return;
      }

      const role = roleRef.current;

      if (!role) {
        pendingInitialNotificationRef.current =
          payload;
        return;
      }

      navigateFromNotification(role, payload);
    };

    const foregroundUnsubscribe =
      subscribeToForegroundNotifications();

    const responseSubscription =
      subscribeToNotificationResponse(
        handleNotification,
      );

    const unsubscribeAuth =
      onAuthStateChanged(
        getAuth(),
        async (user) => {
          await cleanupRegistration();

          roleRef.current = null;

          if (!user || !isMounted) {
            return;
          }

          try {
            const role = await getUserRole(
              user.uid,
            );

            if (!role || !isMounted) {
              return;
            }

            roleRef.current = role;

            const registration =
              await registerCurrentUserNotificationToken(
                role,
              );

            if (!isMounted) {
              registration?.unsubscribe();
              return;
            }

            if (registration) {
              activeRegistrationRef.current = {
                uid: user.uid,
                collectionName:
                  role === 'maid'
                    ? 'maids'
                    : 'users',
                token: registration.token,
                unsubscribe:
                  registration.unsubscribe,
              };
            }

            if (
              !initialNotificationHandledRef.current
            ) {
              initialNotificationHandledRef.current =
                true;

              const initialPayload =
                await getInitialNotificationResponse();

              if (initialPayload) {
                handleNotification(
                  initialPayload,
                );
              }
            }

            const pendingPayload =
              pendingInitialNotificationRef.current;

            if (pendingPayload) {
              pendingInitialNotificationRef.current =
                null;
              navigateFromNotification(
                role,
                pendingPayload,
              );
            }
          } catch (error) {
            console.error(
              '[Notifications] Initialization failed:',
              error,
            );
          }
        },
      );

    return () => {
      isMounted = false;

      foregroundUnsubscribe();
      responseSubscription.remove();
      unsubscribeAuth();

      void cleanupRegistration();
    };
  }, []);

  return children;
}
