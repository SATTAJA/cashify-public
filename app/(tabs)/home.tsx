// =======================
// HOME PAGE FINAL – WEEKLY BAR CHART (REPLACES DONUT)
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
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";

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

// Helper: format tanggal ke "MMM DD" (contoh: Jun 23)
function formatDateShort(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// Helper: mendapatkan range minggu (Minggu - Sabtu)
function getWeekRange(date: Date = new Date()): { start: Date; end: Date; days: Date[] } {
  const current = new Date(date);
  const dayOfWeek = current.getDay(); // 0 = Minggu
  const start = new Date(current);
  start.setDate(current.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return { start, end, days };
}

// Helper: format YYYY-MM-DD untuk perbandingan tanggal
function toYMD(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Komponen Bar Chart Mingguan
const WeeklyBarChart = ({ transactions, userId }: { transactions: any[]; userId: string | null }) => {
  const [weekData, setWeekData] = useState<{
    weekRange: { start: Date; end: Date; days: Date[] };
    dailyTotals: { date: Date; income: number; expense: number }[];
    totalIncome: number;
    totalExpense: number;
    maxValue: number;
  } | null>(null);
  
  useEffect(() => {
    if (!userId || transactions.length === 0) return;
    
    const { start, end, days } = getWeekRange(new Date());
    // Filter transaksi dalam minggu ini
    const weekTransactions = transactions.filter(t => {
      const tDate = new Date(t.created_at);
      return tDate >= start && tDate <= end;
    });
    
    const dailyTotals = days.map(day => {
      const ymd = toYMD(day);
      let income = 0, expense = 0;
      weekTransactions.forEach(t => {
        const tYMD = toYMD(new Date(t.created_at));
        if (tYMD === ymd) {
          if (t.type === 'income') income += t.amount;
          else expense += t.amount;
        }
      });
      return { date: day, income, expense };
    });
    
    const totalIncome = dailyTotals.reduce((sum, d) => sum + d.income, 0);
    const totalExpense = dailyTotals.reduce((sum, d) => sum + d.expense, 0);
    const maxValue = Math.max(...dailyTotals.flatMap(d => [d.income, d.expense]), 1);
    
    setWeekData({ weekRange: { start, end, days }, dailyTotals, totalIncome, totalExpense, maxValue });
  }, [transactions, userId]);
  
  if (!weekData) return null;
  
  const { dailyTotals, totalIncome, totalExpense, maxValue } = weekData;
  const maxBarHeight = 140; // tinggi maks bar dalam px
  const barWidth = 22;
  const groupWidth = 56; // lebar per hari (2 bar + spacing)
  const screenWidth = Dimensions.get('window').width;
  const scrollWidth = Math.max(screenWidth - 32, dailyTotals.length * groupWidth);
  
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  return (
    <View style={styles.weeklyCard}>
      {/* Header minggu & total */}
      <View style={styles.weekHeader}>
        <Text style={styles.weekRangeText}>
          {formatDateShort(weekData.weekRange.start)} - {formatDateShort(weekData.weekRange.end)}
        </Text>
        <View style={styles.totalRow}>
          <View style={styles.totalItem}>
            <View style={[styles.legendDotSmall, { backgroundColor: "#44DA76" }]} />
            <Text style={styles.totalLabel}>Income</Text>
            <Text style={styles.totalValueGreen}>Rp {totalIncome.toLocaleString("id-ID")}</Text>
          </View>
          <View style={styles.totalItem}>
            <View style={[styles.legendDotSmall, { backgroundColor: "#FF5E5E" }]} />
            <Text style={styles.totalLabel}>Expense</Text>
            <Text style={styles.totalValueRed}>Rp {totalExpense.toLocaleString("id-ID")}</Text>
          </View>
        </View>
      </View>
      
      {/* Bar Chart */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
        <View style={{ width: scrollWidth, flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", paddingVertical: 12 }}>
          {dailyTotals.map((item, idx) => {
            const incomeHeight = maxValue === 0 ? 0 : (item.income / maxValue) * maxBarHeight;
            const expenseHeight = maxValue === 0 ? 0 : (item.expense / maxValue) * maxBarHeight;
            return (
              <View key={idx} style={styles.barGroup}>
                <View style={styles.barsContainer}>
                  {/* Bar Income (hijau) */}
                  <View style={[styles.bar, { height: Math.max(incomeHeight, 4), backgroundColor: "#44DA76", marginBottom: 4 }]} />
                  {/* Bar Expense (merah) */}
                  <View style={[styles.bar, { height: Math.max(expenseHeight, 4), backgroundColor: "#FF5E5E" }]} />
                </View>
                <Text style={styles.dayLabel}>{dayLabels[idx]}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      
      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendRow}>
          <View style={[styles.legendColor, { backgroundColor: "#44DA76" }]} />
          <Text style={styles.legendText}>Pemasukan</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendColor, { backgroundColor: "#FF5E5E" }]} />
          <Text style={styles.legendText}>Pengeluaran</Text>
        </View>
      </View>
    </View>
  );
};

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

  // FETCH HISTORY (all transactions)
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

      {/* BODY dengan ScrollView agar konten panjang bisa di-scroll */}
      <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.analisisText}>Analisis Minggu Ini</Text>
            <TouchableOpacity
              style={styles.detailButton}
              onPress={() => router.push("/analysis")}
            >
              <Text style={styles.detailText}>Lihat Detail</Text>
            </TouchableOpacity>
          </View>

          {/* WEEKLY BAR CHART - menggantikan donut */}
          <WeeklyBarChart transactions={transactions} userId={userId} />

          {/* HISTORY */}
          <View style={styles.historyWrapper}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Riwayat Keuangan</Text>
              <TouchableOpacity onPress={() => router.push("/history")}>
                <Text style={styles.historyDetail}>Lihat Detail</Text>
              </TouchableOpacity>
            </View>

            {transactions.length === 0 && (
              <Text style={{ color: "#777", marginBottom: 20 }}>Belum ada transaksi.</Text>
            )}

            <View style={{ marginBottom: 30 }}>
              {transactions.slice(0, 5).map((item) => {
                const catName = item.categories?.name;
                const icon =
                  item.type === "income"
                    ? incomeIconMap[catName] ?? <Wallet color="#74C1FF" size={22} />
                    : expenseIconMap[catName] ?? <Package color="#74C1FF" size={20} />;

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
              {transactions.length > 5 && (
                <TouchableOpacity onPress={() => router.push("/history")}>
                  <Text style={styles.viewAllText}>Lihat semua transaksi →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

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
// STYLES (updated)
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
    marginBottom: 25,
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
  bodyScroll: { flex: 1 },
  body: { alignItems: "center", paddingBottom: 40 },
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
  backgroundImage: { width: "90%", height: 210, resizeMode: "cover", borderRadius: 20 },
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
    marginBottom: 8,
  },
  analisisText: { color: "white", fontSize: 18, fontWeight: "600" },
  detailButton: { paddingVertical: 8, paddingHorizontal: 14 },
  detailText: { color: "#44DA76", fontSize: 14, fontWeight: "600", left: 14 },
  
  // Weekly Bar Chart Styles
  weeklyCard: {
    width: "90%",
    backgroundColor: "#252525",
    borderRadius: 20,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  weekHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  weekRangeText: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  totalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  totalLabel: {
    color: "white",
    fontSize: 13,
    marginLeft: 6,
    marginRight: 6,
  },
  totalValueGreen: {
    color: "#44DA76",
    fontSize: 14,
    fontWeight: "bold",
  },
  totalValueRed: {
    color: "#FF5E5E",
    fontSize: 14,
    fontWeight: "bold",
  },
  chartScroll: {
    marginVertical: 8,
  },
  barGroup: {
    alignItems: "center",
    width: 56,
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: 150,
    marginBottom: 8,
  },
  bar: {
    width: 22,
    marginHorizontal: 2,
    borderRadius: 6,
    minHeight: 4,
  },
  dayLabel: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 6,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#333",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
  },
  legendText: {
    color: "#ccc",
    fontSize: 13,
  },
  legendDotSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  
  // History Styles
  historyWrapper: { width: "90%", marginTop: 25 },
  historyHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  historyDetail: { color: "#44DA76", fontSize: 14, fontWeight: "600" },
  historyTitle: { color: "white", fontSize: 18, fontWeight: "600" },
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
  viewAllText: {
    color: "#44DA76",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
    fontWeight: "500",
  },
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