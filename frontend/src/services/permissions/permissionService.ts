import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Homehelp',
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();

  return requested.granted;
}

export async function requestLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();

  if (current.granted) {
    return true;
  }

  const requested = await Location.requestForegroundPermissionsAsync();

  return requested.granted;
}

export async function requestPostAuthPermissions() {
  const notificationGranted = await requestNotificationPermission();
  const locationGranted = await requestLocationPermission();

  return {
    notificationGranted,
    locationGranted,
  };
}