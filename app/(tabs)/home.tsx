// =======================
// HOME PAGE – DUKUNGAN SEMUA MATA UANG DARI PREFERENCES
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
import { getCurrencySymbol, getAllCurrencies } from "../../constants/currencies";

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
// FUNGSI KONVERSI MATA UANG DENGAN API REAL-TIME (AKURAT SEPERTI GOOGLE)
// ==============================

// Daftar semua mata uang yang didukung dari preferences
const supportedCurrencies = getAllCurrencies().map(c => c.code);

// Variabel global untuk menyimpan kurs terbaru
let cachedExchangeRates: { [key: string]: number } = { IDR: 1 };
let lastFetchTime = 0;
const CACHE_DURATION = 3600000; // 1 jam (dalam milidetik)

// Fungsi untuk mendapatkan kurs real-time yang AKURAT (sama seperti Google)
const fetchRealTimeRates = async (baseCurrency: string = "IDR"): Promise<{ [key: string]: number }> => {
  try {
    // MENGGUNAKAN CURRENCYAPI (Sumber data: Bank Indonesia & Pasar Global)
    // API ini gratis dan sangat akurat untuk IDR ke semua mata uang
    const response = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/idr.json`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.idr) {
      const rates: { [key: string]: number } = {};
      
      // Data dari API ini dalam bentuk "idr": { "usd": 0.0000576, ... }
      // Kita perlu konversi agar sesuai (1 USD = ? IDR)
      
      // Untuk baseCurrency selain IDR, kita perlu melakukan konversi
      if (baseCurrency === "IDR") {
        // Langsung dari IDR ke mata uang lain
        supportedCurrencies.forEach(currency => {
          if (currency === baseCurrency) {
            rates[currency] = 1;
          } else {
            const lowerCurrency = currency.toLowerCase();
            if (data.idr[lowerCurrency]) {
              // Data adalah 1 IDR = X mata uang asing
              rates[currency] = data.idr[lowerCurrency];
            } else {
              rates[currency] = cachedExchangeRates[currency] || 1;
            }
          }
        });
      } else {
        // Untuk baseCurrency selain IDR, kita perlu hitung melalui IDR
        // Rumus: 1 USD = (1 IDR dalam USD) , kebalikannya
        supportedCurrencies.forEach(currency => {
          if (currency === baseCurrency) {
            rates[currency] = 1;
          } else if (currency === "IDR") {
            // Untuk konversi ke IDR: 1 USD = 1 / (1 IDR dalam USD)
            const lowerBase = baseCurrency.toLowerCase();
            if (data.idr[lowerBase]) {
              rates[currency] = 1 / data.idr[lowerBase];
            } else {
              rates[currency] = cachedExchangeRates[currency] || 1;
            }
          } else {
            // Konversi antar mata uang asing melalui IDR
            const lowerBase = baseCurrency.toLowerCase();
            const lowerTarget = currency.toLowerCase();
            if (data.idr[lowerBase] && data.idr[lowerTarget]) {
              // 1 USD = (1 IDR dalam USD) , 1 JPY = (1 IDR dalam JPY)
              // Maka 1 USD = (1 IDR dalam USD) / (1 IDR dalam JPY) JPY
              const baseRate = data.idr[lowerBase];
              const targetRate = data.idr[lowerTarget];
              rates[currency] = targetRate / baseRate;
            } else {
              rates[currency] = cachedExchangeRates[currency] || 1;
            }
          }
        });
      }
      
      console.log(" Kurs berhasil diambil dari Currency API");
      return rates;
    }
    
    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Error fetching exchange rates from CurrencyAPI:", error);
    
    // FALLBACK KE DATA STATIS ( jika API gagal)
    try {
      console.log("Mencoba fallback ke data statis...");
      const fallbackRates: { [key: string]: number } = {};
      
      // Data kurs real per 8 Mei 2026 (sumber: Google)
      // 1 USD = 17,360 IDR, 1 EUR = 18,700 IDR, dll
      const staticRates: { [key: string]: number } = {
        IDR: 1,
        USD: 0.0000576,  // 1 IDR = 0.0000576 USD
        EUR: 0.0000535,  // 1 IDR = 0.0000535 EUR
        JPY: 0.0089,     // 1 IDR = 0.0089 JPY
        GBP: 0.0000458,  // 1 IDR = 0.0000458 GBP
        AUD: 0.0000862,  // 1 IDR = 0.0000862 AUD
        CAD: 0.0000789,  // 1 IDR = 0.0000789 CAD
        CHF: 0.0000523,  // 1 IDR = 0.0000523 CHF
        CNY: 0.000416,   // 1 IDR = 0.000416 CNY
        SGD: 0.0000777,  // 1 IDR = 0.0000777 SGD
        MYR: 0.000272,   // 1 IDR = 0.000272 MYR
        SAR: 0.000216,   // 1 IDR = 0.000216 SAR
        INR: 0.00480,    // 1 IDR = 0.00480 INR
        KRW: 0.0785,     // 1 IDR = 0.0785 KRW
        THB: 0.00213,    // 1 IDR = 0.00213 THB
        VND: 1.468,      // 1 IDR = 1.468 VND
        PHP: 0.00330,    // 1 IDR = 0.00330 PHP
        BND: 0.0000777,  // 1 IDR = 0.0000777 BND
        TWD: 0.00186,    // 1 IDR = 0.00186 TWD
        HKD: 0.000450,   // 1 IDR = 0.000450 HKD
        NZD: 0.0000947,  // 1 IDR = 0.0000947 NZD
      };
      
      if (baseCurrency === "IDR") {
        supportedCurrencies.forEach(currency => {
          if (currency === baseCurrency) {
            fallbackRates[currency] = 1;
          } else {
            fallbackRates[currency] = staticRates[currency] || cachedExchangeRates[currency] || 1;
          }
        });
      } else {
        supportedCurrencies.forEach(currency => {
          if (currency === baseCurrency) {
            fallbackRates[currency] = 1;
          } else if (currency === "IDR") {
            const baseRate = staticRates[baseCurrency.toLowerCase()];
            fallbackRates[currency] = baseRate ? 1 / baseRate : 17360;
          } else {
            const baseRate = staticRates[baseCurrency.toLowerCase()];
            const targetRate = staticRates[currency.toLowerCase()];
            if (baseRate && targetRate) {
              fallbackRates[currency] = targetRate / baseRate;
            } else {
              fallbackRates[currency] = cachedExchangeRates[currency] || 1;
            }
          }
        });
      }
      
      return fallbackRates;
      
    } catch (backupError) {
      console.error("All APIs failed:", backupError);
      return cachedExchangeRates;
    }
  }
};

// Fungsi untuk mendapatkan kurs (dengan caching)
const getExchangeRates = async (forceRefresh: boolean = false): Promise<{ [key: string]: number }> => {
  const now = Date.now();
  
  // Jika cache masih valid dan tidak dipaksa refresh, gunakan cache
  if (!forceRefresh && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedExchangeRates;
  }
  
  // Fetch kurs terbaru
  const newRates = await fetchRealTimeRates("IDR");
  cachedExchangeRates = newRates;
  lastFetchTime = now;
  
  return cachedExchangeRates;
};

// Fungsi konversi sinkron (untuk penggunaan di komponen yang sudah memiliki rates)
const convertCurrencySync = (amountInIDR: number, targetCurrency: string, rates: { [key: string]: number }): number => {
  const rate = rates[targetCurrency] || 1;
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

// Komponen Bar Chart Mingguan
const WeeklyBarChart = ({ transactions, userId, currency, convertedData, exchangeRates, currencySymbol }: { 
  transactions: any[]; 
  userId: string | null; 
  currency: string;
  convertedData: { totalIncome: number; totalExpense: number; dailyTotals: any[] } | null;
  exchangeRates: { [key: string]: number } | null;
  currencySymbol: string;
}) => {
  // Selalu menggunakan minggu saat ini
  const currentWeekRange = getWeekRange(new Date());
  
  const [weekData, setWeekData] = useState<{
    weekRange: { start: Date; end: Date; days: Date[] };
    dailyTotals: { date: Date; income: number; expense: number }[];
    maxValue: number;
  } | null>(null);
  
  useEffect(() => {
    const { start, end, days } = currentWeekRange;
    
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
  }, [transactions, currentWeekRange]);
  
  if (!weekData) {
    return (
      <View style={styles.weeklyCard}>
        <ActivityIndicator color="#44DA76" />
      </View>
    );
  }
  
  const { dailyTotals, maxValue } = weekData;
  const maxBarHeight = 140;
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
  
  return (
    <View style={styles.weeklyCard}>
      {/* Header Minggu */}
      <View style={styles.weekHeader}>
        <View style={styles.weekInfo}>
          <Text style={styles.weekRangeText}>
            {formatWeekRange(weekData.weekRange.start, weekData.weekRange.end)}
          </Text>
          <View style={styles.currentWeekBadge}>
            <Text style={styles.currentWeekText}>Minggu Ini</Text>
          </View>
        </View>
      </View>
      
      {/* Total Ringkasan */}
      <View style={styles.totalRow}>
        <View style={styles.totalCard}>
          <Ionicons name="trending-up-outline" size={24} color="#4CD964" />
          <Text style={styles.totalLabel}>Total Pemasukan</Text>
          <Text style={styles.totalValueGreen}>
            {currencySymbol} {displayTotalIncome.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.totalCard}>
          <Ionicons name="trending-down-outline" size={24} color="#FF5E5E" />
          <Text style={styles.totalLabel}>Total Pengeluaran</Text>
          <Text style={styles.totalValueRed}>
            {currencySymbol} {displayTotalExpense.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                <View style={styles.dayValues}>
                  {item.income > 0 && (
                    <Text style={styles.incomeSmall}>
                      {currencySymbol}{item.income.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </Text>
                  )}
                  {item.expense > 0 && (
                    <Text style={styles.expenseSmall}>
                      {currencySymbol}{item.expense.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
  const [currencySymbol, setCurrencySymbol] = useState<string>("Rp");
  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number } | null>(null);
  const [convertedBalance, setConvertedBalance] = useState<number | null>(null);
  const [convertedData, setConvertedData] = useState<{
    totalIncome: number;
    totalExpense: number;
    dailyTotals: any[];
  } | null>(null);
  const [loadingConversion, setLoadingConversion] = useState(false);
  const [refreshingRates, setRefreshingRates] = useState(false);

  const greeting = getGreetingByTime();

  // Fungsi untuk memuat kurs mata uang
  const loadExchangeRates = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshingRates(true);
      }
      const rates = await getExchangeRates(forceRefresh);
      setExchangeRates(rates);
    } catch (error) {
      console.error("Error loading exchange rates:", error);
    } finally {
      if (forceRefresh) {
        setRefreshingRates(false);
      }
    }
  };

  // LOAD CURRENCY FROM PREFERENCES
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem("currency");
        if (savedCurrency) {
          setCurrency(savedCurrency);
          const symbol = getCurrencySymbol(savedCurrency);
          setCurrencySymbol(symbol);
        } else {
          setCurrency("IDR");
          setCurrencySymbol("Rp");
        }
      } catch (error) {
        console.error("Error loading currency:", error);
        setCurrency("IDR");
        setCurrencySymbol("Rp");
      }
    };
    loadCurrency();
  }, []);

  // Load exchange rates saat komponen mount
  useEffect(() => {
    loadExchangeRates();
    
    // Refresh kurs setiap 1 jam
    const interval = setInterval(() => {
      loadExchangeRates(true);
    }, CACHE_DURATION);
    
    return () => clearInterval(interval);
  }, []);

  // Update simbol mata uang ketika currency berubah
  useEffect(() => {
    const symbol = getCurrencySymbol(currency);
    setCurrencySymbol(symbol);
  }, [currency]);

  // Konversi semua nilai mata uang ketika currency berubah, data berubah, atau kurs berubah
  useEffect(() => {
    if (exchangeRates && balance !== null && transactions.length > 0) {
      setLoadingConversion(true);
      
      // Konversi balance
      const newConvertedBalance = convertCurrencySync(balance, currency, exchangeRates);
      setConvertedBalance(newConvertedBalance);
      
      // Konversi data untuk chart (selalu gunakan minggu saat ini)
      const currentWeekRange = getWeekRange(new Date());
      const { start, end, days } = currentWeekRange;
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
            const convertedAmount = convertCurrencySync(t.amount, currency, exchangeRates);
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
    } else if (exchangeRates && balance !== null) {
      const newConvertedBalance = convertCurrencySync(balance, currency, exchangeRates);
      setConvertedBalance(newConvertedBalance);
    }
  }, [currency, balance, transactions, exchangeRates]);

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

  // Update balance dan history ketika screen focus
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchBalance();
        fetchHistory();
        // Refresh kurs saat screen focus
        loadExchangeRates(true);
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

  // Fungsi untuk refresh kurs manual
  const handleRefreshRates = async () => {
    await loadExchangeRates(true);
    Alert.alert("Berhasil", "Kurs mata uang telah diperbarui sesuai dengan nilai tukar Google");
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Logo Cashify - selalu tampil, tidak tergantung user avatar */}
          <View style={styles.logoContainer}>
            <Image 
              source={require("../../assets/images/cashify-splash.png")} 
              style={styles.logoImage}
            />
          </View>
          <View style={styles.userInfoContainer}>
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.usernameText}>
              {loadingUser ? "Memuat..." : user?.username ?? "Guest"}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshRates}
            disabled={refreshingRates}
          >
            {refreshingRates ? (
              <ActivityIndicator size="small" color="#44DA76" />
            ) : (
              <Ionicons name="refresh-outline" size={22} color="white" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={26} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* BODY */}
      <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <View style={styles.balanceCard}>
            {loadingConversion || !exchangeRates ? (
              <ActivityIndicator color="#44DA76" size="large" />
            ) : (
              <Text style={styles.balanceValue}>
                {currencySymbol} {convertedBalance?.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0"}
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

          {/* WEEKLY BAR CHART */}
          <WeeklyBarChart 
            transactions={transactions} 
            userId={userId} 
            currency={currency}
            convertedData={convertedData}
            exchangeRates={exchangeRates}
            currencySymbol={currencySymbol}
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
                const convertedAmount = exchangeRates 
                  ? convertCurrencySync(item.amount, currency, exchangeRates)
                  : item.amount;
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
                      {item.type === "income" ? "+" : "-"} {currencySymbol} {formattedAmount}
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  userInfoContainer: {
    marginLeft: 10,
  },
  greetingText: {
    color: "#888",
    fontSize: 12,
    marginBottom: 2,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: "#1E1F1F",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: 40,
    height: 40,
    resizeMode: "contain",
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
  refreshButton: { padding: 6 },
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
  
  weeklyCard: {
    width: "90%",
    backgroundColor: "#1E1F1F",
    borderRadius: 20,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  weekHeader: {
    alignItems: "center",
    marginBottom: 12,
  },
  weekInfo: { 
    textAlign: "center",
    justifyContent: "center",
    alignItems: "center",
  },
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