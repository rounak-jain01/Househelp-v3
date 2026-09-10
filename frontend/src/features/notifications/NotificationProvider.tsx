import {
  ReactNode,
  useEffect,
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
  registerCurrentUserNotificationToken,
} from '../../services/notifications/notificationService';

type Props = {
  children: ReactNode;
};

async function getUserRole(
  uid: string,
): Promise<'customer' | 'maid' | null> {
  const db = getFirestore();

  const customerSnapshot = await getDoc(
    doc(
      db,
      'users',
      uid,
    ),
  );

  if (customerSnapshot.exists()) {
    return 'customer';
  }

  const maidSnapshot = await getDoc(
    doc(
      db,
      'maids',
      uid,
    ),
  );

  if (maidSnapshot.exists()) {
    return 'maid';
  }

  return null;
}

export default function NotificationProvider({
  children,
}: Props) {
  useEffect(() => {
    let isMounted = true;
    let unsubscribeTokenRefresh: (() => void) | null = null;

    const unsubscribeAuth =
      onAuthStateChanged(
        getAuth(),
        async (user) => {
          if (!user || !isMounted) {
            return;
          }

          try {
            const role =
              await getUserRole(user.uid);

            if (!role || !isMounted) {
              return;
            }

            unsubscribeTokenRefresh =
              await registerCurrentUserNotificationToken(
                role,
              );
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

      if (unsubscribeTokenRefresh) {
        unsubscribeTokenRefresh();
        unsubscribeTokenRefresh = null;
      }

      unsubscribeAuth();
    };
  }, []);

  return children;
}