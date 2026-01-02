import { populate } from "dotenv";
import { uploadFileCloudinary } from "../config/cloudinaryConfig.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import response from "../utils/responseHandler.js";


export const sendMessage = async (req, res) => {
  const { senderId, receiverId, content, messageStatus } = req.body;
  const file = req.file; // Assuming you're using multer for file uploads

  try {
    const participants = [senderId, receiverId].sort();
    let conversation = await Conversation.findOne({ participants });

    if (!conversation) {
        conversation = new Conversation({ participants });
        await conversation.save();
    }

   let imageOrVideoURL=null;
let contentType=null;

    if(file){
      const uploadFile = await uploadFileCloudinary(file);
      if(!uploadFile) throw new Error("File upload failed");
      imageOrVideoURL= uploadFile?.secure_url;
      if(file.mimetype.startsWith("image")) {
        contentType = "image";
      } else if(file.mimetype.startsWith("video")) {
        contentType = "video";
      } else {
        return response(res, 400, "Invalid file type");
      }
    }else if(content?.trim()){
      contentType = "text";
    }else{
      return response(res, 400, "Invalid content");
    }

    const message = await Message.create({
      conversationId: conversation._id,
      sender: senderId,
      receiver: receiverId,
      content,
      imageOrVideoURL,
      contentType,
      messageStatus
    });

    await message.save();
    console.log(conversation._id)
    if(message.contentType === "text"){
      conversation.lastMessage = message._id;
    }
    conversation.unReadCount += 1;
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "userName profilePicture")
      .populate("receiver", "userName profilePicture");

    return response(res, 200, "Message sent successfully", populatedMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    return response(res, 500, "Internal server error");
  }
};

//get all conversations
export const getAllConversations = async (req, res) => {
    const userId = req.user.userId;


  try {
    const conversations = await Conversation.find({
      participants: userId
    }).populate("participants", "userName profilePicture isOnline lastSeen").populate({path: "lastMessage", populate: [{path: "sender receiver", select: "userName profilePicture"}]}).sort({ updatedAt: -1 });

    return response(res, 200, "Conversations fetched successfully", conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return response(res, 500, "Internal server error");
  }
};

//get Message for a specific conversation
export const getMessagesForConversation = async (req, res) => {
  const { conversationId } = req.params;
  
    const userId = req.user.userId;

  try {
   const conversation = await Conversation.findById(conversationId)

   if (!conversation) {
     return response(res, 404, "Conversation not found");
   }

   const messages = await Message.find({   conversationId: conversation._id })
     .populate("sender", "userName profilePicture")
     .populate("receiver", "userName profilePicture")
     .sort("createdAt");

     

     await Message.updateMany(
       { conversation: conversationId, receiver: userId, messageStatus: { $in: ["send", "delivered"] } },
       { $set: { messageStatus: "read" } }
     );

       conversation.unReadCount = 0;
       await conversation.save();
     

   return response(res, 200, "Messages fetched successfully", messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return response(res, 500, "Internal server error");
  }
};


export const markMessagesAsRead = async (req, res) => {
  const { messageIds } = req.body;
    const userId = req.user.userId;

  try {
    let message= await Message.find({ _id: { $in: messageIds }, receiver: userId });
    await Message.updateMany(
      { _id: { $in: messageIds }, receiver: userId},
      { $set: { messageStatus: "read" } }
    );

    return response(res, 200, "Messages marked as read successfully", message);
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return response(res, 500, "Internal server error");
  }
};

export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
    const userId = req.user.userId;

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return response(res, 404, "Message not found");
    }

    if (message.sender.toString() !== userId) {
      return response(res, 403, "You are not authorized to delete this message");
    }

    await message.deleteOne();

    return response(res, 200, "Message deleted successfully", message);
  } catch (error) {
    console.error("Error deleting message:", error);
    return response(res, 500, "Internal server error");
  }
};
