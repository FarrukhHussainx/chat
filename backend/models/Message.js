import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String},
  imageOrVideoURL: { type: String},
  contentType: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      emoji: { type: String, required: true }
    }
  ],
  messageStatus: { type: String, default: 'sent' },
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);

export default Message;
