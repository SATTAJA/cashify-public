import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

const ForgotPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword)
      return alert("Lengkapi semua kolom");
    if (newPassword !== confirmPassword)
      return alert("Password tidak cocok");

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
      {/* Tombol Kembali */}
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <ArrowLeft color="white" size={35} style={{ marginTop: 20 }} />
      </TouchableOpacity>

      <Text style={styles.title}>Buat Password Baru</Text>
      <Text style={styles.subtitle}>
        Masukkan password baru kamu di bawah ini
      </Text>

      <View style={styles.form}>
        {/* Input Password Baru */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Password Baru"
            placeholderTextColor="gray"
            secureTextEntry={!showPassword}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? (
              <Eye color="gray" size={22} />
            ) : (
              <EyeOff color="gray" size={22} />
            )}
          </TouchableOpacity>
        </View>

        {/* Input Konfirmasi Password */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Konfirmasi Password Baru"
            placeholderTextColor="gray"
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirm((prev) => !prev)}
          >
            {showConfirm ? (
              <Eye color="gray" size={22} />
            ) : (
              <EyeOff color="gray" size={22} />
            )}
          </TouchableOpacity>
        </View>

        {/* Tombol Submit */}
        <TouchableOpacity
          onPress={handleChangePassword}
          style={[styles.button, loading && { opacity: 0.7 }]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Ubah Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ForgotPassword;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#151716" },
  back: { position: "absolute", top: 50, left: 25 },
  title: {
    fontSize: 28,
    color: "white",
    fontWeight: "bold",
    marginTop: 150,
    marginHorizontal: 25,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "gray",
    marginTop: 10,
    marginHorizontal: 25,
    textAlign: "center",
  },
  form: { marginTop: 50, paddingHorizontal: 25 },

  // 🔹 Input field + ikon mata
  inputContainer: {
    position: "relative",
    marginBottom: 15,
  },
  input: {
    height: 50,
    backgroundColor: "#252525",
    borderRadius: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "white",
    borderColor: "gray",
    borderWidth: 1,
    paddingRight: 45, // ruang untuk ikon mata
  },
  eyeButton: {
    position: "absolute",
    right: 15,
    top: 14,
  },

  button: {
    backgroundColor: "#44DA76",
    borderRadius: 100,
    height: 55,
    justifyContent: "center",
    marginTop: 35,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
});
