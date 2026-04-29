// ============================
// ANALYSIS DETAIL PAGE - WEEKLY BAR CHART ADVANCED
// ============================

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

const HEADER_TOP_PADDING = Platform.OS === "android" ? 25 : 55;
const { width: screenWidth } = Dimensions.get("window");

// Helper: format tanggal ke "MMM DD" (contoh: Jun 23)
function formatDateShort(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// Helper: format "Jun 23 - Jun 29"
function formatWeekRange(start: Date, end: Date): string {
  return `${formatDateShort(start)} - ${formatDateShort(end)}`;
}

// Helper: mendapatkan range minggu (Minggu - Sabtu) dari tanggal tertentu
function getWeekRangeFromDate(date: Date): { start: Date; end: Date; days: Date[] } {
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

// Komponen Bar Chart Mingguan (untuk Analysis Page)
const WeeklyBarChart = ({ 
  transactions, 
  weekStartDate, 
  onWeekChange,
  totalIncome,
  totalExpense
}: { 
  transactions: any[]; 
  weekStartDate: Date;
  onWeekChange: (newDate: Date) => void;
  totalIncome: number;
  totalExpense: number;
}) => {
  const [weekData, setWeekData] = useState<{
    weekRange: { start: Date; end: Date; days: Date[] };
    dailyTotals: { date: Date; income: number; expense: number }[];
    maxValue: number;
  } | null>(null);
  
  useEffect(() => {
    const { start, end, days } = getWeekRangeFromDate(weekStartDate);
    
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
  
  if (!weekData) return null;
  
  const { dailyTotals, maxValue } = weekData;
  const maxBarHeight = 180;
  const barWidth = 28;
  const groupWidth = 68;
  const scrollWidth = Math.max(screenWidth - 48, dailyTotals.length * groupWidth);
  
  const dayLabels = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  
  // Cek apakah minggu ini adalah minggu berjalan
  const today = new Date();
  const currentWeekStart = getWeekRangeFromDate(today).start;
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
          <Text style={styles.totalValueGreen}>Rp {totalIncome.toLocaleString("id-ID")}</Text>
        </View>
        <View style={styles.totalCard}>
          <Ionicons name="trending-down-outline" size={24} color="#FF5E5E" />
          <Text style={styles.totalLabel}>Total Pengeluaran</Text>
          <Text style={styles.totalValueRed}>Rp {totalExpense.toLocaleString("id-ID")}</Text>
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
                  {/* Bar Income */}
                  <View style={[styles.bar, { height: Math.max(incomeHeight, 4), backgroundColor: "#44DA76", marginBottom: 4 }]} />
                  {/* Bar Expense */}
                  <View style={[styles.bar, { height: Math.max(expenseHeight, 4), backgroundColor: "#FF5E5E" }]} />
                </View>
                <Text style={styles.dayLabel}>{dayLabels[idx]}</Text>
                {/* Nilai di bawah bar (opsional) */}
                <View style={styles.dayValues}>
                  {item.income > 0 && <Text style={styles.incomeSmall}>Rp{item.income}</Text>}
                  {item.expense > 0 && <Text style={styles.expenseSmall}>Rp{item.expense}</Text>}
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

export default function AnalysisDetail() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStartDate, setWeekStartDate] = useState(new Date());
  
  const [openMonthPicker, setOpenMonthPicker] = useState(false);
  
  const bulanList = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember",
  ];

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // FETCH USER
  useEffect(() => {
    const f = async () => {
      const res = await supabase.auth.getUser();
      setUserId(res?.data?.user?.id ?? null);
    };
    f();
  }, []);

  // FETCH ALL TRANSACTIONS (unfiltered by month)
  useEffect(() => {
    if (!userId) return;

    const fetchAllTrans = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id,type,amount,categories(name),created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      setAllTransactions(data ?? []);
      setLoading(false);
    };

    fetchAllTrans();
  }, [userId]);

  // Filter transactions by selected month (untuk tampilan bulan di header)
  const filteredByMonth = allTransactions.filter(t => {
    const tDate = new Date(t.created_at);
    return tDate.getMonth() === selectedMonth && tDate.getFullYear() === selectedYear;
  });

  // Hitung total untuk bulan yang dipilih
  const monthlyIncome = filteredByMonth
    .filter(x => x.type === "income")
    .reduce((s, x) => s + x.amount, 0);
  const monthlyExpense = filteredByMonth
    .filter(x => x.type === "expense")
    .reduce((s, x) => s + x.amount, 0);
  const monthlySavings = monthlyIncome - monthlyExpense;

  // Transaksi untuk minggu yang dipilih
  const getWeekTransactions = () => {
    const { start, end } = getWeekRangeFromDate(weekStartDate);
    return allTransactions.filter(t => {
      const tDate = new Date(t.created_at);
      return tDate >= start && tDate <= end;
    });
  };

  const weekTransactions = getWeekTransactions();
  const weekIncome = weekTransactions
    .filter(x => x.type === "income")
    .reduce((s, x) => s + x.amount, 0);
  const weekExpense = weekTransactions
    .filter(x => x.type === "expense")
    .reduce((s, x) => s + x.amount, 0);
  const weekSavings = weekIncome - weekExpense;

  // Data terbesar
  const biggestIncomeMonth = [...filteredByMonth]
    .filter(x => x.type === "income")
    .sort((a, b) => b.amount - a.amount)[0];

  const biggestExpenseMonth = [...filteredByMonth]
    .filter(x => x.type === "expense")
    .sort((a, b) => b.amount - a.amount)[0];

  // Data untuk minggu yang dipilih
  const biggestIncomeWeek = [...weekTransactions]
    .filter(x => x.type === "income")
    .sort((a, b) => b.amount - a.amount)[0];

  const biggestExpenseWeek = [...weekTransactions]
    .filter(x => x.type === "expense")
    .sort((a, b) => b.amount - a.amount)[0];

  // Reset to current week
  const goToCurrentWeek = () => {
    setWeekStartDate(new Date());
  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={30} color="#44DA76" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analisis Keuangan</Text>
        <TouchableOpacity onPress={goToCurrentWeek}>
          <Text style={styles.todayText}>Hari Ini</Text>
        </TouchableOpacity>
      </View>

      {/* MONTH PICKER BUTTON */}
      <TouchableOpacity
        onPress={() => setOpenMonthPicker(true)}
        style={styles.monthSelector}
      >
        <Ionicons name="calendar-outline" color="white" size={20} />
        <Text style={styles.monthText}>{bulanList[selectedMonth]} {selectedYear}</Text>
        <Ionicons name="chevron-down" color="white" size={18} />
      </TouchableOpacity>

      {/* MONTH-YEAR PICKER MODAL */}
      <Modal visible={openMonthPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pilih Bulan</Text>

            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => setSelectedYear(selectedYear - 1)}>
                <Ionicons name="chevron-back" size={24} color="#44DA76" />
              </TouchableOpacity>
              <Text style={styles.yearText}>{selectedYear}</Text>
              <TouchableOpacity onPress={() => setSelectedYear(selectedYear + 1)}>
                <Ionicons name="chevron-forward" size={24} color="#44DA76" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 250 }}>
              {bulanList.map((bl, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.monthOption}
                  onPress={() => {
                    setSelectedMonth(i);
                    setOpenMonthPicker(false);
                  }}
                >
                  <Text style={[
                    styles.monthOptionText,
                    i === selectedMonth && { color: "#44DA76", fontWeight: "bold" }
                  ]}>
                    {bl}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setOpenMonthPicker(false)}
              style={styles.closeBtn}
            >
              <Text style={{ color: "white", fontSize: 16 }}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, alignItems: "center" }}>

        {/* WEEKLY BAR CHART */}
        <WeeklyBarChart 
          transactions={allTransactions}
          weekStartDate={weekStartDate}
          onWeekChange={setWeekStartDate}
          totalIncome={weekIncome}
          totalExpense={weekExpense}
        />

        {/* WEEKLY SUMMARY */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Ringkasan Minggu Ini</Text>
          
          <View style={styles.summaryRow}>
            <View style={styles.summarySmallCard}>
              <Text style={styles.summarySmallLabel}>Penghematan</Text>
              <Text style={[
                styles.summarySmallValue,
                { color: weekSavings >= 0 ? "#44DA76" : "#FF5E5E" }
              ]}>
                Rp {weekSavings.toLocaleString("id-ID")}
              </Text>
            </View>
            
            <View style={styles.summarySmallCard}>
              <Text style={styles.summarySmallLabel}>Transaksi</Text>
              <Text style={styles.summarySmallValue}>
                {weekTransactions.length}
              </Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>💚 Pemasukan Terbesar Minggu Ini</Text>
            {biggestIncomeWeek ? (
              <>
                <Text style={styles.summaryCategory}>{biggestIncomeWeek.categories?.name}</Text>
                <Text style={[styles.summaryAmount, { color: "#44DA76" }]}>
                  Rp {biggestIncomeWeek.amount.toLocaleString("id-ID")}
                </Text>
              </>
            ) : (
              <Text style={styles.noData}>Tidak ada pemasukan</Text>
            )}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>❤️ Pengeluaran Terbesar Minggu Ini</Text>
            {biggestExpenseWeek ? (
              <>
                <Text style={styles.summaryCategory}>{biggestExpenseWeek.categories?.name}</Text>
                <Text style={[styles.summaryAmount, { color: "#FF5E5E" }]}>
                  Rp {biggestExpenseWeek.amount.toLocaleString("id-ID")}
                </Text>
              </>
            ) : (
              <Text style={styles.noData}>Tidak ada pengeluaran</Text>
            )}
          </View>
        </View>

        {/* MONTHLY SUMMARY (DETAIL) */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Ringkasan {bulanList[selectedMonth]} {selectedYear}</Text>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>🏆 Pemasukan Terbesar Bulan Ini</Text>
            {biggestIncomeMonth ? (
              <>
                <Text style={styles.summaryCategory}>{biggestIncomeMonth.categories?.name}</Text>
                <Text style={[styles.summaryAmount, { color: "#44DA76" }]}>
                  Rp {biggestIncomeMonth.amount.toLocaleString("id-ID")}
                </Text>
              </>
            ) : (
              <Text style={styles.noData}>Tidak ada pemasukan</Text>
            )}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>⚠️ Pengeluaran Terbesar Bulan Ini</Text>
            {biggestExpenseMonth ? (
              <>
                <Text style={styles.summaryCategory}>{biggestExpenseMonth.categories?.name}</Text>
                <Text style={[styles.summaryAmount, { color: "#FF5E5E" }]}>
                  Rp {biggestExpenseMonth.amount.toLocaleString("id-ID")}
                </Text>
              </>
            ) : (
              <Text style={styles.noData}>Tidak ada pengeluaran</Text>
            )}
          </View>

          {/* Daftar Kategori */}
          <View style={styles.categoriesCard}>
            <Text style={styles.categoriesTitle}>📊 Kategori Pengeluaran</Text>
            {(() => {
              const expenseByCategory: { [key: string]: number } = {};
              filteredByMonth
                .filter(t => t.type === "expense")
                .forEach(t => {
                  const catName = t.categories?.name || "Lainnya";
                  expenseByCategory[catName] = (expenseByCategory[catName] || 0) + t.amount;
                });
              
              const sorted = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
              
              if (sorted.length === 0) {
                return <Text style={styles.noData}>Belum ada pengeluaran</Text>;
              }
              
              return sorted.map(([name, amount]) => (
                <View key={name} style={styles.categoryRow}>
                  <Text style={styles.categoryName}>{name}</Text>
                  <Text style={styles.categoryAmount}>Rp {amount.toLocaleString("id-ID")}</Text>
                </View>
              ));
            })()}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ======================
// STYLES
// ======================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#151716" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: HEADER_TOP_PADDING,
    paddingHorizontal: 18,
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 25,
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },
  todayText: { color: "#44DA76", fontSize: 14, fontWeight: "600" },

  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#252525",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    alignSelf: "center",
    marginBottom: 20,
  },
  monthText: { color: "white", fontSize: 16, fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "80%",
    backgroundColor: "#252525",
    padding: 20,
    borderRadius: 20,
  },
  modalTitle: { color: "white", fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 10 },

  yearRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 15,
    alignItems: "center",
  },
  yearText: { color: "white", fontSize: 18, fontWeight: "700" },

  monthOption: { paddingVertical: 12, alignItems: "center" },
  monthOptionText: { color: "white", fontSize: 16 },

  closeBtn: {
    marginTop: 15,
    backgroundColor: "#333",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  // Savings Card
  savingsCard: {
    width: "90%",
    backgroundColor: "#1E2A2A",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2A3A3A",
  },
  savingsLabel: { color: "#aaa", fontSize: 14, textAlign: "center" },
  savingsValue: { fontSize: 32, fontWeight: "bold", textAlign: "center", marginVertical: 8 },
  savingsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  savingsItem: { flex: 1, alignItems: "center" },
  savingsItemLabel: { color: "#888", fontSize: 12 },
  savingsItemValueGreen: { color: "#44DA76", fontSize: 14, fontWeight: "600" },
  savingsItemValueRed: { color: "#FF5E5E", fontSize: 14, fontWeight: "600" },

  // Weekly Chart
  weeklyCard: {
    width: "90%",
    backgroundColor: "#1E1F1F",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
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
  barGroup: { alignItems: "center", width: 68 },
  barsContainer: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", height: 200, marginBottom: 8 },
  bar: { width: 26, marginHorizontal: 3, borderRadius: 8, minHeight: 4 },
  dayLabel: { color: "#aaa", fontSize: 11, marginTop: 4 },
  dayValues: { alignItems: "center", marginTop: 4 },
  incomeSmall: { color: "#44DA76", fontSize: 9 },
  expenseSmall: { color: "#FF5E5E", fontSize: 9 },
  
  legendContainer: { flexDirection: "row", justifyContent: "center", marginTop: 16, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: "#333" },
  legendRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 16 },
  legendColor: { width: 14, height: 14, borderRadius: 7, marginRight: 6 },
  legendText: { color: "#ccc", fontSize: 13 },
  legendDotSmall: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },

  // Summary Sections
  summarySection: { width: "90%", marginTop: 8 },
  sectionTitle: { color: "white", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  summarySmallCard: { flex: 1, backgroundColor: "#252525", padding: 16, borderRadius: 14, alignItems: "center" },
  summarySmallLabel: { color: "#888", fontSize: 13 },
  summarySmallValue: { color: "white", fontSize: 18, fontWeight: "bold", marginTop: 6 },
  
  summaryCard: { backgroundColor: "#252525", padding: 16, borderRadius: 14, marginBottom: 12 },
  summaryLabel: { color: "#aaa", fontSize: 14, marginBottom: 6 },
  summaryCategory: { color: "white", fontSize: 16, fontWeight: "500" },
  summaryAmount: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  
  categoriesCard: { backgroundColor: "#252525", padding: 16, borderRadius: 14, marginBottom: 20 },
  categoriesTitle: { color: "white", fontSize: 16, fontWeight: "600", marginBottom: 12 },
  categoryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "#333" },
  categoryName: { color: "#ddd", fontSize: 14 },
  categoryAmount: { color: "#FF5E5E", fontSize: 14, fontWeight: "500" },
  
  noData: { color: "#777", marginTop: 6, textAlign: "center" },
});