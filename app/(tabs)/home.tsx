import { View, Text, TouchableOpacity } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import { router } from 'expo-router'

export default function Home() {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    await AsyncStorage.removeItem('session')
    router.replace('/auth')
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Selamat datang di Home!</Text>
      <TouchableOpacity
        style={{
          backgroundColor: '#44DA76',
          paddingVertical: 12,
          paddingHorizontal: 25,
          borderRadius: 30,
          marginTop: 20,
        }}
        onPress={handleLogout}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Logout</Text>
      </TouchableOpacity>
    </View>
  )
}
