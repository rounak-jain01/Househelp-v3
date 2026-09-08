import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
} from '@react-native-firebase/firestore';

export default function AuthGate() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);

  const hasNavigated = useRef(false);

  useEffect(() => {
    const auth = getAuth();
    const firestore = getFirestore();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (hasNavigated.current) {
        return;
      }

      try {
        console.log(
          '[AuthGate] Auth state:',
          user ? user.uid : 'NO USER',
        );

        if (!user) {
          hasNavigated.current = true;
          setChecking(false);
          router.replace('/auth/welcome');
          return;
        }

        const customerRef = doc(
          firestore,
          'users',
          user.uid,
        );

        const customerSnapshot = await getDoc(customerRef);

        console.log(
          '[AuthGate] Customer profile exists:',
          customerSnapshot.exists(),
        );

        if (customerSnapshot.exists()) {
          const customerData = customerSnapshot.data();

          console.log(
            '[AuthGate] Customer role:',
            customerData?.role,
          );

          if (customerData?.role === 'customer') {
            hasNavigated.current = true;
            setChecking(false);

            console.log('[AuthGate] → Customer Home');

            router.replace('/customer');

            return;
          }
        }

        const maidRef = doc(
          firestore,
          'maids',
          user.uid,
        );

        const maidSnapshot = await getDoc(maidRef);

        if (maidSnapshot.exists()) {
          const maidData = maidSnapshot.data();

          if (maidData?.role === 'maid') {
            hasNavigated.current = true;
            setChecking(false);

            console.log('[AuthGate] → Maid Home');

            router.replace('/maid');

            return;
          }
        }

        hasNavigated.current = true;
        setChecking(false);

        router.replace('/auth/permissions');
      } catch (error) {
        console.error(
          '[AuthGate] Failed:',
          error,
        );

        hasNavigated.current = true;
        setChecking(false);

        router.replace('/auth/welcome');
      }
    });

    return unsubscribe;
  }, []);

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size="small"
          color="#172018"
        />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAF9',
  },
});