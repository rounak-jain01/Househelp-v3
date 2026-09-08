import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { requestPostAuthPermissions } from '../../services/permissions/permissionService';

export default function PostAuthPermissionScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    try {
      setIsLoading(true);

      await requestPostAuthPermissions();

      router.replace('/auth/profile');
    } catch (error) {
      console.error('Permission request failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>A couple of permissions</Text>

        <Text style={styles.subtitle}>
          Homehelp uses these permissions to keep you updated and provide
          location-based services.
        </Text>

        <View style={styles.permissionCard}>
          <Text style={styles.icon}>🔔</Text>
          <View style={styles.permissionText}>
            <Text style={styles.permissionTitle}>Notifications</Text>
            <Text style={styles.permissionDescription}>
              Get booking requests, confirmations and important updates.
            </Text>
          </View>
        </View>

        <View style={styles.permissionCard}>
          <Text style={styles.icon}>📍</Text>
          <View style={styles.permissionText}>
            <Text style={styles.permissionTitle}>Location</Text>
            <Text style={styles.permissionDescription}>
              Make address selection and location-based services easier.
            </Text>
          </View>
        </View>
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
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  content: {
    gap: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#111111',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666666',
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#F7F8F8',
  },
  icon: {
    fontSize: 26,
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 5,
  },
  permissionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#707070',
  },
  button: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});