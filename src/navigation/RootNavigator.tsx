import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { colors } from "../theme/colors";
import { DashboardScreen } from "../screens/DashboardScreen";
import { DocumentsScreen } from "../screens/DocumentsScreen";
import { InterviewsScreen } from "../screens/InterviewsScreen";
import { OpportunityDetailScreen } from "../screens/OpportunityDetailScreen";
import { PipelineScreen } from "../screens/PipelineScreen";
import { SyncScreen } from "../screens/SyncScreen";
import { MainTabParamList, RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8
        },
        tabBarIcon: ({ color, size }) => {
          const iconName = {
            Dashboard: "grid-outline",
            Sync: "sync-outline",
            Pipeline: "briefcase-outline",
            Documents: "document-text-outline",
            Interviews: "calendar-outline"
          }[route.name] as keyof typeof Ionicons.glyphMap;

          return <Ionicons name={iconName} color={color} size={size} />;
        }
      })}
    >
      <Tabs.Screen name="Dashboard" component={DashboardScreen} />
      <Tabs.Screen name="Sync" component={SyncScreen} />
      <Tabs.Screen name="Pipeline" component={PipelineScreen} />
      <Tabs.Screen name="Documents" component={DocumentsScreen} />
      <Tabs.Screen name="Interviews" component={InterviewsScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "800" }
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} options={{ title: "Opportunity" }} />
    </Stack.Navigator>
  );
}
