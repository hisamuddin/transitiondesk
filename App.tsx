import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthGate } from "./src/components/AuthGate";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { initializeDatabase } from "./src/services/storage/sqliteRepository";

export default function App() {
  useEffect(() => {
    initializeDatabase();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthGate>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </AuthGate>
    </SafeAreaProvider>
  );
}
