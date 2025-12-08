import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

// Icons
import {
  ShoppingCart,
  Utensils,
  Stethoscope,
  Gamepad2,
  Car,
  Shirt,
  Package,
  BriefcaseBusiness,
  Gift,
  Wallet,
  PlusCircle,
  LucideLandmark,
} from "lucide-react-native";

const incomeIconMap: any = {
  Gaji: <BriefcaseBusiness color="#74C1FF" size={22} />,
  THR: <Gift color="#74C1FF" size={22} />,
  Bonus: <Wallet color="#74C1FF" size={22} />,
  Tabungan: <LucideLandmark color="#74C1FF" size={22} />,
  Lainnya: <PlusCircle color="#74C1FF" size={22} />,
};

const expenseIconMap: any = {
  "Belanja Bulanan": <ShoppingCart color="#74C1FF" size={22} />,
  "Makan & Minum": <Utensils color="#74C1FF" size={22} />,
  Kesehatan: <Stethoscope color="#74C1FF" size={22} />,
  Hiburan: <Gamepad2 color="#74C1FF" size={22} />,
  Transportasi: <Car color="#74C1FF" size={22} />,
  Pakaian: <Shirt color="#74C1FF" size={22} />,
  Barang: <Package color="#74C1FF" size={22} />,
  Lainnya: <PlusCircle color="#74C1FF" size={22} />,
};

export default function HistoryPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const [filterMenu, setFilterMenu] = useState(false);

  // Fetch user
  useEffect(() => {
    const getUser = async () => {
      const res = await supabase.auth.getUser();
      setUserId(res?.data?.user?.id ?? null);
    };
    getUser();
  }, []);

  // Fetch history
  const loadHistory = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("transactions")
      .select(
        `
      id,
      type,
      amount,
      created_at,
      categories(name)
    `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) setHistory(data);
  };

  useEffect(() => {
    loadHistory();
  }, [userId]);

  const getFiltered = () => {
    if (filter === "all") return history;
    return history.filter((x) => x.type === filter);
  };

  const renderItem = ({ item }: any) => {
    const cat = item.categories?.name || "Tidak diketahui";

    const icon =
      item.type === "income"
        ? incomeIconMap[cat] ?? <Wallet color="#74C1FF" size={22} />
        : expenseIconMap[cat] ?? <Package color="#74C1FF" size={22} />;

    return (
      <View style={styles.card}>
        <View style={styles.iconBox}>{icon}</View>

        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{cat}</Text>
          <Text style={styles.cardSubtitle}>
            {item.type === "income" ? "Pemasukan" : "Pengeluaran"}
          </Text>
        </View>

        <Text
          style={[
            styles.amount,
            { color: item.type === "income" ? "#4CD964" : "#FF4E4E" },
          ]}
        >
          {item.type === "income" ? "+" : "-"} Rp{" "}
          {item.amount.toLocaleString("id-ID")}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {filter === "all"
            ? "Riwayat Keuangan"
            : filter === "income"
            ? "Riwayat Pemasukan"
            : "Riwayat Pengeluaran"}
        </Text>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterMenu(true)}
        >
          <Ionicons name="filter-outline" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <FlatList
        data={getFiltered()}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {/* FILTER MENU */}
      <Modal transparent visible={filterMenu} animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setFilterMenu(false)}
        >
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setFilter("all");
                setFilterMenu(false);
              }}
            >
              <Text style={styles.dropdownText}>Semua</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setFilter("income");
                setFilterMenu(false);
              }}
            >
              <Text style={styles.dropdownText}>Pemasukan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setFilter("expense");
                setFilterMenu(false);
              }}
            >
              <Text style={styles.dropdownText}>Pengeluaran</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151716",
    paddingHorizontal: 18,
    paddingTop: 55,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },

  headerText: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
  },

  filterButton: {
    padding: 8,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#222",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  iconBox: {
    width: 45,
    height: 45,
    backgroundColor: "#264E6E",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  cardTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  cardSubtitle: {
    color: "#888",
    fontSize: 13,
  },

  amount: {
    fontSize: 17,
    fontWeight: "bold",
  },

  overlay: {
    flex: 1,
  },

  dropdown: {
    position: "absolute",
    right: 20,
    top: 110,
    backgroundColor: "#222",
    paddingVertical: 6,
    borderRadius: 10,
    width: 160,
  },

  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  dropdownText: {
    color: "white",
    fontSize: 14,
  },
});
