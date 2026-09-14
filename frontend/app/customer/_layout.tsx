import { Stack } from 'expo-router';

import CustomerBottomNav from '../../src/components/CustomerBottomNav';

export default function CustomerLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {
            backgroundColor: '#FAFAF8',
          },
        }}
      />

      {/* One navigation bar for the complete customer flow. */}
      <CustomerBottomNav />
    </>
  );
}
