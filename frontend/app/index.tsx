import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';

import {
  getAuth,
  onAuthStateChanged,
} from '@react-native-firebase/auth';

import {
  doc,
  getDoc,
  getFirestore,
} from '@react-native-firebase/firestore';

type AppRole = 'customer' | 'maid';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setIsAuthenticated(false);
          setRole(null);
          setIsLoading(false);
          return;
        }

        try {
          setIsAuthenticated(true);

          const firestore = getFirestore();

          // First check maid profile.
          const maidRef = doc(
            firestore,
            'maids',
            user.uid,
          );

          const maidSnapshot = await getDoc(
            maidRef,
          );

          if (maidSnapshot.exists()) {
            setRole('maid');
            return;
          }

          // Then check customer/user profile.
          const userRef = doc(
            firestore,
            'users',
            user.uid,
          );

          const userSnapshot = await getDoc(
            userRef,
          );

          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();

            if (userData.role === 'maid') {
              setRole('maid');
            } else if (userData.role === 'customer') {
              setRole('customer');
            }
          }
        } catch (error) {
          console.error(
            '[Index] Role detection failed:',
            error,
          );
        } finally {
          setIsLoading(false);
        }
      },
    );

    return unsubscribe;
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#1F7A4C"
        />

        <Text style={styles.text}>
          Loading HomeHelp...
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/welcome" />;
  }

  if (role === 'customer') {
    return <Redirect href="/customer" />;
  }

  if (role === 'maid') {
    return <Redirect href="/maid" />;
  }

  // Authenticated but profile/role not created yet.
  return <Redirect href="/auth/permissions" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8F6',
  },

  text: {
    marginTop: 12,
    fontSize: 13,
    color: '#777777',
  },
});