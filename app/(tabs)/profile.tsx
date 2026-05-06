import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#44DA76" />
      </View>
    );
  }

  const name = user?.user_metadata?.username || "User";
  const email = user?.email;
  const avatar = user?.user_metadata?.avatar_url || null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons
          name="chevron-back"
          size={26}
          color="#44DA76"
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>Pengaturan</Text>
        <View style={{ width: 26 }} /> 
      </View>

      {/* Upper Curve Section */}
      <View style={styles.topSection} />

      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={45} color="#bbb" />
          </View>
        )}
      </View>

      {/* Name & Email */}
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.email}>{email}</Text>

      {/* Change Password */}
      <TouchableOpacity
        style={styles.changePassBtn}
        onPress={() => router.push("/(auth)/forgot")}
      >
        <Text style={styles.changePassText}>Ganti kata sandi</Text>
        <Ionicons name="chevron-forward" size={20} color="#44DA76" />
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={async () => {
          await supabase.auth.signOut();
          router.replace("/auth");
        }}
      >
        <Text style={styles.logoutText}>Keluar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151716",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // HEADER
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },

  // TOP ROUND SECTION
  topSection: {
    height: 110,
    backgroundColor: "#0F0F0F",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },

  // AVATAR
  avatarWrapper: {
    marginTop: -55,
    alignSelf: "center",
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 70,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 70,
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
  },

  // NAME & EMAIL
  name: {
    marginTop: 15,
    color: "white",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
  },
  email: {
    marginTop: 5,
    color: "#ccc",
    textAlign: "center",
    fontSize: 14,
  },

  // CHANGE PASSWORD ROW
  changePassBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#222",
    padding: 15,
    marginHorizontal: 25,
    borderRadius: 10,
    marginTop: 35,
    alignItems: "center",
  },
  changePassText: {
    color: "white",
    fontSize: 15,
    fontWeight: "500",
  },

  // LOGOUT
  logoutBtn: {
    marginTop: 40,
    marginHorizontal: 25,
    backgroundColor: "#F55353",
    paddingVertical: 15,
    borderRadius: 12,
  },
  logoutText: {
    textAlign: "center",
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});
