// =======================
// HOME PAGE FINAL – DONUT ANALYSIS
// =======================

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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";
import { Svg, Circle } from "react-native-svg";

// ==============================
// IKON INCOME
// ==============================
import {
  BriefcaseBusiness,
  Gift,
  Wallet,
  PlusCircle,
  LucideLandmark,
} from "lucide-react-native";

// ==============================
// IKON EXPENSE
// ==============================
import {
  ShoppingCart,
  Utensils,
  Stethoscope,
  Gamepad2,
  Car,
  Shirt,
  Package,
} from "lucide-react-native";

const incomeIconMap: any = {
  Gaji: <BriefcaseBusiness color="#74C1FF" size={22} />,
  THR: <Gift color="#74C1FF" size={22} />,
  Bonus: <Wallet color="#74C1FF" size={22} />,
  Tabungan: <LucideLandmark color="#74C1FF" size={22} />,
  Lainnya: <PlusCircle color="#74C1FF" size={22} />,
};

const expenseIconMap: any = {
  "Belanja Bulanan": <ShoppingCart color="#74C1FF" size={20} />,
  "Makan & Minum": <Utensils color="#74C1FF" size={20} />,
  Kesehatan: <Stethoscope color="#74C1FF" size={20} />,
  Hiburan: <Gamepad2 color="#74C1FF" size={20} />,
  Transportasi: <Car color="#74C1FF" size={20} />,
  Pakaian: <Shirt color="#74C1FF" size={20} />,
  Barang: <Package color="#74C1FF" size={20} />,
  Lainnya: <PlusCircle color="#74C1FF" size={20} />,
};

type UserInfo = {
  username: string;
  avatar_url: string | null;
} | null;

export default function Home() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [user, setUser] = useState<UserInfo>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  // FETCH USER
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
        } else setUser(null);
      } catch {
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

  // FETCH BALANCE
  const fetchBalance = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("user_balance")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    setBalance(data?.balance ?? 0);
  };

  // FETCH HISTORY
  const fetchHistory = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("transactions")
      .select(`id,type,amount,created_at,categories(name)`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setTransactions(data);
  };

  useEffect(() => {
    if (!userId) return;
    fetchBalance();
    fetchHistory();
  }, [userId]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem("session");
      router.replace("/auth");
    } catch {
      Alert.alert("Logout Gagal", "Terjadi kesalahan saat logout.");
    }
  };

  const handleIncome = () => router.push("/(tabs)/income");
  const handleExpense = () => router.push("/(tabs)/expense");

  // =========================
  // DONUT CALC
  // =========================
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, x) => sum + x.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, x) => sum + x.amount, 0);

  const total = totalIncome + totalExpense;
  const incomePercent = total === 0 ? 0 : (totalIncome / total) * 100;
  const expensePercent = total === 0 ? 0 : (totalExpense / total) * 100;

  const size = 220;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const incomeStroke = (incomePercent / 100) * circumference;
  const expenseStroke = (expensePercent / 100) * circumference;

  return (
    <View style={styles.container}>
      {/* HEADER */}
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

      {/* BODY */}
      <View style={styles.body}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceValue}>
            Rp {balance?.toLocaleString("id-ID") ?? "0"}
          </Text>
        </View>

        <Image
          source={require("../../assets/images/GreenBackground.png")}
          style={styles.backgroundImage}
        />

        <TouchableOpacity style={styles.buttontambah} onPress={handleIncome}>
          <Image
            source={require("../../assets/images/arrowdown.png")}
            style={styles.arrowDown}
          />
          <Text style={styles.texttambah}>Tambah Pemasukan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonkurang} onPress={handleExpense}>
          <Image
            source={require("../../assets/images/arrowup.png")}
            style={styles.arrowup}
          />
          <Text style={styles.texttambah}>Tambah Pengeluaran</Text>
        </TouchableOpacity>

        {/* ANALISIS TITLE */}
        <View style={styles.analisisContainer}>
          <Text style={styles.analisisText}>Analisis Bulan Ini</Text>
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => router.push("/analysis")}
          >
            <Text style={styles.detailText}>Lihat Detail</Text>
          </TouchableOpacity>
        </View>

        {/* DONUT CHART */}
        {(totalIncome > 0 || totalExpense > 0) && (
          <View style={styles.analysisCard}>
            <View style={styles.chartContainer}>
              <Svg width={size} height={size}>
                {/* BACKGROUND */}
                <Circle
                  stroke="#222"
                  fill="none"
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  strokeWidth={strokeWidth}
                />

                {/* INCOME – hanya tampil > 0 */}
                {totalIncome > 0 && (
                  <Circle
                    stroke="#44DA76"
                    fill="none"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${incomeStroke}, ${circumference}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                )}

                {/* EXPENSE – hanya tampil > 0 */}
                {totalExpense > 0 && (
                  <Circle
                    stroke="#FF5E5E"
                    fill="none"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${expenseStroke}, ${circumference}`}
                    strokeDashoffset={-incomeStroke}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                )}
              </Svg>

              <View style={styles.centerText}>
                {totalIncome > 0 ? (
                  <>
                    <Text style={styles.percentText}>
                      {incomePercent.toFixed(1)}%
                    </Text>
                    <Text style={styles.subText}>Pemasukan</Text>
                  </>
                ) : totalExpense > 0 ? (
                  <>
                    <Text style={styles.percentText}>
                      {expensePercent.toFixed(1)}%
                    </Text>
                    <Text style={styles.subText}>Pengeluaran</Text>
                  </>
                ) : null}
              </View>
            </View>

            <View style={styles.legendWrapper}>
              {totalIncome > 0 && (
                <View style={styles.legendRow}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#44DA76" }]}
                  />
                  <Text style={styles.legendText}>
                    Income: Rp {totalIncome.toLocaleString("id-ID")}
                  </Text>
                </View>
              )}
              {totalExpense > 0 && (
                <View style={styles.legendRow}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#FF5E5E" }]}
                  />
                  <Text style={styles.legendText}>
                    Expense: Rp {totalExpense.toLocaleString("id-ID")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* HISTORY */}
        <View style={styles.historyWrapper}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Riwayat Keuangan</Text>
            <TouchableOpacity onPress={() => router.push("/history")}>
              <Text style={styles.historyDetail}>Lihat Detail</Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 && (
            <Text style={{ color: "#777" }}>Belum ada transaksi.</Text>
          )}

          <View style={{ maxHeight: 310 }}>
            {transactions.map((item) => {
              const catName = item.categories?.name;
              const icon =
                item.type === "income"
                  ? incomeIconMap[catName] ?? (
                      <Wallet color="#74C1FF" size={22} />
                    )
                  : expenseIconMap[catName] ?? (
                      <Package color="#74C1FF" size={20} />
                    );

              return (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.iconBox}>{icon}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyName}>
                      {catName || "Tanpa Kategori"}
                    </Text>
                    <Text style={styles.historyType}>
                      {item.type === "income" ? "Pemasukan" : "Pengeluaran"}
                    </Text>
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
      </View>

      {/* MENU POPUP */}
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

// =========================
// STYLES
// =========================
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
    textAlign: "center",
  },
  backgroundImage: { width: "90%", height: 210 },
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
  },
  arrowDown: { width: 25, height: 25, marginLeft: 110 },
  texttambah: {
    color: "white",
    fontSize: 14,
    width: 100,
    textAlign: "center",
    top: -2,
    marginLeft: 10,
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
  detailButton: { paddingVertical: 8, paddingHorizontal: 14 },
  detailText: { color: "#44DA76", fontSize: 14, fontWeight: "600", left: 14 },
  analysisCard: {
    width: "90%",
    backgroundColor: "#1E1F1F",
    borderRadius: 16,
    padding: 18,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  chartContainer: { justifyContent: "center", alignItems: "center" },
  centerText: { position: "absolute", alignItems: "center" },
  percentText: { color: "white", fontSize: 38, fontWeight: "800" },
  subText: { color: "#888", fontSize: 15, marginTop: -3 },
  legendWrapper: { marginTop: 20, width: "90%" },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  legendDot: { width: 16, height: 16, borderRadius: 10, marginRight: 10 },
  legendText: { color: "white", fontSize: 16 },
  historyWrapper: { width: "90%", marginTop: 25 },
  historyHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  historyDetail: { color: "#44DA76", fontSize: 14, fontWeight: "600" },
  historyTitle: { color: "white", fontSize: 18 },
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
  historyAmount: { fontSize: 17, fontWeight: "700", marginLeft: 10 },
  menuWrapper: {
    position: "absolute",
    right: 16,
    top: HEADER_TOP_PADDING + 40,
  },
  menuContainer: {
    backgroundColor: "#222",
    borderRadius: 10,
    paddingVertical: 6,
    minWidth: 160,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuProfile: { color: "white", marginLeft: 10, fontSize: 14 },
  menuLogout: { color: "#F55353", marginLeft: 10, fontSize: 14 },
});
