import { Server } from "socket.io";
import User from "../models/User.js";
import Message from "../models/Message.js";
import e from "express";

// Map to keep track of online users
const onlineUsers = new Map();

// Map to track typing users
const typingUsers = new Map();

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("New user connected:", socket.id);
    let userId = null;

    //handle user connection and mark them online in db
    socket.on("user-connected", async (connectingUserId) => {
      try {
        userId = connectingUserId;
        onlineUsers.set(userId, socket.id);
        socket.join(userId); // join the user to their room
        await User.findByIdAndUpdate(userId, {
          online: true,
          lastSeen: new Date(),
        });

        // Notify other users in the room
        io.emit("user-status", { userId, isOnline: true });
      } catch (error) {
        console.error("Error handling user connection:", error);
      }
    });

    //Return online status of requested user
    socket.on("get-user-status", (requestedUserId, callback) => {
      const isOnline = onlineUsers.has(requestedUserId);
      callback({
        userId: requestedUserId,
        isOnline,
        lastSeen: isOnline ? new Date() : null,
      });
    });

    //Forward message to receiver if online
    socket.on("send-message", (message) => {
      try {
        const recipientSocketId = onlineUsers.get(message.receiver?._id);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("receive-message", message);
        }
      } catch (error) {
        console.error("Error forwarding message:", error);
        socket.emit("error", "Failed to send message");
      }
    });

    //update message as read and notify sender
    socket.on("message-read", async (messageIds, senderId) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { messageStatus: "read" } }
        );

        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          messageIds.forEach((messageId) => {
            io.to(senderSocketId).emit("message_status_updated", {
              messageId,
              status: "read",
            });
          });
        }
      } catch (error) {
        console.error("Error updating message status:", error);
      }
    });

    //handle typing start event and auto stop after 3s
    socket.on("typing-start", ({ conversationId, receiverId }) => {
      if (!userId || conversationId || receiverId) return;

      if (!typingUsers.has(userId)) typingUsers.set(userId, {});

      const userTyping = typingUsers.get(userId);
      userTyping[conversationId] = true;

      //clear any existing timeout for this user
      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
      }

      // Set a timeout to remove the user from the typingUsers map after 3 seconds of inactivity
      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;
        socket
          .to(receiverId)
          .emit("user-typing", { userId, conversationId, isTyping: false });
      }, 3000);

      // Notify the receiver that the user is typing
      socket
        .to(receiverId)
        .emit("user-typing", { userId, conversationId, isTyping: true });
    });

    socket.on("typing-stop", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      if (typingUsers.has(userId)) {
        const userTyping = typingUsers.get(userId);
        userTyping[conversationId] = false;

        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);
          delete userTyping[`${conversationId}_timeout`];
        }
      }
      socket
        .to(receiverId)
        .emit("user-typing", { userId, conversationId, isTyping: false });
    });

    //Add or update user typing status
    socket.on(
      "add_reaction",
      async ({ messageId, userId, reactionUserId, emoji }) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) return;

          const existingIndex = message.reactions.findIndex(
            (r) => r.user.toString() === reactionUserId
          );

          if (existingIndex > -1) {
            const existing = message.reactions[existingIndex];
            if (existing.emoji === emoji) {
              //remove same reaction
              message.reactions.splice(existingIndex, 1);
            } else {
              message.reactions[existingIndex].emoji = emoji;
            }
          } else {
            message.reactions.push({ user: reactionUserId, emoji });
          }

          await message.save();
          const populatedMessage = await Message.findOne(message._id)
            .populate("sender", "userName profilePicture")
            .populate("receiver", "userName profilePicture")
            .populate("reactions.user", "userName ");

          const reactionUpdated = {
            messageId,
            reactions: populatedMessage.reactions,
          };

          const senderSocket = onlineUsers.get(
            populatedMessage.sender._id.toString()
          );
          const receiverSocket = onlineUsers.get(
            populatedMessage.receiver._id.toString()
          );

          if (senderSocket)
            io.to(senderSocket).emit("reaction_update", reactionUpdated);
          if (receiverSocket)
            io.to(receiverSocket).emit("reaction_update", reactionUpdated);
        } catch (error) {
          console.error("Error adding reaction:", error);
        }
      }
    );

    // Handle user disconnect
    const handleDisconnect = async () => {
      if (!userId) return;
      try {
        onlineUsers.delete(userId);

        //cleanup typing timeouts
        if (typingUsers.has(userId)) {
          const userTyping = typingUsers.get(userId);
          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith("_timeout")) clearTimeout(userTyping[key]);
          });
          typingUsers.delete(userId);
        }
        await User.findByIdAndUpdate(userId, {
          online: false,
          lastSeen: new Date(),
        });

        io.emit("user-status", {
          userId,
          isOnline: false,
          lastSeen: new Date(),
        });
        socket.leave(userId);
        console.log(`User ${userId} disconnected`);
      } catch (error) {
        console.error("Error handling user disconnect:", error);
      }
    };

    socket.on("disconnect", handleDisconnect);
  });

  //attach the online user map for external access
  io.socketUserMap = onlineUsers;
  return io;
};

export default initializeSocket;
