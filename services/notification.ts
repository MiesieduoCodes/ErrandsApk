import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { ref, set, get, update, push } from "firebase/database";
import { database } from "../firebase/config";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification types
export type NotificationType =
  | "errand_request"
  | "errand_accepted"
  | "errand_started"
  | "errand_completed"
  | "errand_cancelled"
  | "payment_received"
  | "payment_completed"
  | "new_message"
  | "system";

// Notification interface
export interface Notification {
  id?: string;
  userId: string;
  title: string;
  body: string;
  data?: any;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

// Notification service
export const notificationService = {
  // Register for push notifications
  async registerForPushNotifications() {
    let token: string | undefined;

    if (!Device.isDevice) {
      console.log("Push notifications are not available in the simulator");
      return undefined;
    }

    // Check if we have permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // If we don't have permission, ask for it
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // If we still don't have permission, exit
    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return undefined;
    }

    // Get the token
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (error) {
      console.error("Error getting push token:", error);
      return undefined;
    }

    // Configure for Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#34D186",
      });
    }

    return token;
  },

  // Save FCM token to user profile
  async savePushToken(userId: string, token: string) {
    try {
      await update(ref(database, `users/${userId}`), {
        pushToken: token,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error("Error saving push token:", error);
      throw error;
    }
  },

  // Send notification to a user
  async sendNotification(
    userId: string,
    notification: {
      title: string;
      body: string;
      data?: any;
      type: NotificationType;
    },
  ) {
    try {
      // Get user's push token
      const userSnapshot = await get(ref(database, `users/${userId}`));
      if (!userSnapshot.exists()) {
        throw new Error("User not found");
      }

      const userData = userSnapshot.val();
      const pushToken = userData.pushToken;

      // Save notification to database
      const notificationsRef = ref(database, `notifications/${userId}`);
      const newNotificationRef = push(notificationsRef);

      const notificationData: Notification = {
        userId,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        type: notification.type,
        read: false,
        createdAt: new Date().toISOString(),
      };

      await set(newNotificationRef, notificationData);

      // If user has a push token, send the notification
      if (pushToken) {
        // In a production app, you would use a server to send this
        // For this example, we'll just log it
        console.log(`Sending push notification to ${pushToken}:`, notification);

        // In a real implementation, you would use Firebase Cloud Functions or your own server:
        /*
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: pushToken,
            title: notification.title,
            body: notification.body,
            data: notification.data,
          }),
        });
        */
      }

      return {
        id: newNotificationRef.key,
        ...notificationData,
      };
    } catch (error) {
      console.error("Error sending notification:", error);
      throw error;
    }
  },

  // Get user's notifications
  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      const notificationsRef = ref(database, `notifications/${userId}`);
      const snapshot = await get(notificationsRef);

      if (!snapshot.exists()) {
        return [];
      }

      const notifications: Notification[] = [];
      snapshot.forEach((childSnapshot) => {
        notifications.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        });
      });

      // Sort by creation date (newest first)
      return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting user notifications:", error);
      throw error;
    }
  },

  // Mark notification as read
  async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      await update(ref(database, `notifications/${userId}/${notificationId}`), {
        read: true,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  },

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const notificationsRef = ref(database, `notifications/${userId}`);
      const snapshot = await get(notificationsRef);

      if (!snapshot.exists()) {
        return;
      }

      const updates: Record<string, any> = {};
      snapshot.forEach((childSnapshot) => {
        const notification = childSnapshot.val();
        if (!notification.read) {
          updates[`notifications/${userId}/${childSnapshot.key}/read`] = true;
          updates[`notifications/${userId}/${childSnapshot.key}/updatedAt`] = new Date().toISOString();
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  },

  // Delete notification
  async deleteNotification(userId: string, notificationId: string, p0?: { read: boolean; }): Promise<void> {
    try {
      await set(ref(database, `notifications/${userId}/${notificationId}`), null);
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  },

  // Send errand status notification
  async sendErrandStatusNotification(
    errandId: string,
    status: string,
    senderId: string,
    recipientId: string,
  ): Promise<void> {
    try {
      // Get errand details
      const errandSnapshot = await get(ref(database, `errands/${errandId}`));
      if (!errandSnapshot.exists()) {
        throw new Error("Errand not found");
      }

      const errand = errandSnapshot.val();

      let title = "";
      let body = "";
      let type: NotificationType = "system";

      switch (status) {
        case "accepted":
          title = "Errand Accepted";
          body = `Your ${errand.errandType} errand has been accepted by a runner.`;
          type = "errand_accepted";
          break;
        case "in_progress":
          title = "Errand Started";
          body = `Your ${errand.errandType} errand is now in progress.`;
          type = "errand_started";
          break;
        case "completed":
          title = "Errand Completed";
          body = `Your ${errand.errandType} errand has been completed.`;
          type = "errand_completed";
          break;
        case "cancelled":
          title = "Errand Cancelled";
          body = `Your ${errand.errandType} errand has been cancelled.`;
          type = "errand_cancelled";
          break;
        default:
          title = "Errand Update";
          body = `Your ${errand.errandType} errand status has been updated to ${status}.`;
          type = "system";
      }

      await this.sendNotification(recipientId, {
        title,
        body,
        data: {
          errandId,
          status,
          senderId,
        },
        type,
      });
    } catch (error) {
      console.error("Error sending errand status notification:", error);
      throw error;
    }
  },
};

export default notificationService;