import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme";

type Props = {
  listening: boolean;
  onPress: () => void;
};

export function MicButton({ listening, onPress }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!listening) {
      pulse.setValue(1);
      ring.setValue(0);
      return;
    }
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.07,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ring, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(ring, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    ringLoop.start();
    return () => {
      pulseLoop.stop();
      ringLoop.stop();
    };
  }, [listening, pulse, ring]);

  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.55],
  });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });

  return (
    <View style={styles.wrap}>
      {listening ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { opacity: ringOpacity, transform: [{ scale: ringScale }] },
          ]}
        />
      ) : null}
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={listening ? "Stop recording" : "Start recording"}
          style={({ pressed }) => [pressed && { opacity: 0.92 }]}
        >
          <LinearGradient
            colors={
              listening
                ? [colors.purpleBright, colors.purpleDeep]
                : [colors.purple, colors.purpleDeep]
            }
            style={styles.btn}
          >
            <View style={[styles.glyph, listening && styles.glyphStop]} />
            <Text style={styles.label}>{listening ? "STOP" : "MIC"}</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 2,
    borderColor: colors.purpleBright,
  },
  btn: {
    width: 118,
    height: 118,
    borderRadius: 59,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  glyph: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
  },
  glyphStop: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  label: {
    color: colors.white,
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    letterSpacing: 1.5,
  },
});
