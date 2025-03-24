import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";
import { NavigationContainer } from "@react-navigation/native";

export default function RootLayout() {
  return (
    <>
      {/* <NavigationContainer> */}
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "white" },
          animation: "slide_from_right",
        }}
      />
      {/* </NavigationContainer> */}
    </>
  );
}
