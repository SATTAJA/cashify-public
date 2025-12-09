// ============================
// ANALYSIS DETAIL PAGE (FINAL)
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Svg, Circle } from "react-native-svg";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

const HEADER_TOP_PADDING = Platform.OS === "android" ? 25 : 55;

export default function AnalysisDetail() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const bulanList = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember",
  ];

  const today = new Date();
  const [bulan, setBulan] = useState(today.getMonth());
  const [tahun, setTahun] = useState(today.getFullYear());
  const [openMonthPicker, setOpenMonthPicker] = useState(false);

  // FETCH USER
  useEffect(() => {
    const f = async () => {
      const res = await supabase.auth.getUser();
      setUserId(res?.data?.user?.id ?? null);
    };
    f();
  }, []);

  // FETCH DATA
  useEffect(() => {
    if (!userId) return;

    const fetchTrans = async () => {
      setLoading(true);

      const start = new Date(tahun, bulan, 1).toISOString();
      const end = new Date(tahun, bulan + 1, 1).toISOString();

      const { data } = await supabase
        .from("transactions")
        .select("id,type,amount,categories(name),created_at")
        .eq("user_id", userId)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false });

      setTransactions(data ?? []);
      setLoading(false);
    };

    fetchTrans();
  }, [userId, bulan, tahun]);

  // DONUT LOGIC
  const totalIncome = transactions
    .filter((x) => x.type === "income")
    .reduce((s, x) => s + x.amount, 0);

  const totalExpense = transactions
    .filter((x) => x.type === "expense")
    .reduce((s, x) => s + x.amount, 0);

  const total = totalIncome + totalExpense || 1;
  const incomePercent = (totalIncome / total) * 100;
  const expensePercent = (totalExpense / total) * 100;

  const size = 220;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const incomeStroke = (incomePercent / 100) * circumference;
  const expenseStroke = (expensePercent / 100) * circumference;

  // SUMMARY
  const biggestIncome = [...transactions]
    .filter((x) => x.type === "income")
    .sort((a, b) => b.amount - a.amount)[0];

  const biggestExpense = [...transactions]
    .filter((x) => x.type === "expense")
    .sort((a, b) => b.amount - a.amount)[0];

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={30} color="#44DA76" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analisis Keuangan</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* MONTH PICKER BUTTON */}
      <TouchableOpacity
        onPress={() => setOpenMonthPicker(true)}
        style={styles.monthSelector}
      >
        <Ionicons name="calendar-outline" color="white" size={22} />
        <Text style={styles.monthText}>{bulanList[bulan]} {tahun}</Text>
      </TouchableOpacity>

      {/* MONTH-YEAR PICKER MODAL */}
      <Modal visible={openMonthPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pilih Bulan</Text>

            {/* YEAR NAVIGATION */}
            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => setTahun(tahun - 1)}>
                <Ionicons name="chevron-back" size={24} color="#44DA76" />
              </TouchableOpacity>

              <Text style={styles.yearText}>{tahun}</Text>

              <TouchableOpacity onPress={() => setTahun(tahun + 1)}>
                <Ionicons name="chevron-forward" size={24} color="#44DA76" />
              </TouchableOpacity>
            </View>

            {/* MONTH LIST */}
            {bulanList.map((bl, i) => (
              <TouchableOpacity
                key={i}
                style={styles.monthOption}
                onPress={() => {
                  setBulan(i);
                  setOpenMonthPicker(false);
                }}
              >
                <Text style={[
                  styles.monthOptionText,
                  i === bulan && { color: "#44DA76" }
                ]}>
                  {bl}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setOpenMonthPicker(false)}
              style={styles.closeBtn}
            >
              <Text style={{ color: "white", fontSize: 16 }}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ alignItems: "center" }}>
        {/* DONUT */}
        <View style={styles.chartCard}>
          <View style={styles.chartContainer}>
            <Svg width={size} height={size}>
              <Circle
                stroke="#222"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                fill="none"
              />

              {totalIncome > 0 && (
                <Circle
                  stroke="#44DA76"
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${incomeStroke}, ${circumference}`}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  fill="none"
                />
              )}

              {totalExpense > 0 && (
                <Circle
                  stroke="#FF5E5E"
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${expenseStroke}, ${circumference}`}
                  strokeDashoffset={-incomeStroke}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  fill="none"
                />
              )}
            </Svg>

            <View style={styles.centerText}>
              <Text style={styles.percentText}>{incomePercent.toFixed(1)}%</Text>
              <Text style={styles.subText}>Pemasukan</Text>
            </View>
          </View>

          {/* LEGEND */}
          <View style={styles.legendWrapper}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: "#44DA76" }]} />
              <Text style={styles.legendText}>
                Income: Rp {totalIncome.toLocaleString("id-ID")}
              </Text>
            </View>

            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: "#FF5E5E" }]} />
              <Text style={styles.legendText}>
                Expense: Rp {totalExpense.toLocaleString("id-ID")}
              </Text>
            </View>
          </View>
        </View>

        {/* SUMMARY */}
        <View style={{ width: "90%", marginTop: 25 }}>
          <Text style={styles.listTitle}>Ringkasan Bulan Ini</Text>

          {/* INCOME */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pemasukan Terbesar</Text>
            {biggestIncome ? (
              <>
                <Text style={styles.summaryCategory}>{biggestIncome.categories?.name}</Text>
                <Text style={[styles.summaryAmount, { color: "#44DA76" }]}>
                  Rp {biggestIncome.amount.toLocaleString("id-ID")}
                </Text>
              </>
            ) : (
              <Text style={styles.noData}>Tidak ada pemasukan.</Text>
            )}
          </View>

          {/* EXPENSE */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pengeluaran Terbesar</Text>
            {biggestExpense ? (
              <>
                <Text style={styles.summaryCategory}>{biggestExpense.categories?.name}</Text>
                <Text style={[styles.summaryAmount, { color: "#FF5E5E" }]}>
                  Rp {biggestExpense.amount.toLocaleString("id-ID")}
                </Text>
              </>
            ) : (
              <Text style={styles.noData}>Tidak ada pengeluaran.</Text>
            )}
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

  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1F1F1F",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 15,
  },
  monthText: { color: "white", fontSize: 17, fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "80%",
    backgroundColor: "#1E1F1F",
    padding: 20,
    borderRadius: 16,
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

  monthOption: { paddingVertical: 10 },
  monthOptionText: { color: "white", fontSize: 16 },

  closeBtn: {
    marginTop: 15,
    backgroundColor: "#333",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  chartCard: {
    width: "90%",
    backgroundColor: "#1E1F1F",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },

  chartContainer: { justifyContent: "center", alignItems: "center" },
  centerText: { position: "absolute", alignItems: "center" },
  percentText: { color: "white", fontSize: 38, fontWeight: "800" },
  subText: { color: "#888", fontSize: 15 },

  legendWrapper: { width: "90%", marginTop: 20 },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  legendDot: { width: 16, height: 16, borderRadius: 10, marginRight: 10 },
  legendText: { color: "white", fontSize: 16 },

  listTitle: { color: "white", fontSize: 18, fontWeight: "700" },

  summaryCard: {
    backgroundColor: "#252525",
    padding: 16,
    borderRadius: 14,
    marginTop: 15,
  },
  summaryLabel: { color: "#888", fontSize: 14 },
  summaryCategory: { color: "white", fontSize: 17, },
  summaryAmount: { fontSize: 18, fontWeight: "700", marginTop: 5 },
  noData: { color: "#777", marginTop: 5 },
});
