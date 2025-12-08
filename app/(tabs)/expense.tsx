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
  ShoppingCart,
  Utensils,
  Stethoscope,
  Gamepad2,
  Car,
  Shirt,
  Package,
  PlusCircle,
} from "lucide-react-native";

import { router } from "expo-router";
import { supabase } from "../../lib/supabase";

const PRESET_CATEGORIES = [
  { name: "Belanja Bulanan", icon: <ShoppingCart color="white" size={20} /> },
  { name: "Makan & Minum", icon: <Utensils color="white" size={20} /> },
  { name: "Kesehatan", icon: <Stethoscope color="white" size={20} /> },
  { name: "Hiburan", icon: <Gamepad2 color="white" size={20} /> },
  { name: "Transportasi", icon: <Car color="white" size={20} /> },
  { name: "Pakaian", icon: <Shirt color="white" size={20} /> },
  { name: "Barang", icon: <Package color="white" size={20} /> },
  { name: "Lainnya", icon: <PlusCircle color="white" size={20} /> },
];

// Format angka jadi 15.000 / 2.000.000
const formatIDR = (value: string) => {
  const numeric = value.replace(/\D/g, "");
  return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const AddExpense = () => {
  const [rawAmount, setRawAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBack = () => router.replace("/home");

  const handleAmountChange = (text: string) => {
    const clean = text.replace(/\D/g, "");
    setRawAmount(clean);
    setDisplayAmount(formatIDR(clean));
  };

  const ensureCategoryExists = async (categoryName: string) => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryName)
      .eq("type", "expense")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) return existing.id;

    const { data, error } = await supabase
      .from("categories")
      .insert([
        {
          name: categoryName,
          type: "expense",
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
        amount: parseFloat(rawAmount),
        category_id: categoryId,
        type: "expense",
        note,
      },
    ]);

    setLoading(false);

    if (error) {
      console.log(error);
      Alert.alert("Error", "Gagal menambahkan pengeluaran.");
      return;
    }

    Alert.alert("Berhasil", "Pengeluaran berhasil ditambahkan!");
    router.replace("/home");
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={handleBack}>
          <ChevronLeft color="#FF6B6B" size={35} />
        </TouchableOpacity>

        <Text style={styles.title}>Pengeluaran</Text>
      </View>

      {/* Nominal */}
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

      <Text style={styles.labelInfo}>Isi nominal pengeluaran</Text>

      {/* Catatan */}
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
            <View style={styles.categoryIcon}>{cat.icon}</View>
            <Text style={styles.categoryText}>{cat.name}</Text>
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

export default AddExpense;

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

  /* Nominal */
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
    width: "70%",
    textAlign: "left",
  },

  labelInfo: {
    color: "#FF6B6B",
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
  },

  label: {
    color: "#FF6B6B",
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

  /* Category List */
  categoryWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#252525",
  },

  categorySelected: {
    borderColor: "#FF6B6B",
    borderWidth: 1,
    shadowColor: "#FF6B6B",
    shadowOpacity: 0.25,
    elevation: 5,
  },

  categoryIcon: {
    backgroundColor: "#403F3F",
    borderRadius: 10,
    padding: 10,
  },

  categoryText: {
    color: "white",
    fontWeight: "600",
  },

  /* Save Button */
  saveButton: {
    backgroundColor: "#FF6B6B",
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
