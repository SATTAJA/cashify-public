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
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useLocalSearchParams, router } from "expo-router";

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
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <ArrowLeft color="white" size={35} style={{ marginTop: 20 }} />
      </TouchableOpacity>

      <Text style={styles.title}>Masukkan OTP</Text>
      <Text style={styles.subtitle}>Kode OTP sudah terkirim ke email kamu</Text>
      <Text style={styles.email}>{email}</Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={(ref) => {
              otpRefs.current[i] = ref;
            }}
            style={[
              styles.otpInput,
              focusedIndex === i && styles.otpInputFocused, // efek bercahaya hijau
            ]}
            keyboardType="number-pad"
            maxLength={6}
            value={digit}
            onFocus={() => setFocusedIndex(i)}
            onBlur={() => setFocusedIndex(null)}
            onChangeText={(t) => handleOtpChange(t, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            textAlign="center"
            placeholder="-"
            placeholderTextColor="gray"
            selectionColor="transparent" // hilangkan caret
            caretHidden={true} // 🔥 tidak ada garis kedip
            allowFontScaling={false}
          />
        ))}
      </View>

      <TouchableOpacity
        onPress={handleVerifyOtp}
        style={[styles.button, loading && { opacity: 0.7 }]}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Verifikasi OTP</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.info}>Segera cek email untuk melihat kode OTP</Text>
    </View>
  );
};

export default ForgotOtp;

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
  email: {
    fontSize: 15,
    color: "darkgray",
    marginTop: 35,
    textAlign: "center",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 25,
    marginTop: 25,
  },
  otpInput: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: "#252525",
    borderRadius: 15,
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    borderWidth: 1,
    borderColor: "gray",
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
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8, // efek glow di Android
  },
  button: {
    backgroundColor: "#44DA76",
    borderRadius: 100,
    height: 55,
    justifyContent: "center",
    marginHorizontal: 25,
    marginTop: 60,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  info: {
    color: "gray",
    textAlign: "center",
    marginTop: 20,
  },
});
