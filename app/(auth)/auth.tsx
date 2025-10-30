import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import React from 'react'
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

const login = () => {
  return (
    <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
<ArrowLeft color="white" size={35} style={{marginTop: 20}}/>
        </TouchableOpacity>
      <Text style={styles.title}>Masuk Dengan Akun Yang anda Punya</Text>
      <Text style={styles.subtitle}>Masuk untuk Mendapatkan Pengalaman Mengelola uang terbaik</Text>
      <View style={styles.form}>

        <View style={{backgroundColor: 'lightgray', height: 55, marginHorizontal: 25, borderRadius: 100, marginTop: 50, maxHeight: '10%'}}>
            <TouchableOpacity style={styles.loginselectbutton}>
                <Text style={{textAlign: 'center', marginVertical: 12, fontSize: 16, color: 'black', fontWeight: 'bold'}}>Login</Text>
            </TouchableOpacity>
        </View>

      </View>
    </View>
  )
}

export default login;

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
    marginHorizontal: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  loginselectbutton: {
    backgroundColor: 'white',
    height: 100,
    marginRight: 190,
    borderRadius: 100,
    marginTop: 2.5,
    maxHeight: '90%',
    marginLeft: 3,
  }
})