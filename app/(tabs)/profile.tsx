import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [username, setUsername] = useState("");

  // ✅ Ambil data profil dari Supabase
  const getProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw userError || new Error("Tidak ada user");

      const { data, error } = await supabase
        .from("profiles")
        .select("username, email, avatar_url")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setUsername(data.username ?? "");
    } catch (error) {
      console.log("getProfile error:", error);
      Alert.alert("Gagal Memuat Profil", "Periksa koneksi atau login ulang.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProfile();
  }, []);

  // ✅ Upload foto profil ke Supabase Storage
const handleUploadAvatar = async () => {
  try {
    setUploading(true);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    const file = result.assets[0];
    const ext = file.uri.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `${fileName}`;

    // ✅ Ambil blob dari file URI
    const response = await fetch(file.uri);
    const blob = await response.blob();

    // ✅ Upload ke Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // ✅ Ambil public URL
    const { data: publicUrl } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // ✅ Update URL di tabel profiles
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl.publicUrl })
      .eq("email", profile.email);

    if (updateError) throw updateError;

    setProfile((p: any) => ({ ...p, avatar_url: publicUrl.publicUrl }));
    Alert.alert("Berhasil", "Foto profil berhasil diperbarui!");
  } catch (error) {
    console.error("Upload avatar error:", error);
    Alert.alert("Gagal Upload", "Terjadi kesalahan saat upload foto.");
  } finally {
    setUploading(false);
  }
};


  // ✅ Simpan perubahan username
  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username })
        .eq("email", profile.email);

      if (error) throw error;
      Alert.alert("Berhasil", "Profil berhasil diperbarui!");
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Gagal", "Tidak dapat menyimpan perubahan.");
    }
  };

  // ✅ Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleUploadAvatar}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={{ color: "#888" }}>+ Upload</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Email</Text>
      <TextInput
        value={profile?.email}
        editable={false}
        style={[styles.input, { opacity: 0.6 }]}
      />

      <Text style={styles.label}>Username</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Masukkan username"
        style={styles.input}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#1E90FF" }]}
        onPress={handleSave}
      >
        <Text style={styles.buttonText}>Simpan</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#444" }]}
        onPress={() => router.push("/forgot")}
      >
        <Text style={styles.buttonText}>Ganti Password</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#F55353" }]}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

      {uploading && <ActivityIndicator color="#fff" style={{ marginTop: 10 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151716",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  label: {
    color: "#aaa",
    alignSelf: "flex-start",
    marginLeft: 5,
    marginBottom: 5,
  },
  input: {
    width: "100%",
    backgroundColor: "#222",
    color: "white",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  button: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#151716",
  },
});
