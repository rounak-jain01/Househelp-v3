import { Stack } from "expo-router";

import { MaidLanguageProvider } from "../../src/features/maid/MaidLanguageContext";

export default function MaidLayout() {
  return (
    <MaidLanguageProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: {
            backgroundColor: "#FAFAF8",
          },
        }}
      />
    </MaidLanguageProvider>
  );
}