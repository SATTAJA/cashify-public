import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'

export default function Home() {
  const [menuVisible, setMenuVisible] = useState(false)

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      await AsyncStorage.removeItem('session')
      router.replace('/auth')
    } catch (error) {
      Alert.alert('Logout Gagal', 'Terjadi kesalahan saat logout.')
    }
  }

  return (
    <View style={styles.container}>
      {/* Tombol titik tiga kanan atas */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setMenuVisible(true)}
      >
        <Ionicons name="ellipsis-vertical" size={26} color="white" />
      </TouchableOpacity>

      <Text style={styles.title}>Selamat datang di Home!</Text>

      {/* Tombol Logout di tengah */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Menu pop-up */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPressOut={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false)
                router.push('/profile')
              }}
            >
              <Ionicons name="person-outline" size={20} color="white" />
              <Text style={styles.menuText}>Profile Setting</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151716',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    color: 'white',
  },
  menuButton: {
    position: 'absolute',
    top: 50,
    right: 25,
    zIndex: 10,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  menuContainer: {
    backgroundColor: '#222',
    marginTop: 60,
    marginLeft: 200,
    borderRadius: 10,
    paddingVertical: 10,
    width: 180,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  menuText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: '#44DA76',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    marginTop: 30,
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
})
