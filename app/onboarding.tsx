import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  TextInput,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { getAllCurrencies } from "@/constants/currencies";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    title: "Kelola Uangmu Dengan Mudah",
    subtitle:
      "Catat pengeluaran & pemasukan harian langsung dari genggaman.",
    image: require("../assets/images/dompet1.png"),
  },
  { id: "2" },
  { id: "3" },
];

const Onboarding: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [selectedCurrency, setSelectedCurrency] = useState("IDR");
  const [search, setSearch] = useState("");
  const [currencies, setCurrencies] = useState<any[]>([]);

  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<Animated.FlatList<any>>(null);

  // ✅ INIT (OFFLINE + SESSION)
  useEffect(() => {
    const init = async () => {
      try {
        // ambil currency offline
        const data = getAllCurrencies();
        setCurrencies(data);

        // check session
        const storedSession = await AsyncStorage.getItem("session");
        if (storedSession) {
          const { access_token, refresh_token } = JSON.parse(storedSession);

          const { data: sessionData, error } =
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

          if (!error && sessionData.session) {
            router.replace("/home");
          }
        }
      } catch (err) {
        console.log("Init error:", err);
      }
    };

    init();
  }, []);

  // 🔍 FILTER
  const filteredCurrencies = currencies.filter(
    (item) =>
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
      });
    } else {
      await AsyncStorage.setItem("theme", theme);
      await AsyncStorage.setItem("currency", selectedCurrency);
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
          // =====================
          // 💰 SLIDE 2: CURRENCY
          // =====================
          if (index === 1) {
            return (
              <View style={{ width, paddingHorizontal: 20, marginTop: 120 }}>
                <Text style={styles.title}>Pilih Mata Uang</Text>
                <Text style={styles.subtitle}>
                  Semua transaksi akan pakai ini 💰
                </Text>

                <TextInput
                  placeholder="Cari mata uang..."
                  placeholderTextColor="#888"
                  value={search}
                  onChangeText={setSearch}
                  style={styles.searchInput}
                />

                <FlatList
                  data={filteredCurrencies}
                  keyExtractor={(item) => item.code}
                  showsVerticalScrollIndicator={false}
                  style={{ marginTop: 20, height: 350 }}
                  ListEmptyComponent={
                    <Text style={{ color: "#888", marginTop: 20 }}>
                      Tidak ditemukan 😢
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => setSelectedCurrency(item.code)}
                      style={[
                        styles.currencyItem,
                        selectedCurrency === item.code &&
                          styles.currencyActive,
                      ]}
                    >
                      <Text style={styles.currencyCode}>
                        {item.code}
                      </Text>
                      <Text style={styles.currencyName}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            );
          }

          // =====================
          // 🎨 SLIDE 3: THEME
          // =====================
          if (index === 2) {
            return (
              <View style={{ width, alignItems: "center", marginTop: 200 }}>
                <Text style={styles.title}>Pilih Tampilan</Text>
                <Text style={styles.subtitle}>
                  Sesuaikan gaya kamu 😎
                </Text>

                <View style={styles.themeContainer}>
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

          // =====================
          // 🟢 SLIDE 1
          // =====================
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
  },

  imageWrapper: {
    marginTop: 200,
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
    fontWeight: "bold",
  },

  searchInput: {
    marginTop: 20,
    backgroundColor: "#1E1E1E",
    padding: 14,
    borderRadius: 15,
    color: "white",
  },

  currencyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 15,
    backgroundColor: "#1E1E1E",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },

  currencyActive: {
    borderColor: "#44DA76",
  },

  currencyCode: {
    color: "#44DA76",
    fontWeight: "bold",
    fontSize: 20,
    alignItems: "center",
  },

  currencyName: {
    color: "white",
    alignItems: "center",
  },

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