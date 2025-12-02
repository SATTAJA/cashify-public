import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,

        // 🔥 Pilihan animasi yang clean dan Gen-Z minimalis
        // "fade" = yang paling smooth & modern
        animation: "none",
      }}
    />
  );
}
