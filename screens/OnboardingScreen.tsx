"use client"

import { useState, useRef, useEffect } from "react"
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Dimensions, 
  TouchableOpacity, 
  Image, 
  NativeSyntheticEvent, 
  NativeScrollEvent, 
  Animated,
  Platform,
  SafeAreaView
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { useTheme } from "../context/ThemeContext"
import { StackNavigationProp } from "@react-navigation/stack"
import { RootStackParamList } from "../navigation/types"

const { width, height } = Dimensions.get("window")

interface Slide {
  id: string;
  title: string;
  description: string;
  image: any;
}

const slides: Slide[] = [
  {
    id: "1",
    title: "Request Airands",
    description: "Get anything done with our network of trusted runners. Fast, simple, and reliable.",
    image: require("../assets/onboarding1.gif"),
  },
  {
    id: "2",
    title: "Real-time Tracking",
    description: "Watch your airand progress with live updates and estimated completion time.",
    image: require("../assets/onboarding2.gif"),
  },
  {
    id: "3",
    title: "Verified Runners",
    description: "All runners are background-checked and rated by our community for your safety.",
    image: require("../assets/onboarding3.gif"),
  },
  {
    id: "4",
    title: "Let's Get Started!",
    description: "Join thousands of users getting things done smarter with Airands.",
    image: require("../assets/onboarding4.gif"),
  },
]

interface OnboardingScreenProps {
  navigation: StackNavigationProp<RootStackParamList, 'Onboarding'>;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const { theme } = useTheme()
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef<FlatList<Slide>>(null)
  const scrollX = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  const updateCurrentSlideIndex = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x
    const newIndex = Math.round(contentOffsetX / width)
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex)
    }
  }

  const goToNextSlide = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start()

    const nextSlideIndex = currentIndex + 1
    if (nextSlideIndex < slides.length) {
      flatListRef.current?.scrollToIndex({ index: nextSlideIndex })
      setCurrentIndex(nextSlideIndex)
    } else {
      navigation.replace("Auth")
    }
  }

  const skip = () => {
    navigation.replace("Auth")
  }

  const renderSlide = ({ item, index }: { item: Slide, index: number }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ]
    
    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [50, 0, 50],
      extrapolate: 'clamp',
    })

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp',
    })

    return (
      <View style={[styles.slide, { backgroundColor: theme.background }]}>
        <Animated.View 
          style={[
            styles.imageContainer, 
            { 
              opacity,
              transform: [{ translateY }] 
            }
          ]}
        >
          <Image source={item.image} style={styles.image} resizeMode="contain" />
        </Animated.View>
        
        <Animated.View style={[styles.textContainer, { opacity }]}>
          <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
          <Text style={[styles.description, { color: `${theme.text}80` }]}>
            {item.description}
          </Text>
        </Animated.View>
      </View>
    )
  }

  // Determine if dark mode based on background color (simple heuristic)
  const isDark = theme.background === '#000' || theme.background.toLowerCase().includes('dark')

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <TouchableOpacity 
        style={[styles.iosSkipButton, Platform.OS === 'ios' ? styles.iosSkipButton : styles.androidSkipButton]} 
        onPress={skip}
        activeOpacity={0.6}
      >
        <Text style={[styles.skipText, { color: theme.primary }]}>Skip</Text>
      </TouchableOpacity>

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={updateCurrentSlideIndex}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />

      <View style={styles.bottomContainer}>
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ]
            
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              
            })
            
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              
            })
            
            return (
              <Animated.View
                key={index}
                style={[
                  styles.indicator,
                  {
                    width: dotWidth,
                    opacity,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            )
          })}
        </View>

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.primary }]} 
            onPress={goToNextSlide}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
            </Text>
            <View style={styles.buttonIcon}>
              <Text style={[styles.buttonText, { fontSize: 20 }]}>
                {currentIndex === slides.length - 1 ? "🎉" : "➡️"}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iosSkipButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 2,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.1)'
  },
  androidSkipButton: {
    position: "absolute",
    top: 30,
    right: 20,
    zIndex: 2,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "600",
  },
  slide: {
    width,
    height,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  imageContainer: {
    width: width * 0.8,
    height: height * 0.4,
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 38,
  },
  description: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 26,
    marginTop: 8,
  },
  bottomContainer: {
    position: "absolute",
    bottom: Platform.OS === 'ios' ? 60 : 30,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
    alignItems: 'center',
    height: 10,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  button: {
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: 'row',
    paddingHorizontal: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 10,
  },
})

export default OnboardingScreen