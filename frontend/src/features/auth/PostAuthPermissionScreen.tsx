import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  getAuth,
} from '@react-native-firebase/auth';

import {
  collection,
  doc,
  getDoc,
  getFirestore,
} from '@react-native-firebase/firestore';

import { requestPostAuthPermissions } from '../../services/permissions/permissionService';

type AuthRole = 'user' | 'maid';

export default function PostAuthPermissionScreen() {
  const router = useRouter();

  const { role } =
    useLocalSearchParams<{
      role?: AuthRole;
    }>();

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  const handleContinue = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setErrorMessage('');

      /*
       * Get currently authenticated Firebase user.
       */
      const currentUser =
        getAuth().currentUser;

      if (!currentUser) {
        setErrorMessage(
          'Your session has expired. Please verify your phone number again.',
        );
        return;
      }

      /*
       * Ask for notification/location permissions.
       */
      await requestPostAuthPermissions();

      const uid = currentUser.uid;
      const db = getFirestore();

      /*
       * Build references using Firebase modular API.
       */
      const customerRef = doc(
        collection(db, 'users'),
        uid,
      );

      const maidRef = doc(
        collection(db, 'maids'),
        uid,
      );

      /*
       * Check whether a customer or maid profile
       * already exists for this Firebase UID.
       */
      const [
        customerSnapshot,
        maidSnapshot,
      ] = await Promise.all([
        getDoc(customerRef),
        getDoc(maidRef),
      ]);

      /*
       * Existing Customer
       */
      if (customerSnapshot.exists()) {
        router.replace('/customer');
        return;
      }

      /*
       * Existing Maid
       */
      if (maidSnapshot.exists()) {
        router.replace('/maid');
        return;
      }

      /*
       * No profile exists.
       * This is a new account.
       */
      if (role === 'maid') {
        router.replace('/maid/onboarding');
        return;
      }

      /*
       * Default new-user flow = Customer.
       */
      router.replace('/auth/profile');
    } catch (error) {
      console.error(
        '[Permissions] Permission/navigation failed:',
        error,
      );

      setErrorMessage(
        'Something went wrong. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          ONE LAST STEP
        </Text>

        <Text style={styles.title}>
          A couple of permissions
        </Text>

        <Text style={styles.subtitle}>
          HomeHelp uses these permissions to
          keep you updated and provide
          location-based services.
        </Text>

        <View style={styles.permissionCard}>
          <Text style={styles.icon}>🔔</Text>

          <View style={styles.permissionText}>
            <Text style={styles.permissionTitle}>
              Notifications
            </Text>

            <Text
              style={
                styles.permissionDescription
              }
            >
              Get booking requests,
              confirmations and important
              updates.
            </Text>
          </View>
        </View>

        <View style={styles.permissionCard}>
          <Text style={styles.icon}>📍</Text>

          <View style={styles.permissionText}>
            <Text style={styles.permissionTitle}>
              Location
            </Text>

            <Text
              style={
                styles.permissionDescription
              }
            >
              Make address selection and
              location-based services easier.
            </Text>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          isLoading && styles.buttonDisabled,
        ]}
        onPress={handleContinue}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator
            color="#FFFFFF"
          />
        ) : (
          <Text style={styles.buttonText}>
            Continue
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6',
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },

  content: {
    gap: 22,
  },

  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: '800',
    color: '#1F7A4C',
  },

  title: {
    marginTop: -8,
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '800',
    color: '#111111',
  },

  subtitle: {
    marginTop: -6,
    fontSize: 15,
    lineHeight: 23,
    color: '#707570',
  },

  permissionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EAE7',
  },

  icon: {
    fontSize: 26,
  },

  permissionText: {
    flex: 1,
  },

  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 5,
  },

  permissionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#777C78',
  },

  errorCard: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#FFF2F0',
    borderWidth: 1,
    borderColor: '#F3C9C3',
  },

  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#B42318',
    fontWeight: '600',
  },

  button: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#1F7A4C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonPressed: {
    opacity: 0.82,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});