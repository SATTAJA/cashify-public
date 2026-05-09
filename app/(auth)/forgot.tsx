import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { 
  Mail, 
  ChevronLeft, 
  Send, 
  CheckCircle, 
  XCircle, 
  Info,
  Key 
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

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
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Gradient */}
        <LinearGradient
          colors={['#1a1f1e', '#151716']}
          style={styles.header}
        >
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <ChevronLeft color="#44DA76" size={28} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Key size={48} color="#44DA76" />
          </View>
          
          <Text style={styles.title}>Lupa Kata Sandi?</Text>
          <Text style={styles.subtitle}>
            Tenang, kami akan mengirimkan kode verifikasi ke email Anda
          </Text>
        </LinearGradient>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <View style={styles.formCard}>
            <Text style={styles.label}>Alamat Email</Text>
            
            <View style={styles.inputWrapper}>
              <Mail size={20} color="#44DA76" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="contoh@email.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setEmail}
                value={email}
              />
            </View>

            <TouchableOpacity
              onPress={handleSendOtp}
              style={[styles.button, loading && styles.buttonDisabled]}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Send size={18} color="white" />
                  <Text style={styles.buttonText}>Kirim Kode OTP</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Alert Modal */}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default forgot;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151716",
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 25,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(68, 218, 118, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(68, 218, 118, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  label: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151716",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: "white",
  },
  button: {
    backgroundColor: "#44DA76",
    borderRadius: 12,
    height: 52,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  helpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  helpText: {
    color: "#999",
    fontSize: 14,
  },
  helpLink: {
    color: "#44DA76",
    fontSize: 14,
    fontWeight: "600",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertBox: {
    backgroundColor: "#1C1C1E",
    width: "80%",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 8,
    color: "white",
  },
  alertMessage: {
    color: "#ccc",
    textAlign: "center",
    marginVertical: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  closeButton: {
    borderRadius: 12,
    paddingHorizontal: 30,
    paddingVertical: 10,
    marginTop: 15,
    minWidth: 100,
    alignItems: "center",
  },
  closeText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
  },
});