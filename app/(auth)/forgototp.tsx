import React, { useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useLocalSearchParams, router } from "expo-router";

const ForgotOtpPage = () => {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const otpRefs = Array.from({ length: 6 }, () => useRef<TextInput | null>(null));

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) otpRefs[index + 1].current?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setLoading(false);
    if (error) alert(error.message);
    else router.push("/(auth)/forgotpassword");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <ArrowLeft color="white" size={35} style={{ marginTop: 20 }} />
      </TouchableOpacity>

      <Text style={styles.title}>Masukkan OTP</Text>
      <Text style={styles.subtitle}>Kode OTP dikirim ke {email}</Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={otpRefs[i]}
            style={styles.otpInput}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(t) => handleOtpChange(t, i)}
            textAlign="center"
          />
        ))}
      </View>

      <TouchableOpacity onPress={handleVerifyOtp} style={styles.button} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Verifikasi OTP</Text>}
      </TouchableOpacity>
    </View>
  );
};

export default ForgotOtpPage;

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
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 25,
    marginTop: 50,
  },
  otpInput: {
    width: 45,
    height: 55,
    backgroundColor: "white",
    borderRadius: 10,
    fontSize: 20,
    color: "black",
    borderWidth: 1.5,
    borderColor: "#ccc",
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
});
