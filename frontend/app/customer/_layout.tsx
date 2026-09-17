import { Stack, usePathname } from "expo-router";

import CustomerBottomNav from "../../src/components/CustomerBottomNav";

export default function CustomerLayout() {
  const pathname = usePathname();

  // Booking flow has its own screen actions.
  // Keep the persistent customer bottom navigation hidden there.
  const isBookingFlow = pathname.includes("/customer/booking/");

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: {
            backgroundColor: "#FAFAF8",
          },
        }}
      />

      {!isBookingFlow && <CustomerBottomNav />}
    </>
  );
}

