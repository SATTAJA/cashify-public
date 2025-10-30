import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// 🧩 Data Onboarding
const slides = [
  {
    id: '1',
    title: 'Kelola Uangmu Dengan Mudah',
    subtitle: 'Catat pengeluaran & pemasukan harian langsung dari genggaman.',
    image: require('../assets/images/dompet1.png'),
  },
  {
    id: '2',
    title: 'Lihat Ke Mana Uangmu Pergi',
    subtitle: 'Visualisasi saldo dan histori pengeluaran agar kamu tetap bijak.',
    image: require('../assets/images/uang.png'),
  },
  {
    id: '3',
    title: 'Mulai Mencatat Keuanganmu Hari Ini',
    subtitle: 'Bangun kebiasaan finansial yang sehat, cukup dari saku kamu.',
    image: require('../assets/images/uang.png'), // gunakan PNG, bukan SVG
  },
];

const Onboarding: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<Animated.FlatList<any>>(null);

  // 🎬 Animasi pop-up pertama kali muncul
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.push('/(auth)/auth'); 
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={styles.container}>
      {/* FlatList dengan animasi smooth */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        onScroll={handleScroll}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          // Efek scale + opacity saat scroll
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.9, 1, 0.9],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: 'clamp',
          });

          return (
            <View style={{ width, alignItems: 'center' }}>
              <Animated.View
                style={[
                  styles.imageWrapper,
                  { transform: [{ scale }], opacity },
                ]}
              >
                <Image source={item.image} style={styles.image} />
              </Animated.View>

              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                }}
              >
                <View style={styles.textWrapper}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.subtitle}>{item.subtitle}</Text>
                </View>
              </Animated.View>
            </View>
          );
        }}
      />

      {/* 🔘 Dots dengan animasi */}
      <Animated.View
        style={[
          styles.dotsWrapper,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {slides.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const backgroundColor = scrollX.interpolate({
            inputRange,
            outputRange: ['#777', '#00C853', '#777'],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, backgroundColor }]}
            />
          );
        })}
      </Animated.View>

      {/* 🚀 Tombol Lanjut (pop-up muncul smooth) */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1
              ? 'Mulai Sekarang!'
              : 'Lanjut'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default Onboarding;

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151716',
    justifyContent: 'center',
  },
  imageWrapper: {
    marginTop: 200,
    width: 380,
    height: 380,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 400,
    height: 400,
    borderRadius: 500,
  },
  textWrapper: {
    paddingHorizontal: 25,
    alignItems: 'flex-start',
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Poppins-Regular',
  },
  dotsWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 25,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  button: {
    backgroundColor: '#00C853',
    paddingVertical: 16,
    borderRadius: 30,
    marginHorizontal: 30,
    marginBottom: 60,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
