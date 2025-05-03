import { ref, set, get, update, push } from "firebase/database"
import { database } from "../firebase/config"
import { notificationService } from "./notification"

export interface Message {
  id?: string
  chatId: string
  senderId: string
  text: string
  timestamp: string
  read: boolean
  attachmentUrl?: string
  attachmentType?: "image" | "file" | "location"
}

export interface Chat {
  id: string
  participants: string[]
  lastMessage?: {
    text: string
    senderId: string
    timestamp: string
  }
  createdAt: string
  updatedAt: string
  errandId?: string | null
}

export const chatService = {
  async createChat(participants: string[], errandId?: string | null): Promise<Chat> {
    try {
      const existingChat = await this.findChatByParticipants(participants, errandId)
      if (existingChat) return existingChat

      const chatsRef = ref(database, "chats")
      const newChatRef = push(chatsRef)

      const chatData: Record<string, any> = {
        id: newChatRef.key || "",
        participants,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Only add errandId if it has a value
      if (errandId) {
        chatData.errandId = errandId
      }

      await set(newChatRef, chatData)

      // Create user chat references
      for (const userId of participants) {
        const userChatData: Record<string, any> = {
          chatId: newChatRef.key,
          participants: participants.filter((id) => id !== userId),
          createdAt: chatData.createdAt,
        }

        if (errandId) {
          userChatData.errandId = errandId
        }

        await set(ref(database, `userChats/${userId}/${newChatRef.key}`), userChatData)
      }

      return chatData as Chat
    } catch (error) {
      console.error("Error creating chat:", error)
      throw error
    }
  },

  async findChatByParticipants(participants: string[], errandId?: string | null): Promise<Chat | null> {
    try {
      const sortedParticipants = [...participants].sort()
      const userChatsRef = ref(database, `userChats/${sortedParticipants[0]}`)
      const snapshot = await get(userChatsRef)

      if (!snapshot.exists()) return null

      let matchingChat: Chat | null = null

      snapshot.forEach((childSnapshot) => {
        const userChat = childSnapshot.val()
        const chatId = userChat.chatId

        // Skip if errandId doesn't match (when errandId is provided)
        if (errandId !== undefined && userChat.errandId !== errandId) {
          return
        }

        const allParticipantsIncluded = sortedParticipants
          .slice(1)
          .every((participantId) => userChat.participants.includes(participantId))

        if (allParticipantsIncluded && userChat.participants.length === sortedParticipants.length - 1) {
          get(ref(database, `chats/${chatId}`)).then((chatSnapshot) => {
            if (chatSnapshot.exists()) {
              matchingChat = {
                id: chatId,
                ...chatSnapshot.val(),
              }
            }
          })
          return true // Break the forEach loop
        }
      })

      return matchingChat
    } catch (error) {
      console.error("Error finding chat by participants:", error)
      throw error
    }
  },

  async sendMessage(
    chatId: string,
    senderId: string,
    text: string,
    attachment?: {
      url: string
      type: "image" | "file" | "location"
    },
  ): Promise<Message> {
    try {
      const chatSnapshot = await get(ref(database, `chats/${chatId}`))
      if (!chatSnapshot.exists()) {
        throw new Error("Chat not found")
      }

      const messagesRef = ref(database, `messages/${chatId}`)
      const newMessageRef = push(messagesRef)

      const now = new Date().toISOString()
      const message: Record<string, any> = {
        chatId,
        senderId,
        text,
        timestamp: now,
        read: false,
      }

      if (attachment) {
        message.attachmentUrl = attachment.url
        message.attachmentType = attachment.type
      }

      await set(newMessageRef, message)

      const updateData: Record<string, any> = {
        lastMessage: {
          text,
          senderId,
          timestamp: now,
        },
        updatedAt: now,
      }

      await update(ref(database, `chats/${chatId}`), updateData)

      const chat = chatSnapshot.val()
      const recipients = chat.participants.filter((id: string) => id !== senderId)

      for (const recipientId of recipients) {
        await notificationService.sendNotification(recipientId, {
          title: "New Message",
          body: text.length > 50 ? `${text.substring(0, 47)}...` : text,
          data: {
            chatId,
            messageId: newMessageRef.key,
            senderId,
          },
          type: "new_message",
        })
      }

      return {
        id: newMessageRef.key,
        ...message,
      } as Message
    } catch (error) {
      console.error("Error sending message:", error)
      throw error
    }
  },

  // Get messages for a chat
  async getChatMessages(chatId: string): Promise<Message[]> {
    try {
      const messagesRef = ref(database, `messages/${chatId}`)
      const snapshot = await get(messagesRef)

      if (!snapshot.exists()) {
        return []
      }

      const messages: Message[] = []
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        })
      })

      return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    } catch (error) {
      console.error("Error getting chat messages:", error)
      throw error
    }
  },

  // Get user's chats
  async getUserChats(userId: string): Promise<Chat[]> {
    try {
      const userChatsRef = ref(database, `userChats/${userId}`)
      const snapshot = await get(userChatsRef)

      if (!snapshot.exists()) {
        return []
      }

      const chatPromises: Promise<Chat | null>[] = []
      snapshot.forEach((childSnapshot) => {
        const userChat = childSnapshot.val()
        const chatId = userChat.chatId

        chatPromises.push(
          get(ref(database, `chats/${chatId}`)).then((chatSnapshot) => {
            if (chatSnapshot.exists()) {
              return {
                id: chatId,
                ...chatSnapshot.val(),
              } as Chat
            }
            return null
          }),
        )
      })

      const chats = (await Promise.all(chatPromises)).filter((chat) => chat !== null) as Chat[]

      return chats.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0
        if (!a.lastMessage) return 1
        if (!b.lastMessage) return -1
        return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
      })
    } catch (error) {
      console.error("Error getting user chats:", error)
      throw error
    }
  },

  // Mark messages as read
  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    try {
      const messagesRef = ref(database, `messages/${chatId}`)
      const snapshot = await get(messagesRef)

      if (!snapshot.exists()) {
        return
      }

      const updates: Record<string, boolean> = {}
      snapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val()
        if (message.senderId !== userId && !message.read) {
          updates[`messages/${chatId}/${childSnapshot.key}/read`] = true
        }
      })

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates)
      }
    } catch (error) {
      console.error("Error marking messages as read:", error)
      throw error
    }
  },

  // Get unread message count for a user
  async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      const userChats = await this.getUserChats(userId)
      let unreadCount = 0

      for (const chat of userChats) {
        const messagesRef = ref(database, `messages/${chat.id}`)
        const snapshot = await get(messagesRef)

        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val()
            if (message.senderId !== userId && !message.read) {
              unreadCount++
            }
          })
        }
      }

      return unreadCount
    } catch (error) {
      console.error("Error getting unread message count:", error)
      throw error
    }
  },

  // Delete a chat
  async deleteChat(chatId: string): Promise<void> {
    try {
      const chatSnapshot = await get(ref(database, `chats/${chatId}`))
      if (!chatSnapshot.exists()) {
        throw new Error("Chat not found")
      }

      const chat = chatSnapshot.val()

      for (const userId of chat.participants) {
        await set(ref(database, `userChats/${userId}/${chatId}`), null)
      }

      await set(ref(database, `messages/${chatId}`), null)
      await set(ref(database, `chats/${chatId}`), null)
    } catch (error) {
      console.error("Error deleting chat:", error)
      throw error
    }
  },

  // Add a reaction to a message
  async addMessageReaction(chatId: string, messageId: string, userId: string, emoji: string): Promise<void> {
    try {
      const reactionRef = ref(database, `messageReactions/${chatId}/${messageId}/${userId}`)

      // Check if the user already reacted with this emoji
      const snapshot = await get(reactionRef)

      if (snapshot.exists() && snapshot.val().emoji === emoji) {
        // Remove the reaction if it's the same emoji
        await set(reactionRef, null)
      } else {
        // Add or update the reaction
        await set(reactionRef, {
          userId,
          emoji,
          timestamp: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("Error adding message reaction:", error)
      throw error
    }
  },

  // Get all reactions for messages in a chat
  async getMessageReactions(chatId: string): Promise<{ [messageId: string]: { emoji: string; userId: string }[] }> {
    try {
      const reactionsRef = ref(database, `messageReactions/${chatId}`)
      const snapshot = await get(reactionsRef)

      if (!snapshot.exists()) {
        return {}
      }

      const reactions: { [messageId: string]: { emoji: string; userId: string }[] } = {}

      snapshot.forEach((messageSnapshot) => {
        const messageId = messageSnapshot.key!
        reactions[messageId] = []

        messageSnapshot.forEach((userSnapshot) => {
          const userId = userSnapshot.key!
          const reactionData = userSnapshot.val()

          reactions[messageId].push({
            userId,
            emoji: reactionData.emoji,
          })
        })
      })

      return reactions
    } catch (error) {
      console.error("Error getting message reactions:", error)
      throw error
    }
  },
}

export default chatService
