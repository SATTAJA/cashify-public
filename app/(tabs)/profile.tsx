import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";
import { getCurrencySymbol, getAllCurrencies } from "../../constants/currencies";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("IDR");
  const [currencySymbol, setCurrencySymbol] = useState("Rp");
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(currency);

  // Daftar mata uang yang didukung
  const currencies = getAllCurrencies();

  useEffect(() => {
    loadUser();
    loadCurrency();
  }, []);

  const loadUser = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrency = async () => {
    try {
      const savedCurrency = await AsyncStorage.getItem("currency");
      if (savedCurrency) {
        setCurrency(savedCurrency);
        const symbol = getCurrencySymbol(savedCurrency);
        setCurrencySymbol(symbol);
        setSelectedCurrency(savedCurrency);
      }
    } catch (error) {
      console.error("Error loading currency:", error);
    }
  };

  const handleSaveCurrency = async () => {
    try {
      await AsyncStorage.setItem("currency", selectedCurrency);
      setCurrency(selectedCurrency);
      const symbol = getCurrencySymbol(selectedCurrency);
      setCurrencySymbol(symbol);
      setShowCurrencyModal(false);
      Alert.alert("Berhasil", "Mata uang berhasil diubah");
    } catch (error) {
      console.error("Error saving currency:", error);
      Alert.alert("Error", "Gagal menyimpan mata uang");
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Konfirmasi",
      "Apakah Anda yakin ingin keluar?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            await AsyncStorage.removeItem("session");
            router.replace("/auth");
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#44DA76" />
        <Text style={styles.loadingText}>Memuat profil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/home")} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Saya</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          {user?.user_metadata?.avatar_url ? (
            <Image
              source={require("../../assets/images/cashify-splash.png")}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Image
                source={require("../../assets/images/cashify-splash.png")}
                style={styles.avatar}
              />
            </View>
          )}
        </View>
        <Text style={styles.username}>
          {user?.user_metadata?.username || user?.email?.split("@")[0] || "User"}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Pengaturan</Text>

        {/* Currency Setting */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.replace("/currency")}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="cash-outline" size={24} color="#44DA76" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Mata Uang</Text>
            <Text style={styles.menuSubtitle}>
              {currency} ({currencySymbol})
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* Account Settings */}
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/forgot")}>
          <View style={styles.menuIcon}>
            <Ionicons name="lock-closed-outline" size={24} color="#44DA76" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Ubah Kata sandi</Text>
            <Text style={styles.menuSubtitle}>Anda dapat mengubah kata sandi</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* About */}
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/about")}>
          <View style={styles.menuIcon}>
            <Ionicons name="information-circle-outline" size={24} color="#44DA76" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Tentang Aplikasi</Text>
            <Text style={styles.menuSubtitle}>Versi 1.0.0</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <View style={styles.menuIcon}>
            <Ionicons name="log-out-outline" size={24} color="#FF5E5E" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, styles.logoutText]}>Keluar</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151716",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#151716",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#151716",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  placeholder: {
    width: 34,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#44DA76",
  },
  username: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  email: {
    color: "#888",
    fontSize: 14,
  },
  menuSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    color: "#44DA76",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1F1F",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  menuIcon: {
    marginRight: 15,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  menuSubtitle: {
    color: "#888",
    fontSize: 12,
  },
  logoutItem: {
    marginTop: 20,
  },
  logoutText: {
    color: "#FF5E5E",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#1E1F1F",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  currencyList: {
    padding: 20,
  },
  currencyItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#2A2A2A",
  },
  currencySelected: {
    backgroundColor: "#44DA7620",
    borderWidth: 1,
    borderColor: "#44DA76",
  },
  currencySymbol: {
    fontSize: 24,
    marginRight: 15,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  currencyName: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: "row",
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#333",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#44DA76",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#151716",
    fontSize: 16,
    fontWeight: "bold",
  },
});