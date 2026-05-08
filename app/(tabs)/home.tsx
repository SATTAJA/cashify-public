// =======================
// HOME PAGE FINAL – WEEKLY BAR CHART WITH CURRENCY CONVERSION
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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";
import { useCallback } from "react";

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

// ==============================
// FUNGSI KONVERSI MATA UANG
// ==============================
// Kurs mata uang terhadap IDR (contoh, bisa diganti dengan API real-time)
const exchangeRates: { [key: string]: number } = {
  IDR: 1,
  USD: 0.000064, // 1 IDR = 0.000064 USD
  SGD: 0.000086, // 1 IDR = 0.000086 SGD
  MYR: 0.00030,  // 1 IDR = 0.00030 MYR
  EUR: 0.000059, // 1 IDR = 0.000059 EUR
  GBP: 0.000051, // 1 IDR = 0.000051 GBP
  JPY: 0.0096,   // 1 IDR = 0.0096 JPY
  CNY: 0.00046,  // 1 IDR = 0.00046 CNY
  INR: 0.0053,   // 1 IDR = 0.0053 INR
  AUD: 0.000097, // 1 IDR = 0.000097 AUD
  KRW: 0.087,    // 1 IDR = 0.087 KRW
  THB: 0.0023,   // 1 IDR = 0.0023 THB
  VND: 1.63,     // 1 IDR = 1.63 VND
  PHP: 0.0036,   // 1 IDR = 0.0036 PHP
};

// Simbol mata uang
const currencySymbols: { [key: string]: string } = {
  IDR: "Rp",
  USD: "$",
  SGD: "S$",
  MYR: "RM",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  AUD: "A$",
  KRW: "₩",
  THB: "฿",
  VND: "₫",
  PHP: "₱",
};

// Fungsi konversi nilai dari IDR ke mata uang target
const convertCurrency = (amountInIDR: number, targetCurrency: string): number => {
  const rate = exchangeRates[targetCurrency] || 1;
  return amountInIDR * rate;
};

// Helper: format tanggal ke "MMM DD" (contoh: Jun 23)
function formatDateShort(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// Helper: format "Jun 23 - Jun 29"
function formatWeekRange(start: Date, end: Date): string {
  return `${formatDateShort(start)} - ${formatDateShort(end)}`;
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

// ==============================
// FUNGSI UNTUK SAPAAN BERDASARKAN WAKTU
// ==============================
function getGreetingByTime(): string {
  const hour = new Date().getHours();
  
  if (hour >= 3 && hour < 11) {
    return "Selamat Pagi";
  } else if (hour >= 11 && hour < 15) {
    return "Selamat Siang";
  } else if (hour >= 15 && hour < 18) {
    return "Selamat Sore";
  } else {
    return "Selamat Malam";
  }
}

// Komponen Bar Chart Mingguan (style seperti analysis page)
const WeeklyBarChart = ({ transactions, userId, currency, convertedData, weekStartDate, onWeekChange }: { 
  transactions: any[]; 
  userId: string | null; 
  currency: string;
  convertedData: { totalIncome: number; totalExpense: number; dailyTotals: any[] } | null;
  weekStartDate: Date;
  onWeekChange: (newDate: Date) => void;
}) => {
  const [weekData, setWeekData] = useState<{
    weekRange: { start: Date; end: Date; days: Date[] };
    dailyTotals: { date: Date; income: number; expense: number }[];
    maxValue: number;
  } | null>(null);
  
  useEffect(() => {
    const { start, end, days } = getWeekRange(weekStartDate);
    
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
    
    const maxValue = Math.max(...dailyTotals.flatMap(d => [d.income, d.expense]), 1);
    
    setWeekData({ weekRange: { start, end, days }, dailyTotals, maxValue });
  }, [transactions, weekStartDate]);
  
  if (!weekData) {
    return (
      <View style={styles.weeklyCard}>
        <ActivityIndicator color="#44DA76" />
      </View>
    );
  }
  
  const { dailyTotals, maxValue } = weekData;
  const maxBarHeight = 140;
  const barWidth = 22;
  const groupWidth = 56;
  const screenWidth = Dimensions.get('window').width;
  const scrollWidth = Math.max(screenWidth - 48, dailyTotals.length * groupWidth);
  const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  
  // Gunakan data yang sudah dikonversi jika ada
  const displayTotalIncome = convertedData?.totalIncome ?? 
    dailyTotals.reduce((sum, d) => sum + d.income, 0);
  const displayTotalExpense = convertedData?.totalExpense ?? 
    dailyTotals.reduce((sum, d) => sum + d.expense, 0);
  const displayDailyTotals = convertedData?.dailyTotals ?? dailyTotals;
  
  // Hitung max value untuk chart berdasarkan data yang dikonversi
  const displayMaxValue = convertedData 
    ? Math.max(...displayDailyTotals.flatMap((d: any) => [d.income, d.expense]), 1)
    : maxValue;
  
  const symbol = currencySymbols[currency] || currency;
  
  // Cek apakah minggu ini adalah minggu berjalan
  const today = new Date();
  const currentWeekStart = getWeekRange(today).start;
  const isCurrentWeek = weekData.weekRange.start.toDateString() === currentWeekStart.toDateString();
  
  return (
    <View style={styles.weeklyCard}>
      {/* Navigasi Minggu */}
      <View style={styles.weekNavContainer}>
        <TouchableOpacity 
          onPress={() => {
            const newDate = new Date(weekStartDate);
            newDate.setDate(weekStartDate.getDate() - 7);
            onWeekChange(newDate);
          }}
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={24} color="#44DA76" />
        </TouchableOpacity>
        
        <View style={styles.weekInfo}>
          <Text style={styles.weekRangeText}>
            {formatWeekRange(weekData.weekRange.start, weekData.weekRange.end)}
          </Text>
          {isCurrentWeek && (
            <View style={styles.currentWeekBadge}>
              <Text style={styles.currentWeekText}>Minggu Ini</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          onPress={() => {
            const newDate = new Date(weekStartDate);
            newDate.setDate(weekStartDate.getDate() + 7);
            onWeekChange(newDate);
          }}
          style={styles.navButton}
        >
          <Ionicons name="chevron-forward" size={24} color="#44DA76" />
        </TouchableOpacity>
      </View>
      
      {/* Total Ringkasan */}
      <View style={styles.totalRow}>
        <View style={styles.totalCard}>
          <Ionicons name="trending-up-outline" size={24} color="#4CD964" />
          <Text style={styles.totalLabel}>Total Pemasukan</Text>
          <Text style={styles.totalValueGreen}>
            {symbol} {displayTotalIncome.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.totalCard}>
          <Ionicons name="trending-down-outline" size={24} color="#FF5E5E" />
          <Text style={styles.totalLabel}>Total Pengeluaran</Text>
          <Text style={styles.totalValueRed}>
            {symbol} {displayTotalExpense.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>
      
      {/* Bar Chart */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
        <View style={{ width: scrollWidth, flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", paddingVertical: 12 }}>
          {displayDailyTotals.map((item: any, idx: number) => {
            const incomeHeight = displayMaxValue === 0 ? 0 : (item.income / displayMaxValue) * maxBarHeight;
            const expenseHeight = displayMaxValue === 0 ? 0 : (item.expense / displayMaxValue) * maxBarHeight;
            return (
              <View key={idx} style={styles.barGroup}>
                <View style={styles.barsContainer}>
                  <View style={[styles.bar, { height: Math.max(incomeHeight, 4), backgroundColor: "#44DA76", marginBottom: 4 }]} />
                  <View style={[styles.bar, { height: Math.max(expenseHeight, 4), backgroundColor: "#FF5E5E" }]} />
                </View>
                <Text style={styles.dayLabel}>{dayLabels[idx]}</Text>
                {/* Nilai di bawah bar (opsional) */}
                <View style={styles.dayValues}>
                  {item.income > 0 && (
                    <Text style={styles.incomeSmall}>
                      {symbol}{item.income.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </Text>
                  )}
                  {item.expense > 0 && (
                    <Text style={styles.expenseSmall}>
                      {symbol}{item.expense.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </Text>
                  )}
                </View>
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
  const [currency, setCurrency] = useState<string>("IDR");
  const [convertedBalance, setConvertedBalance] = useState<number | null>(null);
  const [convertedData, setConvertedData] = useState<{
    totalIncome: number;
    totalExpense: number;
    dailyTotals: any[];
  } | null>(null);
  const [loadingConversion, setLoadingConversion] = useState(false);
  const [weekStartDate, setWeekStartDate] = useState(new Date());

  const greeting = getGreetingByTime();
  const symbol = currencySymbols[currency] || currency;

  // LOAD CURRENCY FROM PREFERENCES
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem("currency");
        if (savedCurrency) {
          setCurrency(savedCurrency);
        } else {
          setCurrency("IDR");
        }
      } catch (error) {
        console.error("Error loading currency:", error);
        setCurrency("IDR");
      }
    };
    loadCurrency();
  }, []);

  // Konversi semua nilai mata uang ketika currency berubah atau data berubah
  useEffect(() => {
    if (balance !== null && transactions.length > 0) {
      setLoadingConversion(true);
      
      // Konversi balance
      const newConvertedBalance = convertCurrency(balance, currency);
      setConvertedBalance(newConvertedBalance);
      
      // Konversi data untuk chart
      const { start, end, days } = getWeekRange(weekStartDate);
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
            const convertedAmount = convertCurrency(t.amount, currency);
            if (t.type === 'income') income += convertedAmount;
            else expense += convertedAmount;
          }
        });
        return { date: day, income, expense };
      });
      
      const totalIncome = dailyTotals.reduce((sum, d) => sum + d.income, 0);
      const totalExpense = dailyTotals.reduce((sum, d) => sum + d.expense, 0);
      
      setConvertedData({ totalIncome, totalExpense, dailyTotals });
      setLoadingConversion(false);
    } else if (balance !== null) {
      const newConvertedBalance = convertCurrency(balance, currency);
      setConvertedBalance(newConvertedBalance);
    }
  }, [currency, balance, transactions, weekStartDate]);

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

  // Update balance dan history ketika screen focus (menggunakan useFocusEffect)
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchBalance();
        fetchHistory();
      }
    }, [userId])
  );

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
          <View style={styles.userInfoContainer}>
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.usernameText}>
              {loadingUser ? "Memuat..." : user?.username ?? "Guest"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="ellipsis-vertical" size={26} color="white" />
        </TouchableOpacity>
      </View>

      {/* BODY */}
      <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <View style={styles.balanceCard}>
            {loadingConversion ? (
              <ActivityIndicator color="#44DA76" size="large" />
            ) : (
              <Text style={styles.balanceValue}>
                {symbol} {convertedBalance?.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0"}
              </Text>
            )}
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

          {/* WEEKLY BAR CHART - dengan mata uang terkonversi */}
          <WeeklyBarChart 
            transactions={transactions} 
            userId={userId} 
            currency={currency}
            convertedData={convertedData}
            weekStartDate={weekStartDate}
            onWeekChange={setWeekStartDate}
          />

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
                
                // Konversi amount ke mata uang yang dipilih
                const convertedAmount = convertCurrency(item.amount, currency);
                const formattedAmount = convertedAmount.toLocaleString("id-ID", { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                });

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
                      {item.type === "income" ? "+" : "-"} {symbol} {formattedAmount}
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
                <Ionicons name="settings-outline" size={20} color="white" />
                <Text style={styles.menuProfile}>Pengaturan</Text>
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
    marginBottom: 25,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  userInfoContainer: {
    marginLeft: 10,
  },
  greetingText: {
    color: "#888",
    fontSize: 12,
    marginBottom: 2,
  },
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
    alignItems: "center",
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
  
  // Styles untuk Weekly Bar Chart (seperti analysis page)
  weeklyCard: {
    width: "90%",
    backgroundColor: "#1E1F1F",
    borderRadius: 20,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  weekNavContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
    backgroundColor: "#2A2A2A",
    borderRadius: 30,
  },
  weekInfo: { alignItems: "center" },
  weekRangeText: { color: "white", fontSize: 15, fontWeight: "600" },
  currentWeekBadge: {
    backgroundColor: "#44DA7620",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  currentWeekText: { color: "#44DA76", fontSize: 10 },
  
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, gap: 12 },
  totalCard: { flex: 1, backgroundColor: "#2A2A2A", padding: 12, borderRadius: 12, alignItems: "center" },
  totalLabel: { color: "#aaa", fontSize: 12, marginTop: 4 },
  totalValueGreen: { color: "#44DA76", fontSize: 16, fontWeight: "bold" },
  totalValueRed: { color: "#FF5E5E", fontSize: 16, fontWeight: "bold" },
  
  chartScroll: { marginVertical: 8 },
  barGroup: { alignItems: "center", width: 56 },
  barsContainer: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", height: 150, marginBottom: 8 },
  bar: { width: 22, marginHorizontal: 2, borderRadius: 6, minHeight: 4 },
  dayLabel: { color: "#aaa", fontSize: 11, marginTop: 4 },
  dayValues: { alignItems: "center", marginTop: 4 },
  incomeSmall: { color: "#44DA76", fontSize: 9 },
  expenseSmall: { color: "#FF5E5E", fontSize: 9 },
  
  legendContainer: { flexDirection: "row", justifyContent: "center", marginTop: 16, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: "#333" },
  legendRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 16 },
  legendColor: { width: 14, height: 14, borderRadius: 7, marginRight: 6 },
  legendText: { color: "#ccc", fontSize: 13 },
  legendDotSmall: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  
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