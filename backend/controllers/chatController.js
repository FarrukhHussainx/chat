import { populate } from "dotenv";
import { uploadFileCloudinary } from "../config/cloudinaryConfig";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import response from "../utils/responseHandler";


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
      conversation: conversation._id,
      sender: senderId,
      receiver: receiverId,
      content,
      imageOrVideoURL,
      contentType,
      messageStatus
    });

    await message.save();
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
  const userId = req.user.id;

  try {
    const conversations = await Conversation.find({
      participants: userId
    })
      .populate("participants", "userName profilePicture isOnline lastSeen")
      .populate({path: "lastMessage", populate: [{path: "sender receiver", select: "userName profilePicture"}]}).sort({ updatedAt: -1 });

    return response(res, 200, "Conversations fetched successfully", conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return response(res, 500, "Internal server error");
  }
};
