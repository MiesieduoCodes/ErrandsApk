"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
  Animated,
  Platform,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import * as ImagePicker from "expo-image-picker"
import * as DocumentPicker from "expo-document-picker"
import * as Haptics from "expo-haptics"
import { Camera, CameraType } from "expo-camera"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import {
  checkVerificationRequirements,
  requestVerificationCode,
  verifyCode,
  uploadVerificationDocument,
  type VerificationMethod,
} from "../services/identityVerification"

const IdentityVerificationScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation()

  const [isLoading, setIsLoading] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState({
    isVerified: false,
    requiredMethods: [] as VerificationMethod[],
    completedMethods: [] as VerificationMethod[],
  })

  // Form states
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [currentMethod, setCurrentMethod] = useState<VerificationMethod | null>(null)
  const [codeSent, setCodeSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [activeSection, setActiveSection] = useState<VerificationMethod | null>(null)

  // Document states
  const [idFrontImage, setIdFrontImage] = useState<string | null>(null)
  const [idBackImage, setIdBackImage] = useState<string | null>(null)
  const [selfieImage, setSelfieImage] = useState<string | null>(null)
  const [addressProofImage, setAddressProofImage] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraType, setCameraType] = useState<"idFront" | "idBack" | "selfie" | null>(null)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current
  const cameraRef = useRef<Camera>(null)

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      const { status } = await Camera.requestCameraPermissionsAsync()
      setHasCameraPermission(status === "granted")
    })
  }, [])

  useEffect(() => {
    if (!user) return

    const loadVerificationStatus = async () => {
      try {
        setIsLoading(true)
        const status = await checkVerificationRequirements(user.id, user.userType)
        setVerificationStatus(status)

        if (user.email) {
          setEmail(user.email)
        }

        const firstIncomplete = status.requiredMethods.find((method) => !status.completedMethods.includes(method))
        if (firstIncomplete) {
          setActiveSection(firstIncomplete)
        }
      } catch (error) {
        console.error("Error loading verification status:", error)
        Alert.alert("Error", "Failed to load verification status")
      } finally {
        setIsLoading(false)
      }
    }

    loadVerificationStatus()
  }, [user])

  useEffect(() => {
    if (countdown <= 0) return

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown])

  const handleRequestCode = async (method: "email" | "phone") => {
    if (!user) return

    const destination = method === "email" ? email : phone
    if (!destination) {
      Alert.alert("Error", `Please enter your ${method} first`)
      return
    }

    if (method === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        Alert.alert("Error", "Please enter a valid email address")
        return
      }
    } else if (method === "phone") {
      const phoneRegex = /^\+?[0-9]{10,15}$/
      if (!phoneRegex.test(phone)) {
        Alert.alert("Error", "Please enter a valid phone number")
        return
      }
    }

    setIsSubmitting(true)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      const success = await requestVerificationCode(user.id, method, destination)
      if (success) {
        setCurrentMethod(method)
        setCodeSent(true)
        setCountdown(60)
        Alert.alert("Success", `Verification code sent to your ${method}`)
      } else {
        Alert.alert("Error", `Failed to send verification code to your ${method}`)
      }
    } catch (error) {
      console.error(`Error requesting ${method} verification:`, error)
      Alert.alert("Error", `Failed to request ${method} verification`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!user || !currentMethod) return

    if (!verificationCode || verificationCode.length < 4) {
      Alert.alert("Error", "Please enter a valid verification code")
      return
    }

    setIsSubmitting(true)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      const success = await verifyCode(user.id, currentMethod as "email" | "phone", verificationCode)
      if (success) {
        setVerificationStatus((prev) => ({
          ...prev,
          completedMethods: [...prev.completedMethods, currentMethod],
        }))

        setCodeSent(false)
        setVerificationCode("")
        setCurrentMethod(null)

        const nextIncomplete = verificationStatus.requiredMethods.find(
          (method) => !verificationStatus.completedMethods.includes(method) && method !== currentMethod,
        )
        if (nextIncomplete) {
          setActiveSection(nextIncomplete)
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert("Success", `Your ${currentMethod} has been verified`)
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        Alert.alert("Error", "Invalid verification code")
      }
    } catch (error) {
      console.error("Error verifying code:", error)
      Alert.alert("Error", "Failed to verify code")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePickImage = async (type: "idFront" | "idBack" | "selfie" | "addressProof") => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      if (type === "idFront" || type === "idBack" || type === "selfie") {
        Alert.alert("Choose Image Source", "Where would you like to get the image from?", [
          {
            text: "Camera",
            onPress: () => {
              if (hasCameraPermission) {
                setCameraType(type)
                setShowCamera(true)
              } else {
                Alert.alert("Permission Required", "Camera permission is required to take photos")
              }
            },
          },
          {
            text: "Gallery",
            onPress: () => pickImageFromGallery(type),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ])
      } else {
        Alert.alert("Choose Document Source", "Where would you like to get the document from?", [
          {
            text: "Gallery",
            onPress: () => pickImageFromGallery(type),
          },
          {
            text: "Files",
            onPress: () => pickDocument(type),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ])
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert("Error", "Failed to pick image")
    }
  }

  const pickImageFromGallery = async (type: "idFront" | "idBack" | "selfie" | "addressProof") => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === "selfie" ? [1, 1] : [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets) {
        const uri = result.assets[0].uri
        setImageForType(type, uri)
      }
    } catch (error) {
      console.error("Error picking image from gallery:", error)
      Alert.alert("Error", "Failed to pick image")
    }
  }

  const pickDocument = async (type: "addressProof") => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      })

      if (result.type === "success" && result.assets) {
        setAddressProofImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Error picking document:", error)
      Alert.alert("Error", "Failed to pick document")
    }
  }

  const takePicture = async () => {
    if (!cameraRef.current || !cameraType) return

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      const photo = await cameraRef.current.takePictureAsync()
      setImageForType(cameraType, photo.uri)
      setShowCamera(false)
      setCameraType(null)
    } catch (error) {
      console.error("Error taking picture:", error)
      Alert.alert("Error", "Failed to take picture")
    }
  }

  const setImageForType = (type: "idFront" | "idBack" | "selfie" | "addressProof", uri: string) => {
    switch (type) {
      case "idFront":
        setIdFrontImage(uri)
        break
      case "idBack":
        setIdBackImage(uri)
        break
      case "selfie":
        setSelfieImage(uri)
        break
      case "addressProof":
        setAddressProofImage(uri)
        break
    }
  }

  const handleUploadDocument = async (type: "idFront" | "idBack" | "selfie" | "addressProof") => {
    if (!user) return

    setIsSubmitting(true)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      let uri
      switch (type) {
        case "idFront":
          uri = idFrontImage
          break
        case "idBack":
          uri = idBackImage
          break
        case "selfie":
          uri = selfieImage
          break
        case "addressProof":
          uri = addressProofImage
          break
      }

      if (!uri) {
        Alert.alert("Error", "Please select an image first")
        return
      }

      const success = await uploadVerificationDocument(user.id, type, uri)
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert("Success", "Document uploaded successfully")

        if (type === "idFront" || type === "idBack") {
          if (idFrontImage && idBackImage && !verificationStatus.completedMethods.includes("id")) {
            setVerificationStatus((prev) => ({
              ...prev,
              completedMethods: [...prev.completedMethods, "id"],
            }))

            const nextIncomplete = verificationStatus.requiredMethods.find(
              (method) => !verificationStatus.completedMethods.includes(method) && method !== "id",
            )
            if (nextIncomplete) {
              setActiveSection(nextIncomplete)
            }
          }
        }

        if (type === "addressProof" && !verificationStatus.completedMethods.includes("address")) {
          setVerificationStatus((prev) => ({
            ...prev,
            completedMethods: [...prev.completedMethods, "address"],
          }))

          const nextIncomplete = verificationStatus.requiredMethods.find(
            (method) => !verificationStatus.completedMethods.includes(method) && method !== "address",
          )
          if (nextIncomplete) {
            setActiveSection(nextIncomplete)
          }
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        Alert.alert("Error", "Failed to upload document")
      }
    } catch (error) {
      console.error("Error uploading document:", error)
      Alert.alert("Error", "Failed to upload document")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderVerificationMethod = (method: VerificationMethod) => {
    const isCompleted = verificationStatus.completedMethods.includes(method)
    const isRequired = verificationStatus.requiredMethods.includes(method)
    const isActive = activeSection === method

    if (!isRequired) return null

    return (
      <Animated.View
        style={[
          styles.methodContainer,
          {
            borderColor: isCompleted ? theme.primary + "50" : isActive ? theme.primary : theme.border,
            backgroundColor: isCompleted ? theme.primary + "10" : theme.card,
          },
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.methodHeader}
          onPress={() => setActiveSection(isActive ? null : method)}
          activeOpacity={0.7}
        >
          <View style={styles.methodTitleContainer}>
            {method === "email" && <Ionicons name="mail" size={24} color={isCompleted ? theme.primary : theme.text} />}
            {method === "phone" && (
              <Ionicons name="phone-portrait" size={24} color={isCompleted ? theme.primary : theme.text} />
            )}
            {method === "id" && <Ionicons name="card" size={24} color={isCompleted ? theme.primary : theme.text} />}
            {method === "address" && (
              <Ionicons name="home" size={24} color={isCompleted ? theme.primary : theme.text} />
            )}
            <Text style={[styles.methodTitle, { color: theme.text }]}>
              {method.charAt(0).toUpperCase() + method.slice(1)} Verification
            </Text>
          </View>

          <View style={styles.methodStatusContainer}>
            {isCompleted ? (
              <View style={[styles.verifiedBadge, { backgroundColor: theme.primary }]}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : (
              <Text style={[styles.requiredBadge, { color: theme.accent }]}>Required</Text>
            )}

            <Ionicons
              name={isActive ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.text + "70"}
              style={{ marginLeft: 8 }}
            />
          </View>
        </TouchableOpacity>

        {isActive && !isCompleted && (
          <View style={styles.methodContent}>
            {method === "email" && renderEmailVerification()}
            {method === "phone" && renderPhoneVerification()}
            {method === "id" && renderIdVerification()}
            {method === "address" && renderAddressVerification()}
          </View>
        )}
      </Animated.View>
    )
  }

  const renderEmailVerification = () => {
    return (
      <>
        {!codeSent || currentMethod !== "email" ? (
          <>
            <Text style={[styles.instructions, { color: theme.text }]}>
              We'll send a verification code to your email address to confirm it belongs to you.
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  backgroundColor: isDark ? theme.background : theme.card,
                  color: theme.text,
                },
              ]}
              placeholder="Enter your email"
              placeholderTextColor={theme.text + "50"}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={() => handleRequestCode("email")}
              disabled={isSubmitting}
            >
              {isSubmitting && currentMethod === "email" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.instructions, { color: theme.text }]}>
              Enter the 6-digit verification code sent to {email}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  backgroundColor: isDark ? theme.background : theme.card,
                  color: theme.text,
                  textAlign: "center",
                  letterSpacing: 8,
                  fontSize: 20,
                },
              ]}
              placeholder="000000"
              placeholderTextColor={theme.text + "30"}
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isSubmitting}
            />
            <View style={styles.codeButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    borderColor: theme.border,
                    backgroundColor: isDark ? theme.background : theme.card,
                  },
                ]}
                onPress={() => {
                  setCodeSent(false)
                  setCurrentMethod(null)
                }}
                disabled={isSubmitting}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={handleVerifyCode}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify Code</Text>
                )}
              </TouchableOpacity>
            </View>

            {countdown > 0 ? (
              <Text style={[styles.countdownText, { color: theme.text + "70" }]}>Resend code in {countdown}s</Text>
            ) : (
              <TouchableOpacity
                style={styles.resendContainer}
                onPress={() => handleRequestCode("email")}
                disabled={isSubmitting}
              >
                <Text style={[styles.resendText, { color: theme.primary }]}>Didn't receive the code? Resend</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </>
    )
  }

  const renderPhoneVerification = () => {
    return (
      <>
        {!codeSent || currentMethod !== "phone" ? (
          <>
            <Text style={[styles.instructions, { color: theme.text }]}>
              We'll send a verification code via SMS to confirm your phone number.
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  backgroundColor: isDark ? theme.background : theme.card,
                  color: theme.text,
                },
              ]}
              placeholder="Enter your phone number"
              placeholderTextColor={theme.text + "50"}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={() => handleRequestCode("phone")}
              disabled={isSubmitting}
            >
              {isSubmitting && currentMethod === "phone" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.instructions, { color: theme.text }]}>
              Enter the 6-digit verification code sent to {phone}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  backgroundColor: isDark ? theme.background : theme.card,
                  color: theme.text,
                  textAlign: "center",
                  letterSpacing: 8,
                  fontSize: 20,
                },
              ]}
              placeholder="000000"
              placeholderTextColor={theme.text + "30"}
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isSubmitting}
            />
            <View style={styles.codeButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    borderColor: theme.border,
                    backgroundColor: isDark ? theme.background : theme.card,
                  },
                ]}
                onPress={() => {
                  setCodeSent(false)
                  setCurrentMethod(null)
                }}
                disabled={isSubmitting}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={handleVerifyCode}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify Code</Text>
                )}
              </TouchableOpacity>
            </View>

            {countdown > 0 ? (
              <Text style={[styles.countdownText, { color: theme.text + "70" }]}>Resend code in {countdown}s</Text>
            ) : (
              <TouchableOpacity
                style={styles.resendContainer}
                onPress={() => handleRequestCode("phone")}
                disabled={isSubmitting}
              >
                <Text style={[styles.resendText, { color: theme.primary }]}>Didn't receive the code? Resend</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </>
    )
  }

  const renderIdVerification = () => {
    return (
      <>
        <Text style={[styles.instructions, { color: theme.text }]}>
          Please upload clear photos of the front and back of your government-issued ID
        </Text>

        <View style={styles.documentRow}>
          <View style={styles.documentContainer}>
            <Text style={[styles.documentLabel, { color: theme.text }]}>Front of ID</Text>
            {idFrontImage ? (
              <Image source={{ uri: idFrontImage }} style={styles.documentImage} />
            ) : (
              <TouchableOpacity
                style={[styles.documentPlaceholder, { borderColor: theme.border }]}
                onPress={() => handlePickImage("idFront")}
              >
                <Ionicons name="camera" size={24} color={theme.text} />
                <Text style={[styles.documentPlaceholderText, { color: theme.text }]}>Tap to select</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.documentButton, { backgroundColor: theme.primary }]}
              onPress={idFrontImage ? () => handleUploadDocument("idFront") : () => handlePickImage("idFront")}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.documentButtonText}>{idFrontImage ? "Upload" : "Select"}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.documentContainer}>
            <Text style={[styles.documentLabel, { color: theme.text }]}>Back of ID</Text>
            {idBackImage ? (
              <Image source={{ uri: idBackImage }} style={styles.documentImage} />
            ) : (
              <TouchableOpacity
                style={[styles.documentPlaceholder, { borderColor: theme.border }]}
                onPress={() => handlePickImage("idBack")}
              >
                <Ionicons name="camera" size={24} color={theme.text} />
                <Text style={[styles.documentPlaceholderText, { color: theme.text }]}>Tap to select</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.documentButton, { backgroundColor: theme.primary }]}
              onPress={idBackImage ? () => handleUploadDocument("idBack") : () => handlePickImage("idBack")}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.documentButtonText}>{idBackImage ? "Upload" : "Select"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.documentContainer}>
          <Text style={[styles.documentLabel, { color: theme.text }]}>Selfie with ID</Text>
          {selfieImage ? (
            <Image source={{ uri: selfieImage }} style={[styles.documentImage, { height: 200 }]} />
          ) : (
            <TouchableOpacity
              style={[styles.documentPlaceholder, { borderColor: theme.border, height: 200 }]}
              onPress={() => handlePickImage("selfie")}
            >
              <Ionicons name="camera" size={24} color={theme.text} />
              <Text style={[styles.documentPlaceholderText, { color: theme.text }]}>
                Tap to take a selfie holding your ID
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.documentButton, { backgroundColor: theme.primary }]}
            onPress={selfieImage ? () => handleUploadDocument("selfie") : () => handlePickImage("selfie")}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.documentButtonText}>{selfieImage ? "Upload" : "Select"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </>
    )
  }

  const renderAddressVerification = () => {
    return (
      <>
        <Text style={[styles.instructions, { color: theme.text }]}>
          Please upload a proof of address (utility bill, bank statement, etc.) from the last 3 months
        </Text>

        <View style={styles.documentContainer}>
          {addressProofImage ? (
            <Image source={{ uri: addressProofImage }} style={[styles.documentImage, { height: 200 }]} />
          ) : (
            <TouchableOpacity
              style={[styles.documentPlaceholder, { borderColor: theme.border, height: 200 }]}
              onPress={() => handlePickImage("addressProof")}
            >
              <Ionicons name="document" size={24} color={theme.text} />
              <Text style={[styles.documentPlaceholderText, { color: theme.text }]}>
                Tap to select proof of address
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.documentButton, { backgroundColor: theme.primary }]}
            onPress={
              addressProofImage ? () => handleUploadDocument("addressProof") : () => handlePickImage("addressProof")
            }
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.documentButtonText}>{addressProofImage ? "Upload" : "Select"}</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.documentTip, { color: theme.text + "80" }]}>
          Acceptable documents include: utility bills, bank statements, government letters, or rental agreements.
        </Text>
      </>
    )
  }

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={cameraType === "selfie" ? CameraType.front : CameraType.back}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.cameraCloseButton}
                onPress={() => {
                  setShowCamera(false)
                  setCameraType(null)
                }}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>
                {cameraType === "idFront" ? "Front of ID" : cameraType === "idBack" ? "Back of ID" : "Take Selfie"}
              </Text>
            </View>

            {cameraType === "selfie" && (
              <View style={styles.selfieInstructions}>
                <Text style={styles.selfieInstructionsText}>Hold your ID next to your face</Text>
              </View>
            )}

            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </View>
        </Camera>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Identity Verification</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading verification status...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={[styles.statusContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.statusTitle, { color: theme.text }]}>Verification Status</Text>
            <View style={styles.statusProgressContainer}>
              <View style={[styles.statusProgressBar, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.statusProgressFill,
                    {
                      backgroundColor: theme.primary,
                      width: `${(verificationStatus.completedMethods.length / verificationStatus.requiredMethods.length) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.statusProgressText, { color: theme.text }]}>
                {verificationStatus.completedMethods.length} of {verificationStatus.requiredMethods.length} completed
              </Text>
            </View>

            {verificationStatus.isVerified ? (
              <View style={[styles.verifiedContainer, { backgroundColor: theme.primary + "20" }]}>
                <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                <Text style={[styles.verifiedStatusText, { color: theme.primary }]}>
                  Your identity has been verified
                </Text>
              </View>
            ) : (
              <Text style={[styles.pendingText, { color: theme.text + "80" }]}>
                Please complete all required verification steps to unlock full access to the app.
              </Text>
            )}
          </View>

          {verificationStatus.requiredMethods.map((method) => renderVerificationMethod(method))}

          <Text style={[styles.privacyText, { color: theme.text + "80" }]}>
            Your information is securely stored and will only be used for verification purposes. We do not share your
            personal data with third parties.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  statusContainer: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
  },
  statusProgressContainer: {
    marginBottom: 15,
  },
  statusProgressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 5,
  },
  statusProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  statusProgressText: {
    fontSize: 14,
  },
  verifiedContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
  },
  verifiedStatusText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  pendingText: {
    fontSize: 14,
    textAlign: "center",
  },
  methodContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  methodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  methodTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  methodStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 5,
  },
  requiredBadge: {
    fontSize: 12,
    fontWeight: "600",
  },
  methodContent: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  instructions: {
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  codeButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  secondaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    marginRight: 10,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  countdownText: {
    textAlign: "center",
    marginTop: 15,
    fontSize: 14,
  },
  resendContainer: {
    alignItems: "center",
    marginTop: 15,
    padding: 5,
  },
  resendText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  documentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  documentContainer: {
    flex: 1,
    marginHorizontal: 5,
    marginBottom: 15,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 10,
  },
  documentPlaceholder: {
    height: 150,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  documentPlaceholderText: {
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  documentImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  documentButton: {
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  documentButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  documentTip: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 5,
  },
  privacyText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 40,
    lineHeight: 18,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "space-between",
  },
  cameraHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
  },
  cameraCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  cameraTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  selfieInstructions: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  selfieInstructionsText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
})

export default IdentityVerificationScreen