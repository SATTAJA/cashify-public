import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";

export default function SplashScreen() {
  // animasi
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const textScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/onboarding");
      }
    };

    const startAnimation = () => {
      // animasi logo
      logoScale.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.exp),
      });
      logoOpacity.value = withTiming(1, { duration: 800 });

      // animasi teks
      textScale.value = withDelay(
        400,
        withTiming(1, {
          duration: 800,
          easing: Easing.out(Easing.exp),
        })
      );
      textOpacity.value = withDelay(400, withTiming(1, { duration: 800 }));

      // animasi loading dots
      const pulse = (dot: typeof dot1, delay: number) => {
        dot.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 400 }),
              withTiming(0.3, { duration: 400 })
            ),
            -1,
            false
          )
        );
      };

      pulse(dot1, 0);
      pulse(dot2, 200);
      pulse(dot3, 400);

      // pindah setelah 3.5 detik
      setTimeout(() => {
        checkSession();
      }, 3500);
    };

    startAnimation();
  }, []);

  // style animasi
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
    opacity: textOpacity.value,
  }));

  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#151716",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Animated.Image
        source={require("../assets/images/cashify-splash.png")}
        style={[
          {
            width: 140,
            height: 140,
            resizeMode: "contain",
          },
          logoStyle,
        ]}
      />
      <Animated.Text
        style={[
          {
            color: "#44DA76",
            fontSize: 32,
            fontWeight: "bold",
            marginTop: 20,
          },
          textStyle,
        ]}
      >
        Cashify
      </Animated.Text>

      <View
        style={{
          flexDirection: "row",
          marginTop: 15,
          gap: 8,
        }}
      >
        <Animated.View
          style={[
            {
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "#44DA76",
            },
            dot1Style,
          ]}
        />
        <Animated.View
          style={[
            {
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "#44DA76",
            },
            dot2Style,
          ]}
        />
        <Animated.View
          style={[
            {
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "#44DA76",
            },
            dot3Style,
          ]}
        />
      </View>
    </View>
  );
}
