import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  XCircle,
  CheckCircle,
  Info,
  ChevronLeft,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // === STATE UNTUK CUSTOM ALERT ===
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info"); // success | error | info

  // === CEK SESSION SAAT APP DIBUKA ===
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedSession = await AsyncStorage.getItem("session");
        if (storedSession) {
          const { access_token, refresh_token } = JSON.parse(storedSession);
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (!error && data.session) {
            router.replace("/home"); // langsung masuk ke home
          }
        }
      } catch (err) {
        console.log("Gagal membaca session:", err);
      }
    };
    checkSession();
  }, []);

  // === FUNGSI UNTUK MENAMPILKAN ALERT MODERN ===
  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  // === HANDLE LOGIN / REGISTER ===
  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !username)) {
      showAlert("Error", "Harap isi semua kolom.", "error");
      return;
    }

    setLoading(true);

    if (isLogin) {
      // === LOGIN ===
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);

      if (error) {
        showAlert("Login Gagal", error.message, "error");
      } else {
        showAlert("Berhasil", "Login berhasil!", "success");
        if (rememberMe && data.session) {
          await AsyncStorage.setItem("session", JSON.stringify(data.session));
        }
        setTimeout(() => router.replace("/home"), 800);
      }
    } else {
      // === REGISTER ===
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });
      setLoading(false);

      if (error) {
        showAlert("Gagal Daftar", error.message, "error");
        return;
      }

      if (!data.session) {
        showAlert(
          "Daftar Berhasil",
          "Periksa email Anda untuk verifikasi sebelum login.",
          "info"
        );
      } else {
        if (rememberMe && data.session) {
          await AsyncStorage.setItem("session", JSON.stringify(data.session));
        }
        showAlert("Berhasil", "Akun berhasil dibuat!", "success");
        setTimeout(() => router.replace("/home"), 800);
      }

      setIsLogin(true);
    }
  };

  // === TAMPILKAN ICON ALERT SESUAI TYPE ===
  const renderAlertIcon = () => {
    switch (alertType) {
      case "error":
        return <XCircle color="#ff4d4f" size={60} />;
      case "success":
        return <CheckCircle color="#44DA76" size={60} />;
      default:
        return <Info color="#1890ff" size={60} />;
    }
  };

  const handleBack = () => {
    router.replace("/onboarding");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleBack} style={styles.back}>
        <ChevronLeft color="#44DA76" size={35} style={{ marginTop: 20 }} />
      </TouchableOpacity>

      <Text style={styles.title}>
        {isLogin ? "Masuk ke Akun Anda" : "Buat Akun Baru Anda"}
      </Text>
      <Text style={styles.subtitle}>
        {isLogin
          ? "Masuk untuk pengalaman terbaik mengelola uang"
          : "Daftar untuk mulai mengelola keuangan Anda"}
      </Text>

      <View style={styles.form}>
        {/* === Tab Switch Login / Register === */}
        <View style={styles.switchContainer}>
          <TouchableOpacity
            onPress={() => setIsLogin(true)}
            style={[styles.switchButton, isLogin && styles.switchActive]}
          >
            <Text
              style={[styles.switchLabel, isLogin && styles.switchLabelActive]}
            >
              Masuk
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsLogin(false)}
            style={[styles.switchButton, !isLogin && styles.switchActive]}
          >
            <Text
              style={[styles.switchLabel, !isLogin && styles.switchLabelActive]}
            >
              Daftar
            </Text>
          </TouchableOpacity>
        </View>

        {/* === Input Nama Pengguna === */}
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Nama Pengguna"
            placeholderTextColor="gray"
            onChangeText={setUsername}
            value={username}
          />
        )}

        {/* === Input Email === */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="gray"
          keyboardType="email-address"
          onChangeText={setEmail}
          value={email}
        />

        {/* === Input Password + Icon Mata === */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Kata Sandi"
            placeholderTextColor="gray"
            secureTextEntry={!visible}
            onChangeText={setPassword}
            value={password}
          />
          <TouchableOpacity onPress={() => setVisible((v) => !v)}>
            {visible ? (
              <Eye size={24} color="#666" />
            ) : (
              <EyeOff size={24} color="#666" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.checkboxContainer}>
        {/* === Checkbox Remember Me === */}
        {isLogin && (
          <View style={styles.rememberContainer}>
            <TouchableOpacity
              onPress={() => setRememberMe(!rememberMe)}
              style={[styles.checkbox, rememberMe && styles.checkboxActive]}
            >
              {rememberMe && <Check size={16} color="black" />}
            </TouchableOpacity>
            <Text style={styles.rememberText}>Ingat saya</Text>
          </View>
        )}

        {/* ==== Lupa Sandi === */}
        {isLogin && (
          <TouchableOpacity
          onPress={() => router.push("/forgot")}
          style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>Lupa Kata Sandi?</Text>
          </TouchableOpacity>
        )}
        </View>

        {/* === Button === */}
        <TouchableOpacity
          onPress={handleAuth}
          style={styles.button}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              {isLogin ? "Masuk" : "Daftar"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* === MODERN CUSTOM ALERT === */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            {renderAlertIcon()}
            <Text style={styles.alertTitle}>{alertTitle}</Text>
            <Text style={styles.alertMessage}>{alertMessage}</Text>
            <TouchableOpacity
              style={[
                styles.closeButton,
                alertType === "error"
                  ? { backgroundColor: "#ff4d4f" }
                  : alertType === "success"
                  ? { backgroundColor: "#44DA76" }
                  : { backgroundColor: "#1890ff" },
              ]}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.closeText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AuthPage;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#151716" },
  title: {
    fontSize: 32,
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
  back: { position: "absolute", top: 50, left: 25 },
  form: {
    flex: 1,
    backgroundColor: "white",
    marginTop: 50,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
  },

  // === SWITCH TAB ===
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#E8E8E8",
    borderRadius: 30,
    padding: 5,
    marginBottom: 25,
  },
  switchButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 25,
  },
  switchActive: { backgroundColor: "white" },
  switchLabel: { color: "#777", fontSize: 16, fontWeight: "600" },
  switchLabelActive: { color: "black", fontWeight: "bold" },

  input: {
    height: 50,
    backgroundColor: "white",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: "black",
    borderWidth: 2,
    borderColor: "#E8E8E8",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#E8E8E8",
  },
  passwordInput: { flex: 1, height: 50, fontSize: 16, color: "black" },


  checkboxContainer: {
  justifyContent: "space-between",
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 20,
  },

  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",

  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "black",
    borderRadius: 5,
    marginRight: 10,
    marginLeft: 5,

  },
  checkboxActive: { borderColor: "black" },
  rememberText: { color: "#333", fontSize: 15 },

  forgotButton: {

  },
  forgotText: { color: "#44DA76", fontSize: 15, textDecorationLine: "underline", fontWeight: "light" },

  button: {
    backgroundColor: "#44DA76",
    borderRadius: 100,
    height: 55,
    justifyContent: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },

  // === CUSTOM ALERT ===
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertBox: {
    backgroundColor: "white",
    width: "80%",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    elevation: 10,
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 10,
    color: "#222",
  },
  alertMessage: {
    color: "#444",
    textAlign: "center",
    marginVertical: 10,
    fontSize: 16,
  },
  closeButton: {
    borderRadius: 30,
    paddingHorizontal: 30,
    paddingVertical: 10,
    marginTop: 10,
  },
  closeText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
