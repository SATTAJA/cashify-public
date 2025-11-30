import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Image,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";

// ICONS (untuk history)
import {
  Briefcase,
  Wallet,
  ShoppingCart,
  Gift,
} from "lucide-react-native";

const iconMap: any = {
  briefcase: Briefcase,
  wallet: Wallet,
  cart: ShoppingCart,
  gift: Gift,
};

// -----------------------------------------------------
// TIPE USER
// -----------------------------------------------------
type UserInfo = {
  username: string;
  avatar_url: string | null;
} | null;

// -----------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------
export default function Home() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [user, setUser] = useState<UserInfo>(null);

  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // BALANCE
  const [balance, setBalance] = useState<number | null>(null);

  // TRANSACTIONS
  const [transactions, setTransactions] = useState<any[]>([]);

  // -----------------------------------------------------
  // FETCH USER
  // -----------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      try {
        const res = await supabase.auth.getUser();
        const fetchedUser = res?.data?.user ?? null;

        if (!mounted) return;

        if (fetchedUser) {
          setUser({
            username:
              fetchedUser.user_metadata?.username ??
              fetchedUser.email?.split("@")[0] ??
              "User",
            avatar_url: fetchedUser.user_metadata?.avatar_url ?? null,
          });

          setUserId(fetchedUser.id);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.log("fetchUser error", err);
        setUser(null);
      } finally {
        if (mounted) setLoadingUser(false);
      }
    };

    fetchUser();
    return () => {
      mounted = false;
    };
  }, []);

  // -----------------------------------------------------
  // FETCH BALANCE
  // -----------------------------------------------------
  const fetchBalance = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("user_balance")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.log("Balance fetch error:", error);
      return;
    }

    setBalance(data?.balance ?? 0);
  };

  // Jalankan setelah userId ada
  useEffect(() => {
    if (!userId) return;
    fetchBalance();
    fetchHistory();
  }, [userId]);

  // -----------------------------------------------------
  // FETCH HISTORY TRANSAKSI
  // -----------------------------------------------------
  const fetchHistory = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        id,
        type,
        amount,
        created_at,
        note,
        categories(name, icon)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
  };

  // -----------------------------------------------------
  // LOGOUT
  // -----------------------------------------------------
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem("session");
      router.replace("/auth");
    } catch (error) {
      Alert.alert("Logout Gagal", "Terjadi kesalahan saat logout.");
    }
  };

  // -----------------------------------------------------
  // NAVIGATION
  // -----------------------------------------------------
  const handleIncome = () => {
    router.push("/(tabs)/income");
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ---------------- HEADER ---------------- */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={22} color="white" />
              </View>
            )}
            <Text style={styles.usernameText}>
              {loadingUser ? "Memuat..." : user?.username ?? "Guest"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={26} color="white" />
          </TouchableOpacity>
        </View>

        {/* ---------------- BODY ---------------- */}
        <View style={styles.body}>
          
          {/* TOTAL UANG */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceValue}>
              Rp {balance?.toLocaleString("id-ID") ?? "0"}
            </Text>
          </View>

          <Image
            source={require("../../assets/images/GreenBackground.png")}
            style={styles.backgroundImage}
          />

          {/* Tombol tambah pemasukan */}
          <TouchableOpacity style={styles.buttontambah} onPress={handleIncome}>
            <Image
              source={require("../../assets/images/arrowdown.png")}
              style={styles.arrowDown}
            />
            <Text style={styles.texttambah}>Tambah Pemasukan</Text>
          </TouchableOpacity>

          {/* Tombol tambah pengeluaran */}
          <TouchableOpacity style={styles.buttonkurang}>
            <Image
              source={require("../../assets/images/arrowup.png")}
              style={styles.arrowup}
            />
            <Text style={styles.texttambah}>Tambah Pengeluaran</Text>
          </TouchableOpacity>

          {/* Analisis */}
          <View style={styles.analisisContainer}>
            <Text style={styles.analisisText}>Analisis Bulan Ini</Text>

            <TouchableOpacity style={styles.detailButton}>
              <Text style={styles.detailText}>Lihat Detail</Text>
            </TouchableOpacity>
          </View>

          {/* ---------------- HISTORY ---------------- */}
          <View style={styles.historyWrapper}>
            <Text style={styles.historyTitle}>Riwayat Keuangan</Text>

            {transactions.length === 0 && (
              <Text style={{ color: "#777" }}>Belum ada transaksi.</Text>
            )}

            {transactions.map((item) => {
              const IconComponent =
                iconMap[item.categories?.icon] || Wallet;

              return (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.iconBox}>
                    <IconComponent size={22} color="white" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyName}>
                      {item.categories?.name || "Tanpa Kategori"}
                    </Text>
                    <Text style={styles.historyType}>
                      {item.type === "income" ? "Pemasukan" : "Pengeluaran"}
                    </Text>
                    {/* {item.note && (
                      <Text style={styles.historyNote}>{item.note}</Text>
                    )} */}
                  </View>

                  <Text
                    style={[
                      styles.historyAmount,
                      { color: item.type === "income" ? "#44DA76" : "#FF5E5E" },
                    ]}
                  >
                    {item.type === "income" ? "+" : "-"} Rp{" "}
                    {item.amount.toLocaleString("id-ID")}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* ---------------- MENU POPUP ---------------- */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setMenuVisible(false)}
        >
          <View style={styles.menuWrapper}>
            <View style={styles.menuContainer}>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  router.push("/profile");
                }}
              >
                <Ionicons name="person-outline" size={20} color="white" />
                <Text style={styles.menuProfile}>Pengaturan Profil</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#F55353" />
                <Text style={styles.menuLogout}>Keluar</Text>
              </TouchableOpacity>

            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// -----------------------------------------------------
// STYLES
// -----------------------------------------------------

const HEADER_TOP_PADDING = Platform.OS === "android" ? 20 : 50;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#151716" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: HEADER_TOP_PADDING,
    marginTop: 25,
  },

  headerLeft: { flexDirection: "row", alignItems: "center" },

  avatar: { width: 50, height: 50, borderRadius: 30 },

  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },

  usernameText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },

  body: { flex: 1, alignItems: "center", top: 40 },

  menuButton: { padding: 6 },
  modalOverlay: { flex: 1 },

  // BALANCE CARD
  balanceCard: {
    width: "90%",
    padding: 20,
    borderRadius: 16,
    position: "absolute",
    top: 45,
    zIndex: 200,
  },
  balanceValue: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 4,
    textAlign: "center",
  },

  backgroundImage: {
    width: "90%",
    height: 210,
    justifyContent: "center",
    zIndex: 0,
  },

  buttontambah: {
    width: 45,
    height: 45,
    top: -72,
    left: -130,
    zIndex: 100,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  arrowDown: { width: 25, height: 25, marginLeft: 110 },

  texttambah: {
    color: "white",
    fontSize: 14,
    width: 100,
    textAlign: "center",
    top: -2,
  },

  buttonkurang: {
    width: 45,
    height: 45,
    marginTop: -117,
    left: 42,
    zIndex: 100,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 30,
  },

  arrowup: { width: 25, height: 25, marginLeft: 110 },

  analisisContainer: {
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 35,
  },

  analisisText: { color: "white", fontSize: 18 },

  detailButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },

  detailText: { color: "#44DA76", fontSize: 14, fontWeight: "600" },

  menuWrapper: { position: "absolute", right: 16, top: HEADER_TOP_PADDING + 40 },

  menuContainer: {
    backgroundColor: "#222",
    borderRadius: 10,
    paddingVertical: 6,
    minWidth: 160,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  menuProfile: { color: "white", marginLeft: 10, fontSize: 14 },

  menuLogout: { color: "#F55353", marginLeft: 10, fontSize: 14 },

  // HISTORY
  historyWrapper: {
    width: "90%",
    marginTop: 30,
  },

  historyTitle: {
    color: "white",
    fontSize: 18,
    marginBottom: 12,
  },

  historyCard: {
    backgroundColor: "#252525",
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  iconBox: {
    width: 45,
    height: 45,
    backgroundColor: "#264E6E",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  historyName: { color: "white", fontSize: 16, fontWeight: "600" },

  historyType: { color: "#888", fontSize: 13 },

  historyNote: { color: "#aaa", fontSize: 13, marginTop: 2 },

  historyAmount: { fontSize: 17, fontWeight: "700", marginLeft: 10 },
});
