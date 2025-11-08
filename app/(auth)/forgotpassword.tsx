import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

const forgotpassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) return alert("Lengkapi semua kolom");
    if (newPassword !== confirmPassword) return alert("Password tidak cocok");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) alert(error.message);
    else {
      alert("Password berhasil diubah!");
      router.replace("/auth");
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <ArrowLeft color="white" size={35} style={{ marginTop: 20 }} />
      </TouchableOpacity>

      <Text style={styles.title}>Buat Password Baru</Text>
      <Text style={styles.subtitle}>Masukkan password baru kamu di bawah ini.</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Password Baru"
          placeholderTextColor="gray"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Konfirmasi Password Baru"
          placeholderTextColor="gray"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity onPress={handleChangePassword} style={styles.button} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Ubah Password</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default forgotpassword;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#151716" },
  back: { position: "absolute", top: 50, left: 25 },
  title: {
    fontSize: 28,
    color: "white",
    fontWeight: "bold",
    marginTop: 150,
    marginHorizontal: 25,
  },
  subtitle: {
    fontSize: 15,
    color: "gray",
    marginTop: 10,
    marginHorizontal: 25,
  },
  form: { marginTop: 50, paddingHorizontal: 25 },
  input: {
    height: 50,
    backgroundColor: "white",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: "black",
  },
  button: {
    backgroundColor: "#44DA76",
    borderRadius: 100,
    height: 55,
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
});
