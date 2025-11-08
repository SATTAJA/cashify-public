import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from "react-native";
import { ArrowLeft, CheckCircle, XCircle, Info } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

const forgot = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"info" | "error" | "success">(
    "info"
  );

  const showAlert = (title: string, message: string, type = "info") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type as any);
    setAlertVisible(true);
  };

  const handleSendOtp = async () => {
    if (!email) return showAlert("Error", "Masukkan email kamu.", "error");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);

    if (error) {
      showAlert("Gagal", error.message, "error");
    } else {
      showAlert("Berhasil", "Kode OTP telah dikirim ke email kamu.", "success");
      setTimeout(() => {
        router.push(`/(auth)/forgototp?email=${encodeURIComponent(email)}`);
      }, 1200);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.replace("/auth")} style={styles.back}>
        <ArrowLeft color="white" size={35} style={{ marginTop: 20 }} />
      </TouchableOpacity>

      <Text style={styles.title}>Lupa Kata Sandi</Text>
      <Text style={styles.subtitle}>
        Masukkan email kamu untuk menerima kode OTP.
      </Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="gray"
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={setEmail}
          value={email}
        />

        <TouchableOpacity
          onPress={handleSendOtp}
          style={styles.button}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Kirim OTP</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            {alertType === "error" ? (
              <XCircle color="#ff4d4f" size={60} />
            ) : alertType === "success" ? (
              <CheckCircle color="#44DA76" size={60} />
            ) : (
              <Info color="#1890ff" size={60} />
            )}
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

export default forgot;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#151716" },
  back: { position: "absolute", top: 50, left: 25 },
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
  form: { marginTop: 50, padding: 25 },
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
