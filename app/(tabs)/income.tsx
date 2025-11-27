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
import { ChevronLeft, Wallet, Gift, BriefcaseBusiness, PlusCircle } from "lucide-react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";

const PRESET_CATEGORIES = [
  { name: "Gaji", icon: <BriefcaseBusiness color="white" size={20} /> },
  { name: "THR", icon: <Gift color="white" size={20} /> },
  { name: "Bonus", icon: <Wallet color="white" size={20} /> },
  { name: "Lainnya", icon: <PlusCircle color="white" size={20} /> },
];

const AddIncome = () => {
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBack = () => router.replace("/home");

  // Insert kategori ke database kalau belum ada
  const ensureCategoryExists = async (categoryName: string) => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    // cek kategori
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryName)
      .eq("type", "income")
      .eq("user_id", userId)
      .maybeSingle();

    // sudah ada → kembalikan id
    if (existing) return existing.id;

    // kalau belum ada → insert
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
      Alert.alert("Error", "Gagal membuat kategori");
      return null;
    }

    return data.id; // return id kategori baru
  };

  // Simpan pemasukan
  const handleSave = async () => {
    if (!amount || !selectedCategory) {
      Alert.alert("Error", "Nominal & kategori harus diisi.");
      return;
    }

    setLoading(true);

    // Pastikan kategori tersedia di DB
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
        amount: parseFloat(amount),
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

        <Text style={styles.title}>Tambah Pemasukan</Text>
      </View>

      {/* Nominal */}
      <Text style={styles.label}>Nominal</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Masukkan jumlah"
        placeholderTextColor="#777"
        value={amount}
        onChangeText={setAmount}
      />

      {/* Kategori tombol */}
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
            {cat.icon}
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.name && { color: "#151716" },
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveButton, loading && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveText}>{loading ? "Menyimpan..." : "Simpan"}</Text>
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
    fontWeight: "bold",
  },

  label: {
    color: "#44DA76",
    fontSize: 15,
    marginBottom: 6,
    marginTop: 20,
  },

  input: {
    backgroundColor: "#1E201F",
    borderRadius: 10,
    padding: 12,
    color: "white",
    fontSize: 16,
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

  categoryWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },

  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#1E201F",
  },

  categorySelected: {
    backgroundColor: "#44DA76",
  },

  categoryText: {
    color: "white",
    fontWeight: "600",
  },

  saveButton: {
    backgroundColor: "#44DA76",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 40,
    alignItems: "center",
  },

  saveText: {
    color: "#151716",
    fontSize: 16,
    fontWeight: "700",
  },
});
