import express from "express";
import { multerMiddleware } from "../config/cloudinaryConfig.js";
import auth from "../middleware/auth.js";
import { deleteMessage, getAllConversations, getMessagesForConversation, markMessagesAsRead, sendMessage } from "../controllers/chatController.js";

const router = express.Router();

router.post("/send-message", auth,multerMiddleware, sendMessage);
router.get("/conversations", auth, getAllConversations);
router.get("/conversations/:conversationId/messages", auth, getMessagesForConversation);
router.delete("/messages/:messageId", auth, deleteMessage);
router.put("/messages/read", auth, markMessagesAsRead);

export default router;
