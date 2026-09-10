import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MaidLanguageProvider } from '../src/features/maid/MaidLanguageContext';
import NotificationProvider from '../src/features/notifications/NotificationProvider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MaidLanguageProvider>
        <NotificationProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </NotificationProvider>
      </MaidLanguageProvider>
    </SafeAreaProvider>
  );
}
