import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import {
  ChevronLeft,
  BriefcaseBusiness,
  Gift,
  Wallet,
  PlusCircle,
  LucideLandmark,
} from "lucide-react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";

const PRESET_CATEGORIES = [
  { name: "Gaji", icon: <BriefcaseBusiness color="#74C1FF" size={20} /> },
  { name: "THR", icon: <Gift color="#74C1FF" size={20} /> },
  { name: "Bonus", icon: <Wallet color="#74C1FF" size={20} /> },
  { name: "Tabungan", icon: <LucideLandmark color="#74C1FF" size={20} /> },
  { name: "Lainnya", icon: <PlusCircle color="#74C1FF" size={20} /> },
];

// Format angka jadi "15.000" / "2.000.000"
const formatIDR = (value: string) => {
  const numeric = value.replace(/\D/g, "");
  return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const AddIncome = () => {
  // rawAmount untuk database
  const [rawAmount, setRawAmount] = useState("");

  // displayAmount untuk tampilan input
  const [displayAmount, setDisplayAmount] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBack = () => router.replace("/home");

  // Input nominal handler
  const handleAmountChange = (text: string) => {
    const clean = text.replace(/\D/g, ""); // hanya angka
    setRawAmount(clean); // untuk DB
    setDisplayAmount(formatIDR(clean)); // tampilan
  };

  // Pastikan kategori sudah ada di DB / insert baru
  const ensureCategoryExists = async (categoryName: string) => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryName)
      .eq("type", "income")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) return existing.id;

    const { data, error } = await supabase
      .from("categories")
      .insert([
        {
          name: categoryName,
          type: "income",
          user_id: userId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.log("Insert category error:", error);
      Alert.alert("Error", "Gagal membuat kategori.");
      return null;
    }

    return data.id;
  };

  // Save transaksi
  const handleSave = async () => {
    if (!rawAmount || !selectedCategory) {
      Alert.alert("Error", "Nominal & kategori harus diisi.");
      return;
    }

    setLoading(true);

    const categoryId = await ensureCategoryExists(selectedCategory);
    if (!categoryId) {
      setLoading(false);
      return;
    }

    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    const { error } = await supabase.from("transactions").insert([
      {
        user_id: userId,
        amount: parseFloat(rawAmount), // ANGKA MURNI
        category_id: categoryId,
        type: "income",
        note,
      },
    ]);

    setLoading(false);

    if (error) {
      console.log(error);
      Alert.alert("Error", "Gagal menambahkan pemasukan.");
      return;
    }

    Alert.alert("Berhasil", "Pemasukan berhasil ditambahkan!");
    router.replace("/home");
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={handleBack}>
          <ChevronLeft color="#44DA76" size={35} />
        </TouchableOpacity>

        <Text style={styles.title}>Pemasukan</Text>
      </View>

      {/* Input Nominal */}
      <View style={styles.nominalWrapper}>
        <Text style={styles.rp}>Rp</Text>

        <TextInput
          style={styles.amountInput}
          keyboardType="number-pad"
          placeholder="...."
          placeholderTextColor="#555"
          value={displayAmount}
          onChangeText={handleAmountChange}
          maxLength={15}
        />
      </View>

      <Text style={styles.labelInfo}>Isi nominal pemasukan</Text>

      {/* Note */}
      <Text style={styles.label}>Catatan (Opsional)</Text>
      <TextInput
        style={styles.inputNote}
        placeholder="Tambahkan catatan..."
        placeholderTextColor="#777"
        value={note}
        onChangeText={setNote}
        multiline
      />

      {/* Kategori */}
      <Text style={styles.label}>Kategori</Text>

      <View style={styles.categoryWrapper}>
        {PRESET_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.name}
            style={[
              styles.categoryButton,
              selectedCategory === cat.name && styles.categorySelected,
            ]}
            onPress={() => setSelectedCategory(cat.name)}
          >
            <View style={styles.categoryIcon}>
            {cat.icon}
            </View>
            <Text
              style={[
                styles.categoryText,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, loading && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveText}>
          {loading ? "Menyimpan..." : "Simpan"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AddIncome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151716",
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 60,
    marginBottom: 25,
  },

  back: {
    padding: 5,
  },

  title: {
    color: "white",
    fontSize: 24,
  },

  /* NOMINAL STYLE */
  nominalWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  rp: {
    color: "gray",
    fontSize: 36,
    marginRight: 10,
    fontWeight: "bold",
  },

  amountInput: {
    color: "white",
    fontSize: 40,
    minWidth: 150,
    textAlign: "left",
  },

  labelInfo: {
    color: "#44DA76",
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
  },

  /* NOTE */
  label: {
    color: "#44DA76",
    fontSize: 15,
    marginBottom: 10,
    marginTop: 25,
  },

  inputNote: {
    backgroundColor: "#1E201F",
    borderRadius: 10,
    padding: 12,
    color: "white",
    height: 80,
    fontSize: 16,
    textAlignVertical: "top",
  },

  /* CATEGORY */
  categoryWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryIcon: {
    backgroundColor: "#264E6E",
    borderRadius: 10,
    padding: 10,
  },

  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#252525",
  },

  categorySelected: {
    borderColor: "#44DA76",
    borderWidth: 1,
    shadowColor: "#44DA76",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  categoryText: {
    color: "white",
    fontWeight: "600",
  },

  /* SAVE BUTTON */
  saveButton: {
    backgroundColor: "#44DA76",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 40,
    marginBottom: 40,
    alignItems: "center",
  },

  saveText: {
    color: "#151716",
    fontSize: 16,
    fontWeight: "700",
  },
});
