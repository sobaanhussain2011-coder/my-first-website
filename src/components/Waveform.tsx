import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors } from "../theme";

export function Waveform({ active }: { active: boolean }) {
  const bars = useRef(
    Array.from({ length: 18 }, () => new Animated.Value(0.25))
  ).current;

  useEffect(() => {
    if (!active) {
      bars.forEach((b) => b.setValue(0.25));
      return;
    }
    const loops = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 0.35 + ((i * 19) % 65) / 100,
            duration: 220 + (i % 5) * 40,
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.9 - ((i * 11) % 45) / 100,
            duration: 260 + (i % 4) * 35,
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, bars]);

  return (
    <View style={styles.row}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              transform: [{ scaleY: bar }],
              backgroundColor:
                i % 3 === 0 ? colors.purpleBright : colors.blue,
              opacity: active ? 1 : 0.25,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  bar: {
    width: 4,
    height: 48,
    borderRadius: 2,
  },
});
