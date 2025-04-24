import { ref, push, set, update, get } from "firebase/database";
import { database } from "../firebase/config";

// Payment methods
export type PaymentMethod = "cash" | "card";

// Payment status
export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded";

// Payment interface
export interface Payment {
  id?: string;
  errandId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionRef?: string;
  payerId: string;
  receiverId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Payment method interface
export interface PaymentMethodDetails {
  type: "card";
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  cardType: string;
  isDefault?: boolean;
}

// Payment service
export const paymentService = {
  // Create a new payment
  async createPayment(paymentData: Omit<Payment, "id" | "createdAt" | "updatedAt" | "status">): Promise<Payment> {
    try {
      const paymentsRef = ref(database, "payments");
      const newPaymentRef = push(paymentsRef);

      const payment: Payment = {
        ...paymentData,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await set(newPaymentRef, payment);

      return {
        id: newPaymentRef.key || undefined,
        ...payment,
      };
    } catch (error) {
      const e = error as Error; // Type assertion
      console.error("Error creating payment:", e.message);
      throw e;
    }
  },

  // Get payment by ID
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    try {
      const paymentRef = ref(database, `payments/${paymentId}`);
      const snapshot = await get(paymentRef);

      if (snapshot.exists()) {
        return {
          id: snapshot.key,
          ...snapshot.val(),
        } as Payment;
      }

      return null;
    } catch (error) {
      const e = error as Error; // Type assertion
      console.error("Error getting payment:", e.message);
      throw e;
    }
  },

  // Get payments by errand ID
  async getPaymentsByErrandId(errandId: string): Promise<Payment[]> {
    try {
      const paymentsRef = ref(database, "payments");
      const snapshot = await get(paymentsRef);

      if (!snapshot.exists()) {
        return [];
      }

      const payments: Payment[] = [];
      snapshot.forEach((childSnapshot) => {
        const payment = childSnapshot.val();
        if (payment.errandId === errandId) {
          payments.push({
            id: childSnapshot.key,
            ...payment,
          } as Payment);
        }
      });

      return payments;
    } catch (error) {
      const e = error as Error; // Type assertion
      console.error("Error getting payments by errand ID:", e.message);
      throw e;
    }
  },

  // Update payment status
  async updatePaymentStatus(paymentId: string, status: PaymentStatus, transactionRef?: string): Promise<void> {
    try {
      const updates: Partial<Payment> = {
        status,
        updatedAt: new Date().toISOString(),
      };

      if (transactionRef) {
        updates.transactionRef = transactionRef;
      }

      if (status === "completed") {
        updates.completedAt = new Date().toISOString();
      }

      await update(ref(database, `payments/${paymentId}`), updates);
    } catch (error) {
      const e = error as Error; // Type assertion
      console.error("Error updating payment status:", e.message);
      throw e;
    }
  },

  // Process Flutterwave payment
  async processFlutterwavePayment(
    payment: Payment,
    customerInfo: {
      email: string;
      name: string;
      phoneNumber?: string;
    },
  ): Promise<{ success: boolean; transactionRef?: string; error?: string }> {
    try {
      // Simulating a successful payment
      const transactionRef = `FLW-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

      // Update payment status
      if (payment.id) {
        await this.updatePaymentStatus(payment.id, "completed", transactionRef);
      }

      return {
        success: true,
        transactionRef,
      };
    } catch (error) {
      const e = error as Error; // Type assertion
      console.error("Error processing Flutterwave payment:", e.message);
      return {
        success: false,
        error: e.message || "Payment failed",
      };
    }
  },

  // Get user's saved payment methods
  async getSavedPaymentMethods(userId: string): Promise<PaymentMethodDetails[]> {
    try {
      const paymentMethodsRef = ref(database, `userPaymentMethods/${userId}`);
      const snapshot = await get(paymentMethodsRef);

      if (!snapshot.exists()) {
        return [];
      }

      const paymentMethods: PaymentMethodDetails[] = [];
      snapshot.forEach((childSnapshot) => {
        paymentMethods.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        } as PaymentMethodDetails);
      });

      return paymentMethods;
    } catch (error) {
      const e = error as Error; // Type assertion
      console.error("Error getting saved payment methods:", e.message);
      throw e;
    }
  },

  // Save payment method
  async savePaymentMethod(
    userId: string,
    paymentMethod: PaymentMethodDetails,
  ): Promise<void> {
    try {
      const paymentMethodsRef = ref(database, `userPaymentMethods/${userId}`);
      const newPaymentMethodRef = push(paymentMethodsRef);

      await set(newPaymentMethodRef, {
        ...paymentMethod,
        createdAt: new Date().toISOString(),
      });

      // If this is the default payment method, update other methods
      if (paymentMethod.isDefault) {
        const snapshot = await get(paymentMethodsRef);
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            if (childSnapshot.key !== newPaymentMethodRef.key) {
              update(ref(database, `userPaymentMethods/${userId}/${childSnapshot.key}`), {
                isDefault: false,
              });
            }
          });
        }
      }
    } catch (error) {
      const e = error as Error; // Type assertion
      console.error("Error saving payment method:", e.message);
      throw e;
    }
  },
};

export default paymentService;