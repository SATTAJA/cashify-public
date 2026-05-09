import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { ChevronLeft, KeyRound, Shield, Mail } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useLocalSearchParams, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const BOX_SIZE = 55;

const ForgotOtp: React.FC = () => {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState<boolean>(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const otpRefs = useRef<(TextInput | null)[]>([]);

  // === HANDLE CHANGE / PASTE ===
  const handleOtpChange = (text: string, index: number) => {
    const onlyDigits = text.replace(/\D/g, "");

    if (onlyDigits.length > 1) {
      const newOtp = [...otp];
      for (let i = 0; i < onlyDigits.length && index + i < 6; i++) {
        newOtp[index + i] = onlyDigits[i];
      }
      setOtp(newOtp);

      const lastFilled = Math.min(5, index + onlyDigits.length - 1);
      if (lastFilled === 5) {
        Keyboard.dismiss();
      } else {
        otpRefs.current[lastFilled + 1]?.focus();
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = onlyDigits.slice(0, 1);
    setOtp(newOtp);

    if (onlyDigits && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // === HANDLE BACKSPACE ===
  const handleKeyPress = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (event.nativeEvent.key !== "Backspace") return;

    const newOtp = [...otp];
    if (otp[index] === "") {
      if (index > 0) {
        newOtp[index - 1] = "";
        setOtp(newOtp);
        otpRefs.current[index - 1]?.focus();
      }
    } else {
      newOtp[index] = "";
      setOtp(newOtp);
      if (index > 0) {
        setTimeout(() => otpRefs.current[index - 1]?.focus(), 0);
      }
    }
  };

  // === HANDLE VERIFY ===
  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      alert("Masukkan 6 digit OTP");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });

      if (error) {
        alert(error.message || "Terjadi kesalahan saat verifikasi OTP");
      } else {
        router.push("/(auth)/forgotpassword");
      }
    } catch (err: any) {
      alert(err?.message ?? "Terjadi kesalahan");
    } finally {
      setLoading(false);
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
            <Shield size={48} color="#44DA76" />
          </View>
          
          <Text style={styles.title}>Verifikasi Kode OTP</Text>
          <Text style={styles.subtitle}>
            Masukkan kode verifikasi 6 digit yang telah dikirim ke
          </Text>
          
          <View style={styles.emailContainer}>
            <Mail size={16} color="#44DA76" />
            <Text style={styles.email}>{email}</Text>
          </View>
        </LinearGradient>

        {/* OTP Section */}
        <View style={styles.otpSection}>
          <View style={styles.otpCard}>
            <KeyRound size={24} color="#44DA76" style={styles.otpIcon} />
            <Text style={styles.otpLabel}>Kode Verifikasi</Text>
            
            <View style={styles.otpContainer}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => {
                    otpRefs.current[i] = ref;
                  }}
                  style={[
                    styles.otpInput,
                    focusedIndex === i && styles.otpInputFocused,
                    digit && styles.otpInputFilled,
                  ]}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={digit}
                  onFocus={() => setFocusedIndex(i)}
                  onBlur={() => setFocusedIndex(null)}
                  onChangeText={(t) => handleOtpChange(t, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  textAlign="center"
                  placeholder="•"
                  placeholderTextColor="#444"
                  selectionColor="transparent"
                  caretHidden={true}
                  allowFontScaling={false}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleVerifyOtp}
              style={[styles.button, loading && styles.buttonDisabled]}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.buttonText}>Verifikasi & Lanjutkan</Text>
              )}
            </TouchableOpacity>

            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Belum menerima kode? Cek folder spam atau
              </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.infoLink}> kirim ulang</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotOtp;

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
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(68, 218, 118, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 20,
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: "rgba(68, 218, 118, 0.1)",
    borderRadius: 20,
  },
  email: {
    fontSize: 14,
    color: "#44DA76",
    fontWeight: "500",
  },
  otpSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  otpCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2C2C2E",
    alignItems: "center",
  },
  otpIcon: {
    marginBottom: 12,
  },
  otpLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 24,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 32,
    width: "100%",
  },
  otpInput: {
    flex: 1,
    height: BOX_SIZE,
    backgroundColor: "#151716",
    borderRadius: 12,
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    borderWidth: 1.5,
    borderColor: "#2C2C2E",
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    paddingVertical: 0,
    paddingHorizontal: 0,
    lineHeight: Platform.OS === "ios" ? BOX_SIZE : undefined,
  },
  otpInputFocused: {
    borderColor: "#44DA76",
    shadowColor: "#44DA76",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  otpInputFilled: {
    borderColor: "#44DA76",
    backgroundColor: "rgba(68, 218, 118, 0.05)",
  },
  button: {
    backgroundColor: "#44DA76",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
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
  infoContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 10,
  },
  infoText: {
    color: "#999",
    fontSize: 13,
  },
  infoLink: {
    color: "#44DA76",
    fontSize: 13,
    fontWeight: "600",
  },
});