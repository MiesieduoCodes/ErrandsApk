"use client"

import { useState, useEffect } from "react"
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
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import * as ImagePicker from "expo-image-picker"
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

  // Document states
  const [idFrontImage, setIdFrontImage] = useState<string | null>(null)
  const [idBackImage, setIdBackImage] = useState<string | null>(null)
  const [selfieImage, setSelfieImage] = useState<string | null>(null)
  const [addressProofImage, setAddressProofImage] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const loadVerificationStatus = async () => {
      try {
        setIsLoading(true)
        const status = await checkVerificationRequirements(user.id, user.userType)
        setVerificationStatus(status)

        // Pre-fill email if available
        if (user.email) {
          setEmail(user.email)
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

  const handleRequestCode = async (method: "email" | "phone") => {
    if (!user) return

    setIsSubmitting(true)
    try {
      const destination = method === "email" ? email : phone
      if (!destination) {
        Alert.alert("Error", `Please enter your ${method} first`)
        return
      }

      const success = await requestVerificationCode(user.id, method, destination)
      if (success) {
        setCurrentMethod(method)
        setCodeSent(true)
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

    setIsSubmitting(true)
    try {
      if (!verificationCode) {
        Alert.alert("Error", "Please enter the verification code")
        return
      }

      const success = await verifyCode(user.id, currentMethod as "email" | "phone", verificationCode)
      if (success) {
        // Update local state
        setVerificationStatus((prev) => ({
          ...prev,
          completedMethods: [...prev.completedMethods, currentMethod],
        }))

        setCodeSent(false)
        setVerificationCode("")
        setCurrentMethod(null)

        Alert.alert("Success", `Your ${currentMethod} has been verified`)
      } else {
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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled) {
        const uri = result.assets[0].uri

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
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert("Error", "Failed to pick image")
    }
  }

  const handleUploadDocument = async (type: "idFront" | "idBack" | "selfie" | "addressProof") => {
    if (!user) return

    setIsSubmitting(true)
    try {
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
        Alert.alert("Success", "Document uploaded successfully")

        // If both ID front and back are uploaded, mark ID as verified
        if (type === "idFront" || type === "idBack") {
          if (idFrontImage && idBackImage) {
            // Update local state
            if (!verificationStatus.completedMethods.includes("id")) {
              setVerificationStatus((prev) => ({
                ...prev,
                completedMethods: [...prev.completedMethods, "id"],
              }))
            }
          }
        }

        // If address proof is uploaded, mark address as verified
        if (type === "addressProof") {
          // Update local state
          if (!verificationStatus.completedMethods.includes("address")) {
            setVerificationStatus((prev) => ({
              ...prev,
              completedMethods: [...prev.completedMethods, "address"],
            }))
          }
        }
      } else {
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

    if (!isRequired) return null

    switch (method) {
      case "email":
        return (
          <View style={[styles.methodContainer, { borderColor: theme.border }]}>
            <View style={styles.methodHeader}>
              <View style={styles.methodTitleContainer}>
                <Ionicons name="mail" size={24} color={isCompleted ? theme.primary : theme.text} />
                <Text style={[styles.methodTitle, { color: theme.text }]}>Email Verification</Text>
              </View>
              {isCompleted ? (
                <View style={[styles.verifiedBadge, { backgroundColor: theme.primary }]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : (
                <Text style={[styles.requiredBadge, { color: theme.accent }]}>Required</Text>
              )}
            </View>

            {!isCompleted && (
              <View style={styles.methodContent}>
                {!codeSent || currentMethod !== "email" ? (
                  <>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.card,
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
                    <TextInput
                      style={[
                        styles.input,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.card,
                          color: theme.text,
                        },
                      ]}
                      placeholder="Enter verification code"
                      placeholderTextColor={theme.text + "50"}
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
                            backgroundColor: theme.card,
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
                  </>
                )}
              </View>
            )}
          </View>
        )

      case "phone":
        return (
          <View style={[styles.methodContainer, { borderColor: theme.border }]}>
            <View style={styles.methodHeader}>
              <View style={styles.methodTitleContainer}>
                <Ionicons name="phone-portrait" size={24} color={isCompleted ? theme.primary : theme.text} />
                <Text style={[styles.methodTitle, { color: theme.text }]}>Phone Verification</Text>
              </View>
              {isCompleted ? (
                <View style={[styles.verifiedBadge, { backgroundColor: theme.primary }]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : (
                <Text style={[styles.requiredBadge, { color: theme.accent }]}>Required</Text>
              )}
            </View>

            {!isCompleted && (
              <View style={styles.methodContent}>
                {!codeSent || currentMethod !== "phone" ? (
                  <>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.card,
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
                    <TextInput
                      style={[
                        styles.input,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.card,
                          color: theme.text,
                        },
                      ]}
                      placeholder="Enter verification code"
                      placeholderTextColor={theme.text + "50"}
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
                            backgroundColor: theme.card,
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
                  </>
                )}
              </View>
            )}
          </View>
        )

      case "id":
        return (
          <View style={[styles.methodContainer, { borderColor: theme.border }]}>
            <View style={styles.methodHeader}>
              <View style={styles.methodTitleContainer}>
                <Ionicons name="card" size={24} color={isCompleted ? theme.primary : theme.text} />
                <Text style={[styles.methodTitle, { color: theme.text }]}>ID Verification</Text>
              </View>
              {isCompleted ? (
                <View style={[styles.verifiedBadge, { backgroundColor: theme.primary }]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : (
                <Text style={[styles.requiredBadge, { color: theme.accent }]}>Required</Text>
              )}
            </View>

            {!isCompleted && (
              <View style={styles.methodContent}>
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
              </View>
            )}
          </View>
        )

      case "address":
        return (
          <View style={[styles.methodContainer, { borderColor: theme.border }]}>
            <View style={styles.methodHeader}>
              <View style={styles.methodTitleContainer}>
                <Ionicons name="home" size={24} color={isCompleted ? theme.primary : theme.text} />
                <Text style={[styles.methodTitle, { color: theme.text }]}>Address Verification</Text>
              </View>
              {isCompleted ? (
                <View style={[styles.verifiedBadge, { backgroundColor: theme.primary }]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : (
                <Text style={[styles.requiredBadge, { color: theme.accent }]}>Required</Text>
              )}
            </View>

            {!isCompleted && (
              <View style={styles.methodContent}>
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
                      addressProofImage
                        ? () => handleUploadDocument("addressProof")
                        : () => handlePickImage("addressProof")
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
              </View>
            )}
          </View>
        )

      default:
        return null
    }
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
  },
  statusContainer: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
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
  },
  methodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  methodTitleContainer: {
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
    marginTop: 10,
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
  instructions: {
    fontSize: 14,
    marginBottom: 15,
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
  privacyText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 40,
  },
})

export default IdentityVerificationScreen
