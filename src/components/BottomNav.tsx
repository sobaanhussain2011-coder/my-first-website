import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import type { TabId } from "../types";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "recordings", label: "Recordings", icon: "◈" },
  { id: "favorites", label: "Favorites", icon: "★" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

type Props = {
  active: TabId;
  onChange: (tab: TabId) => void;
};

export function BottomNav({ active, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.item, on && styles.itemOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.icon, on && styles.iconOn]}>{tab.icon}</Text>
            <Text style={[styles.label, on && styles.labelOn]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
  },
  itemOn: {
    backgroundColor: "rgba(139, 92, 246, 0.18)",
  },
  icon: {
    fontSize: 14,
    color: colors.textDim,
    marginBottom: 4,
  },
  iconOn: {
    color: colors.purpleBright,
  },
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: colors.textDim,
  },
  labelOn: {
    color: colors.text,
    fontFamily: "DMSans_700Bold",
  },
});
