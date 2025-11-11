import { View, Text, StyleSheet } from 'react-native'

export default function Profile() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ini Profile Page</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151716',
  },
  title: {
    fontSize: 16,
    color: 'white',
  },
})
