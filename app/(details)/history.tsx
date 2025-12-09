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
  ChevronLeft,
  Trash2,
} from "lucide-react-native";
import { router } from "expo-router";

/* =====================================
   TYPE DEFINITIONS
===================================== */

interface Category {
  name: string;
}

interface Transaction {
  id: number;
  type: "income" | "expense";
  amount: number;
  note: string | null;
  created_at: string;
  categories: Category | null;
}

type IconType = React.ReactElement;

/* =====================================
   ICON MAPS
===================================== */

const incomeIconMap: Record<string, IconType> = {
  Gaji: <BriefcaseBusiness color="#74C1FF" size={22} />,
  THR: <Gift color="#74C1FF" size={22} />,
  Bonus: <Wallet color="#74C1FF" size={22} />,
  Tabungan: <LucideLandmark color="#74C1FF" size={22} />,
  Lainnya: <PlusCircle color="#74C1FF" size={22} />,
};

const expenseIconMap: Record<string, IconType> = {
  "Belanja Bulanan": <ShoppingCart color="#74C1FF" size={22} />,
  "Makan & Minum": <Utensils color="#74C1FF" size={22} />,
  Kesehatan: <Stethoscope color="#74C1FF" size={22} />,
  Hiburan: <Gamepad2 color="#74C1FF" size={22} />,
  Transportasi: <Car color="#74C1FF" size={22} />,
  Pakaian: <Shirt color="#74C1FF" size={22} />,
  Barang: <Package color="#74C1FF" size={22} />,
  Lainnya: <PlusCircle color="#74C1FF" size={22} />,
};

/* =====================================
   MAIN PAGE
===================================== */

export default function HistoryPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const [filterMenu, setFilterMenu] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* GET USER */
  useEffect(() => {
    const getUser = async () => {
      const res = await supabase.auth.getUser();
      setUserId(res?.data?.user?.id ?? null);
    };
    getUser();
  }, []);

  /* LOAD HISTORY */
  const loadHistory = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("transactions")
      .select(
        `
        id,
        type,
        amount,
        note,
        created_at,
        categories(name)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) setHistory(data as unknown as Transaction[]);
  };

  useEffect(() => {
    loadHistory();
  }, [userId]);

  /* FILTER */
  const getFiltered = () => {
    if (filter === "all") return history;
    return history.filter((x) => x.type === filter);
  };

  /* DETAIL */
  const openDetail = (item: Transaction) => {
    setSelected(item);
    setDetailOpen(true);
  };

  const handleBack = () => router.push("/(tabs)/home");

  /* DELETE */
  const deleteTransaction = async () => {
    if (!selected) return;

    await supabase.from("transactions").delete().eq("id", selected.id);

    setConfirmDelete(false);
    setDetailOpen(false);
    loadHistory();
  };

  /* RENDER LIST */
  const renderItem = ({ item }: { item: Transaction }) => {
    const cat = item.categories?.name || "Tidak diketahui";

    const icon =
      item.type === "income"
        ? incomeIconMap[cat] ?? <Wallet color="#74C1FF" size={22} />
        : expenseIconMap[cat] ?? <Package color="#74C1FF" size={22} />;

    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetail(item)}>
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
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={handleBack}>
          <ChevronLeft color="#44DA76" size={35} />
        </TouchableOpacity>

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

      {/* DETAIL MODAL */}
      <Modal visible={detailOpen} transparent animationType="slide">
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Detail Transaksi</Text>

            <Text style={styles.detailLabel}>Kategori:</Text>
            <Text style={styles.detailValue}>
              {selected?.categories?.name}
            </Text>

            <Text style={styles.detailLabel}>Tipe:</Text>
            <Text style={styles.detailValue}>
              {selected?.type === "income" ? "Pemasukan" : "Pengeluaran"}
            </Text>

            <Text style={styles.detailLabel}>Nominal:</Text>
            <Text style={styles.detailValue}>
              Rp {selected?.amount.toLocaleString("id-ID")}
            </Text>

            <Text style={styles.detailLabel}>Catatan:</Text>
            <Text style={styles.detailValue}>{selected?.note || "-"}</Text>

            <Text style={styles.detailLabel}>Tanggal:</Text>
            <Text style={styles.detailValue}>
              {selected &&
                new Date(selected.created_at).toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </Text>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => setConfirmDelete(true)}
            >
              <Trash2 color="white" size={20} />
              <Text style={{ color: "white", marginLeft: 8 }}>Hapus</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDetailOpen(false)}
            >
              <Text style={{ color: "white" }}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* KONFIRMASI DELETE */}
      <Modal visible={confirmDelete} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Anda yakin?</Text>
            <Text style={styles.confirmSub}>
              Jika dihapus maka jumlah saldo anda akan kembali ke sebelum
              ditambahkannya riwayat ini.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmDelete(false)}
              >
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={deleteTransaction}
              >
                <Text style={styles.confirmDeleteText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =====================================
   STYLES
===================================== */

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
  back: {
    padding: 5,
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
    top: 50,
    backgroundColor: "#222",
    paddingVertical: 6,
    borderRadius: 10,
    width: 160,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownText: {
    color: "white",
    fontSize: 14,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  detailCard: {
    backgroundColor: "rgba(40,40,40,0.55)",
    padding: 22,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    marginBottom: 15,
    textAlign: "center",
  },
  detailLabel: {
    color: "#ccc",
    marginTop: 10,
  },
  detailValue: {
    color: "white",
    fontSize: 16,
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: "row",
    backgroundColor: "#FF4E4E",
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },
  closeButton: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#333",
    borderRadius: 12,
    alignItems: "center",
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  confirmBox: {
    width: "100%",
    backgroundColor: "rgba(40,40,40,0.85)",
    padding: 25,
    borderRadius: 20,
  },
  confirmTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  confirmSub: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 25,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: "#555",
    borderRadius: 10,
  },
  cancelText: {
    color: "white",
    fontWeight: "600",
  },
  confirmDeleteBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: "#FF4E4E",
    borderRadius: 10,
  },
  confirmDeleteText: {
    color: "white",
    fontWeight: "700",
  },
});
