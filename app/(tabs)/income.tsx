import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import React from 'react'
import { ArrowLeft } from 'lucide-react-native'

const income = () => {
  return (
    <View style={styles.container}>
        {/* tombol back */}
        <TouchableOpacity  style={styles.back}>
            <ArrowLeft color="green" size={35} style={{ marginTop: 20 }} />
        </TouchableOpacity>
    </View>
  )
}

export default income

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#151716',
    },
    back: {
        position: 'absolute',
        top: 50,
        left: 25,
    },
})
