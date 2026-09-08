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

  const handleContinue = async () => {
    try {
      setIsLoading(true);

      await requestPostAuthPermissions();

      if (role === 'maid') {
        router.replace(
          '/maid/onboarding',
        );
        return;
      }

      router.replace('/auth/profile');
    } catch (error) {
      console.error(
        '[Permissions] Permission request failed:',
        error,
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
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed &&
            styles.buttonPressed,
          isLoading &&
            styles.buttonDisabled,
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