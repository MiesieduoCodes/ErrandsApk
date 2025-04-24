"use client"

import { useState, useRef } from "react"
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Image, NativeSyntheticEvent, NativeScrollEvent } from "react-native"
import { StatusBar } from "expo-status-bar"
import { useTheme } from "../context/ThemeContext"
import { StackNavigationProp } from "@react-navigation/stack"
import { RootStackParamList } from "../navigation/types" // You'll need to create this type

const { width, height } = Dimensions.get("window")

interface Slide {
  id: string;
  title: string;
  description: string;
  image: any; // Use 'any' for require() images or a more specific type if available
}

const slides: Slide[] = [
  {
    id: "1",
    title: "Request Errands",
    description: "Need something done? Request an errand and get matched with a runner.",
    image: require("../assets/onboarding1.gif"),
  },
  {
    id: "2",
    title: "Track Your Errand",
    description: "Know exactly where your errand runner is and when your task will be completed.",
    image: require("../assets/onboarding2.gif"),
  },
  {
    id: "3",
    title: "Safe & Reliable",
    description: "All errand runners are verified and rated by other users for your safety.",
    image: require("../assets/onboarding3.gif"),
  },
  {
    id: "4",
    title: "Ready to Start?",
    description: "Create an account and request your first errand today!",
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

  const updateCurrentSlideIndex = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x
    const currentIndex = Math.round(contentOffsetX / width)
    setCurrentIndex(currentIndex)
  }

  const goToNextSlide = () => {
    const nextSlideIndex = currentIndex + 1
    if (nextSlideIndex < slides.length) {
      flatListRef.current?.scrollToIndex({ index: nextSlideIndex })
      setCurrentIndex(nextSlideIndex)
    } else {
      // Last slide, go to auth screen
      navigation.replace("Auth")
    }
  }

  const skip = () => {
    navigation.replace("Auth")
  }

  const renderSlide = ({ item }: { item: Slide }) => {
    return (
      <View style={[styles.slide, { backgroundColor: theme.background }]}>
        <Image source={item.image} style={styles.image} resizeMode="contain" />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
          <Text style={[styles.description, { color: theme.text + "80" }]}>{item.description}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="dark" />

      <TouchableOpacity style={styles.skipButton} onPress={skip}>
        <Text style={[styles.skipText, { color: theme.primary }]}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={updateCurrentSlideIndex}
      />

      <View style={styles.bottomContainer}>
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentIndex === index && styles.activeIndicator,
                { backgroundColor: currentIndex === index ? theme.primary : theme.border },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={goToNextSlide}>
          <Text style={styles.buttonText}>{currentIndex === slides.length - 1 ? "Get Started" : "Next"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "500",
  },
  slide: {
    width,
    height,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  image: {
    width: width * 0.8,
    height: height * 0.4,
    marginBottom: 30,
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },
  indicator: {
    height: 10,
    width: 10,
    marginHorizontal: 5,
    borderRadius: 5,
  },
  activeIndicator: {
    width: 20,
  },
  button: {
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
})

export default OnboardingScreen