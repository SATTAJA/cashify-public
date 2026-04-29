import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    title: "Kelola Uangmu Dengan Mudah",
    subtitle:
      "Catat pengeluaran & pemasukan harian langsung dari genggaman.",
    image: require("../assets/images/dompet1.png"),
  },
  {
    id: "2",
    title: "Lihat Ke Mana Uangmu Pergi",
    subtitle:
      "Visualisasi saldo dan histori pengeluaran agar kamu tetap bijak.",
    image: require("../assets/images/uang.png"),
  },
  {
    id: "3",
    title: "",
    subtitle: "",
    image: null,
  },
];

const Onboarding: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<Animated.FlatList<any>>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // ✅ CHECK SESSION (FIXED)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedSession = await AsyncStorage.getItem("session");
        if (storedSession) {
          const { access_token, refresh_token } = JSON.parse(storedSession);
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (!error && data.session) {
            router.replace("/home");
          }
        }
      } catch (err) {
        console.log("Session error:", err);
      }
    };
    checkSession();
  }, []);

  // 🎬 animation
  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
      });
    } else {
      await AsyncStorage.setItem("theme", theme);
      router.push("/auth");
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item, index }) => {
          // 🎯 SLIDE 3 (THEME PICKER)
          if (index === 2) {
            return (
              <View style={{ width, alignItems: "center", marginTop: 200 }}>
                <Text style={styles.title}>Pilih Tampilan Kamu</Text>
                <Text style={styles.subtitle}>
                  Sesuaikan dengan gaya kamu 😎
                </Text>

                <View style={styles.themeContainer}>
                  {/* DARK */}
                  <TouchableOpacity
                    onPress={() => setTheme("dark")}
                    style={[
                      styles.themeCard,
                      theme === "dark" && styles.themeActive,
                    ]}
                  >
                    <Text style={styles.themeIcon}>🌙</Text>
                    <Text style={styles.themeText}>Gelap</Text>
                  </TouchableOpacity>

                  {/* LIGHT */}
                  <TouchableOpacity
                    onPress={() => setTheme("light")}
                    style={[
                      styles.themeCard,
                      styles.lightCard,
                      theme === "light" && styles.themeActiveLight,
                    ]}
                  >
                    <Text style={styles.themeIcon}>☀️</Text>
                    <Text style={styles.themeTextLight}>Cerah</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <View style={{ width, alignItems: "center" }}>
              <View style={styles.imageWrapper}>
                <Image source={item.image} style={styles.image} />
              </View>

              <View style={styles.textWrapper}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* DOTS */}
      <View style={styles.dotsWrapper}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === currentIndex ? "#44DA76" : "#777" },
            ]}
          />
        ))}
      </View>

      {/* BUTTON */}
      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>
          {currentIndex === slides.length - 1
            ? "Mulai Sekarang!"
            : "Lanjut"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Onboarding;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151716",
    justifyContent: "center",
  },
  imageWrapper: {
    marginTop: 200,
    width: 380,
    height: 380,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: 400,
    height: 400,
    borderRadius: 500,
  },
  textWrapper: {
    paddingHorizontal: 25,
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    color: "white",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "white",
    marginTop: 10,
  },

  dotsWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 25,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },

  button: {
    backgroundColor: "#44DA76",
    paddingVertical: 16,
    borderRadius: 30,
    marginHorizontal: 30,
    marginBottom: 60,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },

  // 🎨 THEME UI
  themeContainer: {
    flexDirection: "row",
    marginTop: 40,
    gap: 20,
  },
  themeCard: {
    width: 130,
    height: 150,
    borderRadius: 25,
    backgroundColor: "#1E1E1E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#333",
  },
  lightCard: {
    backgroundColor: "#fff",
  },
  themeActive: {
    borderColor: "#44DA76",
  },
  themeActiveLight: {
    borderColor: "#FFD93D",
  },
  themeIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  themeText: {
    color: "white",
    fontWeight: "bold",
  },
  themeTextLight: {
    color: "black",
    fontWeight: "bold",
  },
});