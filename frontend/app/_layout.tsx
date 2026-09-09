import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MaidLanguageProvider } from '../src/features/maid/MaidLanguageContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MaidLanguageProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </MaidLanguageProvider>
    </SafeAreaProvider>
  );
}
