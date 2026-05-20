import React, { useRef } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";

export default function FloatingScanButton() {
  const scaleAnim = useRef(
    new Animated.Value(1)
  ).current;

  const animateIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 30,
      bounciness: 3,
    }).start();
  };

  const animateOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };
  const handlePress = () => {
    router.push("/scan");
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={animateIn}
        onPressOut={animateOut}
        // onPress={() => router.push("/scan")}
      >
        {/* OUTER DARK SHADOW */}
        <View style={styles.shadowCircle}>
          {/* DARK MID LAYER */}
          <View style={styles.darkLayer}>
            {/* GREEN BASE */}
            <View style={styles.greenBase}>
              {/* GREEN TOP BUTTON */}
              <View style={styles.greenTop}>
                <Image
                  source={require("../assets/images/scan-icon.png")}
                  style={styles.icon}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 28,
    right: 24,
  },

  // SHADOW PALING LUAR
  shadowCircle: {
    width: 82,
    height: 82,
    borderRadius: 999,

    backgroundColor: "#181818",

    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    elevation: 2,
  },

  // LAYER GELAP
  darkLayer: {
    width: 74,
    height: 74,
    borderRadius: 999,

    backgroundColor: "#2B2B2B",

    justifyContent: "center",
    alignItems: "center",
  },

  // HIJAU BAWAH (EFEK TIMBUL)
  greenBase: {
    width: 60,
    height: 60,
    borderRadius: 999,

    backgroundColor: "#2FBF62",

    justifyContent: "flex-start",
    alignItems: "center",

    paddingTop: 4,
  },

  // HIJAU ATAS
  greenTop: {
    width: 50,
    height: 50,
    borderRadius: 999,

    backgroundColor: "#44DA76",

    justifyContent: "center",
    alignItems: "center",
  },

  // ICON
  icon: {
    width: 50,
    height: 50,
  },
});