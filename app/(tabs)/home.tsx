import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

export default function Home() {
  const [menuVisible, setMenuVisible] = useState(false)

  return (
    <View style={styles.container}>
      {/* Tombol titik tiga kiri atas */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setMenuVisible(true)}
      >
        <Ionicons name="ellipsis-vertical" size={26} color="white" />
      </TouchableOpacity>

      <Text style={styles.title}>Selamat datang di Home!</Text>

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
    right: 20,
    zIndex: 10,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  menuContainer: {
    backgroundColor: '#222',
    marginTop: 50,
    marginLeft: 225,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    width: 180,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  menuText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 14,
  },
})
