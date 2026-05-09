import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { getAllCurrencies } from "../../constants/currencies";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";

type Currency = {
  code: string;
  name: string;
  country: string;
};

function CurrencyScreen() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("IDR");

  // animasi scale
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currencies = useMemo(() => getAllCurrencies(), []);

  const filtered = useMemo(() => {
    return currencies.filter(
      (c: Currency) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.country.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, currencies]);

  const handleFocus = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.05,
      useNativeDriver: true,
      friction: 6,
    }).start();
  };

  const handleBlur = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
    }).start();
  };

  const handleSave = async () => {
    await AsyncStorage.setItem("currency", selected);
    router.replace("/profile"); // Ganti ke profile page
  };

  const renderItem = ({ item }: { item: Currency }) => {
    const isActive = selected === item.code;

    return (
      <TouchableOpacity
        style={[styles.item, isActive && styles.activeItem]}
        onPress={() => setSelected(item.code)}
      >
        <View style={styles.left}>
          <View style={[styles.radio, isActive && styles.radioActive]} />
          <Text style={styles.name}>
            {item.name} ({item.code})
          </Text>
          <Text style={styles.country}>{item.country}</Text>
        </View>

        <Text style={styles.code}>{item.code}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pilih Mata Uang</Text>

      {/* SEARCH (ANIMATED) */}
      <Animated.View
        style={[
          styles.searchBox,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Ionicons name="search-outline" size={20} color="#919191" />
        <TextInput
          placeholder="Cari mata uang..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          style={styles.search}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </Animated.View>

      {/* LIST */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      />

      {/* BUTTON SIMPAN */}
      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Simpan</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function Currency() {
  return (
    <SafeAreaProvider>
      <CurrencyScreen />
    </SafeAreaProvider>
  );
}

const GREEN = "#44DA76";
const BG = "#151716";
const CARD = "#1C1C1C";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 16,
  },

  title: {
    color: "white",
    fontSize: 26,
    fontWeight: "bold",
    marginVertical: 16,
    marginTop: 60,
    textAlign: "center",
    marginBottom: 25,
  },

  searchBox: {
    backgroundColor: CARD,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },

  search: {
    flex: 1,
    color: "white",
    height: 45,
    marginLeft: 10,
  },

  item: {
    backgroundColor: CARD,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  activeItem: {
    borderWidth: 1,
    borderColor: GREEN,
  },

  left: {
    flex: 1,
    flexDirection: "column",
  },

  name: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    left: 25,
  },

  country: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
    left: 25,
  },

  code: {
    color: GREEN,
    fontWeight: "bold",
    fontSize: 18,
  },

  radio: {
    position: "absolute",
    left: -2,
    top: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#44DA76",
  },

  radioActive: {
    borderColor: GREEN,
    backgroundColor: GREEN,
  },

  button: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: GREEN,
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
  },

  buttonText: {
    fontWeight: "bold",
    color: "white",
    fontSize: 16,
  },
});