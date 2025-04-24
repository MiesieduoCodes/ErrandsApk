import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { ref, update, get } from "firebase/database";
import { database } from "../firebase/config";
import { Alert } from "react-native";

// Verification status types
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

// Verification method types
export type VerificationMethod = "email" | "phone" | "id" | "biometric" | "address";

// Verification data interface
export interface VerificationData {
  userId: string;
  status: VerificationStatus;
  methods: {
    [key in VerificationMethod]?: {
      verified: boolean;
      timestamp?: string;
      data?: any;
    };
  };
  documents?: {
    idFront?: string;
    idBack?: string;
    selfie?: string;
    addressProof?: string;
  };
  updatedAt: string;
}

// Check if device supports biometric authentication
export const checkBiometricSupport = async (): Promise<{
  supported: boolean;
  biometricTypes: string[];
}> => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return { supported: false, biometricTypes: [] };

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return { supported: false, biometricTypes: [] };

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const biometricTypes = types.map((type) => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return "Fingerprint";
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return "Face ID";
        case LocalAuthentication.AuthenticationType.IRIS:
          return "Iris";
        default:
          return "Biometric";
      }
    });

    return { supported: true, biometricTypes };
  } catch (error) {
    console.error("Error checking biometric support:", error);
    return { supported: false, biometricTypes: [] };
  }
};

// Authenticate with biometrics
export const authenticateWithBiometrics = async (
  promptMessage = "Authenticate to continue"
): Promise<boolean> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: "Use passcode",
    });

    return result.success;
  } catch (error) {
    console.error("Error authenticating with biometrics:", error);
    return false;
  }
};

// Save verification token securely
export const saveVerificationToken = async (userId: string, token: string): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync(`verification_token_${userId}`, token);
    return true;
  } catch (error) {
    console.error("Error saving verification token:", error);
    return false;
  }
};

// Get verification token
export const getVerificationToken = async (userId: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(`verification_token_${userId}`);
  } catch (error) {
    console.error("Error getting verification token:", error);
    return null;
  }
};

// Get user verification status
export const getUserVerificationStatus = async (userId: string): Promise<VerificationData | null> => {
  try {
    const verificationRef = ref(database, `userVerifications/${userId}`);
    const snapshot = await get(verificationRef);

    if (snapshot.exists()) {
      return snapshot.val() as VerificationData;
    }

    const initialData: VerificationData = {
      userId,
      status: "unverified",
      methods: {},
      updatedAt: new Date().toISOString(),
    };

    await update(ref(database, `userVerifications/${userId}`), initialData);
    return initialData;
  } catch (error) {
    console.error("Error getting user verification status:", error);
    return null;
  }
};

// Update verification method
export const updateVerificationMethod = async (
  userId: string,
  method: VerificationMethod,
  verified: boolean,
  data?: any
): Promise<boolean> => {
  try {
    const verificationRef = ref(database, `userVerifications/${userId}`);
    const currentData = await getUserVerificationStatus(userId);

    if (!currentData) {
      throw new Error("Verification data not found");
    }

    const updatedMethods = {
      ...currentData.methods,
      [method]: {
        verified,
        timestamp: new Date().toISOString(),
        data: data || currentData.methods[method]?.data,
      },
    };

    let newStatus: VerificationStatus = "unverified";
    const verifiedMethodsCount = Object.values(updatedMethods).filter((m) => m.verified).length;

    const requiredMethods: Record<string, number> = {
      buyer: 2, // Email + Phone
      seller: 3, // Email + Phone + ID
      runner: 4, // Email + Phone + ID + Address
    };

    const userSnapshot = await get(ref(database, `users/${userId}`));
    const userType = userSnapshot.exists() ? userSnapshot.val().userType : "buyer";

    if (verifiedMethodsCount >= requiredMethods[userType]) {
      newStatus = "verified";
    } else if (verifiedMethodsCount > 0) {
      newStatus = "pending";
    }

    await update(verificationRef, {
      methods: updatedMethods,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error updating verification method:", error);
    return false;
  }
};

// Upload verification document
export const uploadVerificationDocument = async (
  userId: string,
  documentType: "idFront" | "idBack" | "selfie" | "addressProof",
  documentUri: string
): Promise<boolean> => {
  try {
    const verificationRef = ref(database, `userVerifications/${userId}`);
    const currentData = await getUserVerificationStatus(userId);

    if (!currentData) {
      throw new Error("Verification data not found");
    }

    const updatedDocuments = {
      ...currentData.documents,
      [documentType]: documentUri,
    };

    await update(verificationRef, {
      documents: updatedDocuments,
      status: "pending",
      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error uploading verification document:", error);
    return false;
  }
};

// Request verification code (SMS or Email)
export const requestVerificationCode = async (
  userId: string,
  method: "email" | "phone",
  destination: string
): Promise<boolean> => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await saveVerificationToken(userId, code);

    console.log(`Verification code for ${userId}: ${code}`);
    Alert.alert("Verification Code", `Your verification code is: ${code}`, [{ text: "OK" }]);

    return true;
  } catch (error) {
    console.error("Error requesting verification code:", error);
    return false;
  }
};

// Verify code
export const verifyCode = async (userId: string, method: "email" | "phone", code: string): Promise<boolean> => {
  try {
    const savedCode = await getVerificationToken(userId);

    if (!savedCode || savedCode !== code) {
      return false;
    }

    await updateVerificationMethod(userId, method, true);
    await SecureStore.deleteItemAsync(`verification_token_${userId}`);

    return true;
  } catch (error) {
    console.error("Error verifying code:", error);
    return false;
  }
};

// Check if user needs verification
export const checkVerificationRequirements = async (
  userId: string,
  userType: string
): Promise<{
  isVerified: boolean;
  requiredMethods: VerificationMethod[];
  completedMethods: VerificationMethod[];
}> => {
  try {
    const verificationData = await getUserVerificationStatus(userId);

    if (!verificationData) {
      throw new Error("Verification data not found");
    }

    let requiredMethods: VerificationMethod[] = ["email"];
    if (userType === "buyer") {
      requiredMethods = ["email", "phone"];
    } else if (userType === "seller") {
      requiredMethods = ["email", "phone", "id"];
    } else if (userType === "runner") {
      requiredMethods = ["email", "phone", "id", "address"];
    }

    const completedMethods = Object.entries(verificationData.methods || {})
      .filter(([_, value]) => value.verified)
      .map(([key]) => key as VerificationMethod);

    const isVerified = requiredMethods.every((method) => completedMethods.includes(method));

    return {
      isVerified,
      requiredMethods,
      completedMethods,
    };
  } catch (error) {
    console.error("Error checking verification requirements:", error);
    return {
      isVerified: false,
      requiredMethods: [],
      completedMethods: [],
    };
  }
};