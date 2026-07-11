import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { OpportunityCard } from "../components/OpportunityCard";
import { Screen } from "../components/Screen";
import { opportunities } from "../data/seed";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { OpportunityStage } from "../types/career";

type Filter = "all" | OpportunityStage;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

const filters: Filter[] = ["all", "saved", "applied", "recruiter", "interviewing", "offer"];

export function PipelineScreen() {
  const navigation = useNavigation<Navigation>();
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = useMemo(
    () => opportunities.filter((opportunity) => filter === "all" || opportunity.stage === filter),
    [filter]
  );

  return (
    <Screen>
      <View>
        <Text style={styles.eyebrow}>Unified database</Text>
        <Text style={styles.title}>Opportunity pipeline</Text>
      </View>

      <View style={styles.filters}>
        {filters.map((item) => (
          <Pressable
            key={item}
            style={[styles.filter, filter === item && styles.filterActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      {filtered.map((opportunity) => (
        <OpportunityCard
          key={opportunity.id}
          opportunity={opportunity}
          onPress={() => navigation.navigate("OpportunityDetail", { opportunityId: opportunity.id })}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  filter: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  filterActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  filterText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  filterTextActive: {
    color: colors.surface
  }
});
