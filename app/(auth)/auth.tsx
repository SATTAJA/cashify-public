import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { router } from 'expo-router'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native'
import { supabase } from '../../lib/supabase'

const auth = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !username)) {
      Alert.alert('Error', 'Harap isi semua kolom.')
      return
    }

    setLoading(true)

    if (isLogin) {
      // === LOGIN ===
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      setLoading(false)

      if (error) Alert.alert('Login gagal', error.message)
      else {
        Alert.alert('Berhasil', 'Login berhasil!')
        router.replace('/home')
      }
    } else {
      // === REGISTER ===
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      })
      setLoading(false)

      if (error) {
        Alert.alert('Gagal daftar', error.message)
        return
      }

      if (!data.session) {
        Alert.alert(
          'Daftar Berhasil',
          'Periksa email Anda untuk verifikasi sebelum login.'
        )
      } else {
        Alert.alert('Berhasil', 'Akun berhasil dibuat!')
        router.replace('/home')
      }

      setIsLogin(true)
    }
  }

  return (

    // === Title & Subtitle ===
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <ArrowLeft color="white" size={35} style={{ marginTop: 20 }} />
      </TouchableOpacity>

      <Text style={styles.title}>{isLogin ? 'Masuk ke Akun Anda' : 'Buat Akun Baru Anda'}</Text>
      <Text style={styles.subtitle}>
        {isLogin
          ? 'Masuk untuk pengalaman terbaik mengelola uang'
          : 'Daftar untuk mulai mengelola keuangan Anda'}
      </Text>

      <View style={styles.form}>
        {/* === Tab Switch Login / Register === */}
        <View style={styles.switchContainer}>
          <TouchableOpacity
            onPress={() => setIsLogin(true)}
            style={[styles.switchButton, isLogin && styles.switchActive]}
          >
            <Text style={[styles.switchLabel, isLogin && styles.switchLabelActive]}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsLogin(false)}
            style={[styles.switchButton, !isLogin && styles.switchActive]}
          >
            <Text style={[styles.switchLabel, !isLogin && styles.switchLabelActive]}>Register</Text>
          </TouchableOpacity>
        </View>

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="gray"
            onChangeText={setUsername}
            value={username}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="gray"
          keyboardType="email-address"
          onChangeText={setEmail}
          value={email}
        />

        {/* === Input Password + Icon Mata === */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="gray"
            secureTextEntry={!visible}
            onChangeText={setPassword}
            value={password}
          />
          <TouchableOpacity onPress={() => setVisible(v => !v)}>
            {visible ? (
              <Eye size={24} color="#666" />
            ) : (
              <EyeOff size={24} color="#666" />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleAuth} style={styles.button} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Register'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default auth

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151716',
  },
  title: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
    marginTop: 150,
    marginHorizontal: 25,
  },
  subtitle: {
    fontSize: 15,
    color: 'gray',
    marginTop: 10,
    marginHorizontal: 25,
  },
  back: {
    position: 'absolute',
    top: 50,
    left: 25,
  },
  form: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 50,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
  },

  // === SWITCH TAB ===
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#E8E8E8',
    borderRadius: 30,
    padding: 5,
    marginBottom: 25,
  },
  switchButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 25,
  },
  switchActive: {
    backgroundColor: 'white',
  },
  switchLabel: {
    color: '#777',
    fontSize: 16,
    fontWeight: '600',
  },
  switchLabelActive: {
    color: 'black',
    fontWeight: 'bold',
  },

  input: {
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: 'black',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#E8E8E8',

  },
  passwordInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: 'black',
  },
  button: {
    backgroundColor: '#44DA76',
    borderRadius: 100,
    height: 55,
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
