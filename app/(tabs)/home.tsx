import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";

//  Definisikan tipe user
type UserInfo = {
  username: string;
  avatar_url: string | null;
} | null;

export default function Home() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [user, setUser] = useState<UserInfo>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      try {
        const res = await supabase.auth.getUser();
        const fetchedUser = res?.data?.user ?? null;
        if (!mounted) return;
        if (fetchedUser) {
          setUser({
            username:
              fetchedUser.user_metadata?.username ??
              fetchedUser.email?.split("@")[0] ??
              "User",
            avatar_url: fetchedUser.user_metadata?.avatar_url ?? null,
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.log("fetchUser error", err);
        setUser(null);
      } finally {
        if (mounted) setLoadingUser(false);
      }
    };

    fetchUser();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem("session");
      router.replace("/auth");
    } catch (error) {
      Alert.alert("Logout Gagal", "Terjadi kesalahan saat logout.");
    }
  };

  return (
    <View style={styles.container}>
      {/* ===== HEADER BAR ===== */}
      <View style={styles.header}>
        {/* Avatar + Username */}
        <View
          style={styles.headerLeft}
        >
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person-outline" size={22} color="white" />
            </View>
          )}
          <Text style={styles.usernameText}>
            {loadingUser ? "Memuat..." : user?.username ?? "Guest"}
          </Text>
        </View>

        {/* Tombol menu */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="ellipsis-vertical" size={26} color="white" />
        </TouchableOpacity>
      </View>

      {/* ===== BODY ===== */}
<View style={styles.body}>
  
  <Image
    source={require("../../assets/images/GreenBackground.png")}
    style={styles.backgroundImage}
  />

  {/* Analisis + Tombol di kiri-kanan */}
  <View style={styles.analisisContainer}>
    <Text style={styles.analisisText}>Analisis Bulan Ini</Text>

    <TouchableOpacity style={styles.detailButton}>
      <Text style={styles.detailText}>Lihat Detail</Text>
    </TouchableOpacity>
  </View>
</View>


      {/* ===== MENU POP-UP ===== */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setMenuVisible(false)}
        >
          <View style={styles.menuWrapper}>
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  router.push("/profile");
                }}
              >
                <Ionicons name="person-outline" size={20} color="white" />
                <Text style={styles.menuProfile}>Pengaturan Profil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color="#F55353" />
                <Text style={styles.menuLogout}>Keluar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const HEADER_TOP_PADDING = Platform.OS === "android" ? 20 : 50;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151716",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: HEADER_TOP_PADDING,

    marginTop: 25,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  usernameText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  menuButton: {
    padding: 6,
  },
  body: {
    flex: 1,
    alignItems: "center",
    top: 40,
  },
  modalOverlay: {
    flex: 1,
  },

  backgroundImage: {
     width: "90%",                     // persegi panjang di tengah
     height: 210,
    justifyContent: "center",

  },
 analisisContainer: {
  width: "90%",                  // sejajar dengan lebar card
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 35,
},

analisisText: {
  color: "white",
  fontSize: 18,
},

detailButton: {
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: 8,
},

detailText: {
  color: "#44DA76",
  fontSize: 14,
  fontWeight: "600",
},


  menuWrapper: {
    position: "absolute",
    right: 16,
    top: HEADER_TOP_PADDING + 40,
  },
  menuContainer: {
    backgroundColor: "#222",
    borderRadius: 10,
    paddingVertical: 6,
    minWidth: 160,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuProfile: {
    color: "white",
    marginLeft: 10,
    fontSize: 14,
  },
  menuLogout: {
    color: "#F55353",
    marginLeft: 10,
    fontSize: 14,
  },
});
